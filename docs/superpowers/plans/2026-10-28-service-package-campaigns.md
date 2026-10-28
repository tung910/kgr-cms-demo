# Service Package Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiến dịch tuỳ chọn trỏ tới một gói dịch vụ đang phát hành: CTA mở trang gói, voucher áp lên gói, lọc máy đã có gói, số liệu mua gói và quyền lợi nguồn `campaign_purchase`.

**Architecture:** Mở rộng slice `campaigns` (schema, CTA, wizard, số liệu) và đọc gói qua bản tóm tắt tối thiểu do API chiến dịch trả, không gọi API danh mục. MSW chiến dịch đọc `packageStore` sống; quyền lợi mua qua chiến dịch nằm trong `entitlementStore` chung và là nguồn của số lượt mua.

**Tech Stack:** React 19, TypeScript, Zod 4, Ant Design 6, TanStack Query/Router, MSW 2, i18next, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-28-service-package-campaigns-design.md` (đã duyệt).

## Global Constraints

- Node.js 24+, pnpm 10+; không thêm dependency, framework hay file test (AGENTS.md). Kiểm chứng bằng assert tạm chạy qua Vite SSR từ scratchpad (không commit) và thao tác MSW trên trình duyệt.
- Ô chọn gói **tuỳ chọn**; chiến dịch `promoted_package_id = null` giữ nguyên hành vi, số khách xem trước và số liệu giả lập.
- Chỉ gói `active`, đủ cấu hình, không thuộc nhóm `bundle`; một chiến dịch tối đa một gói.
- Voucher gói định kỳ chỉ giảm **kỳ thu tiền đầu**; giá gốc là `price` cho `billing_period_months`.
- Gói miễn phí/gộp giá: không voucher giảm giá. Gói báo giá: chỉ giảm %. Số tiền giảm ≤ giá một kỳ.
- Không thêm capability. `GET /campaigns/package-options` gate `campaign.write`; mọi màn chiến dịch dùng bản tóm tắt gói trong DTO chiến dịch, không cần `service_package.read`.
- Không đổi mã máy `DEV-…`/`KGR-…`, luồng nhập lô, cảnh báo lõi, bảo hành điện tử, quyền lợi/audit đã có.
- DTO parse Zod tại API boundary, mapper camelCase, nhãn VI/EN cùng lúc, hằng số `as const {value,labelKey}`, capability qua `hasCapability`.
- Sau mỗi task: `pnpm typecheck` và `pnpm lint`; cuối cùng thêm `pnpm format:check`, `pnpm build`. Không chạy hai `tsc -b` song song. Không push.

## Review Focus

1. Gói bị ngừng bán sau khi chiến dịch đã lưu: gửi duyệt/duyệt/chạy/chạy lại bị 409 `package_unavailable`; đang chạy thì hiện cảnh báo và không sinh lượt gửi mới (Task 2, Task 4).
2. Chiến dịch cũ không gói: số khách xem trước và số liệu `CMP-0001…0008` y hệt trước khi đổi (Task 2).
3. Đổi hoặc bỏ gói trong wizard để lại nút `buy_service_package`, ràng buộc voucher hay điều kiện loại trừ cũ (Task 3).
4. Voucher không hợp lệ với gói (vượt giá, gói miễn phí, giảm tiền trên gói báo giá) bị chặn cả ở UI và mock (Task 1, Task 2, Task 3).
5. Chữ giá gói định kỳ với `billing_period_months` khác 12 hoặc gói một lần (Task 1).

## Quyết định triển khai của người viết

- Bản tóm tắt gói được MSW ghép **lúc đọc** từ `packageStore`, nên phản ánh trạng thái hiện tại. Fixture chỉ lưu `promoted_package_id`.
- Voucher khi có gói ghi `appliesTo = <mã gói>`; ô "áp dụng cho" tự do bị ẩn.
- Số lượt mua gói = số quyền lợi `campaign_purchase` của chiến dịch trong `entitlementStore`, được seed khi load. Như vậy số liệu khớp với quyền lợi trên máy mà không cần ghi khi GET.
- Seed: chiến dịch mới `CMP-0009` "Vệ sinh máy giảm 20% năm đầu", đang chạy, gói `pkg-demo-clean` (600.000đ/12 tháng), voucher 20%, có 3 quyền lợi mua trên 3 máy `KGR-…` đã kích hoạt chưa có gói này.

---

### Task 1: Hợp đồng gói quảng cáo và quy tắc giá

**Files:**
- Modify: `src/features/campaigns/schemas/campaignSchemas.ts`, `src/features/campaigns/schemas/audienceSchemas.ts`, `src/features/campaigns/api/campaignMapper.ts`, `src/features/campaigns/api/campaignApi.ts`, `src/features/campaigns/queries/campaignQueries.ts`, `src/features/campaigns/constants/campaignCta.ts`, `src/features/campaigns/constants/deeplinkTargets.ts`, `src/features/campaigns/locales/{vi,en}.json`
- Create: `src/features/campaigns/utils/packagePricing.ts`

**Interfaces:**
- Produces:
  - `promotedPackageDtoSchema`: `{id, code, name, group, status, grantable: boolean, billing_type, price: int ≥0 | null, billing_period_months: int>0 | null, pricing_mode: 'fixed'|'free_or_included'|'quotation', term_months: int>0 | null}`; `promotedPackageListDtoSchema = z.array(...)`. Domain `PromotedPackage` camelCase (`billingType`, `billingPeriodMonths`, `pricingMode`, `termMonths`).
  - `campaignDtoSchema` thêm `promoted_package_id: string | null`, `promoted_package: PromotedPackageDto | null`; `Campaign` thêm `promotedPackageId`, `promotedPackage`.
  - `CampaignDraftInput`/`campaignDraftInputSchema` thêm `promotedPackageId: string | null`; refine: có nút `buy_service_package` thì bắt buộc `promotedPackageId` (`message: 'package_required'`).
  - `audienceConditionsSchema` thêm `excludeActivePackageId: z.string().min(1).optional()`; `audienceDeviceDtoSchema` thêm `active_package_ids: z.array(z.string())`.
  - `campaignMetricsDtoSchema` thêm `package_purchases: int ≥0`, `package_revenue: number ≥0`; `CampaignMetrics` thêm `packagePurchases`, `packageRevenue`.
  - `BUTTON_TYPES` thêm `{ value: 'buy_service_package', deeplink: 'onekangaroo://service-packages', labelKey/defaultLabelKey: 'button.type.buy_service_package' / 'button.defaultLabel.buy_service_package' }`.
  - `buttonDeeplink(button: CampaignButtonLike, promotedPackageId?: string | null): string | null` — loại mới trả `onekangaroo://service-packages/<encoded id>`, thiếu ID trả `null`.
  - `isDeviceScopedDeeplink` trả `true` cho mọi deeplink bắt đầu bằng `onekangaroo://service-packages/`.
  - `getCampaignPackageOptions(signal?): Promise<PromotedPackage[]>` gọi `GET /campaigns/package-options`; `campaignQueries.packageOptions()` với key `['campaigns', 'package-options']`.
  - `packagePricing.ts`:
    - `type PackageOfferIssue = 'free_package_discount' | 'quotation_amount_discount' | 'discount_exceeds_price'`
    - `validatePackageOffer(pkg: PromotedPackage, offer: CampaignOffer | null): PackageOfferIssue | null`
    - `firstPeriodPrice(pkg: PromotedPackage, offer: CampaignOffer | null): number | null` — giá kỳ đầu sau voucher; `null` khi báo giá.
    - `packagePriceLines(pkg: PromotedPackage, offer: CampaignOffer | null, t: TFunction): string[]` — dòng chữ cho xem trước/tóm tắt.

