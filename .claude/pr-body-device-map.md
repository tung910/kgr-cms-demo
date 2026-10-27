## Tóm tắt

Dựng lại màn **Bản đồ thiết bị** (`/maps`, spec §5) thay cho prototype dùng toạ độ %:

- 4 thẻ tổng thể: thiết bị trên bản đồ, khu vực theo dõi, vùng cảnh báo, TDS trung bình.
- Bản đồ **MapLibre GL** (không cần API key) với style riêng, nền OpenStreetMap qua OpenFreeMap:
  - ranh giới quốc gia / tỉnh / quận, nhãn tiếng Việt hoặc tiếng Anh theo ngôn ngữ đang chọn;
  - nhãn Quần đảo Hoàng Sa, Trường Sa, Biển Đông, Vịnh Bắc Bộ do portal tự vẽ.
- Tô màu từng tỉnh theo trạng thái (xanh ổn định / cam cảnh báo); marker hiện số thiết bị theo nghìn; zoom từ mức 9 chuyển sang quận.
- Chi tiết khu vực (trạng thái, số thiết bị, TDS, nhận định & gợi ý), bảng xếp hạng (đánh dấu vùng vượt ngưỡng TDS, phân trang 15 dòng), bộ lọc model / trạng thái / khoảng thời gian, xuất báo cáo vùng CSV.
- Bộ lọc và khu vực đang chọn nằm trong URL (`?status=&model=&dateFrom=&dateTo=&regionId=`), F5 hoặc copy link vẫn giữ nguyên.

Ban đầu dùng Google Maps (commit `60fe249`), sau đó chuyển sang MapLibre vì cần custom sâu và tránh phụ thuộc key / billing. Dependency Google đã gỡ.

## Ảnh hưởng tới người dùng

- Mọi vai trò có `device_map.read` xem được bản đồ, chi tiết khu vực và bảng xếp hạng; `device_map.export` mới thấy nút xuất.
- Chỉ vai trò có `device_map.location.exact` (admin, TT DV) thấy quận/huyện và địa chỉ lắp đặt. KD, Nhà máy, Kho vận chỉ thấy mức tỉnh/thành (che tại handler mock, không che ở component).
- Báo cáo xuất chỉ gồm số liệu tổng hợp theo khu vực, không có dữ liệu khách hàng hay địa chỉ.

## API backend cần làm (contract mới, chưa có spec)

- `GET /api/device-map/summary`, `GET /api/device-map/regions`: tham số `model`, `status`, `date_from`, `date_to`.
  `regions` trả thêm `tds_threshold`, `models`, `exact_location`.
- `GET /api/device-map/regions/:id`: chi tiết khu vực, kèm `sites` (địa chỉ lắp đặt) chỉ khi người gọi có quyền vị trí chính xác.
- Khu vực nhận diện bằng `id`; bản đồ ghép polygon với khu vực theo **tên tỉnh** (chuẩn hoá bỏ dấu). Nên thống nhất mã hành chính khi có backend.

## Giả định cần xác nhận

- Ngưỡng TDS cảnh báo 150 ppm: spec chưa nêu số, mock trả về qua API.
- Quyền xem vị trí chính xác (spec 5.5, mục "Cần làm rõ"): giữ mô hình sẵn có trong `capabilities.ts`.
- Bộ lọc khoảng thời gian trong mock chỉ ước lượng theo tỷ lệ kích hoạt đều đặn.
- Dữ liệu mock 13 tỉnh viết tay; 50 tỉnh còn lại sinh tự động (số liệu giả lập).
- **Ranh giới tỉnh** `public/geo/vn-provinces.geojson` lấy từ GitHub `thanglv206/vietnam-geojson` (63 tỉnh cũ, repo không ghi giấy phép), đã làm gọn còn ~445 KB và sửa 3 tên sai chính tả. Cần xác nhận giấy phép và cập nhật theo danh sách tỉnh sáp nhập khi cần.
- Tile OpenFreeMap miễn phí, không có cam kết dịch vụ; production nên tự host hoặc dùng nhà cung cấp tile.
- `.env.example` còn dòng `VITE_GOOGLE_MAPS_API_KEY=` cũ (file bị hook bảo vệ), nên xoá thủ công.

## Kiểm tra

- `pnpm lint` (0 lỗi; còn 1 cảnh báo có sẵn trong `mockServiceWorker.js`), `pnpm typecheck`, `pnpm format:check`, `pnpm build` đều qua.
- Đã chạy với MSW trên trình duyệt: bản đồ render, nhãn Hoàng Sa / Trường Sa / Biển Đông, tô màu 63 tỉnh, click marker mở chi tiết và cập nhật URL, lọc qua URL, trạng thái rỗng, đổi EN/VI, phân quyền vị trí qua handler (sales / factory / logistics chỉ tỉnh; service_center có quận và địa chỉ), console không có lỗi.
- Chưa kiểm tra: màn hình điện thoại, xuất CSV mở bằng Excel, hiệu năng với dữ liệu thật.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
