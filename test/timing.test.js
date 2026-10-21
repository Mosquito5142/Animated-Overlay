import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerSpan, layerMotion, nearestEdge, offscreen, scaledBox, ease, makeCycle } from '../templates/_runtime/timing.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
const POP = { start: 1, end: 7.15, enter: { type: 'pop', from: 'auto', duration: 0.7 }, exit: { type: 'pop', duration: 0.45 } };

test('end = null: แสดงตั้งแต่ start จนจบคลิป', () => {
  assert.equal(layerSpan({ start: 2, end: null }, 1, 10).visible, false);
  const s = layerSpan({ start: 2, end: null }, 2.5, 10);
  assert.equal(s.visible, true);
  near(s.local, 0.5);
  near(s.length, 8);
  assert.equal(s.enter, 0);
  assert.equal(s.exit, 0);
});

test('มี end: หายตอนถึง end และบอกความยาวท่าเข้า/ออก', () => {
  assert.equal(layerSpan(POP, 7.149, 20).visible, true);
  assert.equal(layerSpan(POP, 7.15, 20).visible, false);
  assert.equal(layerSpan(POP, 0.5, 20).visible, false);
  const s = layerSpan(POP, 1.2, 20);
  near(s.local, 0.2);
  near(s.length, 6.15);
  near(s.enter, 0.7);
  near(s.exit, 0.45);
});

test('end เกินความยาวคลิป: ส่วนที่เกินวนไปแสดงต้นคลิป', () => {
  const layer = { start: 8, end: 12 };
  assert.equal(layerSpan(layer, 1, 10).visible, true);
  near(layerSpan(layer, 1, 10).local, 3);
  assert.equal(layerSpan(layer, 2.5, 10).visible, false);
  assert.equal(layerSpan(layer, 9, 10).visible, true);
});

test('ไม่มีท่าเข้า/ออก = ไม่ขยับ', () => {
  const s = layerSpan({ start: 0, end: null }, 3, 10);
  assert.deepEqual(layerMotion({}, s, { x: 0, y: 0, w: 10, h: 10 }, 100, 100), { x: 0, y: 0, scale: 1, opacity: 1 });
});

test('fade เข้า: ครึ่งทาง opacity = outCubic(0.5)', () => {
  const layer = { start: 0, end: null, enter: { type: 'fade', duration: 1 } };
  const m = layerMotion(layer, layerSpan(layer, 0.5, 10), { x: 0, y: 0, w: 10, h: 10 }, 100, 100);
  near(m.opacity, ease.outCubic(0.5));
  near(m.x, 0);
});

test('pop เข้า: เริ่มนอกขอบที่ใกล้ที่สุด ย่อ 0.7 และโปร่งใส', () => {
  const box = { x: 1500, y: 40, w: 300, h: 100 };
  assert.equal(nearestEdge(box, 1920, 1080), 'top');
  const layer = { ...POP, enter: { type: 'pop', from: 'right', duration: 0.7 } };
  const m = layerMotion(layer, layerSpan(layer, 1, 20), box, 1920, 1080);
  near(m.x, 1920 - 1500 + 40);
  near(m.y, 0);
  near(m.scale, 0.7);
  near(m.opacity, 0);
});

test('slide เข้าแบบกำหนด offset (intro เดิม)', () => {
  const layer = { start: 0, end: null, enter: { type: 'slide', offset: [420, 0], duration: 0.7 } };
  const m0 = layerMotion(layer, layerSpan(layer, 0, 10), { x: 0, y: 0, w: 10, h: 10 }, 100, 100);
  near(m0.x, 420);
  near(m0.opacity, 0);
  const m1 = layerMotion(layer, layerSpan(layer, 0.7, 10), { x: 0, y: 0, w: 10, h: 10 }, 100, 100);
  assert.deepEqual(m1, { x: 0, y: 0, scale: 1, opacity: 1 });
});

test('pop ออก: จบที่นอกขอบ ย่อ 0.85 และ opacity 0.7', () => {
  const box = { x: 40, y: 40, w: 300, h: 100 };
  const m = layerMotion(POP, layerSpan(POP, 7.1499999, 20), box, 1920, 1080);
  const [dx, dy] = offscreen('left', box, 1920, 1080);
  assert.ok(Math.abs(m.x - dx) < 0.01);
  near(m.y, dy);
  assert.ok(Math.abs(m.scale - 0.85) < 1e-4);
  assert.ok(Math.abs(m.opacity - 0.7) < 1e-4);
});

test('cycle: คาบถูกปัดให้หารความยาวคลิปลงตัว', () => {
  const cycle = makeCycle(10);
  near(cycle(0, 3), 0);
  near(cycle(10, 3), 0);
  near(cycle(5, 2.5), 0);
});

test('scaledBox: กล่องบนจอของชิ้นที่ย่อ/ขยาย ตาม transform-origin', () => {
  const box = { x: 1500, y: 40, w: 300, h: 100 };
  assert.deepEqual(scaledBox(box, 1, [150, 50]), box);
  // ขยาย 2 เท่ารอบจุดกลาง
  assert.deepEqual(scaledBox(box, 2, [150, 50]), { x: 1350, y: -10, w: 600, h: 200 });
  // ขยายจากมุมซ้ายล่าง แยกแกน x/y
  assert.deepEqual(scaledBox(box, [2, 0.5], [0, 100]), { x: 1500, y: 90, w: 600, h: 50 });
});

test('ชิ้นที่ขยาย 2 เท่า: ท่า slide ออกพาชิ้นพ้นขอบจอจริง (หารระยะด้วย scale)', () => {
  const screen = scaledBox({ x: 1500, y: 400, w: 300, h: 100 }, 2, [150, 50]);
  const layer = { start: 0, end: 5, exit: { type: 'slide', from: 'right', duration: 1 } };
  const m = layerMotion(layer, layerSpan(layer, 4.9999999, 10), screen, 1920, 1080, 2);
  // ระยะที่ .motion เลื่อน (ก่อนโดน scale ของ .layer) × 2 = ระยะบนจอ ต้องพาขอบซ้ายของกล่องพ้นขอบขวา
  assert.ok(screen.x + m.x * 2 > 1920, `ขอบซ้ายอยู่ที่ ${screen.x + m.x * 2}`);
  assert.ok(Math.abs(m.x * 2 - (1920 - screen.x + 40)) < 0.01);
  // offset ที่กำหนดเองเป็นพิกเซลบนจอเช่นกัน
  const s = { start: 0, end: null, enter: { type: 'slide', offset: [420, 0], duration: 0.7 } };
  near(layerMotion(s, layerSpan(s, 0, 10), screen, 1920, 1080, 2).x * 2, 420);
});

test('offscreen: ทิศที่ไม่รู้จัก ใช้ขอบที่ใกล้ที่สุดแทน (ไม่คืน undefined)', () => {
  const box = { x: 1500, y: 40, w: 300, h: 100 };
  assert.deepEqual(offscreen('diagonal', box, 1920, 1080), offscreen('top', box, 1920, 1080));
  assert.deepEqual(offscreen(undefined, box, 1920, 1080), offscreen('top', box, 1920, 1080));
  const layer = { start: 0, end: null, enter: { type: 'pop', from: 'sideways', duration: 1 } };
  const m = layerMotion(layer, layerSpan(layer, 0, 10), box, 1920, 1080);
  assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y));
});