- [ ] **Step 1: Viết assert tạm** `<scratchpad>/assert-package-pricing.mjs`, dùng `createServer({ server: { middlewareMode: true }, appType: 'custom' })` + `ssrLoadModule('/src/features/campaigns/utils/packagePricing.ts')` và `campaignCta.ts`/`deeplinkTargets.ts`. Gói mẫu `clean = {price: 600000, billingType: 'recurring', billingPeriodMonths: 12, pricingMode: 'fixed', …}`:
  - `firstPeriodPrice(clean, {type:'voucher', discountType:'percent', discountValue:20}) === 480000`
  - `firstPeriodPrice(clean, {type:'voucher', discountType:'amount', discountValue:100000}) === 500000`
  - `validatePackageOffer(clean, {…amount, discountValue: 600001}) === 'discount_exceeds_price'`; `discountValue: 600000` → `null`
  - gói `pricingMode:'free_or_included', price:0` + voucher bất kỳ → `'free_package_discount'`; + `{type:'loyalty_points'}` → `null`
  - gói `pricingMode:'quotation', price:null` + amount → `'quotation_amount_discount'`; + percent → `null`; `firstPeriodPrice` → `null`
  - `packagePriceLines` với `t = (k, o) => k + JSON.stringify(o ?? {})`: gói định kỳ 12 tháng có voucher cho key kỳ đầu + key gia hạn với `months: 12`; `billingPeriodMonths: 6` cho `months: 6`; gói `one_time` không có dòng gia hạn.
  - `buttonDeeplink({type:'buy_service_package'}, 'pkg a') === 'onekangaroo://service-packages/pkg%20a'`; không ID → `null`; `isDeviceScopedDeeplink('onekangaroo://service-packages/x') === true`.
