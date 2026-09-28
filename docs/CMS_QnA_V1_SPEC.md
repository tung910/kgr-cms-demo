# Đặc tả CMS Portal — CMS_QnA_V1

Nguồn: `D:\Workspace\CMS_QnA_V1.xlsx` (sheet `Yêu cầu CMS`, `Phân quyền (v1)`).
Sheet `Phân quyền` (bản cũ, 48 dòng) bị bỏ qua — bản `(v1)` thay thế.

## Ký hiệu quyền

| Ký hiệu | Nghĩa                                      |
| ------- | ------------------------------------------ |
| R       | Read — Xem                                 |
| C       | Create — Tạo                               |
| U       | Update — Sửa                               |
| D       | Delete — Xoá                               |
| E       | Export — Xuất Excel/CSV                    |
| S       | Send — Gửi lệnh điều khiển / gửi thông báo |
| A       | Approve — Duyệt                            |
| –       | Không có quyền, ẩn menu                    |

**Nguyên tắc phân quyền**

1. Quyền cộng dồn — có `C/U/D/E/S/A` thì mặc định có `R`; có `R` không suy ra các quyền còn lại.
2. Ô `–` thì ẩn hẳn menu khỏi sidebar, đồng thời API trả `403` nếu gõ thẳng URL.
3. Mọi hành động `C/U/D/S/A` đều ghi Audit log (mục 10.5) kèm người thực hiện, thời gian, IP, giá trị trước/sau.

**Vai trò**: Super Admin (1 user duy nhất), Admin, Nhà máy, TT DV (Trung tâm dịch vụ khách hàng/KTV), KD (Kinh doanh/Marketing), Kho vận.

---

## 1. Tổng quan (Dashboard)

### 1.1. Realtime toàn hệ thống

- 6 chỉ số: Thiết bị online; Tỷ lệ lỗi (24h); TDS trung bình toàn quốc (ppm); Người dùng hoạt động; Lõi lọc đã bán (tháng); Doanh thu lõi (tháng, ₫).
- Hiển thị % biến động so với kỳ trước (tăng/giảm có màu).
- Nhãn "Cập nhật realtime", tự làm mới dữ liệu không cần tải lại trang.

### 1.2. Biểu đồ online/offline

- 2 đường: số thiết bị Online và Offline theo giờ.
- Tooltip hiển thị giá trị theo từng mốc giờ.

### 1.3. Biểu đồ chất lượng nước (TDS) & doanh thu

- TDS trung bình theo khu vực (ppm), cột vượt ngưỡng hiển thị màu đỏ (ngưỡng mặc định 55 ppm, cấu hình được).
- Doanh thu lõi lọc & sản lượng 6 tháng gần nhất: biểu đồ kết hợp doanh thu (tỷ ₫) và số lõi bán ra → cho phép xuất Excel.

### 1.4. Biểu đồ active thiết bị & khách hàng

- Số lượng khách hàng active theo tuần/tháng/năm (chọn được khoảng thời gian) → xuất file.
- Số lượng thiết bị active theo tuần/tháng/năm (chọn được khoảng thời gian) → xuất file.

### Ma trận quyền — Tổng quan

| Chức năng                                 | Super Admin | Admin | Nhà máy | TT DV | KD   | Kho vận |
| ----------------------------------------- | ----------- | ----- | ------- | ----- | ---- | ------- |
| 1.1. Xem 6 chỉ số realtime                | R           | R     | R       | R     | R    | R       |
| 1.2. Biểu đồ online/offline theo giờ      | R           | R     | R       | R     | R    | R       |
| 1.3. Biểu đồ TDS & doanh thu lõi          | R, E        | R, E  | R, E    | R     | R, E | R       |
| 1.4. Biểu đồ active thiết bị & khách hàng | R, E        | R, E  | –       | R     | R, E | –       |

**Ràng buộc**

- 1.1: Màn hình mặc định sau đăng nhập cho mọi vai trò. Phạm vi dữ liệu lọc theo khu vực được gán cho user (VD: TT DV miền Bắc chỉ thấy số liệu miền Bắc).
- 1.3: Tách quyền xuất theo nội dung — Nhà máy xuất phần TDS/chất lượng nước, KD xuất phần doanh thu lõi. Kho vận và TT DV chỉ xem, không xuất file doanh thu.
- 1.4: Số liệu active phục vụ KD/Marketing lập kế hoạch. Nhà máy, TT DV, Kho vận không mang dữ liệu KH ra ngoài.

---

## 2. Khách hàng, bảo hành & dịch vụ

### 2.1. Danh sách khách hàng

- Cột: Avatar/tên, SĐT, Khu vực, Số thiết bị, Điểm loyalty, Trạng thái bảo hành, Thời gian tham gia (MM/YYYY).
- Tìm kiếm (tên/SĐT), lọc (khu vực, trạng thái BH) → xuất Excel/CSV.

### 2.2. Thêm/sửa & hồ sơ khách hàng

- Nút "Thêm khách hàng"; sửa thông tin; đồng bộ tài khoản từ App OneKangaroo.
- Hồ sơ chi tiết: tên, SĐT, địa chỉ, danh sách thiết bị liên kết, lịch sử bảo hành/dịch vụ, lịch sử điểm.
- Log trạng thái: lịch sử hoạt động, lịch sử các lần truy cập.

### 2.3. Tab Bảo hành

