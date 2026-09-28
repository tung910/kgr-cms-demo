# Device detail — align with CMS_QnA_V1 §3.4

Date: 2026-09-22
Branch: `feat/m03-device-detail`
Source: `docs/CMS_QnA_V1_SPEC.md` §3.4, 3.4b, 3.4c, 3.4d and their notes.

## Goal

The device detail screen (`src/features/devices/pages/DeviceDetailPage.tsx`)
already exists. This change closes the gaps against §3.4:

1. Owner/shared blocks and history are shown to every role and the mock API
   leaks `shared_members` / `owner_history` to roles without PII access.
2. Ownership is read-only; §3.4b requires change/remove owner and managing the
   shared list.
3. The water chart plots TDS out, flow and temperature instead of TDS in/out.
4. Filter cores show used % with two levels instead of remaining % with
   three levels.
5. History lacks online/offline events and export; device lock is gated as a
   lifecycle action instead of a control command; the factory role cannot see
   control state.

Out of scope: the device list (§3.2/3.3), the delete-record flow
(`DeviceDeleteDialog`), remote diagnostics, and the customers slice.

## Role outcome

| Role                | Owner & shared list | Change owner | Remove owner / revoke share | Control state | Send control | History | Export history |
| ------------------- | ------------------- | ------------ | --------------------------- | ------------- | ------------ | ------- | -------------- |
| Super Admin / Admin | ✅                  | ✅           | ✅                          | ✅            | ✅           | ✅      | ✅             |
| TT DV               | ✅                  | ✅           | —                           | ✅            | ✅           | ✅      | —              |
| Nhà máy             | —                   | —            | —                           | ✅            | —            | ✅      | ✅             |
| KD / Kho vận        | —                   | —            | —                           | —             | —            | —       | —              |

Every role with `device.read` keeps the technical block: serial, model,
status, firmware, quick stats, warranty, water chart, filter cores.

## Capabilities

| Capability                      | Holders                              | Use                                                        |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `device.pii.full` (existing)    | super, admin, service_center         | Read owner block, shared list, owner profile drawer        |
| `device.owner.update` (existing) | super, admin, service_center        | Change owner                                               |
| `device.lifecycle` (existing)   | super, admin                         | Remove owner, revoke shared member, restore, delete record |
| `device.control` (existing)     | super, admin, service_center         | Send commands, **lock/unlock** (moved from lifecycle)      |
| `device.control.read` (**new**) | super, admin, factory, service_center | Read-only power and lock state badges                     |
| `device.history.read` (existing) | super, admin, factory, service_center | History panel and history endpoints                      |
| `device.history.export` (existing) | super, admin, factory             | History CSV export                                         |

`device.control.read` is added to `CAPABILITIES`, `ROLE_CAPABILITIES`, the
matrix comment in `capabilities.ts`, and as the `read` cell of
`permissionCatalog`'s `device_control` row. `device_owner` in the catalog
already maps read/update/delete as above.

## Approach

PII is removed at the response layer and the UI gates with `PermissionGuard`
(same pattern as the existing `deviceForRole` masking). One detail DTO is
kept; owner fields become optional. Rejected: a separate ownership endpoint
(extra request, schema split) and UI-only hiding (PII stays in the API).

## 1. Role-based blocks

API (mock `src/mocks/handlers.ts`):

- `deviceForRole` (shared by the list and detail responses) omits
  `shared_members` and `owner_history` for roles without `device.pii.full` and
  drops `before_value`/`after_value` from owner-related audit entries
  (`change_owner`, `remove_owner`, `revoke_sharing`, `delete`, `restore`).
  `owner` stays reduced to `{ id }` so the §3.2 list keeps showing the customer
  ID; the detail UI hides it.
- `GET /devices/:id/owner` requires `device.pii.full` (403 otherwise).
- `ota-history`, `service-history`, `filter-changes`, `alerts` and the new
  `connectivity-history` require `device.history.read` (403 otherwise).

