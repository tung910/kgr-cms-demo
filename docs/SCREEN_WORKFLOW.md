# Screen Workflow — Quy trình làm một màn hình hoàn chỉnh

Tài liệu này mô tả thứ tự và checklist để làm một màn hình mới (hoặc thay một
màn placeholder `PortalSectionPage`). Nó **không thay thế**
`docs/CODING_CONVENTIONS.md` — khi hai tài liệu mâu thuẫn, `CODING_CONVENTIONS.md`
thắng. Slice tham chiếu chuẩn là `src/features/devices`.

Ví dụ xuyên suốt: màn **Danh sách bảo hành** (feature `warranties`).

**Thứ tự:** Spec → Quyền → Schema → API/Mapper → Query → Mock → i18n →
Component/Page → Route → Menu → Kiểm tra → Commit.
Làm theo thứ tự này để mỗi bước đều typecheck được ngay.

---

## 0. Chuẩn bị (bắt buộc trước khi code)

- [ ] Tìm mục đặc tả của màn trong `docs/CMS_QnA_V1_SPEC.md`; ghi
      lại cột, bộ lọc, quyền theo vai trò, trường PII, hành động cần audit,
      ngưỡng/thời gian (không tự suy đoán con số).
- [ ] Đọc `README.md`, `AGENTS.md`, `docs/CODING_CONVENTIONS.md`.
- [ ] `rg -n "<từ khoá>" src` để tìm thứ đã có (schema, component, mock,
      route placeholder) — mở rộng thay vì viết lại.
- [ ] Quy tắc thiếu mà ảnh hưởng **quyền, PII hoặc API contract** → hỏi lại
      hoặc ghi rõ giả định trong PR. Không tự đặt ra.

## 1. Quyền — `src/core/permissions/capabilities.ts`

- [ ] Thêm capability vào `CAPABILITIES` (vd `warranty.read`, `warranty.write`).
      Chỉ tách capability khi hai vai trò thực sự khác nhau.
- [ ] Cập nhật **cùng lúc**: bảng ma trận trong comment, `ROLE_CAPABILITIES`,
      `PortalMenuKey` + `ROLE_MENU_KEYS` nếu có menu mới.
- [ ] Không bao giờ so sánh tên role. Dùng `hasCapability(role, cap)` hoặc
      `<PermissionGuard capability="...">`.

## 2. Schema & kiểu — `features/<feature>/schemas/<feature>Schemas.ts`

```ts
export const warrantyStatusSchema = z.enum(['active', 'expiring', 'expired']);
export type WarrantyStatus = z.infer<typeof warrantyStatusSchema>;

export const warrantyDtoSchema = z.object({
  id: z.string(),
  serial: z.string(),
  owner_name: z.string().nullable(),
  expires_at: z.string().nullable(),
  status: warrantyStatusSchema,
});
export type WarrantyDto = z.infer<typeof warrantyDtoSchema>;

export interface Warranty {
  id: string;
  serial: string;
  ownerName: string | null;
  expiresAt: string | null;
  status: WarrantyStatus;
}

export interface WarrantyListFilters {
  search: string;
  status?: WarrantyStatus;
  page: number;
  pageSize: number;
}
```

- DTO = `snake_case` đúng wire format; model = `camelCase`.
- Không `any`, không `as` ép kiểu để lách.
- Enum dùng ở **nhiều màn** → `src/shared/constants/<name>.ts` theo mẫu
  `connectionStatus.ts` (`as const` array `{ value, labelKey }`, label là key
  i18n trong namespace `common`). Enum chỉ một feature dùng thì để trong slice.
- Tham chiếu: `features/devices/schemas/deviceSchemas.ts`.

## 3. API & Mapper — `features/<feature>/api/`

- [ ] `<feature>Mapper.ts`: hàm **thuần** DTO → model; thiếu thì giữ
      `null`/`undefined`, không bịa giá trị mặc định.
- [ ] `<feature>Api.ts`:
  - Chỉ dùng `apiClient` (`@/core/api/apiClient`), không import Axios.
  - `schema.safeParse(raw)`; lỗi → ném `ApiError('invalidResponse', ...)`
    (xem `invalidResponse()` trong `devices/api/deviceApi.ts`).
  - Nhận `signal?: AbortSignal` và truyền xuống.
  - Chỉ đưa tham số có giá trị vào query string (xem `getDeviceListPath`).

## 4. Query factory — `features/<feature>/queries/<feature>Queries.ts`

```ts
export const warrantyQueries = {
  all: ['warranties'] as const,
  list: (filters: WarrantyListFilters) =>
    queryOptions({
      queryKey: [...warrantyQueries.all, 'list', filters] as const,
      queryFn: ({ signal }) => getWarranties(filters, signal),
    }),
};
```

- Component chỉ dùng factory, không tự viết `queryKey`.
- Mutation: `useMutation` → khi thành công `invalidateQueries({ queryKey:
warrantyQueries.all })` + `message.success(t(...))`; lỗi → `message.error`.

## 5. Mock MSW

- Fixture dùng chung: `src/mocks/fixtures/<feature>.ts`; dữ liệu chỉ feature
  dùng có thể để ở `features/<feature>/mocks/`.
- Handler: thêm vào `src/mocks/handlers.ts` (vd `http.get('/api/warranties')`),
  tự lọc + phân trang, trả **đúng shape DTO**.
