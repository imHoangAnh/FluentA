# FluentA Frontend Architecture

Tài liệu này là bản đồ dành cho người phát triển frontend. Code, route objects,
package scripts và tests là nguồn sự thật khi tài liệu và implementation khác
nhau.

## Dependency Direction

```text
main.tsx -> app -> features -> shared
```

- `app` lắp router, providers, protected runtime và navigation.
- `features/<domain>` sở hữu API adapter, server-state contract, page,
  component, feature model, realtime adapter và route objects của domain đó.
- `shared` chỉ chứa UI, layout, feedback, transport, type và utility không mang
  business ownership.
- `shared` không import `app` hoặc `features`.
- Feature không import `app` trong production source.
- Import feature khác qua `@/features/<name>`, không deep-import file nội bộ.
- Relative import chỉ dùng bên trong cùng feature hoặc cùng shared boundary.

`npm run check:architecture` kiểm tra production reachability, import cycles,
boundary violations, root `src/lib` debt và wildcard feature exports. Script giữ
một baseline debt chính xác; debt mới hoặc baseline đã stale đều làm command
thất bại.

## Application Composition

```text
main.tsx
  -> AppProviders
  -> App
  -> router
  -> ProtectedRoute
  -> ProtectedRuntime
  -> AppShellRouteLayout
  -> feature route
  -> feature page
```

- `app/router.tsx` ghép route objects được export từ feature public APIs.
- `ProtectedRoute` chỉ giải quyết quyền truy cập/session.
- `ProtectedRuntime` giữ các authenticated realtime subscriptions ở một runtime
  boundary bền qua chuyển route.
- `AppShellRouteLayout` đọc static route metadata và render feature content qua
  `Outlet`.
- Dynamic feature actions vẫn thuộc page; app composition không giữ mutation
  state của feature.

## Standard Feature Shape

```text
features/<feature>/
  api/
    <feature>.api.ts
    <feature>.contracts.ts       # thêm khi transport types cần tách
    <feature>.queries.ts         # query keys/options của feature
  components/
  model/
  pages/
  realtime/
  <feature>.routes.tsx
  <feature>.module.css           # chỉ cho complex feature-owned styling
  index.ts
```

Không tạo thư mục rỗng. Feature nhỏ có thể giữ ít file hơn, nhưng mỗi file vẫn
phải có ownership rõ ràng.

### API and server state

- Chỉ feature API adapter gọi `apiClient` cho domain endpoint của nó.
- TanStack Query giữ server state; không sao chép API response sang Zustand.
- Zustand hiện sở hữu authenticated client/session state.
- Query keys và reusable query options thuộc `api/<feature>.queries.ts` khi
  feature được chuẩn hóa.
- Mutation và realtime hooks dùng cùng exported query-key factory.
- `shared/api/dashboard.queries.ts` là integration contract duy nhất cho
  realtime hooks cần refresh Dashboard; domain feature không import ngược
  `features/dashboard`.
- Filter/tab/selected ID có ý nghĩa điều hướng ưu tiên route/search params nếu
  contract hiện tại cho phép.

### Pages and components

- Page đọc route state, gọi query/mutation boundary và ghép UI sections.
- Component không gọi feature API chỉ để tránh truyền props.
- Extract component khi nó có một trách nhiệm gọi tên được, một test seam rõ,
  hoặc JSX đủ lớn để che khuất page composition.
- Không tạo monolithic controller hook chỉ để chuyển toàn bộ page logic sang
  file khác.

### Public API

`index.ts` chỉ export capability mà app hoặc feature khác thật sự dùng:

```ts
export { todoRoutes } from './todo.routes'
export { todoKeys, todoQueries } from './api/todo.queries'
export type { TodoItem } from './api/todo.contracts'
```

Không dùng `export *` cho public feature API mới. Không export pages, dialog và
internal components nếu không có consumer ngoài feature.

## Feature Map

