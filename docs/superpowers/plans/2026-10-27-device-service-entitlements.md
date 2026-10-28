# Gói dịch vụ gắn theo thiết bị — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gắn gói dịch vụ vào từng máy khi đồng bộ kho, hiển thị và theo dõi
sử dụng gói (lượt, giữ chỗ, gửi lõi, ghi nhận tay, hoàn lượt) trên danh sách và
chi tiết thiết bị, kèm điều chỉnh có audit — frontend + MSW.

**Architecture:** Quyền lợi (entitlement) thuộc slice `src/features/devices`
(schemas → api/mapper → queries → components). Cấu hình "tự gắn" nằm trên gói
trong slice `src/features/service-packages`. Server mock giữ toàn bộ quy tắc
nghiệp vụ (trạng thái, số lượt, ràng buộc) trong `src/mocks/stores/`, dùng
chung giữa handler thiết bị, kho và gói. Client không tự suy diễn trạng thái.

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router/Query, Ant Design 6,
Zod 4, MSW 2, react-i18next, dayjs.

**Spec:** `docs/superpowers/specs/2026-10-27-device-service-entitlements-design.md`
(đọc cùng plan; số mục "§" bên dưới trỏ vào spec).


## Phạm vi cập nhật 28/10/2026

Spec §15 là các quyết định đã duyệt. Không thực thi ngay từ lượt chỉnh tài liệu.
Giai đoạn A làm quyền lợi; giai đoạn B là phiếu lắp đặt/trang KTV điện thoại,
chưa thiết kế chi tiết, không tự dựng UI hay tạo route trong giai đoạn A.
Không suy diễn việc phác thảo được hoãn thành hủy yêu cầu phiếu KTV.

Phân quyền tạm hoãn: không thêm capability/ma trận. Task 6 và phần hàng loạt
Task 7 hiện là kế hoạch có điều kiện, chưa sẵn sàng thực thi. Mọi chỗ còn ghi
`service_entitlement.record|adjust|bulk_assign` chỉ là phương án cũ để truy vết,
không phải cho phép thêm quyền. Task 2–5 và tự gắn Task 7 dùng quyền sẵn có;
Task 8 dùng quyền tạo phiếu hiện có, nhưng phải có chống trùng trước khi mở ghi.
Task 9 chỉ xác nhận phần thực thi thật, không đánh dấu xong task đang hoãn.

Chống trùng phải có trước bất kỳ endpoint ghi mới nào, kể cả tạo gói có cấu
hình tự gắn và bật/tắt tự gắn: tách phần cơ chế operationKey của Task 6 lên
Task 2 (store dùng chung ở src/mocks/stores/operationStore.ts, API truyền header).
Task 6 dùng lại, không đợi Task 6 mới bảo vệ Task 3/7/8. Tạo gói và bật/tắt
cũng kiểm quyền trước replay. UI giữ key tới khi thành công hoặc bắt đầu thao
tác khác; không sinh key mới chỉ vì timeout.

Các lựa chọn kỹ thuật của người lập kế hoạch: snapshot deep-copy; preview
trong phiên, mất preview yêu cầu xem lại; dùng giờ nghiệp vụ và ranh giới hạn
như §15.5. Không coi đây là chính sách bổ sung đã được chủ sản phẩm xác nhận.

## Global Constraints

- Node.js 24+, pnpm 10+. Không thêm dependency, không thêm framework/test file
  (AGENTS.md). "Test" của mỗi task = `pnpm typecheck` + `pnpm lint` +
  `pnpm format:check` + kiểm tra trên trình duyệt với MSW (`pnpm dev`, mock
  mode bật sẵn trong `.env.local`).
- Mỗi task kết thúc phải qua: `pnpm lint`, `pnpm typecheck`,
  `pnpm format:check`. Mỗi thay đổi chạy thêm `pnpm build` theo AGENTS.md.
- Không sửa tay `src/routeTree.gen.ts`.
- DTO snake_case, parse Zod tại biên API, map sang domain camelCase; ngày giờ
  ISO có offset (`z.string().datetime({ offset: true })`); ngày thuần
  `YYYY-MM-DD` (`z.string().date()`).
- Trường mới trên response phải chấp nhận thiếu/`null` cho dữ liệu cũ
  (`.nullish()`), mapper đổi về mặc định (`false`, `null`, `[]`).
- Capability qua `hasCapability` / `PermissionGuard`; không rẽ nhánh theo tên
  vai trò. Không có quyền → ẩn hẳn.
- Hằng số giá trị cố định: mảng `as const` `{ value, labelKey }`, kiểu suy ra
  từ mảng, nhãn là key i18n dịch lúc render (xem
  `src/shared/constants/connectionStatus.ts`). Tập chỉ dùng trong một slice ở
  lại slice đó.
- Chuỗi hiển thị qua i18n, có cả `vi` và `en`.
- Mọi thao tác ghi: lý do bắt buộc (trừ ghi nhận gửi lõi — §6.2), ghi audit
  bất biến qua `recordAudit` (module `service_entitlements`), không có UI sửa/xoá
  lịch sử.
- "Sắp hết hạn" = còn ≤ 30 ngày. Thứ tự ưu tiên trạng thái (server):
  `revoked > expired > exhausted > expiring > active > pending`.
- Commit theo skill `commit` của repo: Conventional Commits, không có dòng
  `Co-Authored-By`.

## Review Focus

1. **Bấm nút hai lần / gửi đồng thời** (ghi nhận gửi lõi, ghi nhận tay, tạo
   phiếu có chọn gói khi chỉ còn 1 lượt): lần thứ hai phải bị từ chối
   `entitlement_exhausted`, không bao giờ `used + reserved > quota`. → Task 6
   bước kiểm tra, Task 8 bước kiểm tra.
2. **Hoàn lượt cùng một sự kiện hai lần**, hoặc hoàn sự kiện không trừ lượt
   (`customer_qr_scan`, `reserved`): từ chối `already_reversed` /
   `event_not_reversible`. → Task 6.
3. **Đồng bộ kho nhiều lần**: máy đã có gói không nhận trùng; gói tắt tự gắn,
   ngừng bán hoặc `auto_attach_from` ở tương lai thì không gắn. → Task 7.
