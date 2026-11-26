# FluentA Frontend

## 1. Tên dự án

**FluentA Frontend**

## 2. Mô tả dự án

FluentA Frontend là ứng dụng SPA cung cấp giao diện học ngoại ngữ và quản lý
năng suất của FluentA. Ứng dụng được xây dựng bằng React 19, TypeScript và Vite;
React Router quản lý điều hướng, TanStack Query quản lý server state, Zustand
quản lý client state. Mutation refresh query ở trang hiện tại; không dùng SignalR.

## 3. Mục lục

- [Tên dự án](#1-tên-dự-án)
- [Mô tả dự án](#2-mô-tả-dự-án)
- [Mục lục](#3-mục-lục)
- [Hướng dẫn cài đặt và chạy dự án](#4-hướng-dẫn-cài-đặt-và-chạy-dự-án)
- [Cách sử dụng dự án](#5-cách-sử-dụng-dự-án)
- [Các lệnh thường dùng](#6-các-lệnh-thường-dùng)
- [Cấu trúc thư mục](#7-cấu-trúc-thư-mục)
- [Quy ước kiến trúc](#8-quy-ước-kiến-trúc)

## 4. Hướng dẫn cài đặt và chạy dự án

Development chạy Vite trực tiếp trên máy lập trình viên và kết nối backend đã cấu hình riêng. Deployment Production đang được cập nhật.

Để chạy đủ Auth, ảnh R2 và Pronunciation cùng API trên localhost, dùng
[hướng dẫn local](../../docs/local-development.md).

### 4.1. Yêu cầu

- Node.js và npm.
- FluentA Backend đang chạy tại `https://localhost:7000`.
- PostgreSQL và bucket R2/S3 đã được cấu hình theo
  [README của root project](../../README.md).

### 4.2. Cài dependency

Từ thư mục `src/frontend`:

```powershell
npm install
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
}
```

File `.env` dùng cho cấu hình local và sử dụng các biến sau:

| Biến | Mục đích |
| --- | --- |
| `API_URL` | Base URL của REST API, mặc định local là `https://localhost:7000/api/v1` |
| `GOOGLE_CLIENT_ID` | Google Identity Services Web Client ID; để chạy đủ chức năng, dùng cùng giá trị `Authentication:Google:ClientId` của API |

Frontend dùng URL ký sẵn do backend trả về và upload trực tiếp lên R2. Cấu hình CORS trên bucket theo [hướng dẫn storage](../../docs/product/asset-storage-r2.md). Credentials chỉ thuộc backend.

Không commit thông tin cấu hình bí mật của môi trường vào Git.

### 4.3. Chạy development server

```powershell
npm run dev
```

Mở `https://localhost:5173`. Vite dùng HTTPS để trình duyệt gửi cookie
`Secure`; chấp nhận development certificate nếu trình duyệt yêu cầu. Vite tự
reload khi source thay đổi.

### 4.4. Build và chạy bản preview

```powershell
npm run build
npm run preview
```

Output production được tạo trong thư mục `dist/`.

## 5. Cách sử dụng dự án

1. Truy cập `/register` để tạo tài khoản hoặc `/login` để đăng nhập.
2. Sau khi đăng nhập, trang `/` hiển thị dashboard tổng quan.
3. Sử dụng các route chính:
   - `/vocabulary`: quản lý vocabulary board, page và từ vựng.
   - `/practice`, `/review`: luyện tập và ôn tập từ vựng.
   - `/todo`, `/habits`, `/countdowns`: quản lý kế hoạch cá nhân.
   - `/project`: quản lý project.
   - `/journal`, `/notes`: lưu nhật ký và ghi chú.
   - `/profile`: xem và cập nhật hồ sơ.
4. Khi phát triển giao diện, đặt code theo feature trong `src/features` và chỉ
   đặt thành phần dùng chung thực sự trong `src/shared`.

Các route được bảo vệ sẽ chuyển người dùng chưa xác thực về `/login`. REST API
được gọi qua base URL trong `API_URL`; REST dùng HttpOnly
cookie, không dùng access token trong JavaScript.

## 6. Các lệnh thường dùng

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy Vite development server |
| `npm run build` | Type-check và tạo production build |
| `npm run check:architecture` | Kiểm tra orphan module, import cycle và frontend boundaries |
| `npm run preview` | Preview production build |
| `npm run lint` | Kiểm tra ESLint |
| `npm run test` | Chạy Vitest ở watch mode |
| `npm run test:run` | Chạy toàn bộ unit test một lần |
| `npm run test:e2e` | Chạy Playwright end-to-end test |
| `npm run test:e2e:cross-browser` | Chạy Playwright trên nhiều browser |
| `npm run test:e2e:performance` | Chạy performance scenario |

## 7. Cấu trúc thư mục

```text
src/frontend/
  src/
    app/              Application shell, provider và router
    features/         Module theo tính năng
    shared/           Component, hook, type và utility dùng chung
    styles/           Design-system entrypoint và global foundation
    test/             Test setup và test dùng chung
  tools/              Kiểm tra kiến trúc chạy từ npm scripts
  e2e/                Playwright scenario
  public/             Static asset
  package.json        Dependency và npm script
  vite.config.ts      Cấu hình Vite/Vitest
```

Xem [README của root project](../../README.md) để chạy toàn bộ hệ thống và
[Backend README](../backend/README.md) để cấu hình API.

## 8. Quy ước kiến trúc

Frontend dùng dependency direction `app -> features -> shared`. Feature khác
chỉ được import qua public `index.ts`; `shared` không được import `app` hoặc
`features`. Không thêm module mới vào root `src/lib`.

Trước khi hoàn tất thay đổi frontend, chạy:

```powershell
npm run check:architecture
npm run lint
npm run test:run
npm run build
```

Code frontend nằm theo feature trong `src/features`; các component và API
dùng chung nằm trong `src/shared`.
