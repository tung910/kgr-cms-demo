# Danh mục gói dịch vụ và cấp gói khi nhập kho

## Danh mục

Trang `/service-packages/new` tạo một trong 14 loại thuộc 5 nhóm dịch vụ.
Khai báo nội dung, điều kiện mô tả, giá, cách thu tiền, thời hạn, số lượt và
cấu hình theo loại; xem lại rồi lưu nháp. Mã thương mại duy nhất khác mã loại.
Không chọn model và không có công tắc tự gắn. Model chỉ là thông tin thiết bị.

Giá cố định là số nguyên VND dương; miễn phí/gộp giá là 0; báo giá sau khảo sát
là null kèm giải thích. Chu kỳ thu tiền khác chu kỳ thực hiện và thời hạn.
Gói cũ thiếu cấu hình vẫn đọc/ngừng bán được; chưa có màn sửa gói cũ.

Gói kết hợp TG-ALL và thuê bao TG-SUB chọn gói thành phần đang phát hành, đủ
cấu hình, không thuộc nhóm bundle. TG-SUB giữ mô tả dịch vụ/chuyển giao nhưng
cần thêm danh sách thành phần cụ thể để cấp quyền lợi; dữ liệu cũ chỉ mô tả
bằng chữ được coi là chưa đủ cấu hình. Không lồng bundle hoặc thuê thiết bị.

Nguồn taxonomy: Ma trận dịch vụ — 5 nhóm, page `Lk897tltZLwwQUYdfjF8`;
taxonomy vẫn là cấu hình trong code, chưa có trang quản trị riêng.

## Nhập lô và cấp quyền lợi

Thiết kế được duyệt: [Chọn dịch vụ khi nhập lô serial](superpowers/specs/2026-10-28-inventory-service-selection-design.md).

1. Trong tab kho, chọn **Nhập thiết bị**: CSV UTF-8 với header `serial,model`,
   tối đa 5 MiB/10.000 dòng; có CSV mẫu. Hoặc lấy bản xem trước từ kho.
2. Chọn nhiều gói chung cho lô. Không giới hạn model; chỉ gói active và đầy đủ
   cấu hình/quota có thể cấp. Có thể không chọn gói.
3. Chỉnh từng máy: thêm/bỏ gói, hoặc dùng lại gói chung. Máy đã chỉnh riêng
   giữ lựa chọn khi quay lại thay gói chung. Thay nguồn nhập reset lựa chọn.
4. Xem lại đúng tập máy, gói và quyền lợi thành phần; xác nhận mới ghi kho.
5. Xem kết quả từng serial từ backend, bao gồm thành công, bỏ qua hoặc lỗi.

Gói có giá/thuê bao vẫn cấp quyền lợi khi xác nhận, không ghi nhận thanh toán,
thu tiền hoặc auto-debit. Bundle không có quota riêng: mỗi thành phần chụp
snapshot, thời hạn lấy `months`, quota thành phần nhân `quantity` nếu có lượt.
Cùng package ID chỉ cấp một quyền lợi trong lần nhập: chọn trực tiếp ưu tiên
cấu hình của gói; nếu trùng giữa bundle, bundle có ID đứng trước được ưu tiên.
Frontend và MSW dùng cùng thứ tự để bảng xem lại khớp kết quả cấp.

Thời hạn/quota/giữ chỗ tiếp tục theo quy tắc quyền lợi hiện hữu. Không tự gia
hạn bảo hành điện tử. Không thay đổi snapshot/audit/quyền lợi đã cấp trước đó.

## Hợp đồng frontend / MSW đề xuất

- `POST /devices/inventory/import/preview`: `{source:'csv',rows:[{serial,model}]}`
  hoặc `{source:'warehouse'}` → `{preview_id,items:[{row_id,serial,model}]}`.
  Không ghi kho hoặc quyền lợi; tập máy gắn với actor.
- `GET /devices/inventory/import/package-options`: options tối thiểu gồm
  `{id,code,name,benefits:[{id,code,name,quota,term_months}]}`; dùng quyền nhập
  kho, không cần quyền sửa/đọc toàn danh mục và không kèm PII.
- `POST /devices/inventory/import/confirm`: `{preview_id,assignments:[{row_id,
package_ids}]}`, bắt buộc `Idempotency-Key` → kết quả từng dòng và tổng
  `added,skipped,failed,entitlements_attached`.
- Cả ba endpoint dùng `device.inventory.sync`; confirm từ chối khi giả lập
  vai trò. Mọi điều kiện model/trạng thái nguồn được backend xác thực lại.
- Mock skip serial đã tồn tại, giữ nguyên quyền lợi. Backend thật quyết định
  chính sách của case này; frontend chỉ phản ánh response.
- Confirm ghi actor/thời gian/target/trước-sau/lý do vào audit và lưu snapshot
  quyền lợi. Retry cùng key/payload trả cùng kết quả, không ghi thêm.
- Endpoint ghi ngay `/devices/inventory/sync` và công tắc
  `/service-packages/{id}/auto-attach` trả 410, không tự gắn dù bản ghi cũ bật.

Mã lỗi: `invalid_input`, `invalid_model`, `preview_unavailable`,
`package_changed`, `idempotency_conflict`, `forbidden`. Lỗi mạng giữ nguyên
request/key để thử lại; UI không cho sửa draft khi chưa xác minh kết quả.

## Quảng cáo gói qua chiến dịch

