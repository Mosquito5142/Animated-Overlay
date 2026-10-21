import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { CATALOG } from '../elements/catalog.js';
import { launch, shoot } from './helpers/browser.js';

const exists = (p) => access(new URL(p, import.meta.url)).then(() => true, () => false);
const project = (layers) => ({
  version: 2, resolution: [1920, 1080], fps: 30, duration: 10,
  theme: { primary: '#e3122c', accent: '#ffd400', panel: '#141418', text: '#ffffff', font: 'Kanit' },
  preview: {}, layers,
});
function layerOf(type, i) {
  const def = CATALOG[type];
  const layer = {
    id: `${type}-1`, type, name: def.label, hidden: false,
    start: 0, end: null, enter: { type: 'none' }, exit: { type: 'none' },
    props: structuredClone(def.defaults.props),
  };
  // ครึ่งหนึ่งวางตำแหน่งเอง อีกครึ่งให้ stage จัดกลางจอ
  const placed = i % 2 === 0 ? { left: 20 + i * 30, top: 20 + i * 30 } : null;
  if (def.defaults.style || placed) layer.style = { ...def.defaults.style, ...placed };
  return layer;
}

test('ทุกชนิดใน catalog มี index.js และ style.css', async () => {
  for (const type of Object.keys(CATALOG)) {
    assert.ok(await exists(`../elements/${type}/index.js`), `${type}/index.js`);
    assert.ok(await exists(`../elements/${type}/style.css`), `${type}/style.css`);
  }
});

const browser = await launch();

test('ใส่ทุกชนิดในโปรเจกต์เดียวด้วยค่าเริ่มต้น แล้วเรนเดอร์ได้โดยไม่มี error', { skip: !browser && 'ยังไม่ได้ติดตั้ง Chromium' }, async () => {
  const layers = Object.keys(CATALOG).map(layerOf);
  const { shots, logs } = await shoot(browser, project(layers), '/templates/_runtime/stage.html?mode=render', [0, 3]);
  assert.equal(shots.length, 2);
  assert.deepEqual(logs, []);
});

test('ชิ้นที่ไม่รู้จัก: ตอนเรนเดอร์ล้มพร้อมชื่อชิ้น', { skip: !browser && 'ยังไม่ได้ติดตั้ง Chromium' }, async () => {
  const layers = [{ id: 'x-1', type: 'nope', start: 0, end: null, props: {} }];
  await assert.rejects(
    shoot(browser, project(layers), '/templates/_runtime/stage.html?mode=render', [0]),
    /x-1: ไม่รู้จักชิ้น "nope"/,
  );
});

after(() => browser?.close());
