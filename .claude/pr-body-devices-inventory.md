## Tóm tắt

Thêm vào màn **Quản lý thiết bị**:
- Tab **Đang sử dụng** / **Tồn kho (chưa sử dụng)**.
- Công tắc **IoT / Không IoT**.

Thay đổi chỉ thêm, không sửa nội dung cũ. `git diff main` trên các file có sẵn chỉ có dòng thêm (0 dòng sửa hoặc xoá), và chỉ ở 4 điểm nối:
- Route `devices/index.tsx`: thêm tham số URL `tab`, `connectivity`, `warrantyStatus`, và 2 nhánh `if` chọn trang mới.
- `DeviceListPage.tsx`: thêm 1 dòng `<DeviceListTabs />`.
- `mocks/handlers.ts`: thêm `...deviceExtraHandlers`, theo mẫu `...systemHandlers`.
- Bản dịch vi/en (`devices`, `common`): thêm key mới.

Khi URL không có tham số mới, màn vẫn giữ nguyên: thiết bị đang sử dụng, loại IoT. Danh sách, bộ lọc, bảng, trang chi tiết, file CSV xuất ra và mock hiện có đều không đổi.

## Ảnh hưởng tới người dùng

- **Tồn kho (chưa sử dụng):** liệt kê máy chưa kích hoạt.
  - Cột: Serial / Model, Trạng thái sử dụng ("Chưa kích hoạt"), Firmware xuất xưởng, Thời gian tồn kho.
  - Thẻ thống kê: tổng, tồn dưới 90 ngày, 90–180 ngày, quá 180 ngày.
- **Không IoT:** máy đã bán nhưng không có module IoT, nên theo dõi qua bảo hành chứ không qua trạng thái kết nối.
  - Thẻ thống kê: tổng, còn / sắp hết / hết bảo hành.
  - Bảng có cột bảo hành và tuổi thọ lõi ước tính.
  - Bấm vào máy để mở ngăn kéo chi tiết, chỉ xem.

## API backend cần làm (contract mới, chưa có spec)

- `GET /api/devices/inventory`, `GET /api/devices/inventory/counts`
  - Tham số: `search`, `model`, `connectivity`, `page`, `page_size`.
- `GET /api/devices/non-iot`, `GET /api/devices/non-iot/counts`, `GET /api/devices/non-iot/:deviceId`
  - Tham số: `search`, `region`, `warranty_status`, `page`, `page_size`.
- Máy không IoT chỉ trả `owner_id`, không kèm thông tin cá nhân của khách hàng.
- API danh sách thiết bị hiện tại không đổi.

## Giả định cần xác nhận

- Mốc tuổi tồn kho 90 / 180 ngày: spec chưa quy định.
- Mã model không IoT `KGR-N110` / `KGR-N120`: chỉ dùng trong mock.

## Kiểm tra

- `pnpm typecheck`, `pnpm lint` (0 lỗi; còn 1 cảnh báo có sẵn trong `mockServiceWorker.js`) và `pnpm build` đều qua.
- `prettier --check "src/**/*"` qua.
- `pnpm format:check` chỉ báo `may-loc-nuoc-3d.html`, file này trên `main` vốn đã báo từ trước.
- Đã chạy với MSW trên trình duyệt:
  - Màn mặc định vẫn 36 thiết bị, các thẻ 36 / 12 / 11 / 13, câu mô tả và bảng như cũ.
  - Chế độ Không IoT có 14 máy, ngăn kéo chi tiết mở được.
  - Tab Tồn kho có 32 máy IoT và 16 máy không IoT; console không có lỗi.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
