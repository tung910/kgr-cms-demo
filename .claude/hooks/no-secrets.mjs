// PreToolUse(Write|Edit) — quét NỘI DUNG agent sắp ghi. Thấy secret thật thì
// chặn trước khi nó chạm đĩa, không phải sau khi đã commit.
import { readInput, deny } from './lib.mjs'

const t = await readInput()
const body = [t.content, t.new_string].filter(Boolean).join('\n')
if (!body) process.exit(0)

const SECRETS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/, 'connection string có mật khẩu'],
]

for (const [re, what] of SECRETS) {
  if (re.test(body)) {
    deny(`no-secrets: sắp ghi ${what} vào ${t.file_path || '?'}. Dùng biến môi trường, đừng hardcode.`)
  }
}
