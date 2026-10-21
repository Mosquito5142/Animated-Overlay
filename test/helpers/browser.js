// ตัวช่วยเปิดหน้า overlay ใน Chromium แบบซ่อน จับภาพตามเวลา และเทียบภาพสองภาพ
import { chromium } from 'playwright';
import { startServer } from '../../src/server.js';

/** เปิด Chromium ถ้ายังไม่ได้ติดตั้งคืน null (เทสต์จะข้ามไป) */
export async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return null;
  }
}

/**
 * เปิด pagePath โดยเสิร์ฟ cfg เป็น /__config.json แล้วจับภาพโปร่งใสทีละเวลา
 * inspect(page, t) (ไม่ใส่ก็ได้): อ่านค่าจากหน้าเว็บหลังวาดแต่ละเวลา ได้คืนเป็น values
 */
export async function shoot(browser, cfg, pagePath, times, inspect) {
  const { server, url } = await startServer(async () => cfg);
  const [width, height] = cfg.resolution;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(e.message));
  try {
    await page.goto(`${url}${pagePath}`);
    await page.waitForFunction(() => window.overlay && (window.overlay.ready || window.overlay.error), null, {
      timeout: 30000,
    });
    const error = await page.evaluate(() => window.overlay.error);
    if (error) throw new Error(error);
    const shots = [];
    const values = [];
    for (const t of times) {
      await page.evaluate((x) => window.overlay.renderFrame(x), t);
      shots.push(await page.screenshot({ omitBackground: true, type: 'png' }));
      if (inspect) values.push(await inspect(page, t));
    }
    return { shots, logs, values };
  } finally {
    await page.close();
    server.close();
  }
}

/** สัดส่วนพิกเซลที่ต่างกัน (ช่องสีใดต่างเกิน 24 นับว่าต่าง) ขนาดไม่เท่ากันคืน 1 */
export async function diffRatio(browser, a, b) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(async ([a64, b64]) => {
      const load = async (s) => {
        const img = new Image();
        img.src = `data:image/png;base64,${s}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height);
      };
      const [A, B] = await Promise.all([load(a64), load(b64)]);
      if (A.width !== B.width || A.height !== B.height) return 1;
      let bad = 0;
      for (let i = 0; i < A.data.length; i += 4) {
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(A.data[i + k] - B.data[i + k]));
        if (m > 24) bad++;
      }
      return bad / (A.width * A.height);
    }, [a.toString('base64'), b.toString('base64')]);
  } finally {
    await page.close();
  }
}
