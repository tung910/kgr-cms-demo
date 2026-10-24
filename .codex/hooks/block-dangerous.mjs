// PreToolUse(Bash) — LỚP LUẬT, không phụ thuộc vào việc Claude có "nhớ" hay không.
// Chặn: xoá đệ quy · sudo · systemctl/docker · force push · push thẳng main ·
//       pipe internet vào shell · đọc .env · tự merge PR
// KHÔNG chặn: git push branch thường (agent cần đẩy branch fix để mở PR)
import { readInput, deny } from './lib.mjs';

// A neo pattern vào ĐẦU LỆNH (hoặc sau ; && ||). Không neo thì mọi khoảng trắng
// giữa câu đều khớp, nên `git commit -m 'remove sudo call'` bị chặn oan.
const A = String.raw`(^|[;&|]\s*)`;

const RULES = [
  [`${A}rm\\s+(-[a-zA-Z]*r|--recursive)`, 'xoá đệ quy'],
  [`${A}find\\s.*-delete`, 'xoá hàng loạt qua find'],
  [`${A}sudo\\s`, 'sudo'],
  [`${A}(systemctl|docker)\\s`, 'đụng service/container'],
  [`${A}git\\s+push\\s+.*--force`, 'force push'],
  [
    `${A}git\\s+push\\s+(\\S+\\s+main(\\s|$)|origin\\s+HEAD:main)`,
    'push thẳng lên main',
  ],
  [String.raw`curl[^|]*\|\s*(ba)?sh`, 'pipe internet vào shell'],
  [`${A}cat\\s+[^|]*\\.env`, 'đọc file .env'],
  [`${A}gh\\s+pr\\s+merge`, 'agent không được tự merge'],
];

const cmd = (await readInput()).command || '';
for (const [pattern, reason] of RULES) {
  if (new RegExp(pattern).test(cmd)) deny(`${reason} — lệnh: ${cmd}`);
}
