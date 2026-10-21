// Dùng chung cho 4 hook. Chạy bằng `node`, không cần bash/grep/timeout
// -> chạy được cả Windows native (cmd/PowerShell), macOS, Linux.

export async function readInput() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  try {
    return JSON.parse(s).tool_input ?? {};
  } catch {
    return {};
  }
}

// Windows trả path dấu `\`; chuẩn hoá về `/` để pattern khớp đồng nhất.
export const normalize = (p) => String(p || '').replace(/\\/g, '/');

export function deny(msg) {
  process.stderr.write(`BLOCKED by hook: ${msg}\n`);
  process.exit(2);
}
