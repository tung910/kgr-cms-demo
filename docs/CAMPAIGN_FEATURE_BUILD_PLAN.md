# Kế hoạch build — Feature Chiến dịch truyền thông (§7)

> Căn cứ: `docs/CMS_QnA_V1_SPEC.md` §7 + `docs/CMS_QnA_V1_SPEC_7_SUPPLEMENT.md` (17 quyết định đã chốt 2026-10-22). Tuân thủ `AGENTS.md`, `docs/CODING_CONVENTIONS.md`, `docs/SCREEN_WORKFLOW.md`.

## Context

Portal CMS nội bộ KGR cần module **Chiến dịch** (marketing/push) — đối trọng của app OneKangaroo: tạo chiến dịch push/in-app banner, phân khúc đối tượng có xem trước số KH, chạy qua luồng duyệt, gắn ưu đãi, và đo hiệu quả. Hệ thống đã **seed sẵn** 6 capability `campaign.*` nhưng chưa có route/slice/menu. Backend là MSW in-memory nên bản build này là **UI + mock**; mô hình dữ liệu viết theo hướng nối backend thật sau không phải làm lại.

## Phạm vi bản build

**Làm đầy đủ:** 7.1 tạo chiến dịch (push + in-app banner), 7.2 phân khúc + preview số KH, 7.5 luồng duyệt Nháp→Chờ duyệt→Đã duyệt→Đang chạy→Kết thúc (+ nhánh từ chối/tạm dừng/dừng khẩn) + trần tần suất + gửi thử.
**Làm nhẹ-nhưng-có:** 7.3 trigger (danh sách rule cấu hình: core ≤ N ngày, bảo hành ≤ 30 ngày, TDS cao), 7.4 ưu đãi (gắn voucher/điểm dạng object, chưa làm module quản lý voucher riêng).
**Read-only, số liệu fabricate:** 7.6 metrics trên trang chi tiết.
**Backlog (ghi nhận, không làm):** chuyển tenant, RFM, lifecycle stage, A/B test, các chiều phân khúc gắn `Backlog` ở mục 7.2.e, loyalty engine thật, push provider thật.

## Kiến trúc slice (mirror `features/serials` + `features/system`)

```
src/features/campaigns/
  schemas/      campaignSchemas.ts, segmentSchemas.ts, voucherSchemas.ts, metricSchemas.ts
  api/          campaignApi.ts, campaignMapper.ts
  queries/      campaignQueries.ts
  constants/    campaignStatus.ts, campaignChannel.ts, triggerType.ts
  components/    CampaignTable.tsx, CampaignFilters.tsx, CampaignStatusTag.tsx,
                 CampaignFormModal.tsx, SegmentBuilder.tsx, AudiencePreview.tsx,
                 CampaignApprovalActions.tsx, VoucherForm.tsx, CampaignMetricsPanel.tsx,
                 TriggerRuleList.tsx, CampaignListSkeleton.tsx
  pages/        CampaignListPage.tsx, CampaignDetailPage.tsx
  mocks/        campaignHandlers.ts
  locales/      en.json, vi.json
src/routes/_authenticated/campaigns/index.tsx      (+ $campaignId.tsx)
src/mocks/fixtures/campaignAudience.ts, campaigns.ts
```

Pattern bắt buộc: DTO snake_case parse bằng Zod `safeParse` → `invalidResponse` → mapper sang domain camelCase; query factory root key `['campaigns']`; filter/pagination trong route search đã validate (`.catch(default)`); `beforeLoad` gate `campaign.read` → redirect `/403`.

## 1. Capabilities & phân quyền

- `src/core/permissions/capabilities.ts`: thêm `campaign.send`, `campaign.frequency.config` vào union `Capability` và gán cho `super_admin`, `admin` (giữ nguyên 6 capability `campaign.*` đã seed). Cập nhật `permissionCatalog.ts` thêm 2 dòng dưới module `campaigns`.
- Ma trận áp theo spec: `campaign.write` (tạo/sửa) → super/admin/sales; `campaign.approve` (duyệt/từ chối) → super/admin; `campaign.send` (cho chạy/dừng) → super/admin; `campaign.voucher.create` → super/admin/sales, `campaign.voucher.update` (sửa voucher đã phát) → super/admin; `campaign.export` → super/admin/sales; service_center chỉ `campaign.read`.
- **Creator ≠ approver** enforce ở handler: người bấm "Gửi duyệt" không được tự "Duyệt".