Thiết kế được duyệt: [Quảng cáo gói dịch vụ qua chiến dịch](superpowers/specs/2026-10-28-service-package-campaigns-design.md).
Mỗi chiến dịch có thể tuỳ chọn trỏ tới đúng một gói; không chọn thì chiến dịch,
số khách xem trước và số liệu giữ nguyên như trước. Chỉ gói `active`, đủ cấu
hình và không thuộc nhóm bundle được chọn.

- DTO chiến dịch: `promoted_package_id` (null nếu không có) và bản tóm tắt
  `promoted_package` do MSW ghép lúc đọc từ danh mục sống: `id`, `code`, `name`,
  `group`, `status`, `grantable`, `billing_type`, `price`,
  `billing_period_months`, `pricing_mode`, `term_months`. Màn chiến dịch dùng
  bản tóm tắt này, không cần `service_package.read`. Bản nháp gửi
  `promotedPackageId`.
- `GET /campaigns/package-options`: gói chọn được cho wizard, dùng
  `campaign.write`, không kèm PII.
- CTA `buy_service_package` ("Mua gói") mở trang gói. Deeplink **đề xuất**:
  `onekangaroo://service-packages/{id}?device={deviceId}`; `device` được gắn
  khi gửi như các CTA theo thiết bị khác. App chưa đăng ký đường dẫn này, đây
  là hợp đồng cần app xác nhận.
- Voucher gắn gói: `appliesTo` = mã gói. Gói định kỳ chỉ giảm **kỳ thu tiền
  đầu**, giá gốc là `price` cho `billing_period_months` (xem trước kiểu
  "480.000đ năm đầu / sau đó 600.000đ/năm"). Gói miễn phí/gộp giá không có
  voucher giảm giá; gói báo giá chỉ giảm %; số tiền giảm không vượt giá một kỳ.
  Vi phạm bị chặn ở form và trả 422 `invalid_package_offer`.
- Đối tượng: điều kiện `excludeActivePackageId` loại máy đã có gói (AND với các
  điều kiện khác), mặc định bật khi chọn gói. Đổi hoặc bỏ gói thì wizard xoá nút,
  voucher không còn hợp lệ và đặt lại điều kiện loại trừ.
- Gói không còn phát hành được (ngừng bán, mất cấu hình): tạo/sửa nháp trả 422
  `package_unavailable`; gửi duyệt, duyệt, chạy, chạy lại trả 409
  `package_unavailable` và không sinh lượt gửi. Chiến dịch đang chạy hiện cảnh
  báo ở danh sách/chi tiết. Body lỗi của mock mang `code`.
- Số liệu: `package_purchases`, `package_revenue` đếm từ quyền lợi nguồn
  `campaign_purchase` của chiến dịch, đã nằm trong đơn/doanh thu, tính kỳ đầu
  sau giảm; gói báo giá cho doanh thu 0. CSV có thêm hai cột.
- Quyền lợi: nguồn `campaign_purchase` (reference = mã chiến dịch). Trên thiết
  bị hiển thị "Mua qua chiến dịch …", có link tới chiến dịch khi vai trò có
  `campaign.read`. Seed `CMP-0009` "Vệ sinh máy giảm 20% năm đầu" (gói
  `pkg-demo-clean`): 3 lượt mua trên KGR-0002/0004/0005, 1.440.000đ. Fixture
  bản nháp cũ chuyển từ `CMP-0009` sang `CMP-0010`.

Giới hạn riêng của tính năng này: chỉ là demo frontend + MSW, chưa nối backend
hay app. Deeplink là đề xuất. Mock có hai bộ dữ liệu tách biệt: đối tượng chiến
dịch dùng mã `DEV-…`, thiết bị và quyền lợi dùng `KGR-…`, nên số khách xem
trước không liên hệ với 3 lượt mua seed. Chiến dịch chỉ ghi nhận lượt mua và
doanh thu từ quyền lợi trong mock; việc đổi voucher khi thanh toán thuộc
storefront (§10), chưa làm ở đây. Gói bundle không được quảng cáo. Bản dịch EN
của màn chiến dịch chưa đầy đủ (chỉ nhánh `package`/`button`), phần còn lại và
mọi thông báo lỗi hiển thị tiếng Việt.

## Giới hạn

Đây là frontend + MSW; backend thật cần duyệt hợp đồng. Chưa cam kết đồng bộ
app. MSW lưu trong bộ nhớ, reload phục hồi fixture và mất preview/idempotency.
CSV chỉ mang serial/model: mock lấy metadata sản xuất từ fixture cùng model,
không phải dữ liệu nhà máy thật. Chưa nhận XLSX. Fixture DEMO không phải giá
hay chính sách thương mại được phê duyệt.

Không mở ghi nhận sử dụng tay, gửi lõi, hoàn lượt, thu hồi, chỉnh hàng loạt
quyền lợi đã cấp; phiếu lắp đặt/màn KTV thuộc giai đoạn sau.

## Kiểm chứng

Các check và bằng chứng cho đợt triển khai này được ghi trong
[kế hoạch triển khai](superpowers/plans/2026-10-28-inventory-service-selection.md);
phần quảng cáo gói qua chiến dịch nằm ở
[kế hoạch riêng](superpowers/plans/2026-10-28-service-package-campaigns.md).
Không thêm dependency hoặc framework kiểm thử. Chưa kiểm tra backend/app thật.