- [ ] **Step 2: Chạy** `node <scratchpad>/assert-package-pricing.mjs` — kỳ vọng lỗi import (module chưa có).
- [ ] **Step 3: Cài đặt** schema/mapper/API/query/CTA/deeplink theo Interfaces; `packagePricing.ts` đọc định dạng tiền như `offerText.ts` (`toLocaleString('vi')` + `unit.vnd`). Key i18n mới (VI/EN) dưới `campaigns`: `button.type.buy_service_package`, `button.defaultLabel.buy_service_package` ("Mua gói"/"Buy plan"), `package.price.firstPeriod` (`"{{price}} {{period}} đầu"`), `package.price.renewal` (`"sau đó {{price}}/{{period}}"`), `package.price.oneTime`, `package.price.free`, `package.price.quotation`, `package.price.quotationDiscount` (`"Giảm {{value}}% trên báo giá"`), `package.period.year`, `package.period.months` (`"{{count}} tháng"`); 12 tháng dùng "năm".
- [ ] **Step 4: Giữ build xanh với giá trị trung tính:** base fixture `promoted_package_id: null`; handler trả `promoted_package: null`, `package_purchases: 0`, `package_revenue: 0`; mỗi máy đối tượng `active_package_ids: []`; `buildDraftInput` gửi `promotedPackageId: null`; `buttonDeeplink` gọi cũ giữ nguyên. Chạy lại assert — tất cả in `ok`.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint` exit 0; commit `feat(campaigns): define promoted service package contract`.

### Task 2: MSW — gói quảng cáo, đối tượng, số liệu và quyền lợi mua

**Files:**
- Modify: `src/mocks/stores/servicePackageStore.ts`, `src/mocks/stores/inventoryImportStore.ts`, `src/mocks/stores/entitlementStore.ts`, `src/features/campaigns/mocks/campaignHandlers.ts`, `src/mocks/fixtures/campaigns.ts`, `src/mocks/fixtures/campaignAudience.ts`, `src/features/devices/schemas/entitlementSchemas.ts`

**Interfaces:**
- Consumes: Task 1 schemas, `buttonDeeplink(button, promotedPackageId)`, `validatePackageOffer`, `firstPeriodPrice` (dùng chung bản domain: handler map DTO gói → `PromotedPackage` bằng mapper Task 1).
- Produces:
  - `isGrantablePackage(pkg: ServicePackageDto): boolean` export từ `servicePackageStore.ts` (chuyển nguyên logic `grantablePackage` từ `inventoryImportStore.ts`, file đó import lại).
  - `toPromotedPackageDto(pkg: ServicePackageDto): PromotedPackageDto` (trong `campaignHandlers.ts`; `grantable = isGrantablePackage(pkg) && pkg.group !== 'bundle'`).
  - `PACKAGE_CAMPAIGN_ID = 'CMP-0009'` export từ `src/mocks/fixtures/campaigns.ts`.
  - `countCampaignPurchases(campaignId: string): number` từ `entitlementStore.ts`.
  - Nguồn quyền lợi thêm `'campaign_purchase'` ở `entitlementSourceSchema`, kiểu domain dòng 202 và `EntitlementRecord['source']['kind']`.

- [ ] **Step 1: Ghi baseline** trước khi sửa: trên trình duyệt (`pnpm dev`, MSW), vào chi tiết `CMP-0001`, `CMP-0004`, `CMP-0006`, ghi số khách xem trước và toàn bộ số liệu; ghi lại vào ghi chú tạm.
- [ ] **Step 2: Fixture.** Base fixture thêm `promoted_package_id: null`. Thêm `CMP-0009` (manual, push, nhóm `service`, `running`, `promoted_package_id: 'pkg-demo-clean'`, nút `buy_service_package`, voucher `{type:'voucher', voucherCode:'VESINH20', discountType:'percent', discountValue:20, appliesTo:'DEMO-BT-2L'}`, `audience.excludeActivePackageId: 'pkg-demo-clean'`). Mỗi máy trong `campaignAudience.ts` thêm `active_package_ids`: `seed % 4 === 0 ? ['pkg-demo-clean'] : []` — không đổi field cũ nào.
- [ ] **Step 3: Store.** Chuyển `isGrantablePackage`. Trong `entitlementStore.ts` thêm khối seed: chọn 3 máy đầu tiên (theo `device_id`) trong `deviceFixtures` có `activated_at` và chưa có `pkg-demo-clean`, `attachPackage(..., pkg, {kind:'campaign_purchase', reference: PACKAGE_CAMPAIGN_ID, at}, {startsAt: at})` với `at = seedNow.subtract(i + 1, 'week')`. Thêm `countCampaignPurchases`.
- [ ] **Step 4: Handlers.**
  - `GET /api/campaigns/package-options`: `campaign.write` hoặc 403; trả `packageStore.filter(grantable && group !== 'bundle').map(toPromotedPackageDto)`.
  - Mọi response chiến dịch (list, get, create, update, transition) ghép `promoted_package` từ `packageStore` (gói không tìm thấy → `null`).
  - Create/update: `promotedPackageId` khác null mà không grantable/bundle → 422 `package_unavailable`; `validatePackageOffer` có issue → 422 `invalid_package_offer`.
  - Transition `submit|approve|run|resume` với gói không grantable → 409 `package_unavailable`, kiểm tra trước mọi ghi.
  - `predicatesOf`: `excludeActivePackageId` → `(_, d) => !d.active_package_ids.includes(id)`.
  - `dispatch`: bỏ qua chiến dịch có gói không grantable; trigger có gói bỏ máy đã có gói (bất kể toggle); deeplink dùng `buttonDeeplink(button, campaign.promoted_package_id)`.
  - `metricsFor`: `package_purchases = countCampaignPurchases(id)`; `package_revenue = purchases × (firstPeriodPrice(pkg, offer) ?? 0)`; cộng vào `orders` và `revenue`. Chiến dịch không gói: hai field = 0 và `orders/revenue` không đổi.
- [ ] **Step 5: Assert tạm** `<scratchpad>/assert-campaign-mock.mjs` qua SSR trên store (không qua handler cần localStorage): `isGrantablePackage` đúng cho `pkg-demo-clean` (true), `pkg-demo-survey` (false, draft); `countCampaignPurchases('CMP-0009') === 3`; các quyền lợi đó có `source.kind === 'campaign_purchase'`, `starts_override_at` khác null, nằm trên 3 máy khác nhau; `countCampaignPurchases('CMP-0001') === 0`.
- [ ] **Step 6: Kiểm tra HTTP mock trên trình duyệt** (DevTools `fetch`): package-options không có bundle/draft; vai trò không có `campaign.write` → 403; lưu nháp với `pkg-demo-survey` → 422; voucher amount 600.001 trên `pkg-demo-clean` → 422; ngừng bán `pkg-demo-clean` ở danh mục rồi `pause` → `resume` `CMP-0009` → 409, số lượt gửi không tăng khi tải lại danh sách; mở lại gói (hoặc reload). So `CMP-0001/0004/0006` với baseline Step 1 — phải trùng.
- [ ] **Step 7:** `pnpm typecheck && pnpm lint`; commit `feat(campaigns): serve promoted packages and purchase entitlements in mocks`.

### Task 3: Wizard — chọn gói, CTA, voucher, đối tượng, xem trước

**Files:**
- Modify: `src/features/campaigns/components/wizard/{wizardValues.ts,StepContentOffer.tsx,ButtonsEditor.tsx,StepAudience.tsx,StepReview.tsx}`, `src/features/campaigns/components/CampaignWizard.tsx`, `src/features/campaigns/components/CampaignPhonePreview.tsx`, `src/features/campaigns/components/CampaignSummary.tsx`, `src/features/campaigns/locales/{vi,en}.json`
- Create: `src/features/campaigns/components/wizard/PromotedPackageField.tsx`

**Interfaces:**
- Consumes: `campaignQueries.packageOptions()`, `PromotedPackage`, `validatePackageOffer`, `packagePriceLines`, `buttonDeeplink`.
- Produces:
  - `WizardValues` thêm `promotedPackageId?: string`, `excludePackageOwners: boolean` (mặc định `true`).
  - `buildConditions` đặt `excludeActivePackageId = promotedPackageId` khi `excludePackageOwners`, ngược lại bỏ trống; `buildOffer` đặt `appliesTo = <mã gói>` khi có gói; `buildDraftInput` gửi `promotedPackageId ?? null`; `fromCampaign` đọc ngược (`excludePackageOwners = !!audience.excludeActivePackageId`).
  - `PromotedPackageField({ value, onChange }: { value?: string; onChange: (pkg: PromotedPackage | null) => void })` — Select `showSearch` + `allowClear`, nhãn "mã — tên — giá"; loading/skeleton; lỗi tải hiện `Alert` + nút thử lại (không coi lỗi là danh sách rỗng).
  - `CampaignPhonePreview` thêm prop `packageCard: { name: string; priceLines: string[] } | null`.

- [ ] **Step 1: Đặt trường** ở bước nội dung/ưu đãi (`StepContentOffer`) phía trên phần ưu đãi.
- [ ] **Step 2: Đồng bộ khi đổi gói** trong `CampaignWizard`: bỏ gói → xoá nút `buy_service_package`, xoá `appliesTo` gắn gói, đặt lại `excludePackageOwners = true`. Đổi sang gói khác → giữ nút, cập nhật `appliesTo`, xoá giá trị voucher không còn hợp lệ cho gói mới.
- [ ] **Step 3: CTA.** `ButtonsEditor` hiện loại "Mua gói dịch vụ" chỉ khi đã chọn gói.
- [ ] **Step 4: Voucher.** Khi có gói thì ẩn ô `appliesTo`, hiện tag gói. Gói miễn phí thì disable hai loại voucher giảm giá. Gói báo giá thì disable giảm tiền. Rule form gọi `validatePackageOffer` và hiện key `package.offerIssue.<issue>`.
- [ ] **Step 5: Đối tượng.** `StepAudience` hiện switch "Loại máy đã có gói này" (chỉ khi có gói), xem trước số khách gọi lại khi switch đổi.
- [ ] **Step 6: Xem trước/tóm tắt.** Truyền `packageCard` vào `CampaignPhonePreview`; `StepReview` và `CampaignSummary` hiện gói + dòng giá; chiến dịch không gói hiển thị như cũ.
- [ ] **Step 7: Kiểm tra trên trình duyệt (MSW, VI rồi EN):**
  - Tạo chiến dịch với `DEMO-BT-2L` + voucher 20% → xem trước hiện "480.000đ năm đầu" và "sau đó 600.000đ/năm".
  - Đổi sang `DEMO-LD-STD` (miễn phí) → voucher giảm giá bị disable hoặc báo lỗi.
  - Bỏ gói → nút "Mua gói dịch vụ" và tag gói biến mất, `appliesTo` tự do hiện lại.
  - Bật/tắt loại máy đã có gói → số khách thay đổi.
  - Lưu nháp, mở lại → mọi giá trị giữ nguyên.
  - Mở wizard sửa `CMP-0001` → không có gói, các trường như cũ.
  - Chặn mạng `package-options` → hiện lỗi kèm nút thử lại.
- [ ] **Step 8:** `pnpm typecheck && pnpm lint`; commit `feat(campaigns): promote a service package from the campaign wizard`.

### Task 4: Danh sách/chi tiết, số liệu và quyền lợi trên thiết bị

**Files:**
- Modify: `src/features/campaigns/components/{CampaignTable.tsx,CampaignActions.tsx,CampaignMetricsPanel.tsx}`, `src/features/campaigns/pages/CampaignDetailPage.tsx`, `src/features/campaigns/utils/exportCampaignMetricsToCsv.ts`, `src/features/campaigns/locales/{vi,en}.json`, `src/features/devices/components/DeviceEntitlementsPanel.tsx`, `src/features/devices/locales/{vi,en}.json`
- Create: `src/features/campaigns/components/PromotedPackageWarning.tsx`

**Interfaces:**
- Consumes: `Campaign.promotedPackage`, `CampaignMetrics.packagePurchases/packageRevenue`, nguồn `campaign_purchase`.
- Produces: `PromotedPackageWarning({ campaign }: { campaign: Campaign })` — trả `null` trừ khi `promotedPackage` tồn tại, `!grantable` và trạng thái thuộc `pending_approval | approved | running | paused`.

- [ ] **Step 1:** Cảnh báo trong cột trạng thái `CampaignTable` và đầu `CampaignDetailPage`. `CampaignActions` map lỗi `package_unavailable`/`invalid_package_offer` sang thông báo i18n.
- [ ] **Step 2:** `CampaignMetricsPanel` thêm hai ô "Lượt mua gói", "Doanh thu gói" khi có gói. Gói báo giá thì thêm ghi chú "Không tính doanh thu gói báo giá". CSV thêm hai cột (label truyền từ panel như các cột cũ); chiến dịch không gói vẫn xuất 0.
- [ ] **Step 3:** `DeviceEntitlementsPanel`: `SOURCE_KIND_KEY.campaign_purchase = 'campaignPurchase'`, nhãn "Mua qua chiến dịch {{reference}}". Có `campaign.read` thì nhãn là `Link` tới `/campaigns/$campaignId`.
- [ ] **Step 4: Kiểm tra trên trình duyệt:**
  - `CMP-0009` hiện lượt mua 3 và doanh thu gói 1.440.000đ, và cả hai nằm trong tổng đơn/doanh thu.
  - CSV có hai cột mới.
  - Mở một trong ba máy đã seed → quyền lợi "Vệ sinh máy" với nguồn "Mua qua chiến dịch CMP-0009", bấm link tới đúng chiến dịch.
  - Vai trò không có `campaign.read` thấy nhãn nhưng không có link.
  - Ngừng bán gói → cảnh báo hiện ở danh sách và chi tiết; chạy lại sau tạm dừng báo lỗi rõ.
  - Màn hình 390px không tràn ngang.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint`; commit `feat(campaigns): show package performance, warnings and purchase source`.

