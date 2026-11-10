# Trung tâm cảnh báo — luồng CSKH: kế hoạch dựng

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay bản demo màn cảnh báo bằng một slice đầy đủ, trong đó CSKH nhận
cảnh báo, ghi kết quả liên hệ khách, tạo phiếu dịch vụ, giao KTV, và cảnh báo
tự đóng khi phiếu đạt TT7.

**Architecture:** Một slice `src/features/alerts` theo đúng mẫu
`src/features/devices`: Zod ở biên API, mapper thuần, query factory, bộ lọc trên
URL. Backend giả lập bằng MSW giữ toàn bộ luật nghiệp vụ (phân quyền, che dữ
liệu cá nhân, máy trạng thái cảnh báo và phiếu, SLA, audit); giao diện chỉ hiển
thị và gọi API. Chi tiết cảnh báo là một ngăn kéo mở theo tham số `alertId`
trên URL của `/alerts`.

**Tech Stack:** React 19, TypeScript strict, TanStack Router/Query, Ant Design
6, Tailwind 4, Zod 4, react-i18next, MSW 2.

**Spec:** `docs/superpowers/specs/2026-11-10-alert-center-cskh-flow-design.md`.
Người thực hiện đọc cả spec lẫn kế hoạch này; số bước `(C1)`–`(C11)` bên dưới là
của spec.

## Global Constraints

- Dự án **chưa có khung test** và `AGENTS.md` cấm thêm khung test hay file test
  khi chưa có kế hoạch riêng. Kế hoạch này vì vậy không có bước viết test tự
  động. Mỗi task kết thúc bằng bốn lệnh `pnpm lint`, `pnpm typecheck`,
  `pnpm format:check`, `pnpm build` và một danh sách kiểm tra tay trên trình
  duyệt với MSW (`pnpm dev`, `VITE_ENABLE_MOCKS=true`).
- `pnpm lint` hiện có sẵn đúng 1 cảnh báo ở `public/mockServiceWorker.js`.
  Không được thêm lỗi hay cảnh báo mới.
- Tuân thủ `docs/CODING_CONVENTIONS.md` và `docs/SCREEN_WORKFLOW.md`: không
  `any`, không ép kiểu `as` để lách, không import Axios trong feature, không tự
  viết `queryKey`, không so sánh tên vai trò, không override class `.ant-*`.
- Slice `alerts` không import từ feature khác, trừ file mock được phép import
  `@/features/system/mocks/systemHandlers` và `@/mocks/fixtures/*` như
  `campaignHandlers.ts` đang làm.
- Không sửa tay `src/routeTree.gen.ts`.
- Mọi chuỗi hiển thị đi qua i18n, thêm đồng thời vào `vi.json` và `en.json`
  của namespace `alerts`. Dữ liệu nghiệp vụ trong mock (tên cảnh báo, tên KTV,
  địa chỉ) giữ nguyên tiếng Việt, không dịch.
- Không thêm capability mới. Dùng `alerts.read`, `alerts.export`,
  `alerts.handle`, `service.read`, `service.write`, `device.pii.full`.
- Thiếu quyền thì ẩn nút, không làm mờ. Che dữ liệu cá nhân ở handler MSW,
  component không tự che.
- Không thêm dependency.
- Commit theo Conventional Commits, scope `alerts`, không có dòng
  Co-Authored-By (quy ước của skill `/commit` trong repo).
- Giá trị nghiệp vụ lấy nguyên từ spec: mốc tự đóng là **TT7**; KTV có **30
  phút** để nhận việc; khung hẹn dài **2 giờ**; SLA lấy từ tham số
  `sla_by_severity` (đơn vị phút, `null` nghĩa là không có SLA).

## Review Focus

Năm tình huống spec ngầm định mà người dùng dễ gặp nhất. Mỗi dòng đã có bước
kiểm tra ở task ghi trong ngoặc.

1. **SLA chưa cấu hình.** Fixture cấu hình hệ thống hiện để cả ba mức là
   `null`. Cột SLA phải hiện "—", bộ lọc "Quá SLA" trả về rỗng, không có `NaN`
   hay đếm ngược âm (Task 3).
2. **Hai người cùng bấm "Nhận xử lý".** Người thứ hai nhận lỗi
   `already_handled`, thấy thông báo ai đang giữ và danh sách tự tải lại
   (Task 4).
3. **Trạng thái đổi trong lúc hộp thoại đang mở** (cảnh báo tự đóng, người
   khác chuyển cảnh báo về mình). Gửi form nhận lỗi `invalid_state` hoặc
   `not_handler`; hộp thoại đóng, có thông báo, dữ liệu tải lại, không ghi đè
   (Task 5, Task 6).
4. **Nhóm quyền tuỳ biến lệch nhau.** Người có `alerts.handle` nhưng thiếu
   `service.write` không thấy lựa chọn "Khách đồng ý"; người thiếu
   `device.pii.full` không thấy khối khách hàng và ghi chú (Task 4, Task 5).
5. **`alertId` trên URL không tồn tại hoặc không được phép xem.** Ngăn kéo hiện
   trạng thái không tìm thấy; đóng ngăn kéo xoá tham số; danh sách vẫn dùng
   được (Task 4).

---

## Cấu trúc file

Tạo mới trong `src/features/alerts/`:

| File                                   | Trách nhiệm                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `constants/alertEnums.ts`              | Mọi tập giá trị cố định và khoá nhãn                                    |
| `schemas/alertSchemas.ts`              | Zod DTO, kiểu model, kiểu bộ lọc và kiểu đầu vào                        |
| `api/alertMapper.ts`                   | Hàm thuần DTO → model                                                   |
| `api/alertApi.ts`                      | Mọi lời gọi API                                                         |
| `queries/alertQueries.ts`              | Query factory                                                           |
| `utils/alertSla.ts`                    | Tính trạng thái SLA và chuỗi thời gian còn lại                          |
| `utils/alertErrors.ts`                 | Đổi mã lỗi backend thành thông báo đã dịch                              |
| `utils/exportAlertsToCsv.ts`           | Xuất CSV danh sách                                                      |
| `utils/useNow.ts`                      | Hook trả về thời điểm hiện tại, cập nhật mỗi giây                       |
| `mocks/alertHandlers.ts`               | Handler MSW và máy trạng thái                                           |
| `components/AlertFilters.tsx`          | Bộ lọc (thay file cũ)                                                   |
| `components/AlertTable.tsx`            | Bảng danh sách                                                          |
| `components/AlertListSkeleton.tsx`     | Khung chờ của route                                                     |
| `components/AlertSlaCell.tsx`          | Ô SLA                                                                   |
| `components/AlertStatusTag.tsx`        | Nhãn trạng thái cảnh báo, mức độ, trạng thái phiếu                      |
| `components/AlertDetailDrawer.tsx`     | Ngăn kéo chi tiết, ghép các khối và các nút                             |
| `components/AlertInfoBlocks.tsx`       | Khối cảnh báo, thiết bị, khách hàng, cảnh báo cùng máy                  |
| `components/AlertTicketBlock.tsx`      | Khối phiếu dịch vụ                                                      |
| `components/AlertHistoryTimeline.tsx`  | Lịch sử thao tác                                                        |
| `components/CloseAlertDialog.tsx`      | Đóng cảnh báo nhóm Kỹ thuật                                             |
| `components/ContactResultDialog.tsx`   | Ghi kết quả liên hệ                                                     |
| `components/TicketWizardModal.tsx`     | Form hai bước tạo phiếu và giao KTV                                     |
| `components/TechnicianPicker.tsx`      | Danh sách KTV gợi ý, dùng cho cả bước 2 và giao lại                     |
| `components/AssignTechnicianModal.tsx` | Giao KTV sau và giao lại KTV                                            |
| `pages/AlertListPage.tsx`              | Trang danh sách                                                         |

Tạo mới ngoài slice: `src/mocks/fixtures/alerts.ts`,
`src/routes/_authenticated/alerts/index.tsx`.

Sửa: `src/mocks/handlers.ts`, `src/shared/components/AppShell.tsx`,
`src/features/alerts/locales/{vi,en}.json`,
`src/features/system/constants/auditModules.ts`,
`src/features/system/locales/{vi,en}.json`, `docs/CMS_QnA_V1_SPEC.md`.

Xoá: `src/routes/_authenticated/alerts.tsx`,
`src/features/alerts/pages/AlertsPage.tsx`,
`src/features/alerts/components/AlertList.tsx`,
`src/features/alerts/mocks/alertMockData.ts`.

---

### Task 1: Hợp đồng dữ liệu

**Files:**

- Create: `src/features/alerts/constants/alertEnums.ts`
- Create: `src/features/alerts/schemas/alertSchemas.ts`
- Create: `src/features/alerts/api/alertMapper.ts`
- Create: `src/features/alerts/api/alertApi.ts`
- Create: `src/features/alerts/queries/alertQueries.ts`
- Create: `src/features/alerts/utils/alertSla.ts`

**Interfaces:**

- Consumes: `apiClient` (`@/core/api/apiClient`), `ApiError`
  (`@/core/api/error`), `PageResponse` (`@/shared/types/pagination`).
- Produces: mọi tên dưới đây; các task sau dùng đúng các tên này.

