# Bàn giao — Feature Chiến dịch (§7), áp delta theo audit

> Dùng file này để một session mới tiếp tục công việc đang dở. Cập nhật 2026-10-22: D1–D14 đã áp; D7–D14 đang ở working tree, chưa commit.

## Bối cảnh ngắn

Đang hoàn thiện module **Chiến dịch truyền thông** (spec §7) trong CMS portal (Vite + React + TS + TanStack Router/Query + AntD + Tailwind + MSW mock, Zod ở biên API). Một bản implementation gần trọn vẹn của feature **đã tồn tại trong working tree (chưa commit)**; cách làm đã chốt là **giữ bản đó làm nền, đối chiếu với §7 + 17 quyết định, rồi áp từng delta**. Mỗi delta chạy `pnpm typecheck && pnpm lint` cho xanh trước khi sang delta kế.

## Tài liệu nguồn (đọc trước)

- `docs/CMS_QnA_V1_SPEC.md` §7 (lines ~320–369) — spec gốc + ma trận quyền.
- `docs/CMS_QnA_V1_SPEC_7_SUPPLEMENT.md` — **17 quyết định đã chốt** (mục "Quyết định đã chốt") + mục 7.2.e (chiều phân khúc mở rộng).
- `docs/CAMPAIGN_FEATURE_BUILD_PLAN.md` — kiến trúc slice + phạm vi.
- `AGENTS.md`, `docs/CODING_CONVENTIONS.md`, `src/core/permissions/capabilities.ts`.

## Trạng thái git

- Branch: `feat/device-status-sublabels`. Nền campaigns + D1–D6 đã committed khi bắt đầu lượt tiếp tục (khác snapshot cũ).
- D7–D14 là thay đổi chưa commit; giữ nguyên file untracked ngoài phạm vi `.claude/pr-body-devices-inventory.md`.
- Không sửa generated `src/routeTree.gen.ts` bằng tay.

## Đã áp (D1–D6)