- Khách hàng: SĐT, thời hạn bảo hành, liên hệ.
- Trạng thái: Còn hiệu lực / Sắp hết (≤30 ngày) / Hết hạn.
- Bảo hành điện tử kích hoạt theo ngày kích hoạt thiết bị (người dùng có ≥2 thiết bị tính ngày còn lại gần nhất của thiết bị đang quản lý); hiển thị ngày bắt đầu, ngày hết hạn, thời hạn theo model, mã CTV.
- Lọc danh sách sắp hết hạn để chăm sóc/gia hạn.

### 2.4. Tab Lịch dịch vụ (TTDVKH)

- Nhận lịch hẹn KH đặt từ App (bảo hành, thay lõi, lắp đặt) kèm tên, SĐT, địa chỉ, dịch vụ, thời gian KH hẹn.
- Phân công KTV, đổi lịch, cập nhật trạng thái (Chờ xác nhận / Đã phân công / Đang xử lý / Hoàn thành / Hủy), ghi chú & ảnh nghiệm thu.
- Xem dạng danh sách và lịch.

### 2.5. Push thông báo

- Nút "Push thông báo": gửi tới 1 KH, danh sách KH hoặc nhóm lọc (khu vực, model, trạng thái BH).
- Nội dung: tiêu đề, nội dung, ảnh, deeplink vào màn hình trong App; gửi ngay hoặc hẹn giờ.

### Ma trận quyền — Khách hàng, bảo hành & dịch vụ

| Chức năng                                             | Super Admin | Admin   | Nhà máy | TT DV   | KD      | Kho vận |
| ----------------------------------------------------- | ----------- | ------- | ------- | ------- | ------- | ------- |
| 2.1. Danh sách KH (tìm kiếm, lọc, xuất)               | R, E        | R, E    | –       | R, E    | R, E    | –       |
| 2.2. Thêm/sửa KH, đồng bộ tài khoản App               | R, C, U     | R, C, U | –       | R, C, U | R       | –       |
| 2.2b. Hồ sơ chi tiết KH & log truy cập/hoạt động      | R           | R       | –       | R       | R       | –       |
| 2.3. Tra cứu bảo hành điện tử                         | R, E        | R, E    | R       | R, E    | R       | R       |
| 2.3b. Kích hoạt/gia hạn/điều chỉnh bảo hành           | R, U        | R, U    | –       | R, U    | –       | –       |
| 2.4. Xem lịch dịch vụ KH đặt từ App                   | R           | R       | –       | R       | R       | R       |
| 2.4b. Phân công KTV, đổi lịch, trạng thái, nghiệm thu | R, C, U     | R, C, U | –       | R, C, U | –       | –       |
| 2.5. Push thông báo tới 1 KH / nhóm KH                | R, C, S     | R, C, S | –       | R, C, S | R, C, S | –       |

**Ràng buộc**

- 2.1: Dữ liệu cá nhân KH — siết chặt nhất. KD/Marketing: che 4 số cuối SĐT trên màn hình; file xuất chỉ chứa cột phục vụ phân khúc (khu vực, model, trạng thái BH), không có SĐT/địa chỉ đầy đủ. Nhà máy và Kho vận không thấy tab này.
- 2.2: TT DV tạo/sửa hồ sơ KH khi tiếp nhận qua hotline. KD chỉ xem, tránh làm lệch dữ liệu gốc đang đồng bộ với App OneKangaroo. Mỗi lần sửa lưu giá trị trước/sau vào audit log.
- 2.2b: Log truy cập (IP, thiết bị, thời điểm) chỉ Super Admin và Admin xem đầy đủ; TT DV và KD chỉ thấy lịch sử dịch vụ và lịch sử điểm.
- 2.3: Nhà máy và Kho vận chỉ tra cứu theo serial để đối chiếu khi đổi trả, không xuất được danh sách KH.
- 2.3b: Thao tác nhạy cảm tài chính. Chỉ TT DV trở lên, bắt buộc chọn lý do từ danh mục (sai ngày kích hoạt, đổi máy, chính sách đền bù) và ghi audit log.
- 2.4: Kho vận chuẩn bị lõi/vật tư, KD theo dõi chuyển đổi từ chiến dịch. Hai vai trò này không thấy ghi chú nội bộ của KTV.
- 2.4b: TT DV là vai trò chủ quản. Ảnh nghiệm thu và trạng thái Hoàn thành là căn cứ tính công KTV, không mở cho vai trò khác sửa.
- 2.5: TT DV gửi thông báo dịch vụ cho từng KH/nhóm nhỏ; KD gửi theo nhóm lọc lớn. Đặt giới hạn số KH/lần gửi khác nhau cho 2 vai trò, bắt buộc duyệt nếu vượt ngưỡng.

---

## 3. Quản lý thiết bị

### 3.1. Thống kê nhanh

- Tổng số thiết bị trong hệ thống.
- Số Đang online / Đang lỗi / Offline; trạng thái realtime.

### 3.2. Danh bạ thiết bị

- Cột: Serial + Model, Khu vực (tỉnh/thành phố + xã), Trạng thái, lần cuối kết nối (vừa xong / x phút / x giờ trước), % lõi lọc còn lại, Firmware, Ngày kích hoạt, nút Chi tiết.
- Phân trang (demo 10 dòng/trang).

### 3.3. Bộ lọc, tìm kiếm, xuất dữ liệu

- Lọc theo Model, Khu vực, Trạng thái (Tất cả/Online/Lỗi/Offline); tìm theo serial/tên chủ sở hữu.
- Nút "Xuất CSV" theo đúng bộ lọc đang chọn.

