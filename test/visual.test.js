import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { launch, shoot, diffRatio } from './helpers/browser.js';
import { CASES, fixture } from './helpers/cases.js';
import { migrate } from '../src/migrate.js';

const hasModule = (type) => access(new URL(`../elements/${type}/index.js`, import.meta.url)).then(() => true, () => false);
const browser = await launch();

test('งานเดิมที่แปลงแล้วหน้าตาเหมือนเดิม', { skip: !browser && 'ยังไม่ได้ติดตั้ง Chromium' }, async (t) => {
  try {
    for (const c of CASES) {
      const cfg = migrate(await fixture(c.file));
      const ready = (await Promise.all(cfg.layers.map((l) => hasModule(l.type)))).every(Boolean);
      await t.test(c.name, { skip: !ready && 'ยังไม่มีโมดูลของบางชิ้น' }, async () => {
        const { shots, logs } = await shoot(browser, cfg, '/templates/_runtime/stage.html?mode=render', c.times);
        assert.deepEqual(logs, []);
        for (const [i, buf] of shots.entries()) {
          const base = await readFile(new URL(`./baseline/${c.name}-${c.times[i]}.png`, import.meta.url));
          const ratio = await diffRatio(browser, base, buf);
          assert.ok(ratio <= 0.005, `${c.name} t=${c.times[i]}: ต่างกัน ${(ratio * 100).toFixed(2)}%`);
        }
      });
    }
  } finally {
    await browser?.close();
  }
});