| Delta        | Nội dung                                                                                                                                              | File chính                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **D1** (#17) | Thêm capability `campaign.send` + `campaign.frequency.config` (super/admin, **không** sales); run/stop tách khỏi `campaign.approve` → `campaign.send` | `capabilities.ts`, `permissionCatalog.ts`, system locales, `campaignHandlers.ts:199`, `CampaignApprovalActions.tsx`      |
| **D2** (#6)  | Trường `opt_in` trên khách + loại trừ cứng opt-out trong matcher dùng chung (`isContactable`), áp cả trigger                                          | `audienceSchemas.ts`, `campaignMapper.ts`, `campaignAudience.ts`, `campaignHandlers.ts`                                  |
| **D3** (#14) | Mask PII tên trong sample preview theo `device.pii.full` + cờ `pii_masked`; `maskName` trong util                                                     | `shared/lib/mask.ts`, `audienceSchemas.ts`, `campaignMapper.ts`, `campaignHandlers.ts` (preview)                         |
| **D4** (#3)  | `content` → `contentVi` (bắt buộc) + `contentEn` (tùy chọn)                                                                                           | `campaignSchemas.ts`, mapper, handler, `campaigns.ts`, `CampaignWizard.tsx`, `CampaignDetailPage.tsx`, campaigns locales |
| **D5** (#2)  | Deeplink enum màn đã đăng ký + scheme `onekangaroo://` (Select thay Input)                                                                            | `constants/deeplinkTargets.ts` (mới), `campaignSchemas.ts` (refine), `CampaignWizard.tsx`, campaigns locales             |
| **D6** (#1)  | Ảnh upload → data URL (mock, không gửi server), kiểm PNG/JPG/WebP ≤2MB; bỏ input URL ngoài                                                            | `CampaignWizard.tsx` (`ImageUploadField`), `campaignSchemas.ts` (refine), campaigns locales                              |

## Đã áp tiếp (D7–D14) — theo thứ tự ưu tiên

| Delta                  | Nội dung                                                                                                                                                                                                                                      | Vị trí gợi ý                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **D7** (#15)           | Thêm `tenantId`/ngành gắn chiến dịch; hiển thị; chuyển tenant = backlog                                                                                                                                                                       | `campaignSchemas.ts` (DTO+domain+draft), mapper, handler create/update, `campaigns.ts` fixtures, wizard/detail         |
| **D8** (#12, 7.5.b)    | Thêm `priority`; thứ tự ưu tiên khi chạm trần tần suất (priority → createdAt); mô hình enforce cap                                                                                                                                            | schema + `campaignHandlers.ts`                                                                                         |
| **D9** (#16, 7.7.f)    | Metrics thêm `failed`, `failure_reason`, `send_id` (idempotent)                                                                                                                                                                               | `campaignSchemas.ts` (metrics), `campaignHandlers.ts:metricsFor`                                                       |
| **D10** (#8)           | Voucher: chế độ mã (shared vs per-customer, **default per-customer**)                                                                                                                                                                         | `campaignOfferSchema`, wizard voucher step                                                                             |
| **D11** (#11)          | Sửa sau duyệt → quay về `pending_approval` (hiện chặn 409 `not_editable`)                                                                                                                                                                     | `campaignHandlers.ts:334-337` (PUT), `CampaignDetailPage.tsx` gating edit                                              |
| **D12** (7.5.a, 7.7.c) | Thêm `paused` + pause/resume + dừng khẩn có thể đảo; audit create/update thêm before/after + reason; audit riêng cho gắn/sửa voucher                                                                                                          | `campaignStatus` enum, `nextStatus`, `TRANSITION_CAPABILITY`, audit calls trong handler, `CampaignApprovalActions.tsx` |
| **D13** (7.7.d)        | Config-over-hardcode: core-N-days, quiet hours, trần tần suất gộp, attribution window, cooldown, hệ số doanh thu (450k/320k) → `systemFixtures.ts` config; wire ngưỡng trigger (`tds_threshold_region=55`, `warranty_expiring_days=30` đã có) | `src/features/system/mocks/systemFixtures.ts`, `campaignHandlers.ts`, `campaignEnums.ts`                               |
| **D14** (#4, #13)      | Tenure gắn nhãn "ngày kích hoạt thiết bị đầu tiên"; mô hình attribution 7 ngày last-click                                                                                                                                                     | `audienceSchemas.ts`/`campaignAudience.ts`, metrics                                                                    |

## Quy ước phải giữ

- **DTO snake_case parse bằng Zod → mapper → domain camelCase**. DTO schema giữ permissive (parse response/fixtures); **draft input schema** là nơi siết validate (xem refine deeplink/image ở `campaignSchemas.ts`).
- **Gating**: `hasCapability` / `allowed(capability)`; **creator ≠ approver** đã enforce ở transition handler (`who.id === created_by` → 403).
- **Mask PII ở tầng response** (handler), không ở component; gate `device.pii.full`; dùng `src/shared/lib/mask.ts`.
- **Audit**: gọi `recordAudit(actor, {...})` (`@/features/system/mocks/systemHandlers`) cho mọi state-change; module `campaigns` đã thêm vào `auditModules.ts`.
- **Constants**: mảng `as const` `{ value, labelKey }`, `labelKey` dịch bằng `t(labelKey)` đúng namespace; không hard-code chữ dịch.
- **Mock role** để test: `localStorage['cms-portal:mock-auth-role']` (và `cms-portal:mock-auth-user`).

## Verify

- Bắt buộc mỗi delta: `pnpm typecheck && pnpm lint` (và `pnpm format:check`, `pnpm build` trước khi kết thúc).
- Thủ công (MSW): vào `/campaigns`, tạo chiến dịch (2 nội dung, Select deeplink, upload ảnh), preview số KH (opt-out bị loại, tên mask với role không có `device.pii.full`), chạy luồng Nháp→…→Kết thúc; role sales không thấy nút Cho chạy/Dừng (chỉ super/admin có `campaign.send`); kiểm `/system/audit` có bản ghi module `campaigns`.

## Kết quả lượt tiếp tục (2026-10-22)

- D7: tenant mặc định `water_purifier`, giữ cùng industry model reference; input từ chối tenant khác, wizard/detail hiển thị ngành; chuyển tenant vẫn backlog.
- D8–D9: priority cao trước, cùng priority thì tạo sớm trước; ledger gửi dùng chung mọi kênh/campaign, định danh lượt gửi theo tenant/campaign/customer/lần gửi. Metrics lấy từ ledger, có failed/failureReason/sendId và không tăng khi đọc lại.
- D10: mã dùng chung hoặc riêng từng khách; mặc định riêng từng khách. Ledger mock giữ mã phát hành, không gọi storefront thật.
- D11–D12: sửa sau duyệt/chạy/tạm dừng trả Chờ duyệt, xóa phê duyệt hiện hành; dấu bảo vệ voucher đã duyệt được giữ riêng để không lách quyền bằng hai lần sửa. Pause và emergency stop đều sang paused, resume khôi phục running. Metrics vẫn xem được khi paused hoặc chờ duyệt lại.
- D12: wizard/transition yêu cầu lý do; create/update có before/after; gắn/sửa voucher ghi audit riêng, scheduler ghi audit khi tự đổi trạng thái.
- D13: System settings chứa 9 tham số campaigns (core days, quiet start/end, frequency limit/window, attribution window, cooldown, hai hệ số doanh thu). Handler đọc config hiện tại; TDS/bảo hành dùng tham số chung đã có. Trần tần suất yêu cầu campaign.frequency.config ở UI và mock backend.
- D14: tenure từ first_activated_at; đơn mock khử trùng theo customer/type, gán cho click thành công gần nhất trong cửa sổ cấu hình (mặc định 7 ngày), VND net; UI ghi rõ dữ liệu mock.
- Mỗi delta đã chạy typecheck + lint; cuối lượt format:check + build đều pass. Lint còn warning có sẵn public/mockServiceWorker.js; build cảnh báo chunk >500 kB.
- Browser/MSW: 27 assertions pass về tenant, quyền duyệt, priority + cap, idempotency, pause/stop/resume, duyệt lại, bảo vệ voucher, audit, cấu hình có hiệu lực không reload, trigger TDS, quiet hours, attribution, opt-out/mask và tenure. Đã tạo chiến dịch và gửi duyệt bằng wizard thật, render detail/metrics, đổi sang tiếng Việt và kiểm screenshot mobile 390px.
- Review độc lập phát hiện 3 lỗi (submit thiếu reason, voucher bypass sau reset approval, paused ẩn metrics); cả 3 đã sửa và kiểm tra lại.

### Giới hạn giữ nguyên

Mock in-memory reset khi reload, scheduler chạy khi đọc; không gửi push thật, không có worker bền vững. Voucher/đơn hàng/loyalty/provider thật và chuyển tenant vẫn backlog/assumption theo supplement. Không thêm framework hay test file vào repo; self-check chạy bằng Playwright đã cài, script tạm ở TEMP.
