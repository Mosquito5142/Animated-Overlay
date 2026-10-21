// สร้างภาพต้นแบบจากโค้ดเทมเพลตเดิม (รันครั้งเดียวก่อนเริ่มยกเครื่อง)
//   node test/tools/make-baseline.js
import { writeFile, mkdir } from 'node:fs/promises';
import { launch, shoot } from '../helpers/browser.js';
import { CASES, fixture } from '../helpers/cases.js';

const browser = await launch();
if (!browser) throw new Error('เปิด Chromium ไม่ได้ ลองรัน: npx playwright install chromium');
const dir = new URL('../baseline/', import.meta.url);
await mkdir(dir, { recursive: true });
try {
  for (const c of CASES) {
    const cfg = await fixture(c.file);
    const { shots, logs } = await shoot(browser, cfg, `/templates/${cfg.template}/index.html?mode=render`, c.times);
    if (logs.length) console.warn(`  ${c.name}:`, logs);
    for (const [i, buf] of shots.entries()) await writeFile(new URL(`${c.name}-${c.times[i]}.png`, dir), buf);
    console.log(`✓ ${c.name} (${shots.length} ภาพ)`);
  }
} finally {
  await browser.close();
}
