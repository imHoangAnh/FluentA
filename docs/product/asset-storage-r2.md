# Cloudflare R2 for FluentA assets

FluentA stores avatars, Countdown covers, and images in Notes and Journal in a private
object-storage bucket. The backend uses `AssetObjectStorage` with the S3 API;
there is no MinIO service in the development Compose file. PostgreSQL stores
asset records and object keys, while R2 stores the image bytes.

## 1. Create a bucket and credentials

Create a private R2 bucket. Create an R2 API token with **Object Read & Write**
permission scoped to that bucket. Keep its Access Key ID and Secret Access Key
out of Git and frontend configuration. Record the account's S3 API endpoint.
For an ordinary bucket it is
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; a jurisdictional bucket needs
its matching jurisdiction endpoint. Cloudflare documents these steps in
[R2 S3 setup](https://developers.cloudflare.com/r2/get-started/s3/) and
[R2 token authentication](https://developers.cloudflare.com/r2/api/tokens/).

## 2. Configure the development API

From the repository root, set these .NET user-secrets for
`src/backend/FluentA.API`:

```powershell
$apiProject = 'src/backend/FluentA.API'
dotnet user-secrets set 'AssetStorage:Enabled' 'true' --project $apiProject
dotnet user-secrets set 'AssetStorage:Endpoint' 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com' --project $apiProject
dotnet user-secrets set 'AssetStorage:Bucket' '<BUCKET_NAME>' --project $apiProject
dotnet user-secrets set 'AssetStorage:Region' 'auto' --project $apiProject
dotnet user-secrets set 'AssetStorage:UsePathStyle' 'false' --project $apiProject
$r2AccessKey = Read-Host 'R2 Access Key ID'
$r2SecretKey = Read-Host 'R2 Secret Access Key' -MaskInput
dotnet user-secrets set 'AssetStorage:AccessKey' $r2AccessKey --project $apiProject
dotnet user-secrets set 'AssetStorage:SecretKey' $r2SecretKey --project $apiProject
Remove-Variable r2AccessKey, r2SecretKey
```

These values select the R2 endpoint for backend operations and browser upload
and download URLs. Replace the endpoint and bucket placeholders locally.
`Read-Host` keeps the keys out of shell history. Leave
`AssetStorage:PublicEndpoint` empty: R2 presigned URLs must use its S3 API
domain, not a custom domain. `Region=auto` and `UsePathStyle=false` match R2's
S3 API. See [R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
and [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

The frontend does not need an R2 key. It gets a short-lived URL from the API,
then sends the image directly to R2. Keep `VITE_API_URL` pointing at the local
API in `src/frontend/.env.local`.

## 3. Allow browser uploads

Set this CORS policy on the R2 bucket. Add the exact deployed frontend origin
when deployment is ready:

```json
[
  {
    "AllowedOrigins": ["https://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The `PUT` request sends the same `Content-Type` that the API signed. The exact
browser origin must be allowed for uploads. See [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).

## 4. Verify the real bucket

Start the API and frontend with the existing development instructions. Check
that `/health/ready` succeeds. In the app, upload one disposable Countdown
cover, confirm it displays, then delete the Countdown and confirm its R2 object
is retained under the shared soft-delete contract. The `AssetObjectStorageIntegrationTests` can also check presigned
PUT/GET and delete against a **dedicated test bucket** when the
`FLUENTA_TEST_OBJECT_STORAGE_*` variables are supplied.

Changing the endpoint does not copy existing objects. This migration uses a
fresh database, so no old image objects need copying. If an existing database
is later retained, migrate its objects before changing the endpoint.