4. **Dữ liệu cũ thiếu trường mới** (`entitlements_summary`, `auto_attach`):
   danh sách vẫn hiển thị "—", không lỗi `invalidResponse`. → Task 2, Task 3.
5. **Vai trò không đủ quyền gọi thẳng API ghi** (ví dụ `sales` POST
   `/entitlements/{id}/usages`): mock trả 403, UI không hiện nút. → Task 6,
   Task 7 (sau khi duyệt quyền).

---

## File map

**Tạo mới**

- `src/features/service-packages/utils/entitlementRules.ts` — kiểu quyền lợi,
  số lượt, điều kiện tự gắn (dùng bởi form và mock).
- `src/features/service-packages/components/ServicePackageAutoAttachDialog.tsx`
- `src/features/devices/schemas/entitlementSchemas.ts`
- `src/features/devices/api/entitlementApi.ts`,
  `src/features/devices/api/entitlementMapper.ts`
- `src/features/devices/constants/entitlement.ts`
- `src/features/devices/components/EntitlementTags.tsx` — cột danh sách.
- `src/features/devices/components/DeviceEntitlementsPanel.tsx` — khối chi tiết.
- `src/features/devices/components/EntitlementEventLog.tsx`
- `src/features/devices/components/EntitlementActionDialogs.tsx` — gửi lõi,
  ghi nhận tay, hoàn lượt, thêm gói.
- `src/features/devices/components/InventoryEntitlementBulkDialog.tsx`
- `src/mocks/stores/servicePackageStore.ts`, `src/mocks/stores/inventoryStore.ts`,
  `src/mocks/stores/entitlementStore.ts`
- `src/features/devices/mocks/entitlementHandlers.ts`

**Sửa**

- `src/core/permissions/capabilities.ts`, `permissionCatalog.ts`: chỉ đọc tham chiếu, không sửa trong đợt này
- `src/features/system/constants/auditModules.ts` + `system/locales/{vi,en}.json`
- `src/features/service-packages/{schemas/servicePackageSchemas.ts, api/servicePackageApi.ts, api/servicePackageMapper.ts, components/ServicePackageForm.tsx, components/ServicePackagePreview.tsx, components/ServicePackageTable.tsx, mocks/servicePackageHandlers.ts, locales/*}`
- `src/mocks/fixtures/servicePackages.ts`
- `src/features/devices/{schemas/deviceSchemas.ts, schemas/inventorySchemas.ts, api/deviceMapper.ts, api/inventoryMapper.ts, api/deviceDetailApi.ts, queries/deviceQueries.ts, components/DeviceTable.tsx, components/InventoryTable.tsx, components/InventorySyncButton.tsx, components/DeviceCoreAlertsPanel.tsx, components/DeviceOwnerChangeDialog.tsx, components/DeviceOwnershipPanel.tsx, pages/DeviceDetailPage.tsx, pages/InventoryListPage.tsx, mocks/deviceExtraHandlers.ts, locales/*}`
- `src/mocks/handlers.ts`
- `docs/SERVICE_PACKAGE_CATALOG.md`, spec §11 (bổ sung endpoint phát sinh).

---

### Task 1: Audit và giới hạn phân quyền (không sửa ma trận)

**Files:**
- Modify: `src/features/system/constants/auditModules.ts`,
  `src/features/system/locales/{vi,en}.json`

**Interfaces:** audit module `service_entitlements`; không sinh capability mới.

- [ ] **Step 1:** Thêm module audit và nhãn vi/en theo pattern hiện có.
- [ ] **Step 2:** Giữ nguyên `capabilities.ts`, `permissionCatalog.ts` và
  ma trận vai trò. Không triển khai endpoint/action ghi thuộc Task 6/7 khi
  chưa chốt quyền; không bỏ guard để chạy demo.
- [ ] **Step 3:** Kiểm tra diff không thêm `service_entitlement.*`; chạy bộ
  kiểm tra bắt buộc. Commit `feat(audit): add service entitlement module`.

---

### Task 2: Tách store mock dùng chung + khung quyền lợi phía mock

Không đổi hành vi hiện có; tạo nền cho các task sau.

**Files:**
- Create: `src/mocks/stores/servicePackageStore.ts`,
  `src/mocks/stores/inventoryStore.ts`, `src/mocks/stores/entitlementStore.ts`
- Create: `src/features/service-packages/utils/entitlementRules.ts`
- Modify: `src/features/service-packages/mocks/servicePackageHandlers.ts`,
  `src/features/devices/mocks/deviceExtraHandlers.ts`

**Interfaces:**
- Produces (`entitlementRules.ts`):
  ```ts
  export type EntitlementKind = 'one_time' | 'counted' | 'time_only';
  export function getEntitlementKind(type: ServiceTypeCode): EntitlementKind | null; // null cho TG-ALL, TG-SUB
  export function computeEntitlementQuota(
    configuration: ServicePackageConfiguration,
    termMonths: number | null,
    quotaMode: 'default' | 'custom',
    customQuota: number | null
  ): number | null; // time_only → null
  export type AutoAttachBlocker = 'pricing' | 'incomplete' | 'bundle' | 'term' | 'zeroQuota';
  export function getAutoAttachBlockers(pkg: {
    group: ServicePackageGroup;
    termMonths: number | null;
    quotaMode: 'default' | 'custom';
    customQuota: number | null;
    details: Pick<ServicePackageDetails, 'pricingMode' | 'configuration'> | null;
  }): AutoAttachBlocker[];
  ```
- Produces (stores): `export const packageStore: ServicePackageDto[]`;
  `export const inventoryStore: InventoryDeviceDto[]` (mảng `const`, thêm máy
  bằng `push`, không gán lại); `entitlementStore.ts` export
  `entitlementRecords`, `entitlementEvents`, `serviceTickets` (mảng rỗng ở task
  này), kiểu `EntitlementRecord`, `ServiceTicketRecord`.

