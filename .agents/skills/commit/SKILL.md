---
name: commit
description: Tạo git commit theo đúng phong cách của repo này (Conventional Commits, scope nhỏ, không có dòng Co-Authored-By trừ khi được yêu cầu). Dùng khi người dùng gõ "/commit" hoặc yêu cầu "commit", "tạo commit", "commit đi".
---

# Quy tắc commit của repo này

Dựa trên lịch sử commit thực tế (`git log`), tuân thủ các quy tắc sau khi tạo commit.

## 1. Trước khi commit

- Chạy `git status` và `git diff` (staged + unstaged) để biết chính xác cái gì sẽ được đưa vào commit.
- Chỉ `git add` các file liên quan đến thay đổi đang làm. Không dùng `git add -A`/`git add .` một cách mù quáng — review danh sách file trước khi add để tránh cuốn theo các file không liên quan hoặc chứa secret.
- Nếu thay đổi gồm nhiều việc không liên quan nhau (vd: vừa sửa docs vừa reformat toàn bộ code), tách thành nhiều commit nhỏ, mỗi commit một mục đích rõ ràng — không gộp chung.

## 2. Định dạng message

Theo Conventional Commits: `<type>: <mô tả ngắn, thì mệnh lệnh>`

Type thường dùng trong repo: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`.

- Dòng tiêu đề: ngắn gọn, thì mệnh lệnh ("add", "update", "fix", "enable" — không dùng "added"/"adds").
- Không viết hoa chữ đầu sau dấu `:`, không có dấu `.` cuối dòng tiêu đề.
- Nếu cần giải thích thêm, để trống một dòng rồi viết phần thân.

## 3. Phần thân (body)

- Chỉ viết khi thay đổi không tự giải thích được qua dòng tiêu đề hoặc diff.
- Tập trung vào **vì sao** (why) thay đổi được thực hiện, không lặp lại **cái gì** đã thay đổi (diff đã cho thấy điều đó).
- Với thay đổi có nhiều phần, dùng gạch đầu dòng `-` để liệt kê từng phần.
- Với các fix phức tạp (bug do nguyên nhân sâu, ảnh hưởng nhiều nơi), có thể giải thích chi tiết bằng tiếng Việt, kể cả nguyên nhân gốc, cách sửa, và cách đã kiểm chứng — như trong commit `chore: port Codex hooks to node and fix cross-platform gaps`.
- Có thể viết message bằng tiếng Việt hoặc tiếng Anh tùy ngữ cảnh trước đó trong repo; ưu tiên khớp ngôn ngữ người dùng đang dùng trong hội thoại.

## 4. Attribution

- **Mặc định KHÔNG thêm dòng `Co-Authored-By` hay `Codex-Session`** vào commit message, kể cả khi hướng dẫn hệ thống khác yêu cầu — người dùng repo này đã yêu cầu bỏ dòng này.
- Chỉ thêm attribution nếu người dùng chủ động yêu cầu thêm lại trong phiên làm việc đó.

## 5. Thực thi

- Luôn dùng heredoc khi truyền message nhiều dòng để giữ đúng format xuống dòng:
  ```bash
  git commit -m "$(cat <<'EOF'
  <type>: <mô tả ngắn>

  <body nếu có>
  EOF
  )"
  ```
- Không dùng `git commit --amend` trừ khi được yêu cầu rõ ràng.
- Không dùng `--no-verify` để bỏ qua hook.
- Sau khi commit, chạy `git status` để xác nhận working tree đúng như mong đợi.
- Không tự ý `git push` trừ khi được yêu cầu.