- [x] **Step 0: Commit spec và kế hoạch**

```bash
git add docs/superpowers/specs/2026-11-10-alert-center-cskh-flow-design.md docs/superpowers/plans/2026-11-10-alert-center-cskh-flow.md
git commit -m "docs(alerts): add alert handling flow spec and plan"
```

- [ ] **Step 1: Viết `alertEnums.ts`**

Theo mẫu `src/features/campaigns/constants/campaignStatus.ts`: mỗi tập là mảng
`as const` gồm `{ value, labelKey }`, khoá nhãn thuộc namespace `alerts`, kèm
kiểu suy ra và mảng `*_VALUES` để đưa vào `z.enum`.

| Hằng                   | Giá trị theo thứ tự                                                                                                                                                                                                                                              | Tiền tố khoá nhãn |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `ALERT_SEVERITIES`     | `critical`, `medium`, `low`                                                                                                                                                                                                                                      | `severity.`       |
| `ALERT_STATUSES`       | `new`, `acknowledged`, `unreachable`, `ticketed`, `declined`, `closed`                                                                                                                                                                                           | `status.`         |
| `ALERT_HANDLER_GROUPS` | `cskh`, `technical`                                                                                                                                                                                                                                              | `group.`          |
| `DECLINE_REASONS`      | `guided_self_fix`, `customer_fixed`, `customer_refused`, `false_alarm`, `other`                                                                                                                                                                                  | `declineReason.`  |
| `SERVICE_TYPES`        | `core_replacement`, `repair`, `cleaning_check`                                                                                                                                                                                                                   | `serviceType.`    |
| `TICKET_STATUSES`      | `tt1`, `tt2`, `tt3`, `tt4`, `tt5`, `tt6`, `tt7`, `tt8`, `tt9`, `cancelled`                                                                                                                                                                                       | `ticketStatus.`   |
| `ASSIGNMENT_STATES`    | `unassigned`, `pending`, `accepted`, `declined`, `expired`                                                                                                                                                                                                       | `assignment.`     |
| `CLOSE_RESULT_KINDS`   | `ticket_done`, `device_recovered`, `manual`                                                                                                                                                                                                                      | `closeResult.`    |
| `HISTORY_ACTIONS`      | `acknowledge`, `takeover`, `contact_unreachable`, `contact_declined`, `ticket_created`, `ticket_merged`, `technician_assigned`, `technician_reassigned`, `technician_declined`, `technician_expired`, `ticket_cancelled`, `closed_ticket_done`, `closed_recovered`, `closed_manual` | `history.`        |
| `TECHNICIAN_SPECIALTIES` | `general`, `repair`                                                                                                                                                                                                                                            | `specialty.`      |

Thêm hai hằng không có nhãn:

```ts
export const ALERT_OPEN_STATUSES = [
  'new',
  'acknowledged',
  'unreachable',
  'ticketed',
] as const satisfies readonly AlertStatus[];

export const APPOINTMENT_SLOTS = [
  '08:00-10:00',
  '10:00-12:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
] as const;
```

Thêm `ALERT_SEVERITY_TONES: Record<AlertSeverity, PortalTone>` =
`critical: 'danger'`, `medium: 'warning'`, `low: 'water'`.

- [ ] **Step 2: Viết DTO trong `alertSchemas.ts`**

```ts
const isoDateTime = z.string().datetime({ offset: true });

export const alertSlaDtoSchema = z.object({
  due_at: isoDateTime.nullable(), // null: mức độ này không cấu hình SLA
  warning_at: isoDateTime.nullable(),
  stopped_at: isoDateTime.nullable(),
});

const personDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const alertTicketSummaryDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(TICKET_STATUS_VALUES),
  assignment_state: z.enum(ASSIGNMENT_STATE_VALUES),
});

export const alertDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  error_code: z.string().min(1),
  severity: z.enum(ALERT_SEVERITY_VALUES),
  handler_group: z.enum(ALERT_HANDLER_GROUP_VALUES),
  status: z.enum(ALERT_STATUS_VALUES),
  device_id: z.string().min(1),
  model_name: z.string().min(1),
  region: z.string().min(1),
  raised_at: isoDateTime,
  last_seen_at: isoDateTime,
  occurrence_count: z.number().int().positive(),
  contact_attempts: z.number().int().nonnegative(),
  handler: personDtoSchema.nullable(),
  sla: alertSlaDtoSchema,
  ticket: alertTicketSummaryDtoSchema.nullable(),
});

export const alertPageDtoSchema = z.object({
  items: z.array(alertDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const alertCountsDtoSchema = z.object({
  open: z.number().int().nonnegative(),
  critical_open: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  mine: z.number().int().nonnegative(),
});

export const alertFilterOptionsDtoSchema = z.object({
  regions: z.array(z.string()),
  models: z.array(z.string()),
});

export const alertDetailDtoSchema = alertDtoSchema.extend({
  close_result: z
    .object({
      kind: z.enum(CLOSE_RESULT_KIND_VALUES),
      note: z.string().nullable(),
    })
    .nullable(),
  decline_reason: z.enum(DECLINE_REASON_VALUES).nullable(),
  suggested_service_type: z.enum(SERVICE_TYPE_VALUES),
  device: z.object({
    connection_status: z.enum(['online', 'offline']).nullable(),
    warranty_status: z.enum(['active', 'expiring', 'expired', 'none']),
    cores: z.array(
      z.object({
        position: z.string().min(1),
        core_name: z.string().min(1),
        used_percent: z.number(),
        over_threshold: z.boolean(),
      })
    ),
  }),
  // Vắng mặt khi người gọi thiếu device.pii.full.
  customer: z
    .object({ name: z.string(), phone: z.string(), address: z.string() })
    .optional(),
  ticket_detail: z
    .object({
      service_type: z.enum(SERVICE_TYPE_VALUES),
      // Ba trường dưới vắng mặt khi thiếu service.read.
      technician: personDtoSchema.nullable().optional(),
      appointment_date: z.iso.date().optional(),
      appointment_slot: z.string().optional(),
      // Ba trường dưới vắng mặt khi thiếu device.pii.full.
      contact_name: z.string().optional(),
      contact_phone: z.string().optional(),
      address: z.string().optional(),
      // Vắng mặt khi thiếu service.write.
      technician_note: z.string().optional(),
    })
    .nullable(),
  sibling_alerts: z.array(
    alertDtoSchema.pick({
      id: true,
      name: true,
      error_code: true,
      severity: true,
      status: true,
    })
  ),
  other_open_ticket_count: z.number().int().nonnegative(),
  history: z.array(
    z.object({
      id: z.string().min(1),
      action: z.enum(HISTORY_ACTION_VALUES),
      actor_name: z.string().min(1),
      occurred_at: isoDateTime,
      from_status: z.enum(ALERT_STATUS_VALUES).nullable(),
      to_status: z.enum(ALERT_STATUS_VALUES).nullable(),
      // Vắng mặt khi thiếu device.pii.full.
      note: z.string().optional(),
    })
  ),
});

export const technicianSuggestionsDtoSchema = z.object({
  station: personDtoSchema,
  technicians: z.array(
    personDtoSchema.extend({
      specialty: z.enum(TECHNICIAN_SPECIALTY_VALUES),
      free_in_slot: z.boolean(),
      tickets_today: z.number().int().nonnegative(),
      rating: z.number().min(0).max(5),
    })
  ),
});
```

- [ ] **Step 3: Viết model, bộ lọc và đầu vào trong cùng file**

Model là bản camelCase của DTO, giữ nguyên cấu trúc lồng và giữ nguyên
`null`/`undefined`: `Alert`, `AlertSla`, `AlertTicketSummary`, `AlertDetail`,
`AlertCounts` (`open`, `criticalOpen`, `overdue`, `mine`), `AlertFilterOptions`,
`TechnicianSuggestions`, `TechnicianSuggestion`.

```ts
export interface AlertListFilters {
  search: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  group?: AlertHandlerGroup;
  region?: string;
  model?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  mine?: boolean;
  overdue?: boolean;
  includeClosed?: boolean;
  page: number;
  pageSize: number;
}

export type ContactResultInput =
  | { outcome: 'unreachable'; note?: string }
  | { outcome: 'declined'; reasonCode: DeclineReason; note?: string };

export interface CreateTicketInput {
  serviceType: ServiceType;
  corePositions: string[];
  issueDescription?: string;
  contactName: string;
  contactPhone: string;
  address: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentSlot: AppointmentSlot;
  technicianNote?: string;
  mergedAlertIds: string[];
  technicianId?: string; // bỏ trống: lưu phiếu, giao KTV sau
}

export interface AssignTechnicianInput {
  technicianId: string;
  reason?: string; // bắt buộc khi giao lại
}

export interface TechnicianSuggestionParams {
  alertId: string;
  appointmentDate: string;
  appointmentSlot: AppointmentSlot;
  serviceType: ServiceType;
}
```

- [ ] **Step 4: Viết `alertMapper.ts`**

Hàm thuần, xuất: `mapAlert`, `mapAlertPage`, `mapAlertCounts`,
`mapAlertDetail`, `mapAlertFilterOptions`, `mapTechnicianSuggestions`.

- [ ] **Step 5: Viết `alertApi.ts`**