### 3.4. Chi tiết thiết bị

- Xoá chủ sở hữu thiết bị.
- Chỉ số nhanh: chất lượng nước đầu ra (ppm), chất lượng kết nối (Ổn định/Yếu), lần cuối kết nối, ngày kích hoạt.
- Quản lý chủ sở hữu: chủ sở hữu hiện tại — tên/SĐT/địa chỉ.
- Serial/model, trạng thái (online/offline/lỗi), version Board IoT / mainboard.
- Bảo hành: thời gian kích hoạt, thời gian còn lại… (đồng bộ trường dữ liệu với ứng dụng).
- Biểu đồ chất lượng nước vào/ra theo thời gian; chọn khoảng 24h / 7d / 30d; bật/tắt từng đường.
- Trạng thái các lõi lọc: loại lõi, tên/chức năng, thời gian của lõi / còn lại quy ra %, trạng thái lõi (100% tốt, 30% kém, 10% quá kém…).
- Điều khiển: khoá thiết bị, khởi động lại, bật/tắt tính năng.
- Danh sách chia sẻ thiết bị: tên/SĐT/địa chỉ/quyền chia sẻ.
- Lịch sử: online/offline, OTA, bảo hành bảo trì, cảnh báo.

### Ma trận quyền — Quản lý thiết bị

| Chức năng                                                    | Super Admin | Admin   | Nhà máy | TT DV | KD   | Kho vận |
| ------------------------------------------------------------ | ----------- | ------- | ------- | ----- | ---- | ------- |
| 3.1. Thống kê nhanh thiết bị                                 | R           | R       | R       | R     | R    | R       |
| 3.2. Danh bạ thiết bị                                        | R           | R       | R       | R     | R    | R       |
| 3.3. Lọc, tìm kiếm & xuất CSV                                | R, E        | R, E    | R, E    | R, E  | R, E | R, E    |
| 3.4. Chi tiết thiết bị: chỉ số, biểu đồ nước, trạng thái lõi | R           | R       | R       | R     | R    | R       |
| 3.4b. Quản lý chủ sở hữu & danh sách chia sẻ                 | R, U, D     | R, U, D | –       | R, U  | –    | –       |
| 3.4c. Điều khiển thiết bị (khoá, khởi động lại, bật/tắt)     | R, S        | R, S    | R       | R, S  | –    | –       |
| 3.4d. Lịch sử thiết bị (online/offline, OTA, BH, cảnh báo)   | R, E        | R, E    | R, E    | R     | –    | –       |

**Ràng buộc**

- 3.2: Cột tên chủ sở hữu chỉ hiện với Super Admin, Admin và TT DV; các vai trò khác thấy ô trống hoặc mã KH.
- 3.3: File xuất bám theo đúng bộ lọc đang chọn và phạm vi dữ liệu của vai trò; không vai trò nào xuất được toàn bộ danh bạ kèm thông tin KH.
- 3.4: Chia theo khối — Nhà máy/KD/Kho vận thấy khối kỹ thuật (serial, model, firmware, TDS, trạng thái lõi); khối chủ sở hữu và danh sách chia sẻ bị ẩn.
- 3.4b: Đổi/xoá chủ sở hữu ảnh hưởng trực tiếp quyền điều khiển máy trên App của KH thật. Bắt buộc nhập lý do, ghi audit log kèm giá trị trước/sau, gửi thông báo cho chủ sở hữu cũ. TT DV sửa được nhưng không xoá.
- 3.4c: Gửi lệnh là tác động vật lý lên máy đang chạy tại nhà KH. Nhà máy xem trạng thái để phân tích lỗi nhưng không gửi lệnh lên máy đã bán ra thị trường.
- 3.4d: Nhà máy xuất lịch sử để phân tích nguyên nhân lỗi theo lô sản xuất. TT DV chỉ xem tại chỗ khi xử lý sự cố.

---

## 4. Quản lý nâng cấp chương trình (OTA)

### 4.1. Upload firmware

- Tải file FW, tên phiên bản, khai báo model áp dụng, phiên bản, release note, checksum/chữ ký số.
- Thư viện firmware: danh sách phiên bản theo model, trạng thái (nháp / đã duyệt / thu hồi).

### 4.2. Tạo chiến dịch OTA

- Mã chiến dịch (`OTA-xxxx`), tên chiến dịch, phiên bản áp dụng, tập thiết bị áp dụng (tất cả model / theo khu vực / theo FW hiện tại / danh sách serial).
- Thời gian bắt đầu (ngay hoặc hẹn lịch — trạng thái "Đã lên lịch").
- Thiết lập quy tắc (bắt buộc / tuỳ chọn khách hàng).

### 4.3. Theo dõi chiến dịch

- Thẻ chiến dịch: trạng thái (Đã lên lịch / Đang chạy / Tạm dừng / Hoàn tất), model → phiên bản, giai đoạn hiện tại, tiến độ x/y thiết bị và %, Đã cập nhật, Thất bại, Tỷ lệ lỗi, thời gian bắt đầu.

### 4.4. Thao tác & xử lý lỗi

- Tạm dừng / Tiếp tục / Hủy chiến dịch.
- Danh sách thiết bị thất bại kèm mã lỗi (tải lỗi, checksum, mất nguồn…); retry từng thiết bị hoặc cả nhóm.

### 4.5. Lọc thiết bị theo version firmware

### Ma trận quyền — OTA