- **Che PII ngay tại handler** bằng `maskPhone` / `maskEmail` /
  `maskInstallAddress` (`src/shared/lib/mask.ts`) theo role — backend sẽ làm
  thay sau này. Component **không** tự mask.
- Có cách giả lập danh sách rỗng và lỗi để test state.
- Dữ liệu nghiệp vụ trong mock (serial, tên, số điện thoại) không dịch.

## 6. i18n

- [ ] Tạo **cả hai** `features/<feature>/locales/en.json` và `vi.json`.
- [ ] Đăng ký namespace trong `src/core/i18n/index.ts` (import, `resources.en`,
      `resources.vi`, mảng `ns`).
- [ ] Key lồng theo trang/khu vực, không lặp tên feature:
      `listPage.title`, `table.columns.serial`, `errors.invalidResponse`.
- [ ] Label menu/breadcrumb nằm trong `common` (`src/core/i18n/locales/`).
- [ ] Kiểm tra sót chuỗi: `rg -P '[à-ỹÀ-Ỹ]' src/features/<feature>`.

## 7. Component & Page — `features/<feature>/{components,pages}/`

```
components/WarrantyFilters.tsx
components/WarrantyTable.tsx
components/WarrantyListSkeleton.tsx
pages/WarrantyListPage.tsx
```

- **Page** nhận `filters` từ route qua props;
  `useSuspenseQuery(warrantyQueries.list(useDeferredValue(filters)))` để khi
  lọc/chuyển trang vẫn giữ danh sách cũ (xem `DeviceListPage.tsx`).
- **Filter/pagination chỉ ghi vào URL**:
  `navigate({ search: (prev) => ({ ...prev, status, page: 1 }) })`.
  Đổi filter luôn reset `page: 1`. Không nhân bản vào `useState`.
- **Tái sử dụng trước khi tạo mới**: `PortalPageHeader`, `PortalCard`,
  `PortalStatCard`, `PortalBadge` (`@/shared/components/portal`), `PageState`,
  `StatusTag`, `ConnectionStatusBadge`, `RouteErrorState`.
- **UI**: Ant Design cho control (Table, Form, Modal); Tailwind cho layout.
  Không override class `.ant-*`. Mỗi form chọn một: Ant Form **hoặc** RHF.
- **Quyền**: thiếu capability → **ẩn** (`PermissionGuard`), không chỉ disable.
- **Trạng thái**: đủ loading (skeleton), rỗng, lỗi.
- **Hành động nhạy cảm / thay đổi trạng thái**: modal xác nhận + bắt buộc nhập
  lý do, gửi lý do lên API để ghi audit (xem `DeviceDeleteDialog.tsx`,
  `DeviceLifecycleActions.tsx`). Lệnh có thể tắt thiết bị phải qua điều kiện
  nghiệp vụ cấu hình được.
- **Export**: dùng cùng dữ liệu đã mask từ API, không mở rộng PII (xem
  `devices/utils/exportDevicesToCsv.ts`).
- Import trong cùng feature dùng đường dẫn tương đối; khác module dùng `@/`.

## 8. Route — `src/routes/_authenticated/<feature>/index.tsx`

Route **mỏng**: validate search, guard, prefetch, render page. Khung chuẩn:
`src/routes/_authenticated/devices/index.tsx`.

- [ ] `validateSearch`: Zod, mỗi field có `.catch(...)` để URL xấu rơi về mặc
      định; `pageSize` giới hạn tập giá trị cho phép.
- [ ] `beforeLoad`: thiếu capability → `throw redirect({ to: '/403' })`.
- [ ] `loaderDeps: ({ search }) => search` + `loader` prefetch query; khi
      `cause === 'stay'` không chặn (giữ UI cũ khi lọc).
- [ ] `pendingComponent` (skeleton), `pendingMs: 200`,
      `errorComponent: RouteErrorState`.
- [ ] Thay placeholder: nếu đang có `routes/_authenticated/<feature>.tsx`
      render `PortalSectionPage` thì **xoá file đó** khi chuyển sang thư mục
      `<feature>/index.tsx`, tránh trùng route.
- Không sửa tay `src/routeTree.gen.ts` — `pnpm dev`/`pnpm build` tự sinh.

## 9. Menu — `src/shared/components/AppShell.tsx`

- [ ] Mục menu + key trong `ROLE_MENU_KEYS` (đã lọc qua `hasMenuAccess`).
- [ ] Map pathname → key, breadcrumb, label `t('nav.<feature>')` trong `common`.

## 10. Kiểm tra

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
pnpm dev   # .env.local có VITE_ENABLE_MOCKS=true
```

Kiểm tra tay với MSW:

- [ ] Đăng nhập từng role: route 403, menu ẩn, nút hành động ẩn đúng ma trận.
- [ ] Loading, rỗng, lỗi.
- [ ] Lọc/phân trang → F5 và copy URL sang tab khác vẫn đúng.
- [ ] Đổi EN/VI không còn chuỗi cứng.
- [ ] PII bị che đúng theo role trên UI **và** file export.
- [ ] Hành động nhạy cảm bắt buộc nhập lý do.

## 11. Commit & PR

- Conventional Commits, nhỏ, scope rõ: `feat(warranties): add warranty list page`.
- PR: mã `POR-xxx`, tác động tới người dùng, lệnh đã chạy, ảnh chụp UI, các
  giả định còn mở.
- Nếu màn thay đổi hành vi so với spec, cập nhật spec/doc liên quan
  (xem commit `docs: sync M03.1 device spec ...`).
