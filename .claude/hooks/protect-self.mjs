// PreToolUse(Write|Edit) — chặn agent sửa chính hệ thống đang điều khiển nó.
// Lớp chống "tự nới quyền": không cho sửa hook hay sửa permission.
import { readInput, normalize, deny } from './lib.mjs'

const file = normalize((await readInput()).file_path)
if (!file) process.exit(0)

const RULES = [
  [/(^|\/)\.claude\/hooks\//, 'là luật ràng buộc chính bạn. Agent không tự sửa luật của mình. Báo cho người.'],
  [/(^|\/)\.claude\/settings(\.local)?\.json$/, 'là luật ràng buộc chính bạn. Agent không tự sửa luật của mình. Báo cho người.'],
  [/(^|\/)\.env($|\.)/, 'là file môi trường — không chạm.'],
]

for (const [re, msg] of RULES) {
  if (re.test(file)) deny(`protect-self: '${file}' ${msg}`)
}