- [ ] **Step 1:** Viết `entitlementRules.ts` theo bảng §5.1:
  - `custom`: one_time/counted dùng customQuota nguyên dương; time_only
    cấm custom. Dữ liệu cũ mặc định default/null.
  - `default`, `one_time`: LD-STD, LD-PRO, TH-OLD → quota 1.
  - `counted`: BT-FIL, CS-WQ → `Math.floor(termMonths / interval)` (term
    `null` → 0); BT-CLN → `visits`; BT-COR → 1.
  - `time_only`: BH-EXT, BH-ADP, BH-CMP, CS-VIP, CS-APP → `null`.
  - Blockers theo thứ tự: `pricing` (khác `free_or_included`), `incomplete`
    (`details === null`), `bundle`, `term` (term `null` và kind khác
    `one_time`), `zeroQuota` (counted và quota cuối cùng 0, đã tính override).
- [ ] **Step 2:** Chuyển `packageStore` sang `servicePackageStore.ts`,
  `inventoryStore` + `nextSyncedNumber` sang `inventoryStore.ts` (export hàm
  `receiveNewUnits(): InventoryDeviceDto[]` cùng file); handler cũ import lại.
- [ ] **Step 3:** Tạo `entitlementStore.ts` với kiểu:
  ```ts
  interface EntitlementRecord {
    id: string; device_id: string; model_code: string;
    package_snapshot: EntitlementPackageSnapshotDto; // Task 3
    kind: EntitlementKind; quota: number | null; used: number;
    activated_at: string | null; // ngày kích hoạt máy; null khi còn trong kho
    starts_override_at: string | null; // "Thêm gói" §7.2: tính từ ngày thêm
    revoked: boolean;
    source: { kind: 'auto_attach' | 'bulk_assign' | 'manual_add'; reference: string; at: string };
  }
  interface ServiceTicketRecord {
    ticket_id: string; ticket_code: string; device_id: string;
    entitlement_id: string | null;
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
    scheduled_at: string | null;
  }
  ```
  (Schema snapshot được định nghĩa ở Task 4; ở task này khai báo tạm kiểu
  snapshot trong store rồi đổi sang import từ `entitlementSchemas.ts` ở Task 4.)
- [ ] **Step 4:** Run `pnpm typecheck && pnpm lint && pnpm format:check`.
  Trình duyệt: `/service-packages` (lọc, tạo nháp, phát hành) và tab Trong kho
  (bấm Đồng bộ thêm máy) chạy như trước.
- [ ] **Step 5: Commit** — `refactor(mocks): share package and inventory stores`

---

### Task 3: Tự gắn khi nhập kho trên gói

**Files:**
- Modify: `servicePackageSchemas.ts`, `servicePackageMapper.ts`,
  `servicePackageApi.ts`, `ServicePackageForm.tsx`, `ServicePackagePreview.tsx`,
  `ServicePackageTable.tsx`, `servicePackageHandlers.ts`,
  `service-packages/locales/{vi,en}.json`, `src/mocks/fixtures/servicePackages.ts`
- Create: `ServicePackageAutoAttachDialog.tsx`

**Interfaces:**
- Consumes: `getAutoAttachBlockers`, `computeEntitlementQuota` (Task 2).
- Produces:
  - DTO/domain/request thêm `quota_mode`/`quotaMode` (`default|custom`),
    `custom_quota`/`customQuota` (số nguyên dương hoặc null); response cũ
    `.nullish()` → default/null; request validate chéo theo spec §5.1.
  - DTO: `auto_attach: z.boolean().nullish()`,
    `auto_attach_from: z.string().date().nullish()`.
  - Domain `ServicePackage`: `autoAttach: boolean; autoAttachFrom: string | null`.
  - `ServicePackageDraftInput`: thêm `autoAttach`, `autoAttachFrom`; draft wire
    schema thêm `auto_attach: z.boolean()`, `auto_attach_from: z.string().date().nullable()`.
  - `setServicePackageAutoAttach(pkg: ServicePackage, input: { enabled: boolean; from: string | null; reason: string }): Promise<ServicePackage>`
    → `POST /service-packages/{id}/auto-attach` body
    `{ enabled, from, reason, changes: [{ field: 'auto_attach', before_value, after_value }, …] }`.

- [ ] **Step 1:** Schema + mapper (thiếu → `false` / `null`). Thêm vào
  `superRefine` của draft:
  - `auto_attach` true ⇒ `auto_attach_from` bắt buộc và
    `getAutoAttachBlockers(...)` rỗng (issue `autoAttach`).
  - `auto_attach` false ⇒ `auto_attach_from === null`.
  - Form chọn mặc định/tùy chỉnh cho one_time/counted, ẩn với time_only;
    đổi về mặc định xóa custom_quota. Preview hiển thị tổng lượt và cách tính.
    Bật tự gắn kiểm tra quota cuối cùng, không chỉ công thức mặc định.
- [ ] **Step 2:** Form tạo gói: mục "Tự động gắn khi nhập kho" (checkbox +
  DatePicker, mặc định hôm nay). Chỉ bật được khi không có blocker; khi có, hiện
  checkbox disabled kèm lý do i18n theo blocker đầu tiên. Với kiểu `counted`,
  hiện "Mỗi máy nhận N lượt" từ `computeEntitlementQuota` với chế độ/giá trị tùy chỉnh. Bản xem lại hiện dòng
  "Tự gắn từ dd/mm/yyyy" hoặc "Không tự gắn".
- [ ] **Step 3:** Bảng gói: nhãn "Tự gắn từ dd/mm/yyyy" dưới tên gói khi
  `autoAttach`; hành động dòng "Bật tự gắn"/"Tắt tự gắn" trong
  `PermissionGuard capability="service_package.write"`, ẩn với gói `archived`.
  Dialog mới: bật cần ngày (≥ hôm nay) + lý do; tắt cần lý do. Thành công →
  invalidate `servicePackageQueries.all`.
- [ ] **Step 4:** Mock: create handler lưu 2 trường; handler mới
  `/auto-attach`: 403 nếu thiếu `service_package.write`; 404; `archived` →
  `invalidTransition` 409; bật với blocker → `autoAttachBlocked` 400; `from` <
  hôm nay → `autoAttachFromPast` 400; không đổi gì → `noChange` 400; ghi
  `packageAuditStore` và `recordAudit` (module `service_entitlements`, action
  `auto_attach_enabled`/`auto_attach_disabled`). Thêm key lỗi i18n.
