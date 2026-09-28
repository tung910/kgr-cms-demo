# Dashboard (M01) & device list (M03) — align with CMS_QnA_V1

Date: 2026-09-22 · Source: `docs/CMS_QnA_V1_SPEC.md` §1, §3.1–3.3

Both screens already exist (`src/features/dashboard`, `src/features/devices`).
This change brings them in line with CMS_QnA_V1; anything the spec does not
mention is removed.

## Decisions

- **1.3 export is split by content** into two capabilities (confirmed with the
  user):
  - `dashboard.tds.export` — Super Admin, Admin, Nhà máy, KD.
  - `dashboard.revenue.export` — Super Admin, Admin, KD.
  - TT DV and Kho vận can view 1.3 but cannot export it.
- **Out-of-spec UI is removed**: `ActiveAlertsPanel` and `RoleScopeBanner` on
  the dashboard; the Customer and Warranty filters on the device list.
- **Data loading**: `GET /dashboard/summary` keeps serving 1.1–1.3 (single
  30 s refetch). 1.4 has its own endpoint because it takes its own parameters.
- **Export format**: CSV via the existing `src/shared/lib/csv.ts`
  (`downloadCsv`); Excel opens it. No xlsx dependency.

## Assumptions

- Region data scope (1.1 note): the backend filters every dashboard and
  device endpoint by the region assigned to the user. The frontend sends no
  region parameter for it and the mock ignores it.
- 3.2 note: the owner name is masked server-side for roles without
  `device.pii.full`; the UI also hides it and shows the customer ID instead.
  The mock strips `owner.name` for those roles.

## 1. Permissions

`src/core/permissions/capabilities.ts`:

- Add `dashboard.tds.export` and `dashboard.revenue.export` to `CAPABILITIES`,
  to the default role matrix, and to the matrix comment (sheet row 1.3).
- 1.4 is unchanged: `dashboard.active.read` shows the block (hidden, not
  disabled, when missing); `dashboard.active.export` shows its export button.

## 2. Dashboard

### 1.1 — Six realtime metrics

Unchanged: six stat cards (online devices, 24 h error rate, national average
TDS, active users, filters sold this month, filter revenue this month) with a
trend percentage and the "Cập nhật realtime" badge; `refetchInterval: 30_000`.

### 1.2 — Online/offline by hour

- DTO `online_trend[]` becomes `{ label, online, offline }` (was
  `online, active`).
- Two lines (Online, Offline); axis tooltip shows both values for each hour.

### 1.3 — TDS by region & filter revenue

- TDS bars above `tds_threshold` use the `danger` (red) colour; others keep
  `water`. The threshold (default 55 ppm) comes from the API.
- TDS card: "Xuất Excel" button behind `dashboard.tds.export`; columns
  region, TDS (ppm), over threshold (yes/no).
- Revenue card (6 months, revenue bars + filters-sold line): "Xuất Excel"
  button behind `dashboard.revenue.export`; columns month, revenue, filters
  sold.
- Both exports build the CSV client-side from the already-loaded summary.

### 1.4 — Active customers & devices (new)

- Endpoint: `GET /dashboard/active?granularity=week|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD`
  → `{ granularity, points: { label, customers, devices }[] }`, parsed with
  Zod at the API boundary and mapped to camelCase.
- Route `/` gains `validateSearch` with `granularity` (default `month`),
  `from`, `to` (optional; default range is chosen by the backend/mock).
- UI: one section with a shared Segmented control (Tuần / Tháng / Năm) and an
  antd `RangePicker`, then two charts (active customers, active devices).
- Export button (CSV of the loaded points) behind `dashboard.active.export`.
- The query is only enabled when the user has `dashboard.active.read`.

### Removed

`ActiveAlertsPanel`, `RoleScopeBanner`, the `alerts` field in the summary
DTO/fixture, and their i18n keys.

## 3. Device list

### 3.1 — Quick stats

- New endpoint `GET /devices/status-counts` with the same filters as the list
  minus `status` and pagination → `{ total, online, warning, offline }`.
- Four stat cards: Total, Online, Lỗi, Offline.
- Replaces `deviceQueries.statusCounts`, which fetched the whole fleet on the
  client (resolves its TODO).

### 3.2 — Device directory columns

1. Serial + model
2. Khu vực — `ward, province` (DTO gains optional `ward`; `region` stays the
   province); owner name above it only with `device.pii.full`, otherwise the
   customer ID
3. Trạng thái
4. Lần cuối kết nối — relative time via dayjs `relativeTime`
   ("Vừa xong" under 1 minute, then "x phút trước", "x giờ trước", …)
5. % lõi lọc còn lại (existing indicator)
6. Firmware (module + mainboard)
7. Ngày kích hoạt (`activatedAt`, date only; "—" if missing)
8. Chi tiết

Pagination: default `pageSize` 10, options 10/20/50. The mobile card layout
shows the same data.

### 3.3 — Filters, search, export

- Filters: model, region, status (Tất cả / Online / Lỗi / Offline); search by
  serial or owner name.
- Removed: Customer and Warranty dropdowns; `warrantyStatus` is dropped from
  the route search schema and the API filters.
- `customerId` stays in the route search schema (no UI) because
  `CustomerTable.tsx` links to `/devices?customerId=…`; that link's
  `pageSize` changes to 10.
- "Xuất CSV" (behind `device.export`) exports with the current filters, as
  today.

## 4. Mocks & i18n

- `src/mocks/handlers.ts`: update `/api/dashboard/summary`, add
  `/api/dashboard/active` and `/api/devices/status-counts`, strip owner names
  for roles without `device.pii.full`, add `ward` to device fixtures.
- `vi`/`en` locales for `dashboard` and `devices`: add new keys, remove the
  unused ones.

## 5. Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.
- Manual run with MSW (Playwright), as Admin, Nhà máy and KD:
  - Admin: both 1.3 exports and the 1.4 block with its export.
  - Nhà máy: TDS export only; no 1.4 block.
  - KD: both 1.3 exports and 1.4 with export; device list shows customer ID
    instead of the owner name.