## 2. Menu wiring (4 chỗ `AppShell.tsx` + 2 chỗ `capabilities.ts`)

- `capabilities.ts`: thêm `'campaign'` vào `PORTAL_MENU_KEYS`, map `MENU_CAPABILITY.campaign = 'campaign.read'`.
- `AppShell.tsx`: thêm `navigationItems` (group `business`, icon AntD), `getSelectedMenuKey` (`/campaigns`→`campaign`), `navigateToMenu` case `campaign`, `pathLabelKeys`.
- Nav label `nav.campaign` ở `src/core/i18n/locales/{en,vi}.json`.

## 3. Domain model (schemas/Zod)

- **Campaign**: `id, name, channel('push'|'in_app_banner'), status, contentVi, contentEn?, title, imageUrl?, deeplink, scheduleMode('now'|'scheduled'), startsAt, endsAt, priority, segment, voucherRef?, triggerRule?, tenantId, frequencyCapOverride?, createdBy, approvedBy?`.
- **Segment**: `conditions: { field, operator, value }[]` nối AND; enum `field` theo 7.2 gốc + các chiều `Demo` ở 7.2.e; `operator` ∈ `in|gte|lte|range|eq`.
- **Voucher**: `code|codeRule, type('percent'|'fixed'|'free_ship'|'points'), value, minOrder, applicableSkus[], validFrom, validTo, usageLimitTotal, usageLimitPerCustomer(=1), stackable(false)`.
- **Metrics** (fabricate): `sent, delivered, failed, failureReason?, opened, clicked, converted{booking,coreQr}, revenue`.
- **Trigger rule**: `type('core_days'|'warranty_expiring'|'tds_high'), threshold, cooldownDays, offerRef?`.
- Constants `as const {value,labelKey}`: `CAMPAIGN_STATUSES` (+ `CAMPAIGN_STATUS_TONES`), `CAMPAIGN_CHANNELS`, `TRIGGER_TYPES` — labelKey trỏ `common` ns, dùng `t(labelKey,{ns:'common'})` (mẫu `shared/constants/connectionStatus.ts`).

## 4. Mock data + MSW handlers (`campaignHandlers.ts`, spread vào `src/mocks/handlers.ts`)

- **Dataset đối tượng mock** `fixtures/campaignAudience.ts`: ~300–500 khách, mỗi khách mang đủ field phân khúc `Demo` (region, model, FW, coreDaysRemaining, warrantyStatus, loyaltyPoints, regionTds, tenureMonths, deviceCount, genuineCore, optIn, language, accountType, accountStatus, serviceCenter, waterQualityZone). Reset theo session.
- **Endpoints**: `GET /api/campaigns` (list, filter, paginate + mask PII theo role), `GET /api/campaigns/:id`, `POST /api/campaigns`, `PUT /api/campaigns/:id`, `POST /api/campaigns/:id/transition` (submit/approve/reject/send/pause/resume/stop — guard theo capability + creator≠approver + reason bắt buộc), `POST /api/campaigns/audience-preview` (đếm khách match, loại trừ opt-out + trần tần suất, dedup customerId, cảnh báo >50k), `GET /api/campaigns/:id/metrics` (fabricate deterministic), `POST /api/campaigns/:id/test-send` (không tính metric), `GET /api/campaigns/export` (gate `campaign.export`, mask PII).
- Preview-count dùng lại pattern `status-counts` (`handlers.ts:796`), filter engine mô phỏng `filterDevices`.
- **Scheduled activate lazily-on-read**: khi GET list/detail, campaign `scheduled` quá `startsAt` tự chuyển `running` (mẫu diagnostics `handlers.ts:168`).

## 5. Audit (bắt buộc)

- Thêm `{ value:'campaigns', labelKey:'audit.modules.campaigns' }` vào `src/features/system/constants/auditModules.ts` + locale `audit.modules.campaigns`.
- Mọi transition + tạo/sửa + gắn/sửa voucher gọi `recordAudit(actor, {...})` (`systemHandlers.ts:267`, exported), dùng `diff(before,after)`, kèm `reason`. Append-only, không route sửa/xoá.