| Chức năng                                          | Super Admin | Admin   | Nhà máy | TT DV | KD  | Kho vận |
| -------------------------------------------------- | ----------- | ------- | ------- | ----- | --- | ------- |
| 4.1. Upload firmware & quản lý thư viện FW         | R, C, U     | R       | R, C, U | –     | –   | –       |
| 4.1b. Duyệt / thu hồi phiên bản firmware           | R, A        | R, A    | R       | –     | –   | –       |
| 4.2. Tạo & lên lịch chiến dịch OTA                 | R, C, U     | R, C, U | R, C    | –     | –   | –       |
| 4.3. Theo dõi tiến độ chiến dịch                   | R, E        | R, E    | R, E    | R     | –   | –       |
| 4.4. Tạm dừng / tiếp tục / huỷ, retry thiết bị lỗi | R, S        | R, S    | R, S    | –     | –   | –       |
| 4.5. Lọc thiết bị theo phiên bản firmware          | R, E        | R, E    | R, E    | R     | –   | –       |

**Ràng buộc**

- 4.1: Nhà máy/R&D phát hành firmware nên có quyền tạo và sửa metadata (release note, model áp dụng, checksum). Admin chỉ xem để kiểm soát, không tự upload file FW.
- 4.1b: Chốt chặn an toàn — firmware lỗi có thể làm hỏng hàng loạt máy ngoài thị trường. Nhà máy đề xuất, Admin hoặc Super Admin duyệt thì FW mới chuyển Nháp → Đã duyệt và dùng được cho chiến dịch.
- 4.2: Nhà máy tạo được chiến dịch nhưng ở trạng thái Chờ duyệt; chỉ Admin trở lên chuyển sang Đang chạy hoặc đặt lịch. Với tập thiết bị toàn quốc, bắt buộc chạy thử một nhóm nhỏ trước.
- 4.3: TT DV xem tiến độ để giải thích cho KH khi máy đang cập nhật.
- 4.4: Nút dừng khẩn khi tỷ lệ lỗi vượt ngưỡng auto-pause (5%, mục 10.6). Mở cho Nhà máy vì họ phát hiện sớm nhất qua mã lỗi; mọi thao tác dừng/huỷ ghi log kèm người thực hiện.
- 4.5: Dùng để lập kế hoạch nâng cấp và đối chiếu máy tồn phiên bản cũ.

---

## 5. Bản đồ thiết bị

### 5.1. Tổng thể

- Tổng thiết bị trên bản đồ, số khu vực theo dõi, số vùng cảnh báo, TDS trung bình.

### 5.2. Bản đồ phân bố

- Bản đồ Việt Nam có marker cụm hiển thị số thiết bị (đơn vị nghìn); màu Xanh = hoạt động ổn định, Đỏ/Cam = có cảnh báo; chú giải.
- Bản đồ tương tác: zoom tỉnh → xã, click marker để xem chi tiết.

### 5.3. Chi tiết khu vực

- Khi chọn khu vực: trạng thái (Ổn định/Cảnh báo), số thiết bị, TDS trung bình, nhận định & gợi ý kinh doanh.

### 5.4. Bảng xếp hạng khu vực

- Danh sách khu vực: số thiết bị, TDS trung bình; vùng vượt ngưỡng TDS được đánh dấu.

### 5.5. Nguồn & quyền dữ liệu vị trí

- Vị trí lấy theo địa chỉ lắp đặt khi kích hoạt (vị trí từ App nếu KH đồng ý).
- Mức tổng hợp (tỉnh/TP) cho vai trò marketing; vị trí chính xác chỉ cho vai trò dịch vụ.

### 5.6. Lọc & xuất báo cáo vùng

- Lọc theo model, trạng thái, khoảng thời gian → "Xuất báo cáo vùng" (Excel/CSV).

### Ma trận quyền — Bản đồ thiết bị

| Chức năng                                   | Super Admin | Admin | Nhà máy | TT DV | KD   | Kho vận |
| ------------------------------------------- | ----------- | ----- | ------- | ----- | ---- | ------- |
| 5.1–5.2. Tổng thể & bản đồ phân bố          | R           | R     | R       | R     | R    | R       |
| 5.3. Chi tiết khu vực                       | R           | R     | R       | R     | R    | R       |
| 5.4. Bảng xếp hạng khu vực                  | R           | R     | R       | R     | R    | R       |
| 5.5. Xem vị trí chính xác (địa chỉ lắp đặt) | R           | R     | R       | R     | R    | R       |
| 5.6. Lọc & xuất báo cáo vùng                | R, E        | R, E  | R, E    | R, E  | R, E | R, E    |

**Ràng buộc**

- 5.1–5.4: Dữ liệu ở mức cụm/khu vực, không lộ danh tính KH.
- 5.5: Vị trí chính xác (địa chỉ lắp đặt) chỉ dành cho vai trò phải đến tận nhà KH. KD/Marketing dừng ở mức tỉnh/thành phố; Nhà máy không cần vị trí.
- 5.6: Báo cáo vùng là số liệu tổng hợp đã ẩn danh nên mở quyền xuất cho tất cả.

> **Cần làm rõ**: dòng 5.5 trong file gán `R` cho cả 6 vai trò nhưng ghi chú lại giới hạn KD ở mức tỉnh/TP và loại Nhà máy. Xử lý bằng phân cấp độ chi tiết trong cùng một quyền `R`, không bằng ẩn menu.

---

## 6. Cảnh báo / thông báo

### 6.1. Danh sách cảnh báo