Dùng `invalidResponse` theo mẫu `devices/api/deviceApi.ts` với khoá
`alerts:errors.invalidResponse`. Mọi hàm đọc nhận `signal?: AbortSignal`. Chỉ
đưa tham số có giá trị vào query string; cờ boolean gửi dạng `1`.

| Hàm                                                     | Gọi                                                                                                                                        | Trả về                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `getAlerts(filters, signal?)`                           | `GET /alerts` với `search`, `severity`, `status`, `handler_group`, `region`, `model`, `date_from`, `date_to`, `mine`, `overdue`, `include_closed`, `page`, `page_size` | `PageResponse<Alert>`  |
| `getAllAlerts(filters, signal?)`                        | Lặp `getAlerts` với `pageSize: 100` như `getAllDevices`                                                                                     | `Alert[]`              |
| `getAlertCounts(filters, signal?)`                      | `GET /alerts/counts`, cùng tham số trừ `status`, `mine`, `overdue`, `page`, `page_size`                                                     | `AlertCounts`          |
| `getAlertFilterOptions(signal?)`                        | `GET /alerts/filter-options`                                                                                                               | `AlertFilterOptions`   |
| `getAlert(alertId, signal?)`                            | `GET /alerts/:id`                                                                                                                          | `AlertDetail`          |
| `acknowledgeAlert(alertId)`                             | `POST /alerts/:id/acknowledge`, thân `{}`                                                                                                  | `AlertDetail`          |
| `takeOverAlert(alertId)`                                | `POST /alerts/:id/takeover`, thân `{}`                                                                                                     | `AlertDetail`          |
| `recordContactResult(alertId, input)`                   | `POST /alerts/:id/contact-results`, thân `{ outcome, reason_code?, note? }`                                                                | `AlertDetail`          |
| `closeAlert(alertId, result)`                           | `POST /alerts/:id/close`, thân `{ result }`                                                                                                | `AlertDetail`          |
| `createTicketFromAlert(alertId, input)`                 | `POST /alerts/:id/service-ticket`, thân snake_case của `CreateTicketInput`                                                                 | `AlertDetail`          |
| `getTechnicianSuggestions(params, signal?)`             | `GET /service-tickets/technician-suggestions` với `alert_id`, `appointment_date`, `appointment_slot`, `service_type`                       | `TechnicianSuggestions` |
| `assignTechnician(ticketId, input)`                     | `PUT /service-tickets/:ticketId/assignment`, thân `{ technician_id, reason? }`                                                             | `void`                 |

- [ ] **Step 6: Viết `alertQueries.ts`**

```ts
export const alertQueries = {
  all: ['alerts'] as const,
  list: (filters: AlertListFilters) => queryOptions({ ... }),
  counts: (filters: AlertListFilters) => queryOptions({ ... }),
  filterOptions: () => queryOptions({ ... }),
  detail: (alertId: string) => queryOptions({ ... }),
  technicianSuggestions: (params: TechnicianSuggestionParams) =>
    queryOptions({ ... }),
};
```

`list`, `counts` và `detail` đặt `refetchInterval: 15_000`, vì trạng thái phiếu
và việc tự đóng thay đổi mà không có thao tác của người đang xem. Khoá của
`counts` bỏ `status`, `mine`, `overdue`, `page`, `pageSize` như
`deviceQueries.statusCounts`. `filterOptions` đặt `staleTime: 5 * 60 * 1000`.

- [ ] **Step 7: Viết `alertSla.ts`**

```ts
export type SlaState =
  | 'none'
  | 'running'
  | 'warning'
  | 'overdue'
  | 'met'
  | 'late';

export function getSlaState(sla: AlertSla, now: number): SlaState;
// Số mili giây còn lại (âm khi quá hạn) hoặc đã dùng khi đồng hồ đã dừng.
export function getSlaDurationMs(
  sla: AlertSla,
  raisedAt: string,
  now: number
): number | null;
```

Luật của `getSlaState`, xét theo thứ tự: `dueAt === null` → `none`; có
`stoppedAt` → `met` nếu `stoppedAt <= dueAt`, ngược lại `late`; `now >= dueAt`
→ `overdue`; có `warningAt` và `now >= warningAt` → `warning`; còn lại
`running`.

- [ ] **Step 8: Kiểm tra**

Chạy: `pnpm typecheck` rồi `pnpm lint`.
Kết quả mong đợi: typecheck không lỗi; lint chỉ còn 1 cảnh báo có sẵn.

- [ ] **Step 9: Commit**

```bash
git add src/features/alerts
git commit -m "feat(alerts): add alert and service ticket data contract"
```

---

### Task 2: Backend giả lập

**Files:**

- Create: `src/mocks/fixtures/alerts.ts`
- Create: `src/features/alerts/mocks/alertHandlers.ts`
- Modify: `src/mocks/handlers.ts` (chèn `...alertHandlers` ngay sau
  `...deviceExtraHandlers` trong mảng `handlers`)
- Modify: `src/features/system/constants/auditModules.ts`
- Modify: `src/features/system/locales/vi.json`, `en.json`

**Interfaces:**

- Consumes: các schema và kiểu DTO của Task 1; `deviceFixtures`
  (`@/mocks/fixtures/devices`), `deviceCoreLayouts`, `deviceCoreSkus`
  (`@/mocks/fixtures/deviceCoreCatalog`), `customerMockData`;
  `getSystemConfigParams`, `listMembersWithCapability`, `recordAudit`
  (`@/features/system/mocks/systemHandlers`).
- Produces: `alertHandlers` (mảng handler MSW); các endpoint ở Task 1 Step 5.

- [ ] **Step 1: Viết fixture**

`src/mocks/fixtures/alerts.ts` xuất `alertSeeds`, `stationFixtures`,
`technicianFixtures`. Mã lỗi và tên cảnh báo là dữ liệu minh hoạ; ghi chú trong
file rằng bảng mã lỗi thật đang chờ KGR (spec mục 10 câu 1).

Danh mục mã lỗi dùng trong mock:

| Mã lỗi                | Tên                                    | Nhóm        | Mức độ     | Loại dịch vụ gợi ý |
| --------------------- | -------------------------------------- | ----------- | ---------- | ------------------ |
| `ER00061`–`ER00065`   | "Lõi {n} vượt ngưỡng thay mức 2"       | `cskh`      | `medium`   | `core_replacement` |
| `ER00051`             | "Áp suất đầu vào vượt ngưỡng an toàn"  | `cskh`      | `critical` | `repair`           |
| `ER00074`             | "Cảm biến TDS báo lỗi hiệu chuẩn"      | `cskh`      | `medium`   | `repair`           |
| `ER00070`             | "Nhiệt độ nước ra ngoài dải khuyến nghị" | `cskh`    | `low`      | `repair`           |
| `ER00052`             | "Mất kết nối hàng loạt theo khu vực"   | `technical` | `critical` | `repair`           |
| `ER00053`             | "Tỷ lệ lỗi tăng sau cập nhật firmware" | `technical` | `medium`   | `repair`           |

Không tạo cảnh báo cho `ER00056`–`ER00060` (nhóm chỉ app, bước C2).

`alertSeeds` có ít nhất 26 cảnh báo, lấy thiết bị từ `deviceFixtures`, thời
điểm tính tương đối so với lúc nạp trang, và phải có đủ các ca sau:

| Ca                                                                   | Dùng để kiểm tra              |
| -------------------------------------------------------------------- | ----------------------------- |
| Nhóm CSKH, trạng thái Mới, đủ ba mức độ                              | Danh sách, lọc mức độ         |
| Nhóm CSKH, Mới, phát sinh cách đây 3 ngày                            | Quá SLA sau khi cấu hình SLA  |
| Hai cảnh báo CSKH đang mở trên cùng một máy (`ER00061` và `ER00063`) | Gộp cảnh báo                  |
| Nhóm CSKH, Đã nhận xử lý, người xử lý là một thành viên khác         | "Chuyển cho tôi"              |
| Nhóm CSKH, Không liên lạc được, `contact_attempts: 2`                | Gọi lại                       |
| Nhóm CSKH, Đã tạo phiếu, phiếu `tt5`, KTV đã nhận                    | Khối phiếu, chỉ đọc           |
| Nhóm CSKH, Khách không cần xử lý                                     | "Hiện cả đã xử lý"            |
| Nhóm CSKH, Đã đóng với `ticket_done`                                 | "Hiện cả đã xử lý"            |
| Nhóm CSKH, Mới, `recoversAfterMs: 60_000`                            | Tự đóng khi thiết bị hết lỗi  |
| Nhóm Kỹ thuật, Mới và Đã nhận xử lý                                  | Luồng mục 6.3                 |
| Mã lỗi nhóm CSKH trên máy không có chủ (`KGR-0012`)                  | Chuyển sang nhóm Kỹ thuật     |

Người xử lý trong seed lấy từ `listMembersWithCapability('alerts.handle')` lúc
dựng kho dữ liệu trong handler, không viết cứng id trong fixture.

`stationFixtures`: bốn trạm, mỗi trạm một tỉnh có trong `deviceFixtures` (Hà
Nội, Hải Phòng, Đà Nẵng, Hồ Chí Minh), dạng `{ id, name, region }`.

