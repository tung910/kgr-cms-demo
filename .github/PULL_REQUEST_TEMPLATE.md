<!-- Chưa rõ quy trình: xem docs/SCREEN_WORKFLOW.md và docs/CODING_CONVENTIONS.md.
     Xoá phần không áp dụng. -->

## Thay đổi gì

<!-- 1-3 câu: làm gì, cho ai dùng, tác động tới người dùng cuối. -->

## Spec

- Mục spec: `POR-xxx` / `Mxx` trong `docs/CMS_QnA_V1_SPEC.md`
- Issue liên quan:

## Kiểm tra đã chạy

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm format:check`
- [ ] `pnpm build`
- [ ] Chạy tay với MSW (`VITE_ENABLE_MOCKS=true`)

## Checklist (bỏ qua nếu PR không đụng UI/dữ liệu)

- [ ] Quyền: kiểm tra bằng capability, **không** so sánh tên role; thiếu quyền thì **ẩn**, không chỉ disable
- [ ] Đã thử đăng nhập từng role liên quan: menu, route 403, nút hành động đúng ma trận
- [ ] PII bị che đúng theo role trên **cả** UI và file export
- [ ] i18n: thêm key vào **cả** `en.json` và `vi.json`, không còn chuỗi cứng
- [ ] Đủ trạng thái: loading / rỗng / lỗi
- [ ] Filter + phân trang nằm trong URL search params (F5 và copy URL vẫn đúng)
- [ ] Hành động nhạy cảm có modal xác nhận + bắt buộc nhập lý do (gửi lên API để audit)
- [ ] API mới: parse DTO bằng Zod ở biên, map sang model trước khi vào component

## Ảnh chụp / video

<!-- Bắt buộc nếu có thay đổi nhìn thấy được. Kèm cả light/dark hoặc EN/VI nếu liên quan. -->

## Giả định còn mở

<!-- Quy tắc nghiệp vụ chưa rõ mà bạn phải tự quyết. Ghi rõ ở đây thay vì im lặng.
     Nếu nó ảnh hưởng quyền, PII hoặc API contract → tag PM/tech lead. -->