- Header: số cảnh báo đang mở, số nghiêm trọng.
- Mỗi dòng: tên cảnh báo, mức độ, mã lỗi, serial, model, khu vực, thời gian, SLA còn lại, người xử lý.

### 6.2. Bộ lọc & xuất báo cáo

- Lọc mức độ: Tất cả / Nghiêm trọng / Trung bình / Thấp; tùy chọn "Hiện cả đã xử lý"; lọc khu vực, model, thời gian.
- Nút "Xuất báo cáo".

### 6.3. Quy trình xử lý

- Trạng thái: Mới → Đã nhận xử lý (gán KTV) → Đóng; nút "Nhận xử lý", "Đóng" (bắt buộc ghi kết quả).
- Lịch sử thao tác từng cảnh báo; tự đóng khi thiết bị hết lỗi (tùy cấu hình).

### 6.4. SLA & escalation

- Đếm ngược SLA realtime theo mức độ; đổi màu khi sắp hết / quá hạn.
- Escalation lên cấp quản lý khi quá SLA.

### 6.5. Kênh thông báo

- Thông báo realtime trên CMS (chuông/âm thanh) cho người phụ trách khu vực.
- Push đến App KH theo mã sự cố (VD: lõi sắp hết); tùy chọn SMS/Zalo OA cho cảnh báo nghiêm trọng.

### Ma trận quyền — Cảnh báo

| Chức năng                                 | Super Admin | Admin   | Nhà máy | TT DV | KD  | Kho vận |
| ----------------------------------------- | ----------- | ------- | ------- | ----- | --- | ------- |
| 6.1. Danh sách cảnh báo hệ thống          | R           | R       | R       | R     | R   | –       |
| 6.2. Lọc & xuất báo cáo cảnh báo          | R, E        | R, E    | R, E    | R, E  | R   | –       |
| 6.3. Nhận xử lý, gán KTV, đóng cảnh báo   | R, U        | R, U    | –       | R, U  | –   | –       |
| 6.4. Cấu hình SLA & escalation            | R, U        | R, U    | –       | R     | –   | –       |
| 6.5. Cấu hình kênh thông báo & push sự cố | R, U, S     | R, U, S | –       | R, S  | –   | –       |

**Ràng buộc**

- 6.1: Kho vận không tham gia xử lý sự cố kỹ thuật nên ẩn hẳn module. KD xem để tránh chạy chiến dịch upsell vào vùng đang khủng hoảng.
- 6.2: Nhà máy xuất báo cáo để truy nguyên lỗi theo lô sản xuất và dòng máy.
- 6.3: Chỉ vai trò trực tiếp xử lý mới đổi trạng thái. Bấm Đóng bắt buộc nhập kết quả xử lý, không cho đóng trống; mỗi lần đổi trạng thái lưu vào lịch sử thao tác.
- 6.4: SLA và escalation là quy định vận hành chung, chỉ Admin trở lên chỉnh. TT DV xem để biết còn bao nhiêu thời gian, không tự nới SLA.
- 6.5: Cấu hình kênh (chuông CMS, push App, SMS/Zalo OA) chỉ Admin trở lên vì liên quan chi phí tin nhắn. TT DV chỉ gửi thông báo sự cố theo mẫu đã cấu hình sẵn.

---

## 7. Chiến dịch truyền thông

### 7.1. Tạo chiến dịch

- Loại: Push notification, in-app banner/popup.
- Thông tin: tên, nội dung, hình ảnh, deeplink, thời gian bắt đầu/kết thúc, gửi ngay/hẹn giờ.

### 7.2. Phân khúc đối tượng

- Điều kiện: khu vực, model, FW, số ngày lõi còn lại, trạng thái bảo hành, điểm loyalty, TDS khu vực, thời gian tham gia.
- Xem trước số KH thỏa điều kiện trước khi gửi.

### 7.3. Chiến dịch tự động (trigger)

- Lõi còn ≤ N ngày → nhắc thay lõi + link mua/đặt lịch.
- Bảo hành sắp hết (30 ngày) → nhắc gia hạn; TDS vùng cao → gợi ý upsell lõi.

### 7.4. Ưu đãi

- Gắn voucher/mã giảm giá hoặc điểm thưởng vào chiến dịch; giới hạn số lượt, thời hạn.

### 7.5. Phê duyệt & kiểm soát

- Luồng Nháp → Chờ duyệt → Đã duyệt → Đang chạy → Kết thúc; giới hạn tần suất gửi mỗi KH; gửi thử cho nhóm test.

### 7.6. Đo lường hiệu quả

- Số gửi, gửi thành công, mở, click, chuyển đổi (đặt lịch, kích hoạt QR lõi mới), doanh thu ghi nhận.

### Ma trận quyền — Chiến dịch

| Chức năng                                  | Super Admin | Admin   | Nhà máy | TT DV | KD      | Kho vận |
| ------------------------------------------ | ----------- | ------- | ------- | ----- | ------- | ------- |
| 7.1. Tạo chiến dịch (push, banner, popup)  | R, C, U     | R, C, U | –       | –     | R, C, U | –       |
| 7.2. Phân khúc đối tượng & xem trước số KH | R, C        | R, C    | –       | –     | R, C    | –       |
| 7.3. Chiến dịch tự động theo trigger       | R, C, U     | R, C, U | –       | R     | R, C, U | –       |
| 7.4. Gắn voucher / điểm thưởng             | R, C, U     | R, C, U | –       | –     | R, C    | –       |
| 7.5. Phê duyệt & cho chạy chiến dịch       | R, A        | R, A    | –       | –     | R       | –       |
| 7.6. Đo lường hiệu quả chiến dịch          | R, E        | R, E    | –       | R     | R, E    | –       |