`technicianFixtures`: mỗi trạm bốn KTV, dạng
`{ id, name, stationId, specialty, rating, ticketsToday, busySlots, mockBehavior }`
với `mockBehavior` lần lượt là `accept`, `decline`, `ignore`,
`accept_then_cancel`. Mỗi trạm có ít nhất một KTV `repair` mang hành vi
`accept` và một KTV có `busySlots` chứa `'08:00-10:00'`. Ghi chú trong file cho
biết KTV nào mang hành vi nào, vì người kiểm tra tay cần biết.

- [ ] **Step 2: Dựng kho dữ liệu và các hàm dùng chung trong `alertHandlers.ts`**

Kho dữ liệu trong bộ nhớ: `alertStore`, `ticketStore`. Lấy vai trò và người
dùng hiện tại từ `localStorage` bằng hai khoá `cms-portal:mock-auth-role` và
`cms-portal:mock-auth-user` như `campaignHandlers.ts`. Tên người dùng hiện tại
tra trong `listMembersWithCapability('alerts.read')`; không thấy thì dùng nhãn
vai trò.

Hàm trả lỗi: `fail(status, code)` trả `{ code, message }` với `message` lấy từ
`alerts:errors.<code>`. Bảng mã lỗi:

| Mã                       | HTTP | Khi nào                                                         |
| ------------------------ | ---- | --------------------------------------------------------------- |
| `forbidden`              | 403  | Thiếu capability                                                |
| `not_found`              | 404  | Không có cảnh báo hoặc phiếu                                    |
| `already_handled`        | 409  | Nhận xử lý một cảnh báo không còn ở trạng thái Mới              |
| `not_handler`            | 403  | Người gọi không phải người xử lý hiện tại                       |
| `invalid_state`          | 409  | Thao tác không hợp lệ với trạng thái hoặc nhóm hiện tại         |
| `validation`             | 422  | Thân yêu cầu sai                                                |
| `specialty_mismatch`     | 422  | Giao phiếu Sửa chữa cho KTV không có chuyên môn `repair`        |
| `technician_unavailable` | 422  | KTV bận trong khung giờ hẹn                                     |

SLA tính lúc đọc từ `getSystemConfigParams().sla_by_severity[severity]` (phút):
`due_at = raised_at + phút`; `warning_at = due_at − 20% thời hạn`; giá trị
`null` thì cả hai là `null`. `stopped_at` của nhóm CSKH là thời điểm ghi kết quả
liên hệ đầu tiên; của nhóm Kỹ thuật là thời điểm đóng.

- [ ] **Step 3: Viết hàm `materialize()` chạy đầu mọi handler đọc và ghi**

Không có bộ hẹn giờ; trạng thái tiến theo thời gian đã trôi, giống
`materialize` của `campaignHandlers.ts`. Các hằng thời gian (đặt ở đầu file):

```ts
const ACCEPT_AFTER_MS = 8_000;
const DECLINE_AFTER_MS = 8_000;
const EXPIRE_AFTER_MS = 30_000; // thay cho 30 phút thật
const STAGE_ADVANCE_MS = 10_000; // mỗi bậc tt3 → tt7
const CANCEL_AFTER_MS = 15_000; // sau khi KTV đã nhận
```

Luật, áp cho từng phiếu theo `mockBehavior` của KTV đang được giao:

- `accept`: sau `ACCEPT_AFTER_MS` → `assignment_state: 'accepted'`, phiếu
  `tt3`; sau đó cứ `STAGE_ADVANCE_MS` lên một bậc cho tới `tt7`.
- `decline`: sau `DECLINE_AFTER_MS` → `declined`, phiếu vẫn `tt2`.
- `ignore`: sau `EXPIRE_AFTER_MS` → `expired`, phiếu vẫn `tt2`.
- `accept_then_cancel`: nhận như `accept`, sau `CANCEL_AFTER_MS` phiếu thành
  `cancelled`.
- Phiếu đạt `tt7`: mọi cảnh báo gắn với phiếu chuyển `closed`,
  `close_result.kind = 'ticket_done'` (bước C11).
- Phiếu `cancelled`: mọi cảnh báo gắn với phiếu quay về `acknowledged`, giữ
  người xử lý, bỏ liên kết phiếu.
- Cảnh báo có `recoversAfterMs` đã tới hạn, chưa có phiếu, trạng thái thuộc
  `new`/`acknowledged`/`unreachable`, và `alert_auto_close` trong cấu hình hệ
  thống đang bật: chuyển `closed`, `close_result.kind = 'device_recovered'`.

Mỗi chuyển đổi tự động thêm một dòng `history` với `actor_name` là
`'Hệ thống'` và gọi `recordAudit(null, { module, action, target, before, after, actorName: 'Hệ thống' })`.

- [ ] **Step 4: Viết các handler đọc**

`GET /api/alerts`, `/api/alerts/counts`, `/api/alerts/filter-options`,
`/api/alerts/:id`. Tất cả cần `alerts.read`.

- Danh sách: mặc định chỉ trả trạng thái thuộc `ALERT_OPEN_STATUSES`; có
  `include_closed=1` hoặc có `status` thì bỏ giới hạn đó. `search` khớp không
  phân biệt hoa thường với `device_id` hoặc `error_code`. `mine=1` lọc theo
  người dùng hiện tại. `overdue=1` lọc cảnh báo đang ở trạng thái `overdue`
  theo đúng luật của `getSlaState`. Sắp xếp: mức độ (`critical` trước), rồi
  `raised_at` cũ trước.
- Số đếm: `open`, `critical_open`, `overdue`, `mine` tính trên tập đã lọc theo
  các bộ lọc còn lại.
- Chi tiết, che theo quyền bằng cách **bỏ hẳn trường**: thiếu
  `device.pii.full` → bỏ `customer`, bỏ `note` trong mọi dòng `history`, bỏ
  `contact_name`, `contact_phone`, `address` của `ticket_detail`; thiếu
  `service.read` → bỏ `technician`, `appointment_date`, `appointment_slot`;
  thiếu `service.write` → bỏ `technician_note`.
- `sibling_alerts`: cảnh báo nhóm `cskh` khác, cùng `device_id`, trạng thái
  thuộc `new`/`acknowledged`/`unreachable`.
- `other_open_ticket_count`: số phiếu của cùng máy chưa ở `tt9` hay
  `cancelled`, không tính phiếu của chính cảnh báo này.
- Máy không có chủ: cảnh báo luôn mang `handler_group: 'technical'`.

- [ ] **Step 5: Viết các handler ghi trên cảnh báo**

Mọi handler: kiểm tra quyền → `materialize()` → kiểm tra trạng thái → cập nhật
→ thêm `history` → `recordAudit(actor, { module: 'alerts', action, target: alert.id, before, after, reason })`
→ trả chi tiết đã che theo quyền.

