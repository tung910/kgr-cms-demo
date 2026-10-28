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
[kế hoạch triển khai](superpowers/plans/2026-10-28-inventory-service-selection.md).
Không thêm dependency hoặc framework kiểm thử. Chưa kiểm tra backend/app thật.