## 6. UI (AntD + Tailwind + shared portal components)

- **List** (`CampaignListPage`): `PortalPageHeader`, grid `PortalStatCard` theo trạng thái, `PortalCard` bọc `CampaignTable` (status tag + tone), filter bar (search/status/channel), pagination qua route search; nút "Tạo chiến dịch" trong `PermissionGuard capability="campaign.write"`.
- **Create/Edit** (`CampaignFormModal`): mẫu từ `serials/CampaignModal.tsx` — tên, kênh, nội dung (vi bắt buộc + en tùy chọn), ảnh, deeplink (Select danh sách màn), RangePicker giờ chạy, gửi ngay/hẹn giờ; `SegmentBuilder` (thêm điều kiện field/operator/value) + `AudiencePreview` (nút "Xem trước số KH", **bắt buộc trước khi lưu**); `VoucherForm` tùy chọn.
- **Detail** (`CampaignDetailPage`): thông tin + `CampaignStatusTag`, `CampaignApprovalActions` (Gửi duyệt/Duyệt/Từ chối/Cho chạy/Tạm dừng/Dừng — mỗi hành động `Modal` + reason `Input.TextArea`, mẫu `DeviceReasonConfirmDialog.tsx`), `CampaignMetricsPanel` (7.6 read-only), `TriggerRuleList` (7.3).
- Tất cả hành động nhạy cảm bọc `PermissionGuard` đúng capability.

## 7. i18n

Thêm namespace `campaigns` (register ở `src/core/i18n/index.ts`: import en/vi, thêm vào `resources` + `ns`). Status/channel/trigger labelKey + audit module + nav label ở `common` ns.

## Thứ tự thực hiện (milestone)

1. **Nền tảng**: capabilities (2 mới) + menu wiring + route rỗng + i18n ns + constants + schemas. → lint/typecheck pass, menu hiện.
2. **List + mock CRUD**: fixtures campaigns, handlers list/get, `CampaignTable`, list page, route gate. → xem được danh sách.
3. **Create + Segment + Preview**: form modal, segment builder, audience dataset + audience-preview endpoint (dedup/opt-out/trần). → tạo nháp + xem trước số KH.
4. **Luồng duyệt + audit**: transition endpoint (guard + creator≠approver + reason), approval actions UI, audit module. → chạy hết 5 trạng thái + nhánh từ chối/dừng.
5. **Ưu đãi + Trigger**: voucher form/object, trigger rule list.
6. **Metrics + export + test-send**: metrics panel fabricate, export (mask PII), test-send.
7. **Đánh bóng**: skeleton, empty state, responsive, mobile card list.

Mỗi milestone chạy `pnpm lint && pnpm typecheck && pnpm format:check` trước khi sang bước sau.

## Verification

- Checks bắt buộc: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.
- Thủ công với MSW (mock role qua `localStorage['cms-portal:mock-auth-role']`):
  - Vào `/campaigns` bằng role sales → thấy menu + tạo được nháp; preview số KH đổi theo điều kiện; không lưu được nếu chưa preview.
  - Role sales "Gửi duyệt" rồi thử tự "Duyệt" → bị chặn (creator≠approver); role admin duyệt được.
  - Chạy đủ Nháp→…→Kết thúc + từ chối + tạm dừng/dừng; kiểm tra `/system/audit` có bản ghi `campaigns` với before/after + reason.
  - Role service_center chỉ xem, không thấy nút ghi.
  - Export danh sách đối tượng → PII bị mask đúng theo role.

## Rủi ro / phụ thuộc còn mở (assumption)

Voucher redemption (e-commerce §10), loyalty engine, doanh thu attribution, push provider thật — demo mock, chốt hợp đồng khi nối backend. Chuyển tenant và các chiều phân khúc `Backlog` chưa làm.

Mở rộng chiến dịch gắn gói dịch vụ (CTA mua gói, voucher theo gói, lượt mua `campaign_purchase`): xem [spec](superpowers/specs/2026-10-28-service-package-campaigns-design.md) và mục "Quảng cáo gói qua chiến dịch" trong `docs/SERVICE_PACKAGE_CATALOG.md`.