- [ ] **Step 5:** Fixture: bật tự gắn (từ `2026-01-01`) cho ít nhất 3 gói
  `active` `free_or_included`: một BT-FIL giao `self` (model KGR-A100), một
  BT-CLN giao kỹ thuật viên hoặc BT-FIL giao `technician` (KGR-A100/B200), một
  BH-EXT (tất cả model). Sửa fixture tương ứng nếu chưa có gói phù hợp.
- [ ] **Step 6:** Run checks. Trình duyệt (vai trò sales):
  - Tạo gói `fixed` → checkbox disabled, hiện lý do "chỉ gói miễn phí/gộp giá".
  - Tạo gói BT-FIL miễn phí 12 tháng chu kỳ 6 → "Mỗi máy nhận 2 lượt", lưu nháp
    được, xem lại hiện ngày.
  - Bật/tắt trên danh sách → nhãn đổi; chọn ngày hôm qua bị từ chối.
  - Vai trò service_center: không thấy hành động bật/tắt.
  - BT-FIL 12 tháng/6 tháng: mặc định 2 lượt, tùy chỉnh 3 lượt → preview 3;
    số 0, số lẻ, time_only custom bị từ chối; đổi gói không đổi snapshot máy.
- [ ] **Step 7: Commit** — `feat(service-packages): add auto-attach on stock intake`

---

### Task 4: Mô hình quyền lợi phía client + đọc từ mock

**Files:**
- Create: `devices/schemas/entitlementSchemas.ts`,
  `devices/api/entitlementMapper.ts`, `devices/api/entitlementApi.ts`,
  `devices/constants/entitlement.ts`, `devices/mocks/entitlementHandlers.ts`
- Modify: `entitlementStore.ts`, `deviceSchemas.ts`, `inventorySchemas.ts`,
  `deviceMapper.ts`, `inventoryMapper.ts`, `deviceQueries.ts`,
  `src/mocks/handlers.ts`, `deviceExtraHandlers.ts`, `devices/locales/*`

**Interfaces:**
- Produces (schemas, theo §11 spec):
  - `entitlementStatusSchema = z.enum(['pending','active','expiring','exhausted','expired','revoked'])`
  - `entitlementPackageSnapshotDtoSchema` — `package_id, code, name, group (string), service_type_code (string), delivery ('self'|'technician'|'shipment'|null), term_months, interval_months,
    purpose, included_items, excluded_items, eligibility_description,
    model_scope, eligible_model_ids, pricing_mode, pricing_description,
    additional_cost_description, configuration, quota_mode, custom_quota, quota`
    — parse theo schema gói, deep-copy configuration/mảng khi cấp, không giữ
    tham chiếu sống tới packageStore
  - `entitlementDtoSchema`, `entitlementEventDtoSchema` (đủ trường §11),
    `entitlementEventPageDtoSchema` (`items, page, page_size, total`).
  - `entitlementSummaryDtoSchema` — §11 + `term_months: number|null` và
    `source_reference: string` (cho tooltip tab kho, §8.2).
  - Domain: `Entitlement`, `EntitlementEvent`, `EntitlementSummary`,
    `EntitlementStatus`, `EntitlementEventType` (camelCase của DTO).
- Produces (api):
  ```ts
  getDeviceEntitlements(deviceId: string, signal?: AbortSignal): Promise<Entitlement[]>
  getEntitlementEvents(entitlementId: string, page: number, signal?: AbortSignal): Promise<PageResponse<EntitlementEvent>>
  ```
- Produces (queries, dưới `deviceQueries.all`):
  `deviceQueries.entitlements(deviceId)` key `[...all,'entitlements',deviceId]`;
  `deviceQueries.entitlementEvents(entitlementId, page)` key
  `[...all,'entitlement-events',entitlementId,page]`.
- Produces (constants): `ENTITLEMENT_STATUSES` `{ value, labelKey, tone }`
  (`tone`: `PortalTone` — active `primary`, expiring/exhausted `warning`,
  expired/revoked `danger`, pending `info`), `ENTITLEMENT_EVENT_TYPES`
  `{ value, labelKey }`. Nhãn trong namespace `devices` (`entitlements.*`).
- Produces (device/inventory domain): `Device.entitlementsSummary: EntitlementSummary[]`,
  `InventoryDevice.entitlementsSummary: EntitlementSummary[]`; DTO trường
  `entitlements_summary` `.nullish()` → `[]`.
- Produces (mock store):
  ```ts
  toEntitlementDto(record: EntitlementRecord, now: Date): EntitlementDto
  entitlementSummaries(deviceId: string, now: Date): EntitlementSummaryDto[] // bỏ revoked, expired
  attachPackage(target: { deviceId: string; modelCode: string; activatedAt: string | null },
                pkg: ServicePackageDto, source: EntitlementRecord['source'],
                options?: { allowDuplicate?: boolean; startsAt?: string }): EntitlementRecord | null
  ```

- [ ] **Step 1:** Schemas, mapper, constants, api, queries như trên.
- [ ] **Step 2:** `toEntitlementDto` trong store:
  - `starts_at` = `starts_override_at ?? activated_at`;
    `ends_at` = `starts_at + term_months` tháng (dayjs), `null` khi không có
    `starts_at` hoặc `term_months`.
  - `status` theo thứ tự ưu tiên trong Global Constraints; `expiring` khi
    `ends_at − now ≤ 30 ngày`; `exhausted` khi `quota !== null && used >= quota`.
  - Ngoại lệ lắp đặt trước kích hoạt: pending hiển thị “Chưa sử dụng”;
    đã dùng hết thì exhausted dù chưa activated_at. API lắp đặt giai đoạn B
    mới được phép giữ/dùng trước kích hoạt, không mở usage thủ công.
  - `reserved` = số phiếu `pending|assigned|in_progress` trỏ tới quyền lợi;
    `open_reservations` lấy từ đó.
  - `next_due_at` = `starts_at + (used + 1) × interval_months` cho `counted` có
    interval và chưa `exhausted`; nếu mốc sau ends_at thì null; ngược lại
    `null`. Chu kỳ không đổi theo custom quota.
  - `attachPackage`: snapshot từ DTO gói; model của máy phải thuộc phạm vi gói
    (map `model_code` → `model_id` qua `modelFixtures`); không trùng gói trên
    cùng máy (`revoked` không tính) trừ khi `allowDuplicate`; thêm event
    `attached`.
