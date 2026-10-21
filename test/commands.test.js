import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../elements/catalog.js';
import * as cmd from '../templates/_runtime/editor/commands.js';

const empty = () => ({ duration: 20, layers: [] });

test('addLayer: ใส่บนสุดด้วยค่าเริ่มต้นจาก catalog (สำเนา ไม่ผูกกับ catalog)', () => {
  const cfg = empty();
  const id = cmd.addLayer(cfg, 'text');
  assert.equal(id, 'text-1');
  const layer = cfg.layers[0];
  assert.deepEqual(
    { name: layer.name, hidden: layer.hidden, start: layer.start, end: layer.end, enter: layer.enter, exit: layer.exit },
    { name: 'ข้อความ', hidden: false, start: 0, end: null, enter: { type: 'none' }, exit: { type: 'none' } },
  );
  layer.props.text = 'แก้แล้ว';
  assert.equal(CATALOG.text.defaults.props.text, 'ข้อความ');
  assert.equal(cmd.addLayer(cfg, 'text'), 'text-2');
  assert.equal(cfg.layers[1].id, 'text-2');
});

test('addLayer: ใช้ timing และ style เริ่มต้นของชนิด', () => {
  const cfg = empty();
  cmd.addLayer(cfg, 'popup-card');
  assert.equal(cfg.layers[0].end, 6.15);
  assert.deepEqual(cfg.layers[0].enter, { type: 'pop', from: 'auto', duration: 0.7 });
  cmd.addLayer(cfg, 'ticker');
  assert.deepEqual(cfg.layers[1].style, { width: 1000 });
  assert.throws(() => cmd.addLayer(cfg, 'nope'), /ไม่รู้จักชิ้น "nope"/);
});

test('duplicateLayer: id ใหม่ ชื่อเติม (สำเนา) เลื่อน 40px วางเหนือชิ้นเดิม และต่อเวลาหลังชิ้นเดิม', () => {
  const cfg = empty();
  cmd.addLayer(cfg, 'popup-card');
  cmd.addLayer(cfg, 'text');
  cfg.layers[0].style = { right: 40, top: 40, left: 'auto' };
  const id = cmd.duplicateLayer(cfg, 'popup-card-1', 20);
  assert.equal(id, 'popup-card-2');
  assert.deepEqual(cfg.layers.map((l) => l.id), ['popup-card-1', 'popup-card-2', 'text-1']);
  const copy = cfg.layers[1];
  assert.equal(copy.name, 'การ์ดสปอนเซอร์เด้ง (สำเนา)');
  assert.deepEqual(copy.style, { right: 80, top: 80, left: 'auto' });
  assert.equal(copy.start, 6.5);
  assert.equal(copy.end, 12.65);
});

test('duplicateLayer: ชิ้นที่แสดงตลอดคลิปไม่ต้องเลื่อนเวลา', () => {
  const cfg = empty();
  cmd.addLayer(cfg, 'text');
  const id = cmd.duplicateLayer(cfg, 'text-1', 20);
  const copy = cfg.layers.find((l) => l.id === id);
  assert.equal(copy.start, 0);
  assert.equal(copy.end, null);
});

test('moveLayer / removeLayer / toggleHidden / renameLayer', () => {
  const cfg = empty();
  cmd.addLayer(cfg, 'text');
  cmd.addLayer(cfg, 'shape');
  assert.equal(cmd.moveLayer(cfg, 'shape-1', 1), false);
  assert.equal(cmd.moveLayer(cfg, 'shape-1', -1), true);
  assert.deepEqual(cfg.layers.map((l) => l.id), ['shape-1', 'text-1']);
  cmd.toggleHidden(cfg, 'text-1');
  assert.equal(cfg.layers[1].hidden, true);
  cmd.renameLayer(cfg, 'text-1', 'หัวเรื่อง');
  assert.equal(cfg.layers[1].name, 'หัวเรื่อง');
  cmd.removeLayer(cfg, 'shape-1');
  assert.deepEqual(cfg.layers.map((l) => l.id), ['text-1']);
});

test('removeLayer: id ที่ไม่มีอยู่ ต้องไม่ลบอะไร', () => {
  const cfg = empty();
  cmd.addLayer(cfg, 'text');
  cmd.removeLayer(cfg, 'nope-1');
  assert.deepEqual(cfg.layers.map((l) => l.id), ['text-1']);
});
