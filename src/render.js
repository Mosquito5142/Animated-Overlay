import { mkdir, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';
import { startServer } from './server.js';
import { encodeVideo } from './encode.js';

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (err) {
    throw new Error(
      `เปิด Chromium ไม่ได้ ลองรัน "npx playwright install chromium" ก่อน\n  ${err.message.split('\n')[0]}`,
    );
  }
}

/** เปิดเทมเพลตในเบราว์เซอร์แบบซ่อน แล้วรอจนพร้อมเรนเดอร์ */
async function openTemplate(cfg) {
  const { server, url } = await startServer(async () => cfg);
  const browser = await launchBrowser();
  const [width, height] = cfg.resolution;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(e.message));

  await page.goto(`${url}/templates/${cfg.template}/index.html?mode=render`);
  await page.waitForFunction(() => window.overlay && (window.overlay.ready || window.overlay.error), null, {
    timeout: 30000,
  });
  const error = await page.evaluate(() => window.overlay.error);
  if (error) throw new Error(`เทมเพลตมีข้อผิดพลาด:\n${error}`);
  for (const l of logs) console.warn(`  [template] ${l}`);

  const close = async () => {
    await browser.close();
    server.close();
  };
  const shoot = async (t) => {
    await page.evaluate((time) => window.overlay.renderFrame(time), t);
    return page.screenshot({ omitBackground: true, type: 'png' });
  };
  return { shoot, close };
}

function progressBar(i, total) {
  if (!process.stdout.isTTY) return;
  const w = 30;
  const done = Math.round((i / total) * w);
  process.stdout.write(`\r  [${'#'.repeat(done)}${'.'.repeat(w - done)}] ${i}/${total} เฟรม`);
  if (i === total) process.stdout.write('\n');
}

/** เรนเดอร์ภาพนิ่ง PNG โปร่งใสที่เวลา t */
export async function renderStill(cfg, outDir, t) {
  await mkdir(outDir, { recursive: true });
  const tpl = await openTemplate(cfg);
  try {
    const out = path.join(outDir, `${cfg.name || 'overlay'}.png`);
    await writeFile(out, await tpl.shoot(t));
    return [out];
  } finally {
    await tpl.close();
  }
}

/**
 * เรนเดอร์ทุกเฟรมแล้วเข้ารหัสตาม cfg.format
 * onProgress({ phase: 'capture' | 'encode', done, total, format }) ใช้แสดงความคืบหน้าในหน้า studio
 */
export async function renderVideo(cfg, outDir, { onProgress } = {}) {
  await mkdir(outDir, { recursive: true });
  const total = Math.round(cfg.duration * cfg.fps);
  const framesDir = path.join(os.tmpdir(), `overlay-frames-${process.pid}-${Date.now()}`);
  await mkdir(framesDir, { recursive: true });

  const tpl = await openTemplate(cfg);
  try {
    if (!onProgress) console.log(`จับภาพ ${total} เฟรม (${cfg.resolution.join('x')} @ ${cfg.fps}fps, ${cfg.duration}s)`);
    for (let i = 0; i < total; i++) {
      const buf = await tpl.shoot(i / cfg.fps);
      await writeFile(path.join(framesDir, `frame-${String(i).padStart(5, '0')}.png`), buf);
      if (onProgress) onProgress({ phase: 'capture', done: i + 1, total });
      else progressBar(i + 1, total);
    }
  } finally {
    await tpl.close();
  }

  const base = path.join(outDir, cfg.name || 'overlay');
  const outputs = [];
  try {
    for (const format of cfg.format) {
      if (format === 'png') {
        const dir = `${base}-png`;
        await rm(dir, { recursive: true, force: true });
        await cp(framesDir, dir, { recursive: true });
        outputs.push(`${dir}/`);
        continue;
      }
      if (onProgress) onProgress({ phase: 'encode', format, done: total, total });
      else console.log(`เข้ารหัส ${format} ...`);
      outputs.push(await encodeVideo(format, framesDir, cfg.fps, base));
    }
  } finally {
    await rm(framesDir, { recursive: true, force: true });
  }
  return outputs;
}