- [ ] **Step 3:** Seed trong store (gọi `attachPackage` lúc load, dữ liệu xác
  định, không random) đủ các kịch bản §12: đang hiệu lực, sắp hết hạn, hết
  lượt, hết hạn; ≥1 phiếu `assigned` giữ chỗ; lịch sử có `shipment`,
  `manual`, `reversal`, `customer_qr_scan` (`counts_against_quota: false`); máy
  không IoT có quyền lợi; vài máy trong kho có quyền lợi `pending`; ít nhất một
  máy đang có cảnh báo lõi (xem `GET /devices/:id/core-alerts`) có quyền lợi
  BT-FIL/BT-COR giao `technician` còn lượt.
- [ ] **Step 4:** Handler (`entitlementHandlers.ts`, đăng ký trước handler
  `/api/devices/:deviceId` giống `deviceExtraHandlers`):
  `GET /api/devices/:deviceId/entitlements`, `GET /api/entitlements/:id/events`
  (`page`, `page_size`, mới nhất trước) — cần `device.read`. Gắn
  `entitlements_summary` vào item của `GET /api/devices`,
  `GET /api/devices/:deviceId` và `GET /api/devices/inventory`.
- [ ] **Step 5:** Run checks. Trình duyệt: tab Network thấy
  `entitlements_summary` trong `/api/devices`; danh sách vẫn hiển thị bình
  thường (chưa có cột). Xoá tạm `entitlements_summary` khỏi một item trong
  handler → không có lỗi `invalidResponse`; hoàn tác.
- [ ] **Step 6: Commit** — `feat(devices): add service entitlement read model`

---

### Task 5: Hiển thị — cột danh sách (phương án A) và khối chi tiết

**Files:**
- Create: `EntitlementTags.tsx`, `DeviceEntitlementsPanel.tsx`,
  `EntitlementEventLog.tsx`
- Modify: `DeviceTable.tsx`, `InventoryTable.tsx`, `DeviceDetailPage.tsx`,
  `DeviceOwnerChangeDialog.tsx`, `DeviceOwnershipPanel.tsx`, `devices/locales/*`

**Interfaces:**
- Consumes: Task 4.
- Produces:
  ```ts
  EntitlementTags(props: { items: EntitlementSummary[]; variant: 'in_use' | 'inventory' })
  DeviceEntitlementsPanel(props: { device: Device })
  EntitlementEventLog(props: { entitlementId: string })
  ```
  `DeviceEntitlementsPanel` có chỗ render nút hành động (Task 6 điền vào).

- [ ] **Step 1:** `EntitlementTags` (§8.1): tối đa 2 thẻ + "+N" (tooltip liệt
  kê phần còn lại); không có → "—"; nội dung theo trạng thái: `exhausted` "Hết
  lượt", `expiring` "Sắp hết hạn: còn N ngày", `active` + `quota` → "x/y lượt",
  còn lại chỉ tên. `variant='inventory'`: thẻ xám "Chưa bắt đầu"; riêng lắp đặt pending
  hiện "Chưa sử dụng", exhausted hiện "Hết lượt"; không ghi đè status server. Tooltip
  "<tên> · <thời hạn N tháng, tính từ ngày kích hoạt> · nguồn <source_reference>".
- [ ] **Step 2:** Cột "Gói dịch vụ" sau cột Lõi lọc trong `DeviceTable` và sau
  cột Trạng thái kích hoạt trong `InventoryTable`.
- [ ] **Step 3:** `DeviceEntitlementsPanel` (§8.2) đặt sau
  `DeviceFilterCoresPanel` trong `DeviceDetailPage`, cho cả IoT và không IoT:
  mỗi quyền lợi hiện tên, mã, nhóm (`t('groups.'+group, { ns: 'servicePackages' })`),
  kiểu giao, thẻ trạng thái, khoảng hiệu lực, còn lại; kiểu `counted`:
  `PortalProgress`, "đã dùng x/y", "đang giữ chỗ n — phiếu <code>
  (<trạng thái>, <ngày hẹn>)", lượt kế tiếp; nhóm `warranty`: dòng §6.4 "Bảo
  hành bổ sung theo gói — độc lập với bảo hành điện tử (hết hạn dd/mm/yyyy)" từ
  `device.warrantyExpiresAt` (không có → bỏ phần ngoặc); dòng nguồn. Lịch sử
  (`EntitlementEventLog`) gập/mở, phân trang 10; `customer_qr_scan` có nhãn
  "không trừ lượt". Không có quyền lợi → trạng thái rỗng.
- [ ] **Step 4:** Hộp thoại đổi chủ và xoá chủ (§5.4): khi
  `device.entitlementsSummary` có N mục trạng thái `active|expiring|exhausted`
  (N > 0), hiện `Alert` info "N gói dịch vụ còn hiệu lực sẽ chuyển theo máy".
- [ ] **Step 5:** Run checks. Trình duyệt:
  - Danh sách tab Đang sử dụng: thấy thẻ đủ các dạng, "+N" khi > 2.
  - Tab Trong kho: thẻ xám, tooltip đúng.
  - Chi tiết máy có giữ chỗ: hiện phiếu; máy có BH-EXT: dòng độc lập bảo hành.
  - Đổi ngôn ngữ EN: không còn chuỗi tiếng Việt cứng.
  - Đổi chủ: thấy dòng "N gói…"; kiểm tra payload/nội dung thông báo chủ
    cũ có ý quyền lợi chuyển theo máy theo §5.4. Nếu backend chưa có trường
    tương ứng, ghi rõ giới hạn tích hợp, không giả vờ đã gửi thông báo thật.
- [ ] **Step 6: Commit** — `feat(devices): show service entitlements on list and detail`

---

### Task 6: Ghi nhận, hoàn lượt, thêm/thu hồi gói — TẠM HOÃN tới khi duyệt quyền

**Files:**
- Create: `EntitlementActionDialogs.tsx`
- Modify: `entitlementApi.ts`, `deviceQueries.ts`, `DeviceEntitlementsPanel.tsx`,
  `entitlementHandlers.ts`, `entitlementStore.ts`, `devices/constants/entitlement.ts`,
  `devices/locales/*`