| Endpoint                           | Quyền                             | Điều kiện                                                                                    | Kết quả                                                                                                    |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /alerts/:id/acknowledge`     | `alerts.handle`                   | Trạng thái `new`, nếu không → `already_handled`                                              | `acknowledged`, người xử lý là người gọi                                                                   |
| `POST /alerts/:id/takeover`        | `alerts.handle`                   | Trạng thái `acknowledged`/`unreachable`/`ticketed` và người xử lý khác người gọi, nếu không → `invalid_state` | Đổi người xử lý, giữ trạng thái                                                                |
| `POST /alerts/:id/contact-results` | `alerts.handle`, là người xử lý   | Nhóm `cskh`, trạng thái `acknowledged`/`unreachable`; `declined` cần `reason_code`, và cần `note` khi `reason_code` là `other` | `unreachable` (tăng `contact_attempts`) hoặc `declined`; đặt `sla.stopped_at` nếu chưa có       |
| `POST /alerts/:id/close`           | `alerts.handle`, là người xử lý   | Nhóm `technical`, trạng thái `acknowledged`, `result` không rỗng                             | `closed`, `close_result = { kind: 'manual', note: result }`, đặt `sla.stopped_at`                          |
| `POST /alerts/:id/service-ticket`  | `alerts.handle` và `service.write`, là người xử lý | Nhóm `cskh`, trạng thái `acknowledged`/`unreachable`; kiểm tra thân theo Step 6 | Tạo phiếu `tt1`; cảnh báo và các cảnh báo gộp → `ticketed`; đặt `sla.stopped_at` nếu chưa có; tăng `contact_attempts` |

- [ ] **Step 6: Viết luật kiểm tra thân của `service-ticket`**

- `contact_name`, `address` không rỗng; `contact_phone` gồm 9 đến 11 chữ số.
- `appointment_date` không sớm hơn hôm nay; `appointment_slot` thuộc
  `APPOINTMENT_SLOTS`.
- `service_type` là `core_replacement` thì `core_positions` có ít nhất một phần
  tử và mọi phần tử là vị trí lõi của máy; loại khác thì `issue_description`
  không rỗng.
- Mỗi id trong `merged_alert_ids` phải là cảnh báo nhóm `cskh`, cùng máy, trạng
  thái `new`/`acknowledged`/`unreachable`. Cảnh báo gộp nhận người xử lý là
  người gọi, một dòng `history` hành động `ticket_merged`, và
  `sla.stopped_at` nếu chưa có.
- Mã phiếu dạng `WT-` cộng 8 ký tự như handler tạo phiếu có sẵn ở
  `handlers.ts`.
- Có `technician_id` thì giao luôn theo luật Step 7; phiếu thành `tt2`.

- [ ] **Step 7: Viết handler của phiếu**

`GET /api/service-tickets/technician-suggestions` (cần `service.write`): trạm
là trạm có `region` trùng `region` của máy; danh sách KTV của trạm đó, sắp
theo `free_in_slot` giảm dần, rồi khớp chuyên môn (`repair` trước khi
`service_type` là `repair`), rồi `rating` giảm dần.

`PUT /api/service-tickets/:ticketId/assignment` (cần `service.write`, người gọi
là người xử lý của cảnh báo gắn với phiếu): chỉ cho phép khi
`assignment_state` là `unassigned`, `declined` hoặc `expired`, nếu không →
`invalid_state`. Giao lại (trạng thái `declined`/`expired`) bắt buộc `reason`.
KTV bận khung giờ → `technician_unavailable`; phiếu `repair` mà KTV không có
chuyên môn `repair` → `specialty_mismatch`. Thành công: phiếu `tt2`,
`assignment_state: 'pending'`, ghi `history` hành động `technician_assigned`
hoặc `technician_reassigned` trên mọi cảnh báo gắn với phiếu, và
`recordAudit` với `module: 'service_tickets'`.

- [ ] **Step 8: Đăng ký module audit**

Thêm `{ value: 'alerts', labelKey: 'audit.modules.alerts' }` và
`{ value: 'service_tickets', labelKey: 'audit.modules.service_tickets' }` vào
`AUDIT_MODULES`; thêm hai khoá đó vào khối `audit.modules` của
`system/locales/vi.json` ("Trung tâm cảnh báo", "Phiếu dịch vụ") và `en.json`
("Alert center", "Service tickets").

- [ ] **Step 9: Kiểm tra trên trình duyệt**

Chạy `pnpm dev`, đăng nhập tài khoản TT DV, mở console:

```js
await fetch('/api/alerts?page=1&page_size=10').then((r) => r.json());
```

Mong đợi: `total` ≥ 20, không có phần tử nào ở `declined` hay `closed`, không
có `error_code` nào trong `ER00056`–`ER00060`.

```js
const id = 'id của một cảnh báo nhóm cskh, trạng thái new';
const post = (path, body = {}) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (r) => [r.status, await r.json()]);
await post(`/api/alerts/${id}/acknowledge`); // [200, { status: 'acknowledged', ... }]
await post(`/api/alerts/${id}/acknowledge`); // [409, { code: 'already_handled' }]
await post(`/api/alerts/${id}/contact-results`, { outcome: 'declined' }); // [422, { code: 'validation' }]
```

Đăng nhập tài khoản Nhà máy: `GET /api/alerts/<id>` không có trường `customer`
và không dòng `history` nào có `note`. Đăng nhập tài khoản Kho vận:
`GET /api/alerts` trả 403.

- [ ] **Step 10: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add src/mocks src/features/alerts/mocks src/features/system
git commit -m "feat(alerts): add mock backend for alert handling and ticket dispatch"
```

---

### Task 3: Danh sách cảnh báo

**Files:**

- Create: `src/routes/_authenticated/alerts/index.tsx`
- Delete: `src/routes/_authenticated/alerts.tsx`
- Create: `src/features/alerts/pages/AlertListPage.tsx`
- Create: `src/features/alerts/components/AlertTable.tsx`,
  `AlertListSkeleton.tsx`, `AlertSlaCell.tsx`, `AlertStatusTag.tsx`
- Replace: `src/features/alerts/components/AlertFilters.tsx`
- Create: `src/features/alerts/utils/useNow.ts`, `exportAlertsToCsv.ts`,
  `alertErrors.ts`
- Delete: `src/features/alerts/pages/AlertsPage.tsx`,
  `components/AlertList.tsx`, `mocks/alertMockData.ts`
- Replace: `src/features/alerts/locales/vi.json`, `en.json`
- Modify: `src/shared/components/AppShell.tsx` (nhánh `case 'alerts'` của
  `navigateToMenu`)

**Interfaces:**

- Consumes: `alertQueries`, `getAllAlerts`, `acknowledgeAlert`,
  `getSlaState`, `getSlaDurationMs`, các hằng của Task 1.
- Produces:
  - `AlertListPage({ filters }: { filters: AlertListPageFilters })` với
    `AlertListPageFilters = AlertListFilters & { alertId?: string }`.
  - `useNow(intervalMs?: number): number`.
  - `alertErrorMessage(error: unknown, t: TFunction<'alerts'>): string` — tra
    `getApiErrorCode(error)` trong `errors.<code>`, không có thì `errors.generic`.
  - `AlertSeverityTag`, `AlertStatusTag`, `TicketStatusTag` từ
    `AlertStatusTag.tsx`.
  - Ở task này bấm một dòng chỉ ghi `alertId` lên URL và chưa hiển thị gì
    thêm. Task 4 tạo `AlertDetailDrawer` và thêm
    `{filters.alertId ? <AlertDetailDrawer ... /> : null}` vào trang.

- [ ] **Step 1: Viết route**

Theo khung `src/routes/_authenticated/devices/index.tsx`.

```ts
const optionalText = z.string().trim().min(1).optional().catch(undefined);
const optionalFlag = z.boolean().optional().catch(undefined);

const alertSearchSchema = z.object({
  search: z.string().catch(''),
  severity: z.enum(ALERT_SEVERITY_VALUES).optional().catch(undefined),
  status: z.enum(ALERT_STATUS_VALUES).optional().catch(undefined),
  group: z.enum(ALERT_HANDLER_GROUP_VALUES).optional().catch(undefined),
  region: optionalText,
  model: optionalText,
  dateFrom: z.iso.date().optional().catch(undefined),
  dateTo: z.iso.date().optional().catch(undefined),
  mine: optionalFlag,
  overdue: optionalFlag,
  includeClosed: optionalFlag,
  alertId: optionalText,
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50)
    .catch(10),
});
```

`beforeLoad`: thiếu `alerts.read` → `redirect({ to: '/403' })`. `loaderDeps`
bỏ `alertId` để chọn một dòng không tải lại danh sách. `loader` nạp trước
`alertQueries.list` và `alertQueries.counts`, không chặn khi `cause === 'stay'`.
`pendingMs: 200`, `pendingComponent: AlertListSkeleton`,
`errorComponent: RouteErrorState`.

- [ ] **Step 2: Sửa điều hướng menu**

Trong `AppShell.tsx`, `case 'alerts'` thành
`navigate({ to: '/alerts', search: { search: '', page: 1, pageSize: 10 } })`.

- [ ] **Step 3: Viết `useNow`, `AlertSlaCell`, `AlertStatusTag`**

`AlertSlaCell({ sla, raisedAt, now })` hiển thị theo `getSlaState`:

| Trạng thái | Hiển thị                               | Màu           |
| ---------- | -------------------------------------- | ------------- |
| `none`     | "—"                                    | mặc định      |
| `running`  | Thời gian còn lại                      | mặc định      |
| `warning`  | Thời gian còn lại                      | cam (warning) |
| `overdue`  | "Quá hạn" kèm thời gian đã quá         | đỏ (danger)   |
| `met`      | "Đạt" kèm thời gian đã dùng            | xanh          |
| `late`     | "Trễ" kèm thời gian đã dùng            | đỏ (danger)   |

Thời gian viết dạng "2 giờ 15 phút", "15 phút", "dưới 1 phút" qua khoá i18n có
tham số, không nối chuỗi trong component.

- [ ] **Step 4: Viết `AlertFilters` và `AlertTable`**

Bộ lọc theo spec mục 6: ô tìm serial hoặc mã lỗi; mức độ; trạng thái; nhóm xử
lý; khu vực và model (lựa chọn từ `alertQueries.filterOptions()`); khoảng thời
gian; ba công tắc "Của tôi", "Quá SLA", "Hiện cả đã xử lý"; nút đặt lại. Mọi
thay đổi ghi lên URL và đặt `page: 1`.

Cột của bảng theo thứ tự: tên cảnh báo (kèm số lần ghi nhận khi lớn hơn 1),
mức độ, mã lỗi, serial, model, khu vực, thời gian, SLA, trạng thái, người xử
lý, phiếu (mã và `TicketStatusTag`), thao tác. Cột thao tác chỉ có nút "Nhận xử
lý", hiện khi trạng thái `new` và người dùng có `alerts.handle`. Bấm vào dòng
ghi `alertId` lên URL. Phân trang ghi `page`, `pageSize` lên URL.

- [ ] **Step 5: Viết `AlertListPage`**

Theo `DeviceListPage`: `useDeferredValue(filters)`, `useSuspenseQuery` cho
`list` và `counts`. Bốn thẻ tổng: đang mở, nghiêm trọng đang mở, quá SLA, chờ
tôi xử lý. Thẻ "chờ tôi xử lý" chỉ hiện khi có `alerts.handle`. Nút "Xuất báo
cáo" bọc trong `PermissionGuard capability="alerts.export"`.