| Feature | Routes | Cross-feature role |
| --- | --- | --- |
| Auth | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Session store and auth routes |
| Dashboard | `/` | Composes public data capabilities from learning/productivity features |
| Settings | `/profile`, `/settings/*` | Composes Auth, Practice and Review settings |
| Notifications | `/notifications` | Notification inbox and shared shell menu |
| Vocabulary | `/vocabulary` | Boards, pages, columns and words |
| Flashcards | `/flashcards`, `/flashcards/pages/:pageId` | Deck/page library, cards and viewer |
| Practice | `/practice`, `/practice/:pageId` | Practice modes, live session and completion |
| Review | `/review` | SRS setup, queue, session and persistence |
| Pronunciation | No route | Recording and assessment capability |
| Todo | `/todo` | Daily/weekly tasks and realtime sync |
| Habits | `/habits` | Habit tracking and realtime sync |
| Project | `/project` | Project boards/cards and realtime sync |
| Countdown | `/countdowns` | Countdown events and cover assets |
| Pomodoro | `/pomodoro` | Timer state, task links and realtime sync |
| Journal | `/journal` | Calendar entries and rich-text content |
| Notes | `/notes` | Note boards/pages and rich-text content |
| Trash | `/trash` | Restore and permanent-delete workflows |

Practice, Flashcards và Review là ba feature riêng. Pronunciation là capability
được Practice và Review sử dụng qua public API.

## Shared Ownership

```text
shared/
  api/          Axios client and neutral transport contracts
  components/
    ui/          repository-owned primitives
    layout/      AppShell and neutral layout
    feedback/    loading/error route feedback
    rich-text/   neutral rich-text editor capability
  lib/           neutral utilities and feedback helpers

features/assets/
  api/            shared presign/direct-upload/finalize asset capability
```

Code chỉ được chuyển vào `shared` khi không mang tên, policy hoặc lifecycle của
một product domain. Hai feature có JSX giống nhau chưa đủ để tạo shared
abstraction nếu behavior và authority vẫn khác nhau.

Asset upload là capability dùng chung nhưng vẫn nằm dưới `features/assets` vì
workflow này có API ownership và asset-type policy. Settings, Countdown và
Notes chỉ truyền explicit `avatar`, `countdown-cover` hoặc `note-image`; không
tự tạo presign, direct PUT hay finalize flow riêng. Rich-text editor nằm trong
`shared/components/rich-text` vì Journal và Notes dùng cùng behavior.

Không thêm code mới vào root `src/lib`; đây là debt được theo dõi bởi
architecture checker cho đến khi các consumer hiện tại chuyển sang owner mới.

## Styling

- `styles/design-system.css` là entrypoint CSS duy nhất từ `main.tsx`.
- Tailwind utilities dùng cho layout và presentation thông thường.
- Shared component sở hữu reusable variants của chính nó.
- Complex feature surfaces như editor, calendar, Kanban hoặc 3D flashcard có
  thể dùng colocated CSS Module.
- Feature selector không được thêm mới vào global stylesheet nếu nó có thể có
  owner cục bộ.
- CSS hiện có được di chuyển cùng feature và responsive/focus proof; không bulk
  rewrite global CSS độc lập với consumer.

## Tests

- Unit/component test mới colocate với source (`Thing.test.tsx`).
- `src/test` giữ setup, render helpers, fixtures, builders và app-wide contract
  tests.
- `e2e` giữ Playwright workflows qua route/API boundaries.
- Test có thể dùng app-level test harness; production feature source không được
  import app composition.

## Adding Code

### Add a feature route

1. Tạo hoặc cập nhật `<feature>.routes.tsx` với lazy page và AppShell metadata.
2. Export route array rõ ràng từ feature `index.ts`.
3. Compose route array trong `app/router.tsx`.
4. Cập nhật route manifest test và relevant Playwright workflow.

### Add an API query

1. Thêm request/response contract trong feature API boundary.
2. Thêm HTTP call vào `<feature>.api.ts`.
3. Thêm key/query option vào `<feature>.queries.ts` nếu feature đã được chuẩn
   hóa.
4. Dùng exported query option ở page/composition consumer.
5. Dùng cùng key factory cho mutation và realtime invalidation.

### Add shared UI

1. Xác nhận component không chứa domain policy hoặc feature import.
2. Đặt accessible primitive trong `shared/components/ui` hoặc neutral layout
   trong `shared/components/layout`.
3. Thêm focused component test.
4. Giữ feature-specific wrapper ở feature nếu behavior chưa thực sự chung.

## Required Checks

Từ `src/frontend`:

```powershell
npm run check:architecture
npm run lint
npm run test:run
npm run build
```

Browser workflow cần local frontend/API runtime phù hợp trước khi chạy
`npm run test:e2e`.
