using System.Net.Http.Headers;
using Amazon.Runtime;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Assets;
using FluentA.Infrastructure.Persistence.Repositories.Countdown;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using CountdownEvent = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.UnitTests;

public sealed class CountdownPersistenceIntegrationTests
{
    [CountdownRuntimeFact]
    public async Task Create_list_and_soft_delete_respect_completion_ownership_and_preserve_cover()
    {
        var connection = new NpgsqlConnectionStringBuilder(
            Environment.GetEnvironmentVariable("FLUENTA_COUNTDOWN_VALIDATION_POSTGRES"));
        if (connection.Database != "fluenta_countdown_validation"
            || connection.Host is not ("127.0.0.1" or "localhost")
            || connection.Port == 5432)
        {
            throw new InvalidOperationException("Countdown proof requires an isolated local validation database.");
        }

        var endpoint = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ENDPOINT")!;
        var bucket = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_BUCKET")!;
        var accessKey = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ACCESS_KEY")!;
        var secretKey = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_SECRET_KEY")!;
        var region = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_REGION")!;
        var objectKey = $"countdown-proof/cover-{Guid.NewGuid():N}.png";
        var options = new AssetStorageOptions
        {
            Enabled = true,
            Endpoint = endpoint,
            Bucket = bucket,
            AccessKey = accessKey,
            SecretKey = secretKey,
            Region = region,
            UsePathStyle = string.Equals(
                Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_USE_PATH_STYLE"),
                "true", StringComparison.OrdinalIgnoreCase)
        };
        using var client = new AmazonS3Client(
            new BasicAWSCredentials(accessKey, secretKey),
            new AmazonS3Config
            {
                ServiceURL = endpoint,
                AuthenticationRegion = region,
                ForcePathStyle = options.UsePathStyle,
                UseHttp = endpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            });
        var storage = new AssetObjectStorage(client, options);
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connection.ConnectionString).Options;
        var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02 };

        try
        {
            var upload = storage.CreatePresignedUpload(new AssetUploadRequest(
                objectKey, "image/png", TimeSpan.FromMinutes(5)));
            using var http = new HttpClient();
            using var content = new ByteArrayContent(bytes);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            using var uploadResponse = await http.PutAsync(upload.Url, content);
            uploadResponse.EnsureSuccessStatusCode();
            Assert.NotNull(await storage.GetObjectMetadataAsync(objectKey));

            Guid userId;
            Guid assetId;
            await using (var seed = new AppDbContext(dbOptions))
            {
                var user = User.CreateWithPassword(
                    $"countdown-proof-{Guid.NewGuid():N}@example.test", "Countdown proof", "test-hash");
                var asset = Asset.CreatePending(Guid.NewGuid(), user.Id,
                    AssetType.CountdownCover, objectKey, "image/png", bytes.Length,
                    DateTime.UtcNow.AddHours(1), bucket);
                asset.FinalizeUpload("image/png", bytes.Length);
                seed.Users.Add(user);
                seed.Assets.Add(asset);
                seed.CountdownEvents.Add(CountdownEvent.Create(
                    user.Id, "Completed memory", DateTime.UtcNow.AddDays(-30)));
                await seed.SaveChangesAsync();
                userId = user.Id;
                assetId = asset.Id;
            }

            Guid countdownId;
            await using (var db = new AppDbContext(dbOptions))
            {
                var service = Service(db, storage);
                var created = await service.CreateAsync(userId, new CreateCountdownEventRequest(
                    "Upcoming exam", DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd"), assetId));
                Assert.True(created.IsSuccess);
                countdownId = created.Value!.Id;

                var listed = await service.ListAsync(userId);
                Assert.True(listed.IsSuccess);
                var items = listed.Value!;
                Assert.Equal(["Upcoming exam", "Completed memory"],
                    items.Select(item => item.Name).ToArray());
                Assert.False(items[0].IsCompleted);
                Assert.True(items[1].IsCompleted);

                var foreignDelete = await service.DeleteAsync(Guid.NewGuid(), countdownId);
                Assert.False(foreignDelete.IsSuccess);
                Assert.Equal("COUNTDOWN_NOT_FOUND", foreignDelete.Error!.Code);
            }

            await using (var db = new AppDbContext(dbOptions))
            {
                var deleted = await Service(db, new DeleteMustNotBeCalledStorage())
                    .DeleteAsync(userId, countdownId);
                Assert.True(deleted.IsSuccess);
            }

            await using (var verify = new AppDbContext(dbOptions))
            {
                var retained = await verify.CountdownEvents.SingleAsync(item => item.Id == countdownId);
                Assert.NotNull(retained.DeletedAt);
                Assert.Equal(retained.DeletedAt, retained.UpdatedAt);
                Assert.Equal(assetId, retained.CoverAssetId);
                Assert.Equal(AssetStatus.Ready,
                    (await verify.Assets.SingleAsync(item => item.Id == assetId)).Status);
                Assert.NotNull(await storage.GetObjectMetadataAsync(objectKey));
                var service = Service(verify, storage);
                Assert.Equal(["Completed memory"],
                    (await service.ListAsync(userId)).Value!.Select(item => item.Name).ToArray());
                var repeated = await service.DeleteAsync(userId, countdownId);
                Assert.False(repeated.IsSuccess);
                Assert.Equal("COUNTDOWN_NOT_FOUND", repeated.Error!.Code);
            }
        }
        finally
        {
            await client.DeleteObjectAsync(new Amazon.S3.Model.DeleteObjectRequest { BucketName = bucket, Key = objectKey });
        }
    }

    private static CountdownService Service(AppDbContext db, IAssetObjectStorage storage) =>
        new(new EfCountdownRepository(db), new EfAssetRepository(db), storage);

    private sealed class DeleteMustNotBeCalledStorage : IAssetObjectStorage
    {
        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) =>
            throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) =>
            throw new NotSupportedException();
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey,
            CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes,
            CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string objectKey,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Countdown soft delete must not delete its cover object.");
    }

    private sealed class CountdownRuntimeFactAttribute : FactAttribute
    {
        public CountdownRuntimeFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_COUNTDOWN_VALIDATION_POSTGRES"))
                || Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ENABLED") != "true"
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ENDPOINT"))
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_BUCKET"))
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ACCESS_KEY"))
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_SECRET_KEY"))
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_REGION")))
            {
                Skip = "Set the isolated Countdown PostgreSQL and object-storage validation variables.";
            }
        }
    }
}
