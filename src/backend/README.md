# FluentA Backend

## 1. Tên dự án

**FluentA Backend**

## 2. Mô tả dự án

FluentA Backend là backend ASP.NET Core trên .NET 10 của hệ thống FluentA. Dự
án cung cấp REST API dưới prefix `/api/v1`, xử lý
xác thực. Các background job dọn dẹp đã được bỏ.

Backend được tổ chức theo modular monolith với bốn lớp chính: API,
Application, Domain và Infrastructure. PostgreSQL lưu dữ liệu nghiệp vụ cùng
challenge OTP/reset của auth;
object storage private lưu asset qua một adapter S3-compatible: mọi môi trường dùng R2 hoặc AWS S3 theo cấu hình.

Mỗi bounded context trong Application giữ một service facade và các port/DTO
của nó. Những phần dễ phình to được tách thành collaborator nội bộ theo trách
nhiệm, chẳng hạn validator, DTO mapper, statistics calculator và query/provider
parser. API dùng `ApiControllerBase` cho identity và error mapping dùng chung;
Infrastructure giữ EF adapter, provider, job facade và composition extension.
Thiết kế này giữ bốn project, route và payload của các feature giữ lại;
không dùng CQRS, MediatR hoặc một handler cho từng endpoint.

## 3. Mục lục

