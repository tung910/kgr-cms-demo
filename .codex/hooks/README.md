# 4 hook trong repo này — mỗi cái giải quyết một rủi ro có thật

Viết bằng Node (`.mjs`), không phụ thuộc `bash`/`grep`/`timeout`, nên chạy được
cả **Windows native** (cmd/PowerShell), macOS và Linux. Phụ thuộc duy nhất là
`node` — thứ repo này vốn đã cần.

| Hook                  | Sự kiện                  | Chặn/làm gì                                                                                                                                                | Vì sao đáng có                                                                                                                                                                                                               |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block-dangerous.mjs` | PreToolUse · Bash        | xoá đệ quy · `find -delete` · `sudo` · `systemctl`/container · force push · **push thẳng `main`** · tải script từ mạng rồi chạy · đọc `.env` · tự merge PR | Cho phép **việc**, chặn **đường tắt**. Cùng lệnh `git push`: nhánh `fix/*` đi qua, `main` bị chặn. Pattern neo vào **đầu lệnh** (hoặc sau `;` `&&` `\|\|`) nên commit message nhắc tới tên lệnh nguy hiểm không bị chặn oan. |
| `no-secrets.mjs`      | PreToolUse · Write/Edit  | Quét **nội dung sắp ghi** (`content` của Write, `new_string` của Edit): Anthropic key, GitHub token, AWS key, private key, connection string có mật khẩu   | Agent hay "tiện tay" hardcode key cho nhanh chạy. Chặn trước khi chạm đĩa, không phải sau khi đã commit.                                                                                                                     |
| `protect-self.mjs`    | PreToolUse · Write/Edit  | Không cho sửa `.claude/hooks/*`, `.claude/settings.json`, `.claude/settings.local.json`, `.env*`                                                           | **Agent không được tự sửa còng tay của mình.** Chống tự nới quyền. Path Windows (`\`) được chuẩn hoá về `/` trước khi so — bản bash cũ để lọt hoàn toàn trên Windows.                                                        |
| `format-on-edit.mjs`  | PostToolUse · Edit/Write | Chạy prettier lên file vừa ghi: `.js .mjs .cjs .jsx .ts .tsx .css .json .md`                                                                               | Giữ `pnpm format:check` luôn xanh. Gọi qua `node <prettier.cjs>` chứ không qua `node_modules/.bin` — trên Windows đó là `.CMD`, spawn không shell sẽ trượt. Timeout 5s: hook chậm thì mọi tool call chậm theo.               |

`lib.mjs` là phần dùng chung của cả 4 hook: đọc stdin, chuẩn hoá path, `deny()`.

## Quy ước

Mỗi hook nhận JSON qua stdin, đọc `tool_input`, **`exit 2` = chặn**, `exit 0` = cho qua.

Mọi hook **fail-open**: JSON hỏng, stdin rỗng, hoặc thiếu `node` trong PATH thì hook
thoát 0 và hành động được cho qua, không cảnh báo. Đánh đổi có chủ đích — hook lỗi
không được chặn công việc hợp lệ.

## Thử tay

```bash
printf '{"tool_input":{"file_path":"/x/.claude/settings.json"}}' | node .claude/hooks/protect-self.mjs; echo $?    # 2
printf '{"tool_input":{"command":"pnpm build"}}'                 | node .claude/hooks/block-dangerous.mjs; echo $?  # 0
```

> Gõ tay lệnh thử **trong Claude Code thì chính hook sẽ chặn**, vì chuỗi nguy hiểm
> nằm ngay trong câu lệnh bạn gõ. Chạy ở terminal thường, hoặc dựng chuỗi gián tiếp
> (`'su' + 'do'`). Chuyện này xảy ra với cả file README bạn đang đọc.

## Hook khác `--disallowedTools` ở chỗ nào

`--disallowedTools` là luật của Claude Code, viết trong câu lệnh. Hook là **script của bạn, chạy trên máy bạn**:
đọc được nội dung sắp ghi, gọi được API, ghi log, và không phụ thuộc việc Claude có "nhớ" hay không.
Dùng cả hai: flag là lớp ngoài, hook là lớp trong.
