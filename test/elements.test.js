import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { CATALOG } from '../elements/catalog.js';
import { launch, shoot, diffRatio } from './helpers/browser.js';

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

const skip = !browser && 'ยังไม่ได้ติดตั้ง Chromium';
const RENDER = '/templates/_runtime/stage.html?mode=render';
const base = (id, type, extra = {}) => ({ id, type, start: 0, end: null, enter: { type: 'none' }, exit: { type: 'none' }, props: {}, ...extra });

test('รูปที่ยังไม่ได้เลือก: ตอนเรนเดอร์ไม่มีกรอบ "ยังไม่ได้เลือกรูป" ติดไป', { skip }, async () => {
  const { shots: [empty] } = await shoot(browser, project([]), RENDER, [0]);
  const { shots: [img], logs } = await shoot(browser, project([base('image-1', 'image', { style: { left: 100, top: 100 } })]), RENDER, [0]);
  assert.deepEqual(logs, []);
  assert.equal(await diffRatio(browser, empty, img), 0);
});

test('ตัววิ่งที่ไม่มีข้อความ (items: []): ไม่ clone ไม่มี NaN', { skip }, async () => {
  const layers = [base('ticker-1', 'ticker', { style: { left: 30, right: 30, bottom: 30 }, props: { items: [] } })];
  const { logs, values } = await shoot(browser, project(layers), RENDER, [0, 3], (page) =>
    page.evaluate(() => ({ units: document.querySelectorAll('.el-ticker .unit').length, transform: document.querySelector('.el-ticker .track').style.transform })));
  assert.deepEqual(logs, []);
  for (const v of values) {
    assert.equal(v.units, 1);
    assert.doesNotMatch(v.transform, /NaN|Infinity/);
  }
});

test('ท่าเข้าที่ค่าผิด: หน้าดูตัวอย่างแสดงกล่อง ⚠ แค่ชิ้นนั้น ส่วนเรนเดอร์ล้ม', { skip }, async () => {
  const layers = [
    base('bad-1', 'text', { style: { left: 100, top: 100 }, enter: { type: 'slide', offset: 5, duration: 1 }, props: { text: 'BAD' } }),
    base('ok-1', 'text', { style: { left: 100, top: 300 }, props: { text: 'OK' } }),
  ];
  const { values } = await shoot(browser, project(layers), '/templates/_runtime/stage.html?embed=1', [0.2], (page) =>
    page.evaluate(() => [...document.querySelectorAll('.layer')].map((n) => [n.dataset.id, n.querySelector('.el').className])));
  assert.deepEqual(values[0], [['bad-1', 'el el-broken'], ['ok-1', 'el el-text']]);
  await assert.rejects(shoot(browser, project(layers), RENDER, [0.2]), /bad-1/);
});

test('ชิ้นที่ย่อเหลือครึ่ง: ท่า slide ออกพาชิ้นพ้นขอบจอจริง', { skip }, async () => {
  const layers = [base('text-1', 'text', {
    end: 5, exit: { type: 'slide', from: 'right', duration: 1 },
    style: { left: 1400, top: 400, scale: '0.5' }, props: { text: 'SCALED' },
  })];
  const { values } = await shoot(browser, project(layers), RENDER, [4.999], (page) =>
    page.evaluate(() => document.querySelector('.layer .el').getBoundingClientRect().left));
  assert.ok(values[0] > 1920, `ขอบซ้ายของชิ้นอยู่ที่ ${values[0]}`);
});

after(() => browser?.close());