**Interfaces:**
- Produces (api, tất cả trả `Entitlement` sau cập nhật):
  ```ts
  recordEntitlementShipment(entitlementId: string, input: { trackingCode: string | null; coreQrCode: string | null; note: string | null }): Promise<Entitlement>
  recordEntitlementUsage(entitlementId: string, input: { reasonCode: UsageReasonCode; note: string }): Promise<Entitlement>
  revokeDeviceEntitlement(entitlementId: string, input: { reason: string }, operationKey: string): Promise<Entitlement> // POST /entitlements/{id}/revoke
  reverseEntitlementEvent(entitlementId: string, input: { eventId: string; reason: string }): Promise<Entitlement>
  addDeviceEntitlement(deviceId: string, input: { packageId: string; reason: string }): Promise<Entitlement>
  getEntitlementPackageOptions(target: { deviceId: string } | 'inventory', signal?: AbortSignal): Promise<EntitlementPackageOption[]>
  // EntitlementPackageOption = { id: string; code: string; name: string; serviceTypeCode: string }
  ```
  Endpoint: `POST /entitlements/{id}/shipments|usages|reversals`,
  `POST /devices/{id}/entitlements`,
  `GET /devices/{id}/entitlements/package-options`,
  `GET /devices/inventory/entitlements/package-options`.
- Produces (constants): `USAGE_REASONS` = `call_center`, `service_center`,
  `other` (`{ value, labelKey }`), type `UsageReasonCode`.
- Produces (query): `deviceQueries.entitlementPackageOptions(target)`.

- [ ] **Step 1:** Mock (`entitlementStore` + handlers), mỗi lệnh ghi:
  - Shipment: cần `service_entitlement.record`; chỉ BT-FIL `delivery=self` hoặc
    BT-COR `delivery=shipment` (`entitlement_not_eligible`); ít nhất một trong
    `tracking_code`/`core_qr_code` (`invalidInput`); `core_qr_code` phải tồn tại
    trong serial store (`core_qr_not_found`) — export tra cứu từ `handlers.ts`
    hoặc kiểm qua `serialFixtures`; `used += 1`, event `shipment`.
  - Usage: cần `record`; `reason_code` + `note` bắt buộc; `counted`/`one_time`
    thì `used += 1`; `time_only` chỉ ghi event (`counts_against_quota: false`).
  - Chung cho hai lệnh trên: trạng thái phải `active|expiring`
    (`entitlement_not_active`); chỉ khi quota !== null mới kiểm
    `used + reserved < quota` (`entitlement_exhausted`). Time_only chỉ ghi
    sự kiện không trừ lượt.
  - Các lệnh ghi nhận/thêm/thu hồi/hoàn: API nhận operationKey riêng
    (tham số cuối, kể cả các chữ ký minh họa bên trên), truyền Idempotency-Key.
    UI tạo khóa một lần cho thao tác, giữ lại khi retry; mock lưu fingerprint
    actor+route+key và kết quả, kiểm quyền trước replay; payload khác cùng
    khóa → idempotency_conflict. Tất cả cập nhật/event/audit nguyên tử.
  - Usage thủ công không áp dụng LD-STD/LD-PRO/TH-OLD; phải có phiếu KTV.
  - Reversal: cần `service_entitlement.adjust`; event phải thuộc quyền lợi, loại
    `consumed|shipment|manual` (`event_not_reversible`), chưa bị hoàn
    (`already_reversed`), counts_against_quota=true và used>0; `used -= 1`, event `reversal` có
    `reference.reversed_event_id`.
  - Revoke: quyền điều chỉnh chưa duyệt; chặn tới khi chốt. Khi mở:
    máy đã kích hoạt, chưa từng dùng dịch vụ, không reserved; bắt buộc lý do,
    không yêu cầu gói nguồn active; ghi revoked, event và audit.
  - Add: cần `adjust`; máy phải đã kích hoạt; gói theo điều kiện §7.1 (`active`,
    không blocker); `attachPackage(..., { allowDuplicate: true, startsAt: now })`,
    source `manual_add`.
  - Bộ chọn revoke hàng loạt lấy gói từ quyền lợi tồn tại trong kho,
    bao gồm archived; mở rộng getEntitlementPackageOptions target inventory
    thêm action attach|revoke vào API/query key; không dùng picker attach.
  - Package options: device → cùng điều kiện, lọc theo model máy; inventory →
    gói đủ điều kiện (mọi model). Đăng ký route
    `/api/devices/inventory/entitlements/package-options` **trước**
    `/api/devices/:deviceId/entitlements/package-options`, nếu không
    `:deviceId` sẽ khớp chữ `inventory`.
  - Mọi lệnh ghi gọi `recordAudit` module `service_entitlements` với before/after
    (`used`, `status`), lý do; thêm key lỗi i18n `devices:errors.*`.
- [ ] **Step 2:** API + query như Interfaces.
- [ ] **Step 3:** Dialogs và nút trong `DeviceEntitlementsPanel` (§8.2):
  - "Ghi nhận gửi lõi" (chỉ BT-FIL self / BT-COR shipment) và "Ghi nhận sử dụng":
    `PermissionGuard` `service_entitlement.record`; disabled khi không còn lượt
    hoặc không ở trạng thái dùng được (tooltip lý do).
  - "Hoàn lượt": trên từng dòng event `consumed|shipment|manual` chưa hoàn,
    `PermissionGuard` `service_entitlement.adjust`.
  - "Thêm gói" ở đầu khối: chỉ khi `device.activatedAt`, `adjust`.
  - Thành công → invalidate `deviceQueries.entitlements(id)`, events, và
    `[...deviceQueries.all, 'list']`.
