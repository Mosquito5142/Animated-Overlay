import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { launch, shoot, diffRatio } from './helpers/browser.js';
import { CASES, fixture } from './helpers/cases.js';
import { migrate } from '../src/migrate.js';
import { presetProject } from '../src/studio.js';

const browser = await launch();

/** จับภาพ cfg ตามเวลาของ case แล้วเทียบกับ baseline/<name>-<t>.png */
async function assertMatchesBaseline(cfg, c) {
  const { shots, logs } = await shoot(browser, cfg, '/templates/_runtime/stage.html?mode=render', c.times);
  assert.deepEqual(logs, []);
  for (const [i, buf] of shots.entries()) {
    const base = await readFile(new URL(`./baseline/${c.name}-${c.times[i]}.png`, import.meta.url));
    const ratio = await diffRatio(browser, base, buf);
    assert.ok(ratio <= 0.005, `${c.name} t=${c.times[i]}: ต่างกัน ${(ratio * 100).toFixed(2)}%`);
  }
}

test('งานเดิมที่แปลงแล้วหน้าตาเหมือนเดิม', { skip: !browser && 'ยังไม่ได้ติดตั้ง Chromium' }, async (t) => {
  try {
    const stageExists = await access(new URL('../templates/_runtime/stage.html', import.meta.url)).then(() => true, () => false);
    assert.ok(stageExists, 'ไม่พบ templates/_runtime/stage.html');
    for (const c of CASES) {
      await t.test(c.name, async () => assertMatchesBaseline(migrate(await fixture(c.file)), c));
    }

    // งานที่สร้างจาก preset sponsor-gaming แบบแนวตั้ง ต้องวางตำแหน่งเหมือนงานแนวตั้งเดิม
    await t.test('preset sponsor-gaming แนวตั้ง', async () => {
      const created = await presetProject('sponsor-gaming', true);
      const expected = migrate(await fixture('vertical.config.json'));
      const { layers: a, ...restA } = created;
      const { layers: b, ...restB } = expected;
      assert.deepEqual(restA, restB);
      assert.deepEqual(a.map((l) => [l.id, l.style]), b.map((l) => [l.id, l.style]), 'ตำแหน่งต้องตรงกับงานแนวตั้งเดิม');
      // เนื้อหาต่างกันแค่ขนาดกล้อง (preset 398×292, งานแนวตั้งเดิม 400×300) ใช้ของงานเดิมก่อนเทียบภาพ
      const diffs = a.filter((l, i) => JSON.stringify(l) !== JSON.stringify(b[i])).map((l) => l.id);
      assert.deepEqual(diffs, ['webcam-frame-1']);
      const cam = (cfg) => cfg.layers.find((l) => l.id === 'webcam-frame-1');
      assert.deepEqual({ ...cam(created).props, camSize: null }, { ...cam(expected).props, camSize: null });
      cam(created).props.camSize = cam(expected).props.camSize;
      await assertMatchesBaseline(created, CASES.find((c) => c.name === 'vertical'));
    });
  } finally {
    await browser?.close();
  }
});