Schema/mapper: `shared_members` and `owner_history` become optional in the DTO;
the mapper returns `[]` when absent.

UI:

- `PermissionGuard capability="device.pii.full"` wraps
  `DeviceOwnershipPanel`, `DeviceOwnerDrawer`, and the owner/phone part of the
  `DeviceOverview` header line. Region stays visible.
- `PermissionGuard capability="device.history.read"` wraps `DeviceHistoryPanel`.
- Grid rows collapse when a block is hidden: a lone remaining block spans the
  full width, no empty column.

## 2. Owner and shared-list management

Schema (`deviceSchemas.ts`), fields present only for `device.pii.full`:

- `owner`: add `address`. The phone keeps using the existing `phone_masked`
  field, which the server fills per role.
- `shared_members[]`: add `phone`, `address`, `permission`.
  `permission` is a feature-local enum `'control' | 'view'`
  (Điều khiển / Chỉ xem).

API (`api/deviceDetailApi.ts`, parsed with Zod; mock handlers). Every mutation
requires a non-empty `reason`; the server writes an immutable audit entry with
actor, timestamp, before/after values and reason into the device operation log.

| Method & path                                    | Body                       | Capability            | Notes                                                                             |
| ------------------------------------------------ | -------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| `GET /devices/:id/owner-candidates?q=`           | —                          | `device.owner.update` | Customers matching phone or customer ID, max 10: `{ id, name, phone, address }`   |
| `PUT /devices/:id/owner`                         | `{ customer_id, reason }`  | `device.owner.update` | Closes the current `owner_history` entry; notifies the previous owner             |
| `POST /devices/:id/owner/remove`                 | `{ reason }`               | `device.lifecycle`    | Closes the current `owner_history` entry; notifies the previous owner             |
| `POST /devices/:id/shared-members/:memberId/revoke` | `{ reason }`            | `device.lifecycle`    | Revokes the member                                                                |

Removals use POST because `apiClient.delete` carries no body and the reason is
required (same convention as the existing `POST /devices/:id/delete`).

Owner mutations return `{ previous_owner_notified: boolean }`; the UI shows a
success toast that mentions the notification. Choosing the current owner as the
new owner is rejected (UI disables it; server returns 422). The candidate
endpoint is device-scoped so the devices slice does not import from
`features/customers`.

On success invalidate the device `detail`, `owner` and operation-log queries.
Errors (403/404/422) surface via `message.error` with the `ApiError` message.

UI:

- `DeviceOwnershipPanel` → titled "Quản lý chủ sở hữu":
  - Current owner card: name (opens the profile drawer), phone, address.
  - **Đổi chủ sở hữu** (`device.owner.update`) and **Xoá chủ sở hữu**
    (`device.lifecycle`) buttons, each in its own `PermissionGuard`.
  - Shared list table: Tên / SĐT / Địa chỉ / Quyền / **Thu hồi**
    (`device.lifecycle`).
  - Owner history timeline unchanged.
- `DeviceOwnerChangeDialog` (new): server-searched `Select` (debounced) and a
  required reason field.
- `DeviceReasonConfirmDialog` (new): generic confirm with a required reason,
  used for remove owner and revoke member, each with its own title and impact
  warning ("KH sẽ mất quyền điều khiển máy trên App").

## 3. Water chart and filter cores

Telemetry (`DeviceTelemetryPanel`):

- Point DTO becomes `{ measured_at, tds_in_ppm, tds_out_ppm }` (both nullable);
  `flow_lpm` and `temperature_c` are removed. Mock: TDS in ~150–400 ppm, TDS out
  ~5–60 ppm.
- Two lines on one ppm axis: **TDS vào** (warning color), **TDS ra** (water
  color). ECharts legend click toggles each line. Axis tooltip shows both values
  with the ppm unit.
