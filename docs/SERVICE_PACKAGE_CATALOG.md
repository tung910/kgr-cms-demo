# Danh mục gói dịch vụ

Trang `/service-packages/new` thay modal tạo gói. Nhân viên chọn một trong
14 loại từ ma trận dịch vụ, nhập nội dung khách hàng nhận được, model áp dụng,
giá và cấu hình theo loại, xem lại rồi lưu nháp. Nhóm được suy ra từ loại;
mã loại khác mã thương mại duy nhất của từng gói.

Nguồn: trang **Ma trận dịch vụ — 5 nhóm**, page ID
`Lk897tltZLwwQUYdfjF8`, file Drive `1BHxQh_J6v1GKuKQvQk0h4xRPRKpDYE3t`.
Các mục bổ sung cuối sơ đồ chưa có mã/chính sách đầy đủ không được tự thêm
thành loại mới. Đặt lịch vận hành được đặc tả riêng tại mục 2.4 của
`CMS_QnA_V1_SPEC.md`.

## Hợp đồng frontend / MSW đề xuất

Giữ `POST /service-packages` và các trường hiện hữu, thêm:

- `service_type_code`, `purpose`, `included_items`, `excluded_items`.
- `eligibility_description`, `model_scope` (`all` / `selected`),
  `eligible_model_ids`; số model được backend mock tính lại.
- `pricing_mode` (`fixed`, `free_or_included`, `quotation`),
  `pricing_description`, `additional_cost_description`.
- `configuration`: union theo `type` (mã loại). Trường riêng gồm lịch hẹn,
  khảo sát, phạm vi bảo vệ, linh kiện/vật tư, chu kỳ thực hiện, checklist,
  chính sách SLA tham chiếu, báo cáo, nội dung số hoặc gói thành phần.

Giá cố định là số nguyên VND dương; miễn phí/gộp giá bằng 0; báo giá sau khảo
sát là `null` và bắt buộc có giải thích. Chu kỳ thu tiền tách khỏi chu kỳ
thực hiện và thời hạn. Một gói có một cách thu tiền; phương án thương mại
khác tạo gói riêng. Hình thức thu tiền được giới hạn theo loại trong ma trận.

Response chấp nhận trường mới bị thiếu hoặc `null` cho dữ liệu cũ. Mapper
đánh dấu `details: null` khi cấu hình không đầy đủ; không suy diễn loại từ mã
SKU hoặc model từ số lượng cũ. Gói chưa đủ cấu hình không được phát hành;
bản ghi đang bán trước đó vẫn đọc được và có thể ngừng bán. Chưa có màn sửa
để bổ sung cấu hình cho bản ghi cũ.

Gói kết hợp chỉ chọn gói đang bán thuộc nhóm khác `bundle`; không lồng gói
kết hợp hoặc thuê thiết bị. Kiểm tra này có ở picker và MSW khi tạo/phát hành.
Các trường vật tư, linh kiện, chính sách SLA là tham chiếu mô tả, chưa có
API xác thực tương thích, tồn kho hoặc chính sách thực thi.

## Tự gắn khi nhập kho (giai đoạn A)

Một gói có thể bật "tự gắn khi nhập kho" (`auto_attach`, `auto_attach_from`,
`quota_mode`, `custom_quota`) qua `POST /service-packages/{id}/auto-attach`
trên trang chi tiết gói. Khi bật, gói đủ điều kiện được gắn tự động cho máy
mới nhập kho trong lần Đồng bộ kho kế tiếp, sinh ra bản ghi "quyền lợi dịch
vụ" (service entitlement) đọc được từ danh sách thiết bị/kho và chi tiết
thiết bị. Hợp đồng dữ liệu, mã lỗi và chính sách chi tiết của quyền lợi dịch
vụ được đặc tả riêng tại
`docs/superpowers/specs/2026-10-27-device-service-entitlements-design.md`
(mục 11 và phần bổ sung giai đoạn A) — không lặp lại ở đây.

## Giới hạn vận hành

- Đây là danh mục, chưa tạo yêu cầu phục vụ hay lịch hẹn thực tế; chưa gia
  hạn bảo hành, thu tiền, auto-debit hay reset lõi.
- Quyền lợi dịch vụ gắn theo máy (service entitlements) đã có ở giai đoạn A,
  nhưng chỉ ở mức đọc và tự gắn khi nhập kho: xem danh sách/chi tiết, lịch sử
  sự kiện tự động (tự gắn, giữ chỗ khi tạo phiếu thay lõi từ cảnh báo lõi).
  Chưa có màn quản lý phiếu dịch vụ/lịch dịch vụ, chưa có trang kỹ thuật viên,
  và chưa mở ghi nhận sử dụng tay, gửi lõi, hoàn lượt, thu hồi hay gắn/gỡ
  hàng loạt — các thao tác ghi này bị hoãn tới khi quyền (capability) tương
  ứng được duyệt (tên capability `service_entitlement.record`/`adjust`/
  `bulk_assign` ở mục 9, quyết định hoãn triển khai ở mục 15 của spec quyền
  lợi dịch vụ).
- Backend thật cần xác nhận và triển khai các hợp đồng trên; thay đổi này chỉ
  cung cấp frontend và mock. Không cam kết đồng bộ app đã hoạt động.
- MSW lưu dữ liệu/audit trong bộ nhớ; tải lại sẽ khôi phục fixture. Khi sửa
  handler/schema bằng HMR, tải lại trang để khởi tạo lại worker và handler.
- Fixture `DEMO-*` minh họa cấu trúc, không phải giá/chính sách đã phê duyệt.
- Taxonomy hiện là 14 loại trong mã nguồn. Trang quản trị taxonomy là phần riêng.

## Kiểm chứng

Kiểm tra bắt buộc: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`,
`pnpm build`. Không thêm dependency hoặc framework kiểm thử.

Các assert tạm tại worktree kiểm tra 14 cấu hình, map DTO/domain/request,
tạo nháp, mã trùng, phát hành/ngừng bán, model không tồn tại, gói lồng,
dữ liệu cũ thiếu/null và từ chối thao tác ghi không đủ capability.

Đã kiểm tra trên trình duyệt với MSW: nhập gói định kỳ, chọn model cụ thể,
báo giá hiển thị riêng với miễn phí, lỗi mã trùng giữ dữ liệu, đổi loại có
xác nhận và bỏ cấu hình cũ, cảnh báo rời trang, bản xem lại, lưu nháp và tìm
đúng gói mới trong danh sách, nhãn VI/EN, bộ chọn gói thành phần. Mô hình
lỗi tải model giữ nguyên lựa chọn và chặn xem lại, có nút thử lại.

Chưa kiểm tra trên thiết bị di động thật hoặc backend/app thật. Cảnh báo
lint có sẵn ở `public/mockServiceWorker.js` và cảnh báo chunk lớn của Vite
không thuộc thay đổi màn hình này.