- [ ] **Step 4:** Run checks. Trình duyệt:
  - service_center: gửi lõi có vận đơn → lượt tăng, event mới đầu lịch sử.
  - Gửi lõi khi thiếu cả vận đơn và QR → lỗi form; QR không tồn tại → thông báo
    `core_qr_not_found`.
  - Quyền lợi còn 1 lượt: bấm ghi nhận 2 lần nhanh → lần 2 báo hết lượt, số
    lượt không vượt quota (Review Focus 1).
  - Hoàn lượt cùng event 2 lần → `already_reversed` (Review Focus 2).
  - Thêm gói trùng gói đang có → tạo quyền lợi riêng, thời hạn từ hôm nay.
  - Vai trò sales: không thấy nút; gọi thẳng `fetch('/api/entitlements/<id>/usages', {method:'POST', …})`
    trong console → 403 (Review Focus 5).
  - `/system` audit log lọc module "Gói dịch vụ thiết bị": thấy các thao tác.
- [ ] **Step 5: Commit** — `feat(devices): record and adjust service entitlement usage`

---

### Task 7: Đồng bộ kho tự gắn + gắn/gỡ hàng loạt (phần hàng loạt TẠM HOÃN tới khi duyệt quyền)

**Files:**
- Create: `InventoryEntitlementBulkDialog.tsx`
- Modify: `deviceExtraHandlers.ts`, `entitlementStore.ts`,
  `entitlementHandlers.ts`, `inventorySchemas.ts`, `inventoryMapper.ts`,
  `inventoryApi.ts`, `InventorySyncButton.tsx`, `InventoryTable.tsx`,
  `InventoryListPage.tsx`, `devices/locales/*`

**Interfaces:**
- Consumes: `getEntitlementPackageOptions('inventory')` (Task 6),
  `attachPackage` (Task 4).
- Produces:
  - `InventorySyncResult.entitlementsAttached: number` (DTO
    `entitlements_attached`, `.nullish()` → 0).
  - ```ts
    bulkAssignInventoryEntitlements(input: {
      action: 'attach' | 'revoke'; packageId: string;
      target: { deviceIds: string[] } | { filters: { modelCode?: string; batchCode?: string; receivedFrom?: string; receivedTo?: string } };
      reason: string; dryRun: true;
    }): Promise<{ affected: number; skipped: { reason: 'already_attached' | 'not_attached' | 'model_out_of_scope' | 'activated'; count: number }[] }>
    ```
    → `POST /devices/inventory/entitlements/bulk` (xem trước).
  - Preview response thêm `previewId: string`; xác nhận là hàm riêng
    `confirmInventoryEntitlements(input: { previewId: string; reason: string }, operationKey: string)`
    trả affected/skipped cùng kiểu; DTO snake_case tại API.
  - Mock lưu preview theo actor, tập ID cố định, action/packageId; preview
    chỉ hợp lệ trong phiên. Không tồn tại → preview_not_found; khác actor
    → forbidden. Xác nhận không nhận bộ lọc hoặc ID bổ sung.

- [ ] **Step 1:** Sync mock (§4.2): với mỗi máy mới, gắn mọi gói `active`,
  `auto_attach`, `auto_attach_from <= synced_at` (ngày), model trong phạm vi,
  không trùng; source `auto_attach`, reference `"Đồng bộ kho <synced_at>"`;
  trả `entitlements_attached`. Máy chỉ cập nhật không gắn. Một `recordAudit`
  cho lần đồng bộ (actor hệ thống, số quyền lợi).
- [ ] **Step 2:** Thông báo thành công của Đồng bộ thêm ", gắn N gói dịch vụ"
  khi N > 0.
- [ ] **Step 3:** Bulk mock: cần `service_entitlement.bulk_assign`; lý do bắt
  buộc; lọc máy theo `target`; bỏ qua có phân loại; `dry_run` không ghi gì;
  xác nhận bằng preview_id, chỉ tập ID đã xem trước; kiểm tra lại từng máy
  (kích hoạt, model, quyền lợi) và gói, không thêm máy mới; lý do bỏ qua
  thêm not_found/package_ineligible khi phù hợp. Chống trùng theo Task 6.
  Chạy thật: attach (source `bulk_assign`, reference = id thao tác) hoặc revoke
  (đặt `revoked`, event `revoked`); một `recordAudit` cho thao tác (gói, bộ lọc
  hoặc số máy, số ảnh hưởng/bỏ qua).
- [ ] **Step 4:** UI tab Trong kho (`PermissionGuard` `bulk_assign`): bảng có
  chọn dòng; nút "Gắn/gỡ gói" mở dialog: chọn thao tác, gói (package options),
  phạm vi ("N máy đã chọn" hoặc "Theo điều kiện": model, mã lô, khoảng ngày nhập),
  lý do → "Xem trước" gọi `dryRun: true` hiện số ảnh hưởng/bỏ qua theo lý do →
  "Xác nhận" gọi thật. Thành công → invalidate danh sách kho, bỏ chọn.
- [ ] **Step 5:** Run checks. Trình duyệt (admin):
  - Đồng bộ 2 lần → máy mới KGR-A100 nhận gói tự gắn, thông báo có số gói; máy
    cũ không đổi (Review Focus 3).
  - Tắt tự gắn gói BH-EXT rồi đồng bộ → máy mới không nhận BH-EXT.
  - Bulk attach theo model KGR-B200: xem trước có "đã có gói" bị bỏ qua; xác
    nhận → thẻ xuất hiện. Bulk revoke → thẻ biến mất.
  - Sau preview, thêm máy khớp lọc → không bị tác động; kích hoạt một máy
    đã xem trước → bỏ qua. Gói ngừng bán vẫn gỡ được; gói attach vừa archived
    → không gắn. Reload mất preview → yêu cầu xem lại; retry cùng key không
    tạo thêm audit.
  - Vai trò logistics: có nút Đồng bộ, không có nút Gắn/gỡ gói (sau duyệt quyền).
- [ ] **Step 6: Commit** — `feat(devices): attach service packages on stock sync`

---

### Task 8: Tạo phiếu thay lõi có chọn gói (không phải phiếu lắp đặt KTV)

**Files:**
- Modify: `deviceDetailApi.ts`, `DeviceCoreAlertsPanel.tsx`, `src/mocks/handlers.ts`,
  `entitlementStore.ts`, `devices/locales/*`

**Interfaces:**
- Consumes: `deviceQueries.entitlements(deviceId)` (Task 4).
- Produces: `createServiceTicketFromCoreAlert(deviceId: string, position: string, reason: string, entitlementId: string | null): Promise<void>`
  — body thêm `entitlement_id`, thêm operationKey tham số cuối cho header
  Idempotency-Key; replay không tạo phiếu/giữ lượt thứ hai.

