## Thay đổi gì

Thay màn Trung tâm cảnh báo demo bằng luồng xử lý hoàn chỉnh cho CSKH: lọc và xuất danh sách, nhận hoặc tiếp quản cảnh báo, ghi kết quả liên hệ, tạo phiếu dịch vụ và giao KTV. Chi tiết cảnh báo mở trong ngăn kéo, giữ bộ lọc và phân trang trên URL, đồng thời hiển thị SLA, lịch sử xử lý và trạng thái phiếu.

## Ảnh hưởng theo vai trò

- Super Admin, Admin, TT DV: xem và xuất cảnh báo; nhận xử lý, ghi kết quả, tạo phiếu và giao KTV; xem dữ liệu khách hàng.
- Nhà máy: chỉ xem và xuất dữ liệu phục vụ truy nguyên; không thấy dữ liệu khách hàng hay thao tác xử lý.
- KD: chỉ xem danh sách và thông tin phiếu; không xuất, không thấy dữ liệu khách hàng và không thao tác.
- Kho vận: không thấy module.
- Khi Super Admin mô phỏng vai trò, các API ghi bị chặn.

## API backend cần làm

| Method | Endpoint | Nội dung |
| ------ | -------- | -------- |
| GET | `/alerts` | Danh sách với `search`, `severity`, `status`, `handler_group`, `region`, `model`, `date_from`, `date_to`, `mine`, `overdue`, `include_closed`, `page`, `page_size` |
| GET | `/alerts/counts` | Số liệu tổng hợp, dùng bộ lọc danh sách trừ `status`, `mine`, `overdue`, `page`, `page_size` |
| GET | `/alerts/filter-options` | Tùy chọn khu vực và model |
| GET | `/alerts/:id` | Chi tiết cảnh báo |
| POST | `/alerts/:id/acknowledge` | Nhận xử lý, thân `{}` |
| POST | `/alerts/:id/takeover` | Tiếp quản, thân `{}` |
| POST | `/alerts/:id/contact-results` | Ghi `{ outcome, reason_code?, note? }` |
| POST | `/alerts/:id/close` | Đóng với `{ result }` |
| POST | `/alerts/:id/service-ticket` | Tạo phiếu từ cảnh báo |
| GET | `/service-tickets/technician-suggestions` | Gợi ý KTV theo cảnh báo, lịch hẹn và loại dịch vụ |
| PUT | `/service-tickets/:ticketId/assignment` | Giao hoặc giao lại KTV với `{ technician_id, reason? }` |

Mọi DTO phản hồi cần tuân theo schema trong `src/features/alerts/schemas/alertSchemas.ts`. Giá trị SLA mặc định trong cấu hình hệ thống vẫn đang để trống; backend trả `due_at: null` cho mức độ chưa được cấu hình.

## Giả định chờ KGR xác nhận

1. Dùng bảng phân nhóm xử lý và mức độ ở bước C2 cho `ER00051`–`ER00074`.
2. Lõi mức 1 chỉ nhắc trên app; mức 2 mới chuyển CSKH.
3. KTV hoàn thành tại TT7 ký nghiệm thu.
4. Không giới hạn số lần gọi không được và không tự đóng.
5. CSKH không tạm tính hay chọn thanh toán; phiếu ghi "trả khi xong".
6. CSKH và điều phối cùng vai trò TT DV.
7. Quá SLA chỉ được đánh dấu trên danh sách.
8. SLA tính theo giờ đồng hồ.
9. Phiếu khách tự đặt cho cùng lỗi không tự gắn; form tạo phiếu chỉ cảnh báo nếu máy có phiếu mở.
10. Sau khi khách không cần xử lý, chỉ tạo lại cảnh báo khi lỗi đã hết rồi xuất hiện lại.

## Kiểm tra đã chạy

- [x] `pnpm lint` (0 lỗi, 1 cảnh báo có sẵn ở `public/mockServiceWorker.js`)
- [x] `pnpm typecheck`
- [x] `pnpm format:check`
- [x] `pnpm build`

## Chưa kiểm tra

- Ma trận sáu vai trò và chế độ mô phỏng vai trò trên trình duyệt.
- Luồng nhận cảnh báo, ghi kết quả, tạo phiếu, giao KTV với MSW.
- Bố cục ở 375 px và 768 px; ảnh chụp thay đổi giao diện.
- Fetch kiểm tra contract mock trong phiên đăng nhập.