- 24h / 7d / 30d selector unchanged; title/description become "Chất lượng nước
  vào/ra".

Filter cores (`DeviceFilterCoresPanel`):

- `filterCoreStatus` DTO adds `core_type` (string, configurable, e.g. PP, CTO,
  RO, Khoáng), optional `function`, `poor_percent`, `critical_percent`
  (thresholds from M04.1 config). `warning_days` stays for
  `DeviceCoreAlertsPanel`.
- Columns: Cấp / Loại lõi / Tên – chức năng / Thời gian ("còn 45 / 180 ngày"
  plus a remaining-% bar) / Trạng thái.
- `remainingPercent = clamp(round(remaining_days / total_days × 100), 0, 100)`.
- Pure function `coreHealth(remainingPercent, poorPercent, criticalPercent)` in
  `src/features/devices/utils/coreHealth.ts`:
  ≤ critical → `critical` "Quá kém" (danger); ≤ poor → `poor` "Kém" (warning);
  otherwise `good` "Tốt" (primary). Poor/critical rows get a tinted background.
- Mock thresholds: poor 30, critical 10.

## 4. History, export, lock, control state

History (`DeviceHistoryPanel`), tabs in spec order:

1. **Online/Offline** — new `GET /devices/:id/connectivity-history` returning
   `{ id, event: 'online' | 'offline', occurred_at, duration_seconds? }[]`;
   mock ~20 events.
2. **OTA** — existing.
3. **Bảo hành – bảo trì** — existing service history.
4. **Cảnh báo** — moved in from `DeviceAlertHistoryPanel`, which is deleted.
5. **Thay lõi** — existing filter changes.

Each tab loads independently and shows its own error/empty state.

Export: a **Xuất CSV** button in `Tabs.tabBarExtraContent`, wrapped in
`PermissionGuard capability="device.history.export"`, exports the active tab via
`downloadCsv` (`src/shared/lib/csv.ts`). File name
`device-<serial>-<tab>-<YYYY-MM-DD>.csv` (the helper appends the date); headers from i18n; no technician or
owner columns.

Lock (§3.4c): the API `setDeviceLifecycleState` exists but no button calls it
today. `DeviceLifecycleActions` gains a **Khoá** / **Mở khoá** button
(active ↔ locked) gated by `device.control`, and the mock `mutateDevice`
checks `device.control` for `set_lifecycle_state` (still `device.lifecycle`
when the target is `decommissioned`). Restore and delete record stay on
`device.lifecycle`.

Control state: two read-only badges in the detail header — **Nguồn: Bật/Tắt**
(`powered`) and **Khoá: Đang khoá/Hoạt động** (`lifecycle_state`) — wrapped in
`device.control.read`. Command buttons still require `device.control`.
Existing feature toggles (power, hot tank, membrane flush) are unchanged.

## i18n

All new labels go in `src/features/devices/locales/{vi,en}.json`. Shared-member
permission and core health labels are feature-local sets and stay in the
devices namespace.

## Delivery

One commit per task of the implementation plan
(`docs/superpowers/plans/2026-09-22-device-detail.md`) on
`feat/m03-device-detail`. The alert history moves into the history tabs in the
first task, together with the history gating.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.
- Manual run with MSW, using role simulation for all six roles, checking the
  role outcome table; change owner, remove owner and revoke share each produce
  an operation-log audit entry; CSV export per tab.
- No test framework is configured, so no tests are added; `coreHealth` is a
  pure function to be testable later.

## Assumptions (need business confirmation)

- Shared-member permission values are `control` / `view`; to be matched with
  the OneKangaroo app.
- Core health thresholds are per core from M04.1 config; mock uses 30% / 10%
  from the spec's example.
- Revoking a shared member counts as the D cell of 3.4b (Admin and above).
- Lock/unlock counts as a 3.4c control command, not a lifecycle action.
- Previous-owner notification is sent by the backend; the portal only reports
  it.