**Ràng buộc**

- 7.1: KD/Marketing là vai trò chủ quản. Admin có quyền tương đương để hỗ trợ và dừng gấp một chiến dịch.
- 7.2: Bước xem trước số KH thỏa điều kiện là bắt buộc trước khi lưu.
- 7.3: Trigger chạy tự động 24/7 nên tác động lớn hơn chiến dịch thủ công. TT DV chỉ xem để tránh gọi trùng nội dung.
- 7.4: KD tạo được voucher nhưng không sửa/huỷ voucher đã phát hành ra ngoài (liên quan quyền lợi KH và công nợ); chỉ Admin trở lên, kèm lý do và audit log.
- 7.5: Tách người tạo và người duyệt — KD bấm Gửi duyệt, Admin hoặc Super Admin chuyển sang Đã duyệt.
- 7.6: KD xuất số liệu hiệu quả để báo cáo. TT DV xem phần chuyển đổi sang đặt lịch dịch vụ để chuẩn bị nhân sự.

> **Ghi chú**: file gốc đánh số mục này là `7.7. Đo lường hiệu quả` ở sheet yêu cầu và `7.6` ở sheet phân quyền. Dùng `7.6`.

---

## 8. Phân tích & báo cáo

### 8.1. Bộ lọc & xuất dữ liệu

- Chọn khoảng thời gian (7/30/90 ngày, tùy chọn); lọc model, khu vực; nút "Xuất Excel".

### 8.2. KPI tổng hợp

- Sự cố ghi nhận, dòng máy có MTBF cao nhất, tỷ lệ tự phục hồi, số lõi bán ra trong kỳ.

### 8.3. Sức khỏe thiết bị & độ bền

- Top lỗi thường gặp theo mã sự cố.
- MTBF theo dòng máy (giờ — thời gian trung bình giữa 2 lỗi).

### 8.4. Chất lượng nước & kinh doanh

- TDS trung bình theo vùng (ppm, từ telemetry tổng hợp).
- Doanh thu lõi (tỷ ₫) & sản lượng lõi bán ra theo tháng.

### 8.5. Bảng chi tiết mã lỗi

- Cột: Mã lỗi, Mô tả, Số ca, Tỷ trọng (%); sắp xếp theo số ca.

### 8.6. Định nghĩa chỉ số & báo cáo định kỳ

- Tài liệu định nghĩa công thức: tỷ lệ lỗi, MTBF, tỷ lệ tự phục hồi, DAU, doanh thu lõi.
- Gửi báo cáo định kỳ (tuần/tháng) qua email cho ban lãnh đạo.

### Ma trận quyền — Phân tích & báo cáo

| Chức năng                                         | Super Admin | Admin | Nhà máy | TT DV | KD   | Kho vận |
| ------------------------------------------------- | ----------- | ----- | ------- | ----- | ---- | ------- |
| 8.1–8.2. Xem, lọc & xuất Excel báo cáo tổng hợp   | R, E        | R, E  | R, E    | R, E  | R, E | R, E    |
| 8.3. Sức khoẻ thiết bị, top lỗi, MTBF             | R, E        | R, E  | R, E    | R     | R    | –       |
| 8.4. Chất lượng nước theo vùng & doanh thu lõi    | R, E        | R, E  | R       | R     | R, E | R       |
| 8.5. Bảng chi tiết mã lỗi                         | R, E        | R, E  | R, E    | R     | R    | –       |
| 8.6. Cấu hình định nghĩa chỉ số & báo cáo định kỳ | R, U        | R, U  | –       | –     | R    | –       |

**Ràng buộc**

- 8.1–8.2: Báo cáo tổng hợp đã ẩn danh; dữ liệu vẫn lọc theo khu vực được gán cho user.
- 8.3: Nhà máy là người dùng chính — MTBF và top lỗi là đầu vào cải tiến thiết kế và chọn nhà cung cấp linh kiện.
- 8.4: Phần doanh thu lõi chỉ KD (và Admin trở lên) xuất được. Nhà máy, TT DV, Kho vận xem sản lượng lõi nhưng không xuất file doanh thu.
- 8.5: Dùng chung giữa Nhà máy (khắc phục gốc) và TT DV (tra cứu khi KH gọi).
- 8.6: Công thức chỉ số là định nghĩa chung toàn hệ thống, đổi một lần là đổi mọi báo cáo nên chỉ Admin trở lên. Danh sách email nhận báo cáo định kỳ do Admin cấu hình.

---

## 9. QR lõi lọc

**Cơ chế chống hàng giả**: mỗi lõi lọc chính hãng gắn 1 tem QR duy nhất. Khách quét khi thay lõi trên App OneKangaroo (hoặc nhập tay dãy số) — hệ thống xác thực mã, ghi nhận thời điểm kích hoạt và reset đồng hồ lõi (nếu đúng chính hãng). QR quét lần 2 hoặc không tồn tại sẽ bị cảnh báo giả.

### 9.1. Tổng quan QR

- Tổng QR đã cấp, Đã kích hoạt, Còn hiệu lực, Đã vô hiệu/giả.

### 9.2. Upload lô QR

