# FluentA Backend

## 1. Tên dự án

**FluentA Backend**

## 2. Mô tả dự án

FluentA Backend là backend ASP.NET Core trên .NET 10 của hệ thống FluentA. Dự
án cung cấp REST API dưới prefix `/api/v1`, SignalR hub tại `/hubs/sync`, xử lý
xác thực và thực thi background job định kỳ bằng Hangfire.

Backend được tổ chức theo modular monolith với bốn lớp chính: API,
Application, Domain và Infrastructure. PostgreSQL lưu dữ liệu nghiệp vụ, Redis
lưu refresh token và trạng thái ngắn hạn, còn MinIO lưu object phục vụ asset.

## 3. Mục lục

- [Tên dự án](#1-tên-dự-án)
- [Mô tả dự án](#2-mô-tả-dự-án)
- [Mục lục](#3-mục-lục)
- [Hướng dẫn cài đặt và chạy dự án](#4-hướng-dẫn-cài-đặt-và-chạy-dự-án)
- [Cách sử dụng dự án](#5-cách-sử-dụng-dự-án)
- [API response contract](#6-api-response-contract)
- [Cấu trúc solution](#7-cấu-trúc-solution)
- [Kiểm tra backend](#8-kiểm-tra-backend)

## 4. Hướng dẫn cài đặt và chạy dự án

### 4.1. Yêu cầu

- .NET 10 SDK.
- Docker Desktop hoặc Docker Engine có Docker Compose.
- PostgreSQL, Redis và MinIO theo cấu hình local của repository.

### 4.2. Khôi phục dependency và chạy hạ tầng

Từ thư mục root của repository:

```powershell
dotnet restore src/backend/FluentA.slnx
docker compose -f docker-compose.dev.yml up -d
```

### 4.3. Cập nhật database

```powershell
dotnet tool restore
dotnet tool run dotnet-ef database update `
  --project src/backend/FluentA.Infrastructure `
  --startup-project src/backend/FluentA.API
```

### 4.4. Chạy API

```powershell
dotnet run --project src/backend/FluentA.API --launch-profile http
```

API chạy tại `http://localhost:5000`. Ở môi trường Development, OpenAPI JSON
có tại `http://localhost:5000/openapi/v1.json`.

Các secret cho email, Google OAuth hoặc môi trường triển khai phải được cấu
hình bằng .NET user-secrets hoặc biến môi trường. Không ghi secret vào file
được theo dõi bởi Git.

## 5. Cách sử dụng dự án

### 5.1. REST API

- Dùng OpenAPI JSON tại `/openapi/v1.json` để xem schema và endpoint hiện có.
- Các endpoint nghiệp vụ dùng prefix `/api/v1`, ví dụ `/api/v1/auth`,
  `/api/v1/boards`, `/api/v1/flashcards`, `/api/v1/todos` và
  `/api/v1/settings`.
- Đăng ký hoặc đăng nhập qua nhóm endpoint `/api/v1/auth` để nhận access token.
- Với endpoint được bảo vệ, gửi header `Authorization: Bearer <access-token>`.
- Response body dùng envelope gồm `success`, `data` và `error`; contract đầy
  đủ được mô tả trong phần tiếp theo.

### 5.2. Realtime

Client đã xác thực kết nối tới SignalR hub `/hubs/sync`. Hub thông báo các thay
đổi cần đồng bộ cho flashcard, todo, habit, Kanban và Pomodoro giữa các phiên
trình duyệt.

### 5.3. Background job

Khi API khởi động, Hangfire đăng ký các recurring job phục vụ reminder và cập
nhật định kỳ. Vì vậy PostgreSQL và Redis cần sẵn sàng trước khi chạy API.

## 6. API Response Contract

Các REST endpoint trả về cấu trúc `ApiEnvelope<T>`. Phản hồi thành công đặt dữ
liệu endpoint trong `data`:

```json
{
  "success": true,
  "data": {
    "id": "7f6e2c7d-7bb7-4d10-b450-02a4e727dbb1",
    "title": "Learn English"
  },
  "error": null
}
```

Phản hồi thất bại đặt `data` là `null` và trả về mã lỗi ổn định, thông báo cùng
chi tiết validation khi có:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid values.",
    "details": {
      "title": ["Title is required."]
    }
  }
}
```

Envelope được sử dụng cùng HTTP status code, không thay thế status code. Định
nghĩa nằm tại `FluentA.API/Contracts/ApiEnvelope.cs`; type tương ứng phía
frontend nằm tại `../frontend/src/shared/types/api.ts`.

## 7. Cấu trúc solution

```text
src/backend/
  FluentA.API/                    Controller, middleware, SignalR, Hangfire worker và composition root
  FluentA.Application/            Use case, service và port
  FluentA.Domain/                 Entity, value object và business rule
  FluentA.Infrastructure/         EF Core, PostgreSQL, Redis, MinIO và provider
  FluentA.Application.UnitTests/  Unit test cho application layer
  FluentA.Domain.UnitTests/       Unit test cho domain layer
  FluentA.Worker/                 Chỉ còn launch profile cũ; không có project/host buildable
  FluentA.slnx                    .NET solution
```

## 8. Kiểm tra backend

Từ thư mục root của repository:

```powershell
dotnet test src/backend/FluentA.slnx
```

Để chỉ build solution:

```powershell
dotnet build src/backend/FluentA.slnx
```

Xem [README của root project](../../README.md) để chạy toàn bộ hệ thống và
[Frontend README](../frontend/README.md) để chạy giao diện.
