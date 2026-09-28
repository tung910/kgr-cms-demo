// PostToolUse(Edit|Write) — format file vừa sửa bằng prettier CỤC BỘ.
// Gọi qua `node <prettier.cjs>` thay vì binary trong .bin: trên Windows đó là
// file .CMD mà spawn không shell sẽ không chạy được.
// Hook chậm = mọi tool call chậm theo, nên timeout 5s và không bao giờ tải gói.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readInput, normalize } from './lib.mjs'

const EXT = /\.(js|mjs|cjs|jsx|ts|tsx|css|json|md)$/i

const file = normalize((await readInput()).file_path)
if (!file || !EXT.test(file)) process.exit(0)

let prettier
try {
  prettier = createRequire(import.meta.url).resolve('prettier/bin/prettier.cjs')
} catch {
  process.exit(0) // chưa cài prettier -> bỏ qua, không phải lỗi
}

spawnSync(process.execPath, [prettier, '--write', file], {
  timeout: 5000,
  stdio: 'ignore',
})