- Khai báo mã lô (`QR-Bxxxx`), loại lõi, khu vực phân phối (Miền Bắc/Nam/Trung/Toàn quốc), số lượng, ngày upload, sau đó upload file Excel/CSV.
- Định dạng file theo mẫu KGR cung cấp (chứa các thông tin định dạng của lõi lọc).

### 9.3. Cấu hình tuổi thọ lõi

- Cấu hình chi tiết thời gian hoạt động của từng lõi.

### 9.4. Danh sách lô QR

- Mỗi lô: loại lõi, mã lô, khu vực, trạng thái (An toàn / x% cảnh báo), tiến độ kích hoạt (đã dùng/tổng, %), Còn lại, Đã dùng, Vô hiệu, ngày upload; nút Export, Chi tiết.
- Lọc theo khu vực.

### 9.5. Luồng xác thực khi quét (API cho App)

- Kiểm tra mã tồn tại, chưa sử dụng, đúng loại lõi so với file đã upload.
- Hợp lệ → kích hoạt, ghi thời điểm, thiết bị/KH, reset đồng hồ lõi, cộng điểm loyalty.
- Quét lần 2 hoặc mã không tồn tại → báo nghi hàng giả trên App và ghi nhận trên CMS.

### 9.6. Chi tiết lô & tra cứu mã

- Trạng thái từng mã, thời điểm/thiết bị/KH kích hoạt, số lần quét, vị trí quét.
- Vô hiệu hóa thủ công mã/lô (thất lạc, lỗi in) kèm lý do.

### 9.7. Cảnh báo bất thường

- Tỷ lệ vô hiệu/giả của lô vượt ngưỡng (VD 2%); mã quét ngoài vùng phân phối; một mã bị quét nhiều lần ở nhiều nơi.

### Ma trận quyền — QR lõi lọc

| Chức năng                                        | Super Admin | Admin | Nhà máy | TT DV | KD   | Kho vận |
| ------------------------------------------------ | ----------- | ----- | ------- | ----- | ---- | ------- |
| 9.1. Tổng quan QR                                | R           | R     | R       | R     | R    | R       |
| 9.2. Upload lô QR                                | R, C        | R, C  | R, C    | –     | –    | R, C    |
| 9.3. Cấu hình tuổi thọ từng loại lõi             | R, U        | R, U  | R, U    | R     | R, U | –       |
| 9.4. Danh sách lô QR, tiến độ kích hoạt & export | R, E        | R, E  | R, E    | R     | R    | R, E    |
| 9.5–9.6. Tra cứu chi tiết mã QR                  | R           | R     | R       | R     | –    | R       |
| 9.6b. Vô hiệu hoá mã/lô QR                       | R, U, D     | R, U  | R, U    | –     | –    | R, U    |
| 9.7. Cảnh báo bất thường QR                      | R, E        | R, E  | R       | R     | R    | R, E    |

**Ràng buộc**

- 9.2: Nhà máy upload lô tem theo lệnh in, Kho vận khai báo lô khi phân phối về khu vực. Hệ thống phải chặn upload trùng mã lô và báo lỗi dòng nếu file sai định dạng KGR quy định.
- 9.3: Quyết định đồng hồ đếm ngược lõi hiển thị trên App. Bắt buộc ghi audit log và **chỉ áp dụng cho lô kích hoạt sau thời điểm sửa, không hồi tố**.
- 9.4: Kho vận xuất danh sách lô để đối chiếu tồn kho tem. KD xem tiến độ kích hoạt như chỉ số bán hàng nhưng không xuất file.
- 9.5–9.6: Tra cứu một mã gồm cả thiết bị/KH đã kích hoạt và vị trí quét. KD bị ẩn vì không cần mức chi tiết tới từng KH.
- 9.6b: Vô hiệu hoá nhầm thì KH cầm lõi thật vẫn bị báo hàng giả. Bắt buộc nhập lý do (thất lạc, lỗi in, thu hồi) và ghi audit log; xoá hẳn cả lô khỏi hệ thống chỉ Super Admin.
- 9.7: Cảnh báo nghi hàng giả đi tới 3 phía — Nhà máy (rò rỉ khâu in), Kho vận (quét ngoài vùng phân phối), KD (thị trường có hàng giả).

---

## 10. Tài khoản, phân quyền & hệ thống

### Tổng quan

- **Tab thành viên**: tên, SĐT, vai trò, lần truy cập gần nhất, trạng thái (đang hoạt động…) → tìm kiếm theo tên/SĐT/vai trò. Thêm thành viên: tên, SĐT đăng nhập, password, gán quyền.
- **Tab nhóm quyền**: tạo quyền (tên nhóm quyền, tích các quyền cần tạo/sửa — có sẵn mặc định admin, KD…); danh sách tên quyền đã tạo.

### 10.1. Phân quyền theo vai trò

- Ma trận quyền theo module (tính năng) × hành động (xem / tạo / sửa / xóa / xuất / gửi lệnh / duyệt).
- Vai trò đề xuất: Super Admin, Admin vận hành, TTDVKH/KTV, Kho vận, Nhà máy, Kinh doanh/Marketing.

### 10.2. Quyền Super Admin

- Tạo/xóa tài khoản CMS; cấu hình tài khoản (truy cập khẩn cấp có ghi log).

### 10.3. Mô phỏng vai trò

- Super Admin xem giao diện dưới quyền một vai trò khác để kiểm tra; hiển thị rõ nhãn "Đang mô phỏng vai trò"; không cho thao tác ghi khi mô phỏng.

### 10.4. Đăng nhập & bảo mật