### Task 5: Tài liệu và kiểm chứng toàn luồng

**Files:** Modify `docs/SERVICE_PACKAGE_CATALOG.md` (mục mới "Quảng cáo gói qua chiến dịch": hợp đồng `promoted_package_id`, `package-options`, deeplink đề xuất, nguồn `campaign_purchase`, giới hạn demo), `docs/CAMPAIGN_FEATURE_BUILD_PLAN.md` (một dòng trỏ spec mới), plan này (mục Kết quả).

- [ ] **Step 1:** `rg -n "buttonDeeplink\(|grantablePackage|appliesTo" src`. Kiểm tra không còn caller cũ thiếu tham số và không còn bản sao logic grantable.
- [ ] **Step 2:** Chạy tuần tự `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`; ghi exit code và tách riêng warning có sẵn (worker lint, chunk > 500 kB).
- [ ] **Step 3:** Đi lại khoảnh khắc thành công từ đầu đến cuối trên trình duyệt: tạo → gửi duyệt → duyệt bằng tài khoản khác → chạy → số liệu → thiết bị. Chụp ảnh ở 1440/768/390px.
- [ ] **Step 4:** Review diff độc lập; xử lý phát hiện thật, chạy lại các check bị ảnh hưởng.
- [ ] **Step 5:** Ghi kết quả và giới hạn vào plan và tài liệu. Commit `docs: document service package campaigns and verification`. Không push.

## Self-review

- Đối chiếu spec: §4.1 → Task 1/3; §4.2 → Task 1/2/3; §4.3 → Task 3; §4.4 → Task 2/3; §4.5 → Task 2/4; §4.6 → Task 2/4; §4.7 → Task 2/4; §5 → Task 1/2; §6 → Review Focus 2 và Task 2 Step 6; §8 → Task 3–5.
- Tên dùng nhất quán: `promotedPackageId`/`promoted_package_id`, `excludeActivePackageId`, `PromotedPackage`, `isGrantablePackage`, `countCampaignPurchases`, `buy_service_package`, `campaign_purchase`.
- Mỗi mục Review Focus có bước kiểm chứng: 1 → T2S6, T4S4; 2 → T2S1/S6; 3 → T3S7; 4 → T1S1, T2S6, T3S7; 5 → T1S1.
