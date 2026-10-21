import { spawn } from 'node:child_process';

/**
 * เปิดลิงก์หรือโฟลเดอร์ด้วยโปรแกรมของเครื่อง (เบราว์เซอร์ / File Explorer / Finder)
 * ถ้าเปิดไม่ได้ก็ไม่เป็นไร ผู้ใช้เปิดเองได้ จึงไม่โยน error
 */
export function openExternal(target) {
  const [cmd, args] =
    process.platform === 'win32'
      ? /^https?:/.test(target) ? ['cmd', ['/c', 'start', '', target]] : ['explorer.exe', [target]]
      : process.platform === 'darwin' ? ['open', [target]]
        : ['xdg-open', [target]];
  try {
    const p = spawn(cmd, args, { stdio: 'ignore', detached: true });
    p.on('error', () => {});
    p.unref();
    return true;
  } catch {
    return false;
  }
}