- Đăng nhập tài khoản, khóa khi sai nhiều lần, hết phiên khi không hoạt động, đổi mật khẩu.

### 10.5. Audit log toàn hệ thống

- Ghi lại: người thực hiện, thời gian, IP, module, hành động, giá trị trước/sau; tra cứu & xuất log.

### 10.6. Cấu hình tham số & sao lưu

- Tham số: ngưỡng TDS khu vực (55 ppm), ngưỡng auto-pause OTA (5%), ACK timeout (30 s), SLA theo mức độ, ngưỡng BH sắp hết (30 ngày), danh mục model/lõi/khu vực.
- Sao lưu định kỳ & khôi phục.

### Ma trận quyền — Tài khoản & hệ thống

| Chức năng                                                | Super Admin | Admin   | Nhà máy | TT DV | KD  | Kho vận |
| -------------------------------------------------------- | ----------- | ------- | ------- | ----- | --- | ------- |
| 10.1. Tab thành viên — xem danh sách tài khoản CMS       | R           | R       | –       | –     | –   | –       |
| 10.1b. Thêm / sửa / khoá – mở khoá tài khoản CMS         | R, C, U     | R, C, U | –       | –     | –   | –       |
| 10.1c. Xoá tài khoản CMS                                 | R, D        | –       | –       | –     | –   | –       |
| 10.2. Tab nhóm quyền — tạo/sửa/xoá nhóm quyền, gán quyền | R, C, U, D  | R, C, U | –       | –     | –   | –       |
| 10.3. Mô phỏng vai trò                                   | R           | –       | –       | –     | –   | –       |
| 10.4. Cấu hình đăng nhập & bảo mật                       | R, U        | R       | –       | –     | –   | –       |
| 10.5. Audit log toàn hệ thống                            | R, E        | R, E    | –       | –     | –   | –       |
| 10.6. Cấu hình tham số hệ thống                          | R, U        | R, U    | R       | R     | –   | –       |
| 10.6b. Sao lưu định kỳ & khôi phục dữ liệu               | R, S        | –       | –       | –     | –   | –       |

**Ràng buộc**

- 10.1: Chỉ Super Admin và Admin thấy tab thành viên. Các vai trò khác không biết hệ thống có bao nhiêu tài khoản và ai giữ quyền gì.
- 10.1b: Chống leo thang quyền — Admin chỉ thao tác trên tài khoản có vai trò thấp hơn mình, không sửa được tài khoản Super Admin hay Admin khác. Khoá/mở khoá ghi audit log kèm lý do.
- 10.1c: Xoá tài khoản làm mất đầu mối truy vết. Khuyến nghị dùng Khoá thay cho Xoá; quyền xoá riêng cho Super Admin (1 user duy nhất).
- 10.2: Nơi định nghĩa chính ma trận này. Nếu Admin tự sửa nhóm quyền thì mọi giới hạn ở trên đều vô hiệu.
- 10.3: Trong lúc mô phỏng phải hiện nhãn "Đang mô phỏng vai trò" và chặn toàn bộ thao tác ghi.
- 10.4: Cấu hình chung: số lần sai mật khẩu thì khoá, timeout phiên, độ mạnh mật khẩu. Tự đổi mật khẩu của chính mình thì mọi vai trò đều làm được, không tính là quyền trong bảng này.
- 10.5: Audit log chỉ được ghi thêm, **không vai trò nào (kể cả Super Admin) được sửa hoặc xoá bản ghi**. Quyền xuất dùng khi gửi hồ sơ cho kiểm toán.
- 10.6: Nhà máy và TT DV chỉ xem giá trị đang áp dụng; muốn đổi thì gửi đề xuất cho Admin.
- 10.6b: Khôi phục dữ liệu ghi đè toàn hệ thống nên chỉ Super Admin, cần xác nhận 2 bước và ghi log. Lịch sao lưu định kỳ để hệ thống tự chạy; người dùng chỉ kích hoạt sao lưu thủ công trước các đợt thay đổi lớn.

---

## Tham số hệ thống mặc định

| Tham số                   | Giá trị mặc định           | Tham chiếu     |
| ------------------------- | -------------------------- | -------------- |
| Ngưỡng TDS khu vực        | 55 ppm                     | 1.3, 10.6      |
| Ngưỡng auto-pause OTA     | 5% tỷ lệ lỗi               | 4.4, 10.6      |
| ACK timeout               | 30 s                       | 10.6           |
| Ngưỡng bảo hành sắp hết   | 30 ngày                    | 2.3, 7.3, 10.6 |
| Ngưỡng cảnh báo lô QR giả | 2%                         | 9.7            |
| SLA cảnh báo              | theo mức độ, cấu hình được | 6.4, 10.6      |

## Điểm cần làm rõ với KGR

1. Mục 5.5: ma trận cho `R` cả 6 vai trò nhưng ghi chú giới hạn KD ở mức tỉnh/TP và loại Nhà máy — cần chốt là hai cấp độ chi tiết trong cùng quyền hay hai capability riêng.
2. Mục 2.1 / 3.2 / 3.4: mức che PII (4 số cuối SĐT, ẩn cột chủ sở hữu) cần áp dụng nhất quán ở UI, file xuất và API.
3. Mục 9.2: định dạng file Excel/CSV lô QR do KGR cung cấp — chưa có mẫu.
4. Mục 10.2: Admin có `R, C, U` trên nhóm quyền nhưng ghi chú nói "Admin chỉ được xem để đối chiếu, không sửa" — mâu thuẫn, cần chốt.
