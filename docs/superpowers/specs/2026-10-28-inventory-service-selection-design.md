# Chọn dịch vụ khi nhập lô serial

## Mục tiêu và quyết định đã duyệt

Nhân viên quyết định gói được cấp ở lúc nhập lô serial, thay vì cấu hình model
trên danh mục rồi hệ thống tự gắn. Người dùng đã duyệt luồng minh họa ngày
28/10/2026: nhập serial → chọn gói chung → chỉnh từng máy → xem lại và xác nhận.

- Bỏ ràng buộc model khỏi việc tạo và cấp gói; nhân viên chọn mọi gói,
  không lọc hoặc chặn theo model. Model vẫn là dữ liệu của máy.
- Bỏ tự gắn gói khi đồng bộ kho, kể cả cấu hình tự gắn cũ đang bật.
- Chọn nhiều gói chung cho cả lô; mỗi máy có thể thêm hoặc bỏ gói riêng.
- Chỉ xác nhận cuối mới nhập kho và cấp quyền lợi.
- Serial đã tồn tại do backend xử lý; frontend không tự cộng, thay thế hoặc
  ghi đè quyền lợi. Hiển thị kết quả và lý do backend trả về cho từng máy.
- Người dùng xác nhận thêm: chỉ cấp mới gói đang phát hành và đủ cấu hình;
  không cấp gói nháp/ngừng bán. “Mọi gói” nghĩa là không giới hạn model,
  không phải bỏ điều kiện trạng thái hoặc tính hợp lệ của cấu hình.
- Gói có giá/thuê bao được cấp quyền lợi ngay khi nhập kho thành công;
  luồng này không thu tiền, ghi nhận đã thanh toán hay khởi tạo tự động thu tiền.
- Gói kết hợp cấp các quyền lợi thành phần, không tạo quyền lợi quota riêng
  cho gói cha. Giữ quy tắc không lồng bundle/thuê thiết bị trong thành phần.

## Hiện trạng code

`InventorySyncButton` có lựa chọn upload đang disabled; đồng bộ tự động hiện
gửi POST `/devices/inventory/sync` và ghi ngay. Vì vậy phải bổ sung luồng
preview/confirm, không thể coi upload và xem trước đã tồn tại.

Danh mục ở `src/features/service-packages`; quyền lợi và UI thiết bị ở
`src/features/devices`; mock dùng các store package/inventory/entitlement chung.
`attachPackage` hiện kiểm tra model, cần bỏ điều kiện này trong luồng cấp mới.
Không chỉ bỏ trường khỏi form mà giữ lại chặn trong schema hoặc mock.

## Trải nghiệm

1. Nhập serial: đọc danh sách máy, hiển thị serial và model cùng lỗi dữ liệu.
   Chưa ghi kho. Có thể quay lại sửa nguồn nhập.
2. Chọn gói chung: bộ chọn nhiều gói có tìm kiếm; không có bộ lọc model.
   Hiển thị tên/mã, trạng thái, số lượt và thời hạn theo cấu hình danh mục.
3. Chỉnh từng máy: bảng serial/model/gói; sửa danh sách gói theo máy;
   đánh dấu máy chỉnh riêng; có thao tác dùng lại gói của lô.
4. Xem lại: hiển thị số máy, gói cuối cùng theo từng máy, máy chỉnh riêng và
   tổng quyền lợi dự kiến. Cho quay lại sửa. Nút xác nhận gửi đúng tập đã xem.
   Với gói kết hợp, thể hiện các quyền lợi thành phần và tính tổng theo quyền
   lợi thực tế; không đếm gói cha như một quyền lợi bổ sung.
5. Kết quả: hiện trạng thái từng máy và tổng thành công/thất bại/bỏ qua từ
   backend; không báo thành công chỉ từ số dòng client gửi.

Lựa chọn triển khai do người viết đề xuất: cho phép lô/máy không chọn gói;
không tự cấp mặc định. Máy chưa chỉnh kế thừa thay đổi gói chung; máy đã chỉnh
giữ tập gói riêng tới khi dùng lại gói của lô. Quay lại sửa giữ dữ liệu;
thay nguồn serial phải tạo lại preview và không mang tùy chỉnh sang serial khác.
Không thêm chỉnh nhiều máy cùng lúc ở lần đầu.

## Dữ liệu, backend và quyền

Đây là hợp đồng frontend/MSW đề xuất; backend thật chưa xác nhận. Builder chọn
tên endpoint và DTO cụ thể, nhưng phải đáp ứng các điều kiện sau:

- Preview có định danh lô và tập máy cố định, không ghi inventory/entitlement.
- Confirm gửi định danh preview và tập package ID cuối cùng theo máy, cùng
  khóa chống gửi trùng. Không gửi chỉ một bộ lọc được chạy lại ở lúc confirm.
- Backend xác thực serial, package ID, trạng thái gói và quyền truy cập;
  bỏ kiểm tra tương thích model. Không tin quota/giá/snapshot do client gửi.
  Với bundle, kiểm tra cả thành phần còn phát hành và đủ cấu hình. Người viết
  đề xuất hợp nhất cùng package ID trên cùng máy trong một lần nhập nếu gói
  được chọn trực tiếp và qua bundle, tránh cấp lặp ngoài ý muốn. Đây không
  thay thế chính sách backend cho serial đã tồn tại.
- Khi gói hoặc preview thay đổi không còn hợp lệ, trả lỗi rõ ràng để xem lại;
  không tự thay gói. Quy tắc serial tồn tại và tính nguyên tử của cả lô thuộc
  backend; response hỗ trợ kết quả từng máy và frontend phản ánh đúng.
- Backend chịu trách nhiệm chống cấp trùng; gửi lại cùng thao tác không tạo
  thêm máy, quyền lợi, sự kiện hoặc audit. Lỗi mạng giữ bản nháp và khóa thao tác.
- Mọi ghi kho/cấp gói có audit actor, thời gian, máy/gói, trước/sau và lý do
  nghiệp vụ nhập lô. Quyền lợi chụp snapshot cấu hình tại thời điểm cấp.
- Không tự mở rộng ma trận quyền. Dùng capability `device.inventory.sync`
  hiện hữu làm cổng luồng nhập kho; không yêu cầu quyền sửa danh mục để chọn
  gói. Đây là đề xuất cần duyệt cùng tài liệu này vì trước đây quyền cấp gói
  thủ công/bulk còn hoãn. Backend vẫn phải kiểm tra quyền trên mọi endpoint.

## Loại bỏ và tương thích

Loại trường model và công tắc tự gắn khỏi giao diện danh mục, validation tạo
gói và hành vi cấp mới. Trường cũ có thể tiếp tục đọc khi cần tương thích DTO,
nhưng không có hiệu lực giới hạn model hoặc tự cấp. Không sửa/xóa quyền lợi,
snapshot, lịch sử nguồn auto_attach hay audit đã tồn tại. Giữ cách tính quota,
thời hạn, giữ chỗ và luồng cảnh báo lõi hiện có. Không thay đổi bảo hành điện tử.

Đồng bộ tự động không được âm thầm ghi máy/cấp gói trước xác nhận: nếu giữ
nguồn này, nó phải trả preview và đi qua cùng ba bước chọn/chỉnh/xác nhận.

## Phần để builder quyết định và phạm vi ngoài

Builder đề xuất định dạng file tối thiểu, cột bắt buộc, file mẫu và giới hạn
upload dựa trên mã nguồn/dependency hiện có trong kế hoạch trước triển khai;
không mặc định hỗ trợ XLSX chỉ vì mockup có tên file minh họa. Không thêm
dependency chỉ để dựng giao diện. Bộ đọc file thực tế cần validation đầy đủ.

Không xây màn KTV, phiếu lắp đặt, thu tiền, chỉnh quyền lợi đã cấp hoặc quản trị
taxonomy. Không triển khai backend thật hay cam kết đồng bộ app. Các ghi mới
trong frontend/MSW chỉ thuộc giao dịch nhập kho đã xác nhận của thiết kế này.

Thiết kế này thay thế quy tắc model/tự gắn trong tài liệu danh mục và spec
quyền lợi cũ chỉ trong phạm vi trên; khi triển khai phải cập nhật các tài liệu đó.

## Kiểm chứng khi triển khai

Chạy lint, typecheck, format:check, build; không thêm framework test. Kiểm tra
MSW: nhiều model cùng gói; chỉnh riêng và reset; quay lại; lô không gói;
không ghi trước confirm; hủy; gói thay đổi; lỗi mạng/retry; double submit;
serial tồn tại trả từ backend; không đủ quyền; dữ liệu cũ; VI/EN; lô lớn dùng
phân trang/tìm kiếm, không render mọi dòng. Không thay đổi luồng đọc quyền lợi
và cảnh báo lõi. Chỉ đánh dấu hoàn thành sau khi có kết quả kiểm chứng thực tế.