- [Tên dự án](#1-tên-dự-án)
- [Mô tả dự án](#2-mô-tả-dự-án)
- [Mục lục](#3-mục-lục)
- [Hướng dẫn cài đặt và chạy dự án](#4-hướng-dẫn-cài-đặt-và-chạy-dự-án)
- [Cách sử dụng dự án](#5-cách-sử-dụng-dự-án)
- [API response contract](#6-api-response-contract)
- [Cấu trúc solution](#7-cấu-trúc-solution)
- [Kiểm tra backend](#8-kiểm-tra-backend)
- [Health và production image](#9-health-và-production-image)

## 4. Hướng dẫn cài đặt và chạy dự án

Dự án có hai môi trường: Development và Production. Development chạy API trực tiếp trên máy lập trình viên, tự cấu hình qua user-secrets hoặc biến môi trường. Tài liệu này hướng dẫn chạy Development; deployment Production đang được cập nhật. API từ chối tên môi trường khác.

### 4.1. Yêu cầu

- .NET 10 SDK.
- Docker Compose là tùy chọn nếu muốn chạy PostgreSQL trong container; cũng có thể dùng PostgreSQL đã cài trên máy.
- PostgreSQL và một bucket private trên R2 hoặc AWS S3.

### 4.2. Khôi phục dependency và chạy hạ tầng

Từ thư mục root của repository:

```powershell
dotnet restore src/backend/FluentA.slnx
docker compose -f docker-compose.dev.yml up -d
```

PostgreSQL sử dụng database `fluenta_dev` tại `localhost:5432`. Dữ liệu local
được giữ trong Docker volume `fluenta-postgres-dev-data` giữa các lần khởi động.

### 4.3. Cập nhật database

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
```

### 4.4. Chạy API

```powershell
dotnet run --project src/backend/FluentA.API --launch-profile https
```

API chạy tại `https://localhost:7000`. Ở môi trường Development, OpenAPI JSON
có tại `https://localhost:7000/openapi/v1.json`.

Các secret `Jwt:Key`, `Authentication:OtpHashKey`, `Resend:ApiKey` và cấu hình
Google/Resend phải được cung cấp bằng .NET user-secrets hoặc biến môi trường.
Không ghi secret vào file được theo dõi bởi Git. Xem lệnh cấu hình đầy đủ tại
[hướng dẫn localhost](../../docs/local-development.md).

Object storage không có trường `Provider` và không branch theo môi trường hoặc nhà cung cấp trong
asset code. Cấu hình `AssetStorage` gồm:

- `Endpoint`: S3-compatible URL dùng cho backend operations; bỏ trống để AWS
  SDK dùng regional endpoint. R2 dùng endpoint account; S3 có thể dùng regional endpoint;
- `PublicEndpoint`: URL browser-reachable dùng để ký PUT/GET; bỏ trống để dùng
  cùng client với operations;
- `Bucket`, `Region`, `UsePathStyle`;
- `AccessKey` và `SecretKey`: cặp optional, phải cùng có hoặc cùng vắng mặt.

Development và Production dùng cùng cấu hình AssetStorage. Xem [hướng dẫn R2](../../docs/product/asset-storage-r2.md) để cấu hình user-secrets hoặc biến môi trường. Khi chưa cấu hình, development tắt asset storage; bật Enabled sau khi điền bucket và credentials.

## 5. Cách sử dụng dự án

### 5.1. REST API

- Dùng OpenAPI JSON tại `/openapi/v1.json` để xem schema và endpoint hiện có.
- Các endpoint nghiệp vụ dùng prefix `/api/v1`, ví dụ `/api/v1/auth`,
  `/api/v1/vocabs`, `/api/v1/practice`, `/api/v1/review`, `/api/v1/todos` và
  `/api/v1/profile`.
- Đăng ký hoặc đăng nhập qua nhóm endpoint `/api/v1/auth`; đăng nhập đặt JWT
  truy cập 5 phút và refresh token cố định 7 ngày vào hai HttpOnly cookie
  `access_token` và `refresh_token`. Token không xuất hiện trong JSON.
- `POST /api/v1/auth/refresh` giữ nguyên refresh token và chỉ cấp lại cookie
  truy cập. `POST /api/v1/auth/logout` thu hồi refresh token của lần đăng nhập
  hiện tại rồi xóa cả hai cookie. JWT truy cập đã sao chép còn hiệu lực tối đa
  năm phút.
- Các yêu cầu `POST /login`, `/google`, `/refresh` và `/logout` phải gửi header
  `Origin` khớp với `Frontend:Origins` hoặc `Frontend:BaseUrl`.
- `GET /api/v1/auth/me` trả về hồ sơ tối thiểu `id`, `fullName`, `avatarUrl`;
  `GET /api/v1/profile` trả về hồ sơ đầy đủ; `PUT /api/v1/profile` cập nhật hồ sơ.
- Với endpoint được bảo vệ, client HTTPS gửi cookie bằng `withCredentials`;
  không tạo header Bearer trong JavaScript.
- Response body dùng envelope gồm `success`, `data` và `errors`; contract đầy
  đủ được mô tả trong phần tiếp theo.

### 5.2. Cập nhật dữ liệu

Pomodoro và SignalR đã được gỡ. Không còn hub `/hubs/sync`.
Các mutation cập nhật trang hiện tại qua query refresh.

### 5.3. Background job

Không còn Quartz hoặc background job dọn asset, Trash và database.
Delete cập nhật `deleted_at`; bản ghi và object trên R2 được giữ lại.
`AssetStorageStartupService` chỉ kiểm tra storage khi API khởi động.

## 6. API Response Contract

Các REST endpoint trả về cấu trúc `ApiResponse<T>`. Phản hồi thành công đặt dữ
liệu endpoint trong `data`:

```json
{
  "success": true,
  "message": null,
  "data": {
    "id": "7f6e2c7d-7bb7-4d10-b450-02a4e727dbb1",
    "title": "Learn English"
  },
  "errors": [],
  "traceId": "request-trace-id"
}
```

Phản hồi thất bại đặt `data` là `null`. Mỗi lỗi có mã ổn định và có `field`
khi là lỗi validation:

```json
{
  "success": false,
  "message": "The request contains invalid values.",
  "data": null,
  "errors": [
    { "code": "VALIDATION_ERROR", "message": "Title is required.", "field": "title" }
  ],
  "traceId": "request-trace-id"
}
```

Response được sử dụng cùng HTTP status code, không thay thế status code.
Validation trả 400; các exception nghiệp vụ ánh xạ 400/401/403/404/409;
lỗi không xác định trả 500 với thông báo an toàn. Định nghĩa nằm tại
`FluentA.API/Contracts/ApiResponse.cs`; type phía frontend nằm tại
`../frontend/src/shared/api/contracts.ts`.

Request validation dùng ASP.NET Core model binding cho dữ liệu sai định dạng
và các validator trong Application cho quy tắc trường, nghiệp vụ và uniqueness.
Upload asset kiểm tra MIME, dung lượng và chữ ký nội dung sau khi upload;
Practice giới hạn `pageSize` từ 1 đến 100. Các query hiện tại không nhận tên
trường sort tùy ý. Mọi lỗi validation của REST API trả 400 theo cùng contract.

## 7. Cấu trúc solution

```text
src/backend/
  FluentA.API/                    Controller, middleware, health checks và composition root
    Extensions/                   Auth, CORS, rate limiting, OpenAPI, health composition
    HealthChecks/                  PostgreSQL, object storage và health response contract
  FluentA.Application/            Bounded context, service facade, DTO, port và collaborator nội bộ
    Common/Results/                OperationResult và application error contract
  FluentA.Domain/                 Entity, enum, domain service và business rule theo bounded context
  FluentA.Infrastructure/         Persistence, identity, email, object storage, provider, job và DI composition
    Persistence/Repositories/     EF adapters theo bounded context
    ObjectStorage/                 Provider-neutral S3-compatible asset storage
    ExternalServices/              Provider tích hợp như Azure pronunciation
    RuntimeState/                  Process-local runtime state
  FluentA.API.UnitTests/          Unit test cho API, production config và health contract
  FluentA.Application.UnitTests/  Unit test cho application layer
  FluentA.Domain.UnitTests/       Unit test cho domain layer
  FluentA.Infrastructure.UnitTests/ Unit test cho S3-compatible config, signing và access
  FluentA.slnx                    .NET solution
```

## 8. Kiểm tra backend

Từ thư mục root của repository:

```powershell
dotnet test src/backend/FluentA.slnx --configuration Release
```

Để chỉ build solution:

```powershell
dotnet build src/backend/FluentA.slnx --configuration Release
```

Kiểm tra model EF không bị lệch so với migration hiện tại:

```powershell
dotnet tool run dotnet-ef migrations has-pending-model-changes `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API `
  --configuration Release
```

## 9. Health và production image

API công khai hai endpoint vận hành không yêu cầu đăng nhập:

- `/health/live` chỉ kiểm tra process;
- `/health/ready` kiểm tra PostgreSQL và object storage bắt buộc.

Body chỉ chứa trạng thái tổng hợp và không trả endpoint, connection string hay
exception của dependency.

Build API image từ root repository:

```powershell
docker build `
  --file src/backend/Dockerfile `
  --build-arg VCS_REF=<commit-sha> `
  --tag fluenta-backend:<commit-sha> `
  src/backend
```

Build one-shot EF migration image từ cùng source revision:

```powershell
docker build `
  --file src/backend/Dockerfile `
  --target migrations `
  --build-arg VCS_REF=<commit-sha> `
  --tag fluenta-migrations:<commit-sha> `
  src/backend
```

Hai image chạy non-root. API nghe cổng container 8080. Các lệnh Compose
Production cũ không còn trong worktree; cần chốt deployment layout mới trước
khi đưa image lên server. Không truyền secret bằng Docker build arguments.

Xem [hướng dẫn localhost](../../docs/local-development.md) để chạy toàn bộ hệ thống và
[Frontend README](../frontend/README.md) để chạy giao diện.