"Nhận xử lý" dùng `useMutation(acknowledgeAlert)`; thành công →
`invalidateQueries({ queryKey: alertQueries.all })` và `message.success`; lỗi →
`message.error(alertErrorMessage(error, t))` và cũng `invalidateQueries`.

- [ ] **Step 6: Viết `exportAlertsToCsv.ts`**

`downloadAlertsCsv(alerts: Alert[], labels: AlertCsvLabels): void` dùng
`downloadCsv` của `@/shared/lib/csv`, tiền tố file `alerts`. Cột: tên cảnh báo,
mức độ, mã lỗi, serial, model, khu vực, thời gian, trạng thái, người xử lý, mã
phiếu, trạng thái phiếu. Không có cột khách hàng, KTV hay lịch hẹn. Nhãn đã
dịch truyền vào từ trang như `maps`/`campaigns` đang làm.

- [ ] **Step 7: Viết lại hai file locale**

Xoá các khoá của bản demo. Cấu trúc khoá cấp một: `page`, `stats`, `filters`,
`table`, `severity`, `status`, `group`, `ticketStatus`, `assignment`, `sla`,
`export`, `errors`. Nhãn tiếng Việt cho các tập giá trị:

- `severity`: Nghiêm trọng, Trung bình, Thấp.
- `status`: Mới, Đã nhận xử lý, Không liên lạc được, Đã tạo phiếu, Khách không
  cần xử lý, Đã đóng.
- `group`: CSKH, Kỹ thuật.
- `ticketStatus`: TT1 Đã đặt, TT2 Điều phối, TT3 Nhận việc, TT4 Xuất vật tư,
  TT5 Bắt đầu đi, TT6 Check-in, TT7 Nghiệm thu, TT8 Thanh toán, TT9 Đánh giá,
  Huỷ.
- `assignment`: Chờ giao KTV, Chờ KTV nhận việc, KTV đã nhận, Cần giao lại KTV
  (dùng chung cho `declined` và `expired`).
- `errors`: một khoá cho mỗi mã ở Task 2 Step 2, cộng `invalidResponse` và
  `generic`.

- [ ] **Step 8: Kiểm tra trên trình duyệt**

- [ ] Tài khoản TT DV: menu Cảnh báo mở danh sách, mặc định không có dòng Đã
      đóng hay Khách không cần xử lý; bật "Hiện cả đã xử lý" thì có.
- [ ] Lọc mức độ, nhóm, khu vực, "Của tôi"; tải lại trang và dán URL sang tab
      khác vẫn giữ nguyên bộ lọc.
- [ ] URL có `?severity=abc&pageSize=7` rơi về mặc định, không lỗi.
- [ ] **Review Focus 1:** với cấu hình mặc định, cột SLA mọi dòng là "—" và
      công tắc "Quá SLA" cho danh sách rỗng kèm trạng thái rỗng. Đăng nhập
      Admin, vào Hệ thống → Cấu hình, đặt SLA Nghiêm trọng 30 phút, Trung bình
      120 phút. Quay lại: dòng phát sinh 3 ngày trước hiện "Quá hạn", thẻ "Quá
      SLA" lớn hơn 0, ô đếm ngược giảm mỗi giây.
- [ ] Bấm "Nhận xử lý": dòng đổi sang Đã nhận xử lý, cột người xử lý hiện tên
      mình.
- [ ] Tài khoản KD và Nhà máy: không có nút "Nhận xử lý"; KD không có nút xuất,
      Nhà máy có.
- [ ] Tài khoản Kho vận: không có menu; gõ thẳng `/alerts` chuyển về `/403`.
- [ ] Xuất báo cáo: file mở được, không có cột khách hàng.
- [ ] Trạng thái lỗi: trong DevTools → Network, chặn URL `*/api/alerts*` rồi
      tải lại trang; trang hiện `RouteErrorState`. Bỏ chặn sau khi xem.
- [ ] Đổi EN/VI: không còn chuỗi cứng. Chạy
      `rg -P '[à-ỹÀ-Ỹ]' src/features/alerts --glob '!**/locales/**' --glob '!**/mocks/**'`
      không ra kết quả.

- [ ] **Step 9: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add -A src/features/alerts src/routes src/shared/components/AppShell.tsx src/routeTree.gen.ts
git commit -m "feat(alerts): rebuild alert list with URL filters, SLA and export"
```

---

### Task 4: Chi tiết cảnh báo và các thao tác cơ bản

**Files:**

- Create: `src/features/alerts/components/AlertDetailDrawer.tsx`,
  `AlertInfoBlocks.tsx`, `AlertHistoryTimeline.tsx`, `CloseAlertDialog.tsx`
- Modify: `src/features/alerts/pages/AlertListPage.tsx`
- Modify: `src/features/alerts/locales/vi.json`, `en.json` (thêm `detail`,
  `history`, `closeResult`, `declineReason`, `actions`)

**Interfaces:**

- Consumes: `alertQueries.detail`, `acknowledgeAlert`, `takeOverAlert`,
  `closeAlert`, `alertErrorMessage`, `useAuth` (`@/core/auth/useAuth`).
- Produces:
  - `AlertDetailDrawer({ alertId, onClose }: { alertId: string; onClose: () => void })`.
  - Trong `AlertDetailDrawer.tsx`, hàm
    `getAlertActions(alert: AlertDetail, viewer: { userId: string; can: (capability: Capability) => boolean }): AlertAction[]`
    với `AlertAction = 'acknowledge' | 'takeover' | 'contact' | 'close' | 'assign' | 'reassign'`.
    Task 5 và 6 gắn hộp thoại vào các hành động `contact`, `assign`,
    `reassign`.

- [ ] **Step 1: Viết `getAlertActions`**

"Là người xử lý" nghĩa là `alert.handler?.id === viewer.userId`.

| Hành động     | Điều kiện                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `acknowledge` | `alerts.handle`, trạng thái `new`                                                                                                     |
| `takeover`    | `alerts.handle`, trạng thái `acknowledged`/`unreachable`/`ticketed`, có người xử lý và không phải mình                                |
| `contact`     | `alerts.handle`, là người xử lý, nhóm `cskh`, trạng thái `acknowledged`/`unreachable`                                                 |
| `close`       | `alerts.handle`, là người xử lý, nhóm `technical`, trạng thái `acknowledged`                                                          |
| `assign`      | `service.write`, là người xử lý, trạng thái `ticketed`, `ticket.assignmentState === 'unassigned'`                                     |
| `reassign`    | `service.write`, là người xử lý, trạng thái `ticketed`, `ticket.assignmentState` là `declined` hoặc `expired`                         |

- [ ] **Step 2: Viết các khối thông tin**

`AlertInfoBlocks.tsx` xuất bốn component, mỗi cái nhận `alert: AlertDetail`:

- `AlertSummaryBlock`: tên, mã lỗi, mức độ, trạng thái, nhóm, thời điểm phát
  sinh, lần ghi nhận gần nhất, số lần ghi nhận, người xử lý, ô SLA, số lần đã
  gọi (khi lớn hơn 0), lý do khi trạng thái `declined`, kết quả khi `closed`.
- `AlertDeviceBlock`: serial (liên kết sang `/devices/$deviceId`), model, khu
  vực, trạng thái kết nối, tình trạng bảo hành, danh sách lõi với phần trăm đã
  dùng, lõi vượt ngưỡng tô đỏ.
- `AlertCustomerBlock`: tên, số điện thoại, địa chỉ. Chỉ render khi
  `alert.customer` có mặt; component không tự che.
- `AlertSiblingsBlock`: danh sách cảnh báo khác đang mở của cùng máy; bấm một
  dòng đổi `alertId` trên URL. Ẩn khi rỗng.

- [ ] **Step 3: Viết `AlertHistoryTimeline`**

Mỗi dòng: nhãn hành động (`history.<action>`), tên người thực hiện, thời điểm,
trạng thái trước → sau khi có, và `note` khi có. Mới nhất ở trên.

- [ ] **Step 4: Viết `CloseAlertDialog`**

`CloseAlertDialog({ open, pending, onCancel, onConfirm }: { open: boolean; pending: boolean; onCancel: () => void; onConfirm: (result: string) => void })`.
Một ô văn bản "Kết quả xử lý", bắt buộc, tối đa 500 ký tự, theo mẫu
`DeviceReasonConfirmDialog`.

- [ ] **Step 5: Viết `AlertDetailDrawer` và gắn vào trang**

Ant Design `Drawer`, rộng 720. Dùng `useQuery(alertQueries.detail(alertId))`.
Ba trạng thái: đang tải (skeleton), lỗi `notFound` hoặc `forbidden`
(`PageState` tương ứng), có dữ liệu. Thứ tự khối: tóm tắt, thiết bị, khách
hàng, cảnh báo cùng máy, lịch sử. Hàng nút ở chân ngăn kéo sinh từ
`getAlertActions`. Ba mutation `acknowledge`, `takeover`, `close` đều
`invalidateQueries({ queryKey: alertQueries.all })` khi thành công và khi lỗi.

Trong `AlertListPage`, `onClose` gọi
`navigate({ search: (previous) => ({ ...previous, alertId: undefined }) })`.

- [ ] **Step 6: Kiểm tra trên trình duyệt**

- [ ] Bấm một dòng: ngăn kéo mở, URL có `alertId`; tải lại trang ngăn kéo vẫn
      mở; đóng ngăn kéo thì URL mất `alertId` và danh sách không tải lại từ
      đầu.
- [ ] **Review Focus 5:** `/alerts?alertId=khong-ton-tai` hiện trạng thái không
      tìm thấy trong ngăn kéo; đóng được; danh sách phía sau vẫn dùng được.
- [ ] Cảnh báo đang do người khác giữ: có nút "Chuyển cho tôi", không có nút
      nào khác. Bấm xong: mình là người xử lý, lịch sử có dòng mới.
- [ ] **Review Focus 2:** mở cùng một cảnh báo Mới ở hai cửa sổ, đăng nhập hai
      tài khoản có `alerts.handle` (TT DV và Admin). Bấm "Nhận xử lý" ở cả hai.
      Cửa sổ thứ hai hiện thông báo cảnh báo đã có người nhận và tự hiển thị
      tên người đang giữ.
- [ ] Cảnh báo nhóm Kỹ thuật: Nhận xử lý → Đóng; để trống kết quả thì không gửi
      được; đóng xong trạng thái Đã đóng, kết quả hiện trong khối tóm tắt.
- [ ] Cảnh báo của máy không chủ (`KGR-0012`) thuộc nhóm Kỹ thuật và không có
      khối khách hàng.
- [ ] Tài khoản Nhà máy và KD: không có khối khách hàng, lịch sử không có ghi
      chú, không có nút nào.
- [ ] Vào Hệ thống → Nhật ký: có dòng của module "Trung tâm cảnh báo" cho mỗi
      thao tác vừa làm, đủ người thực hiện, thời điểm, giá trị trước và sau.
- [ ] Bật `alert_auto_close` trong cấu hình hệ thống, chờ hơn 60 giây: cảnh báo
      có `recoversAfterMs` chuyển Đã đóng với kết quả "Thiết bị hết lỗi", lịch
      sử ghi người thực hiện là Hệ thống.

- [ ] **Step 7: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add src/features/alerts
git commit -m "feat(alerts): add alert detail drawer with claim, takeover and close"
```