- [ ] **Step 1:** Mock `POST /devices/:id/service-tickets`: nếu có
  `entitlement_id` — phải thuộc máy, BT-FIL/BT-COR, `delivery=technician`
  (`entitlement_not_eligible`), trạng thái `active|expiring`
  (`entitlement_not_active`), `used + reserved < quota`
  (`entitlement_exhausted`); tạo `ServiceTicketRecord` `pending` +
  event `reserved` (actor hệ thống, `reference.ticket_code`). Không có
  `entitlement_id` → hành vi cũ.
- [ ] **Step 2:** Hộp thoại (§6.3): Radio "Dùng gói dịch vụ" liệt kê quyền lợi
  đủ điều kiện (lọc phía client từ `deviceQueries.entitlements` để hiển thị;
  server vẫn kiểm) + "Không dùng gói (khách trả phí)"; một lựa chọn phù hợp thì
  chọn sẵn; không có quyền lợi phù hợp thì ẩn mục. Thành công → invalidate
  `entitlements(id)` cùng các key hiện có.
- [ ] **Step 3:** Run checks. Trình duyệt: máy seed ở Task 4 Step 3 → tạo phiếu
  với gói → khối Gói dịch vụ hiện "đang giữ chỗ 1"; tạo phiếu khi chỉ còn 1
  lượt và đã giữ 1 → server báo hết lượt (Review Focus 1); chọn "Không dùng gói"
  → lượt không đổi. Cùng key gọi lại chỉ một phiếu và một giữ chỗ.
- [ ] **Step 4: Commit** — `feat(devices): reserve entitlement usage from core alert tickets`

---

### Task 9: Tài liệu, đối chiếu phạm vi và kiểm tra toàn bộ

**Files:**
- Modify: `docs/SERVICE_PACKAGE_CATALOG.md`, spec §11.

- [ ] **Step 1:** Spec §11: bổ sung 2 endpoint `package-options`, trường
  `term_months`/`source_reference` trong summary, `entitlements_attached`, và
  danh sách mã lỗi thực tế (`event_not_reversible`, `autoAttachBlocked`,
  `autoAttachFromPast`). `SERVICE_PACKAGE_CATALOG.md`: thêm mục ngắn "Tự gắn khi
  nhập kho" trỏ tới spec, bỏ câu "chưa tạo quyền lợi của khách hàng" khỏi Giới
  hạn vận hành (thay bằng phạm vi mới: chưa có màn phiếu, chưa có app).
- [ ] **Step 2:** Run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`
  → tất cả pass (cảnh báo có sẵn ở `public/mockServiceWorker.js` và chunk lớn
  của Vite không tính).
- [ ] **Step 3:** Nghiệm thu giai đoạn A: tạo gói default/custom → bật tự
  gắn → Đồng bộ kho → thẻ trong kho → đọc snapshot/chi tiết → lịch sử fixture,
  đổi ngôn ngữ, dữ liệu cũ, audit; kiểm tra snapshot bất biến và self-check
  kích hoạt ở phần kiểm chứng bổ sung. Chụp danh sách/chi tiết cho PR.
  Chỉ sau duyệt quyền và mở Task 6/phần hàng loạt Task 7 mới nghiệm thu thêm
  gửi lõi/ghi nhận/hoàn/thu hồi, bulk, vai trò và API 403. Task 8 nghiệm thu
  khi cơ chế chống trùng đã có; phiếu KTV thuộc giai đoạn B, không đánh dấu
  đã kiểm chỉ bằng fixture.
- [ ] **Step 4: Commit** — `docs: document device service entitlements contract`


## Giai đoạn B — Phiếu lắp đặt và trang KTV (chưa lập task triển khai)

Đầu vào đã chốt: KGR tạo phiếu/gán KTV; KTV dùng trang riêng trên điện thoại,
chỉ người được phân công tự hoàn thành khi đủ checklist và ảnh, không cần
app/khách/quản lý duyệt. Giữ một lượt khi tạo phiếu; hoàn thành nguyên tử
chuyển reserved → used, replay không trừ thêm. Cho lắp trước kích hoạt,
không kích hoạt máy hoặc gói khác ngầm. Hủy trả giữ chỗ, sau hạn không mở lại
lượt sử dụng. Không thay phiếu bằng manual usage.

Trước khi viết plan riêng cần duyệt checklist/số ảnh, nhân sự và tài khoản
KTV, quyền truy cập và PII, đổi người được giao, quay lại, tải ảnh thất bại.
Không tự triển khai offline, OTP, chữ ký hoặc xác nhận thay.

## Bổ sung kiểm chứng bắt buộc

- Snapshot: sửa/ngừng bán gói nguồn sau cấp → configuration, bao gồm/không
  bao gồm, quota/mode trên máy không đổi.
- Quota: default, custom nguyên dương, dữ liệu cũ, time_only, quota=0;
  lịch gợi ý sau ends_at → null, không đổi chu kỳ theo override.
- Ngày: cuối tháng, đúng ends_at, còn đúng 30 ngày; hủy giữ chỗ sau hạn
  không khôi phục hiệu lực. Không khẳng định luồng kho → kích hoạt đã được
  kiểm chứng chỉ nhờ fixture: dùng self-check tạm mô phỏng cập nhật activated_at
  và giữ nguyên snapshot; không thêm endpoint kích hoạt giả ra UI.
- Lượt: replay cùng key, payload khác cùng key, hết lượt do reserved,
  hoàn time_only, hoàn sau hạn, thu hồi đã dùng; không used âm/vượt quota.
- Phạm vi: chưa sửa capability/role matrix; task bị hoãn không có endpoint
  ghi không guard. Checklist nghiệm thu KTV chỉ kiểm ở giai đoạn B.
- Mỗi thay đổi chạy pnpm lint, pnpm typecheck, pnpm format:check, pnpm build;
  không thêm framework/test file ngoài phạm vi được duyệt. Self-check logic
  tạm được ghi lại kết quả; kiểm tra trình duyệt MSW theo từng task thực thi.
