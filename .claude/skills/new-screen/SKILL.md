---
name: new-screen
description: Quy trình dựng mới hoặc thay thế một màn hình/trang/feature slice trong CMS portal (quyền, schema, API, query, mock MSW, i18n, page, route, menu, kiểm tra). Dùng khi người dùng yêu cầu "làm màn X", "thêm trang", "tạo feature mới", "build screen", hoặc gõ "/new-screen".
---

# Dựng một màn hình

Nguồn chuẩn duy nhất là `docs/SCREEN_WORKFLOW.md` — skill này chỉ bắt buộc làm theo nó.

1. Đọc toàn bộ `docs/SCREEN_WORKFLOW.md` trước khi code.
2. Tra mục đặc tả của màn và ma trận quyền trong `docs/CMS_QnA_V1_SPEC.md`; không tự suy đoán con số, quyền hay trường PII — thiếu thì hỏi lại người dùng.
3. Đi lần lượt từng bước 0 → 11 theo checklist, không bỏ bước. Bước nào không áp dụng thì nói rõ lý do.
4. Không bỏ bước 10 (Kiểm tra): chạy `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` và báo kết quả thật.
5. Commit theo skill `commit`.