---

### Task 5: Ghi kết quả liên hệ

**Files:**

- Create: `src/features/alerts/components/ContactResultDialog.tsx`
- Modify: `src/features/alerts/components/AlertDetailDrawer.tsx`
- Modify: `src/features/alerts/locales/vi.json`, `en.json` (thêm `contact`)

**Interfaces:**

- Consumes: `recordContactResult`, `ContactResultInput`, `DECLINE_REASONS`,
  `alertErrorMessage`.
- Produces:
  `ContactResultDialog({ open, canCreateTicket, pending, onCancel, onSubmit, onAgreed }: { open: boolean; canCreateTicket: boolean; pending: boolean; onCancel: () => void; onSubmit: (input: ContactResultInput) => void; onAgreed: () => void })`.
  `onAgreed` được gọi khi người dùng chọn "Khách đồng ý" và bấm tiếp tục;
  Task 6 nối nó với `TicketWizardModal`.

- [ ] **Step 1: Viết `ContactResultDialog`**

Một `Form` của Ant Design. Trường `outcome` là nhóm radio ba lựa chọn theo thứ
tự: "Khách đồng ý cho thợ đến", "Khách không cần xử lý", "Không liên lạc được".
Lựa chọn đầu chỉ render khi `canCreateTicket`.

- Chọn "Khách không cần xử lý": hiện `Select` lý do (bắt buộc, từ
  `DECLINE_REASONS`) và ô ghi chú; ghi chú bắt buộc khi lý do là `other`.
- Chọn "Không liên lạc được": hiện ô ghi chú không bắt buộc.
- Chọn "Khách đồng ý": nút chính đổi nhãn thành "Tiếp tục tạo phiếu" và gọi
  `onAgreed`, không gọi API.

Ghi chú tối đa 500 ký tự.

- [ ] **Step 2: Nối vào ngăn kéo**

`canCreateTicket` là `can('service.write')`. Mutation `recordContactResult`:
thành công → đóng hộp thoại, `message.success`, `invalidateQueries`; lỗi →
đóng hộp thoại, `message.error(alertErrorMessage(error, t))`,
`invalidateQueries`. Ở task này `onAgreed` chỉ đóng hộp thoại; Task 6 thay
bằng việc mở form tạo phiếu.

- [ ] **Step 3: Kiểm tra trên trình duyệt**

- [ ] Nhận một cảnh báo nhóm CSKH → Ghi kết quả liên hệ → Không liên lạc được:
      trạng thái đổi, số lần gọi là 1, ô SLA chuyển "Đạt" hoặc "Trễ" (khi đã
      cấu hình SLA) và ngừng đếm. Ghi thêm lần nữa: số lần gọi là 2, ô SLA
      không đổi.
- [ ] Khách không cần xử lý, lý do "Lý do khác", để trống ghi chú: không gửi
      được. Chọn lý do khác và gửi: trạng thái Khách không cần xử lý, cảnh báo
      biến khỏi danh sách mặc định, không còn nút nào trong ngăn kéo.
- [ ] **Review Focus 3:** mở hộp thoại ở cửa sổ A; ở cửa sổ B (Admin) bấm
      "Chuyển cho tôi" trên cùng cảnh báo; quay lại A và gửi. A nhận thông báo
      mình không còn là người xử lý, hộp thoại đóng, ngăn kéo hiện người xử lý
      mới, kết quả của A không được ghi.
- [ ] **Review Focus 4:** đăng nhập Super Admin, vào Hệ thống → Thành viên →
      nhóm quyền, tạo nhóm tuỳ biến có `alerts.read`, `alerts.handle`,
      `device.pii.full` nhưng không có `service.write`; gán cho một thành viên
      và đăng nhập bằng thành viên đó. Hộp thoại chỉ có hai lựa chọn, không có
      "Khách đồng ý".

- [ ] **Step 4: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add src/features/alerts
git commit -m "feat(alerts): record customer contact results on alerts"
```

---

### Task 6: Tạo phiếu, gộp cảnh báo, giao và giao lại KTV

**Files:**

- Create: `src/features/alerts/components/TicketWizardModal.tsx`,
  `TechnicianPicker.tsx`, `AssignTechnicianModal.tsx`, `AlertTicketBlock.tsx`
- Modify: `src/features/alerts/components/AlertDetailDrawer.tsx`
- Modify: `src/features/alerts/locales/vi.json`, `en.json` (thêm `ticket`,
  `technician`, `serviceType`, `specialty`)

**Interfaces:**

- Consumes: `createTicketFromAlert`, `assignTechnician`,
  `alertQueries.technicianSuggestions`, `CreateTicketInput`,
  `AssignTechnicianInput`, `SERVICE_TYPES`, `APPOINTMENT_SLOTS`.
- Produces:
  - `TicketWizardModal({ open, alert, onClose }: { open: boolean; alert: AlertDetail; onClose: () => void })`.
  - `TechnicianPicker({ params, value, onChange }: { params: TechnicianSuggestionParams; value?: string; onChange: (technicianId: string) => void })`.
  - `AssignTechnicianModal({ open, alert, mode, onClose }: { open: boolean; alert: AlertDetail; mode: 'assign' | 'reassign'; onClose: () => void })`.
  - `AlertTicketBlock({ alert }: { alert: AlertDetail })`.

- [ ] **Step 1: Viết `TechnicianPicker`**

Dùng `useQuery(alertQueries.technicianSuggestions(params))`. Phía trên hiện tên
trạm. Bảng chọn một dòng, giữ thứ tự backend trả về, cột: tên, chuyên môn, rảnh
trong khung giờ, số phiếu trong ngày, điểm đánh giá. Dòng bị vô hiệu kèm
tooltip lý do khi `freeInSlot` là `false`, hoặc khi `params.serviceType` là
`repair` mà chuyên môn không phải `repair`. Danh sách rỗng hiện trạng thái rỗng.

- [ ] **Step 2: Viết `TicketWizardModal` bước 1 (C7)**

Ant Design `Modal` với `Steps` hai bước và một `Form`. Giá trị ban đầu:

| Trường               | Giá trị ban đầu                                                              |
| -------------------- | ---------------------------------------------------------------------------- |
| `serviceType`        | `alert.suggestedServiceType`                                                 |
| `corePositions`      | Các lõi có `overThreshold`                                                   |
| `issueDescription`   | `alert.name`                                                                 |
| `contactName`        | `alert.customer?.name ?? ''`                                                 |
| `contactPhone`       | `alert.customer?.phone ?? ''`                                                |
| `address`            | `alert.customer?.address ?? ''`                                              |
| `appointmentDate`    | trống                                                                        |
| `appointmentSlot`    | trống                                                                        |
| `technicianNote`     | trống                                                                        |
| `mergedAlertIds`     | Toàn bộ id trong `alert.siblingAlerts`                                       |

Phần chỉ đọc ở đầu form: nguồn phiếu (mã cảnh báo), serial và model, tình trạng
bảo hành. Khi `alert.otherOpenTicketCount > 0` hiện `Alert` cảnh báo "Máy đang
có N phiếu chưa đóng".

Hiển thị có điều kiện: `corePositions` (nhóm checkbox các lõi của máy) chỉ khi
loại là `core_replacement`; `issueDescription` chỉ khi loại khác. Khối "Gộp
cảnh báo cùng máy" (nhóm checkbox, mỗi mục là tên và mã lỗi) chỉ khi
`siblingAlerts` không rỗng.

Luật kiểm tra phía giao diện trùng với Task 2 Step 6. `DatePicker` vô hiệu các
ngày trước hôm nay.

- [ ] **Step 3: Viết bước 2 (C8) và việc gửi**

Bước 2 render `TechnicianPicker` với ngày, khung giờ và loại dịch vụ của bước
1. Hai nút: "Tạo phiếu và giao KTV" (cần đã chọn KTV) và "Lưu phiếu, giao KTV
sau" (gửi không có `technicianId`).

Mutation `createTicketFromAlert`: thành công → đóng, `message.success` kèm mã
phiếu, `invalidateQueries({ queryKey: alertQueries.all })`. Lỗi `validation`,
`specialty_mismatch`, `technician_unavailable` → giữ form mở, hiện thông báo.
Lỗi `invalid_state`, `not_handler`, `not_found` → đóng form, hiện thông báo,
`invalidateQueries`.

- [ ] **Step 4: Viết `AssignTechnicianModal`**

Dùng cho hành động `assign` và `reassign`. Lấy ngày, khung giờ và loại dịch vụ
từ `alert.ticketDetail`; nếu ngày hoặc khung giờ vắng mặt (nhóm quyền tuỳ biến
có `service.write` mà thiếu `service.read`) thì hiện thông báo thiếu quyền xem
lịch hẹn thay cho danh sách. Render `TechnicianPicker`; chế độ `reassign` có
thêm ô lý do bắt buộc. Gửi `assignTechnician(alert.ticket.id, input)`; xử lý kết quả
như Step 3.

- [ ] **Step 5: Viết `AlertTicketBlock` và nối vào ngăn kéo**

Chỉ render khi `alert.ticket` khác `null`. Hiện mã phiếu, `TicketStatusTag`,
nhãn trạng thái giao KTV, loại dịch vụ; KTV và lịch hẹn khi có trong
`ticketDetail`; người liên hệ, số điện thoại, địa chỉ khi có; ghi chú cho KTV
khi có. Component không kiểm tra quyền, chỉ hiện trường nào backend trả về. Đặt
khối này ngay sau khối tóm tắt.

Trong ngăn kéo: `ContactResultDialog.onAgreed` mở `TicketWizardModal`; hành
động `assign` và `reassign` mở `AssignTechnicianModal` với `mode` tương ứng.

- [ ] **Step 6: Kiểm tra trên trình duyệt**

Dùng KTV theo hành vi ghi trong `src/mocks/fixtures/alerts.ts`.

- [ ] Đường chính: nhận cảnh báo lõi → Khách đồng ý → form điền sẵn loại Thay
      lõi, lõi vượt ngưỡng đã tích, thông tin khách đã điền → chọn ngày mai,
      khung 10:00-12:00 → bước 2 → chọn KTV hành vi `accept` → tạo. Cảnh báo
      thành Đã tạo phiếu, khối phiếu hiện TT2 và "Chờ KTV nhận việc". Sau
      khoảng 10 giây: TT3. Sau khoảng 50 giây nữa: phiếu TT7, cảnh báo tự Đã
      đóng với kết quả "Đã xử lý theo phiếu".
- [ ] Gộp: dùng máy có hai cảnh báo lõi. Form liệt kê và tích sẵn cảnh báo còn
      lại. Tạo phiếu: cả hai thành Đã tạo phiếu cùng mã phiếu, cùng đóng khi
      phiếu đạt TT7. Lặp lại với một máy khác và bỏ tích: cảnh báo kia vẫn ở
      hàng chờ.
- [ ] Khung giờ 08:00-10:00: KTV bận bị vô hiệu kèm tooltip. Loại Sửa chữa: KTV
      không có chuyên môn sửa chữa bị vô hiệu.
- [ ] KTV hành vi `decline`: sau khoảng 10 giây khối phiếu hiện "Cần giao lại
      KTV" và có nút "Giao lại KTV"; để trống lý do thì không gửi được; giao
      cho KTV `accept` thì đi tiếp.
- [ ] KTV hành vi `ignore`: sau khoảng 30 giây hiện "Cần giao lại KTV".
- [ ] "Lưu phiếu, giao KTV sau": khối phiếu hiện TT1 và "Chờ giao KTV"; nút
      "Giao KTV" mở danh sách gợi ý; giao xong thành TT2.
- [ ] KTV hành vi `accept_then_cancel`: phiếu thành Huỷ, cảnh báo quay về Đã
      nhận xử lý, vẫn là mình giữ, lịch sử có dòng phiếu bị huỷ, ghi lại kết
      quả liên hệ được.
- [ ] Ngày hẹn hôm qua không chọn được; số điện thoại 5 chữ số bị báo lỗi; loại
      Thay lõi không tích lõi nào bị báo lỗi.
- [ ] **Review Focus 3:** mở form tạo phiếu, chờ cảnh báo có `recoversAfterMs`
      tự đóng (bật `alert_auto_close`), rồi gửi: form đóng, có thông báo trạng
      thái đã thay đổi, không tạo phiếu.
- [ ] Tài khoản KD xem cảnh báo đã có phiếu: thấy mã, trạng thái, KTV, lịch
      hẹn; không thấy người liên hệ, địa chỉ, ghi chú. Tài khoản Nhà máy: chỉ
      thấy mã và trạng thái phiếu.
- [ ] Nhật ký hệ thống có dòng module "Phiếu dịch vụ" cho việc giao và giao lại
      KTV, kèm lý do.

- [ ] **Step 7: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add src/features/alerts
git commit -m "feat(alerts): create service tickets from alerts and dispatch technicians"
```

---

### Task 7: Kiểm tra toàn luồng và cập nhật tài liệu

**Files:**

- Modify: `docs/CMS_QnA_V1_SPEC.md` (mục 6.1, 6.3, 6.4, 2.4, và danh sách "Điểm
  cần làm rõ với KGR")
- Create: `.claude/pr-body-alert-center-cskh.md`

**Interfaces:**

- Consumes: toàn bộ các task trước.
- Produces: không có.

- [ ] **Step 1: Chạy ma trận quyền**

Đăng nhập lần lượt sáu tài khoản mẫu và đối chiếu với spec mục 7:

| Vai trò     | Menu | Nút xuất | Nhận xử lý, ghi kết quả | Tạo phiếu, giao KTV | Khối khách hàng | KTV và lịch hẹn của phiếu |
| ----------- | ---- | -------- | ----------------------- | ------------------- | --------------- | ------------------------- |
| Super Admin | Có   | Có       | Có                      | Có                  | Có              | Có                        |
| Admin       | Có   | Có       | Có                      | Có                  | Có              | Có                        |
| TT DV       | Có   | Có       | Có                      | Có                  | Có              | Có                        |
| Nhà máy     | Có   | Có       | Không                   | Không               | Không           | Không                     |
| KD          | Có   | Không    | Không                   | Không               | Không           | Có                        |
| Kho vận     | Không | —       | —                       | —                   | —               | —                         |

- [ ] **Step 2: Kiểm tra chế độ mô phỏng vai trò**

Super Admin bật mô phỏng TT DV. Bấm "Nhận xử lý": yêu cầu bị chặn, hiện thông
báo lỗi, không có gì thay đổi, trang không vỡ.

- [ ] **Step 3: Kiểm tra bố cục**

Thu trình duyệt về 375 px và 768 px: bảng cuộn ngang được, ngăn kéo và hai form
dùng được, không có nội dung tràn khỏi màn hình.

- [ ] **Step 4: Cập nhật `docs/CMS_QnA_V1_SPEC.md`**

- Mục 6.1: "người xử lý" là nhân viên CMS nhận cảnh báo; thêm cột trạng thái và
  phiếu.
- Mục 6.3: thay dòng trạng thái bằng hai luồng theo nhóm xử lý, dẫn sang spec
  thiết kế cho chi tiết Trang C.
- Mục 6.4: SLA của nhóm CSKH dừng ở lần ghi kết quả liên hệ đầu tiên.
- Mục 2.4: thêm bảng quy đổi TT1–TT9 sang năm trạng thái.
- "Điểm cần làm rõ với KGR": thêm mười câu ở mục 10 của spec thiết kế, giữ
  nguyên nhãn "đang dùng".

Không sửa ma trận quyền của mục 6 và mục 2.

- [ ] **Step 5: Viết mô tả PR**

Theo mẫu `.github/PULL_REQUEST_TEMPLATE.md` và file mô tả PR bản đồ đã có: tóm
tắt, ảnh hưởng tới từng vai trò, danh sách API backend cần làm (bảng ở Task 1
Step 5), các giả định chờ xác nhận (mục 10 của spec thiết kế), lệnh đã chạy,
và phần chưa kiểm tra. Ghi rõ giá trị SLA mặc định trong cấu hình hệ thống vẫn
đang trống.

- [ ] **Step 6: Chạy bốn lệnh kiểm tra và commit**

```bash
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
git add docs .claude/pr-body-alert-center-cskh.md
git commit -m "docs(alerts): sync alert handling flow into the CMS spec"
```
