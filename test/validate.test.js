import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../src/validate.js';

const ok = () => ({
  version: 2, duration: 10,
  layers: [{ id: 'text-1', type: 'text', hidden: false, start: 0, end: null, enter: { type: 'none' }, exit: { type: 'none' }, props: {} }],
});
const errs = (mutate, opts) => {
  const cfg = ok();
  mutate(cfg);
  return validateProject(cfg, opts).join('\n');
};

test('โปรเจกต์ถูกต้อง: ไม่มีข้อผิดพลาด', () => {
  assert.deepEqual(validateProject(ok()), []);
  assert.deepEqual(validateProject(ok(), { strict: true }), []);
  assert.deepEqual(validateProject({ version: 2, duration: 10, layers: [] }), []);
});

test('ค่าที่ผิดแต่ละแบบถูกปฏิเสธ', () => {
  assert.match(errs((c) => (c.version = 1)), /version ต้องเป็น 2/);
  assert.match(errs((c) => (c.layers = {})), /layers ต้องเป็นรายการ/);
  assert.match(errs((c) => c.layers.push({ ...c.layers[0] })), /id ซ้ำ/);
  assert.match(errs((c) => delete c.layers[0].id), /ต้องมี id/);
  assert.match(errs((c) => (c.layers[0].type = 'Bad Type')), /ชนิด "Bad Type" ไม่ถูกต้อง/);
  assert.match(errs((c) => (c.layers[0].hidden = 'yes')), /hidden ต้องเป็น true\/false/);
  assert.match(errs((c) => (c.layers[0].start = -1)), /start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป/);
  assert.match(errs((c) => (c.layers[0].start = 10)), /start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป/);
  assert.match(errs((c) => (c.layers[0].end = 0)), /end ต้องว่างหรือมากกว่า start/);
  assert.match(errs((c) => (c.layers[0].enter = { type: 'spin' })), /ไม่รู้จักท่าเข้า "spin"/);
  assert.match(errs((c) => (c.layers[0].exit = { type: 'spin' })), /ไม่รู้จักท่าออก "spin"/);
  assert.match(errs((c) => (c.layers[0].props = [])), /props ต้องเป็นออบเจกต์/);
});

test('ชนิดที่ไม่รู้จัก: โหลดได้ (ไปลบในหน้าแก้ไข) แต่บันทึกไม่ได้', () => {
  assert.equal(errs((c) => (c.layers[0].type = 'nope')), '');
  assert.match(errs((c) => (c.layers[0].type = 'nope'), { strict: true }), /ไม่รู้จักชิ้น "nope"/);
});

test('ค่าท่าเข้า/ออกที่ทำให้ stage พัง ถูกปฏิเสธ', () => {
  assert.match(errs((c) => (c.layers[0].enter = { type: 'pop', from: 'diagonal' })), /ทิศ "diagonal"/);
  assert.match(errs((c) => (c.layers[0].exit = { type: 'slide', from: 5 })), /ทิศ "5"/);
  assert.match(errs((c) => (c.layers[0].enter = { type: 'slide', offset: [1] })), /offset ต้องเป็น \[x, y\]/);
  assert.match(errs((c) => (c.layers[0].enter = { type: 'slide', offset: ['a', 0] })), /offset ต้องเป็น \[x, y\]/);
  assert.match(errs((c) => (c.layers[0].exit = { type: 'slide', offset: 3 })), /offset ต้องเป็น \[x, y\]/);
  assert.match(errs((c) => (c.layers[0].enter = { type: 'fade', duration: 0 })), /duration ต้องเป็นตัวเลขมากกว่า 0/);
  assert.match(errs((c) => (c.layers[0].exit = { type: 'fade', duration: '1' })), /duration ต้องเป็นตัวเลขมากกว่า 0/);
  assert.match(errs((c) => (c.layers[0].enter = 'pop')), /ท่าเข้า/);
  // ค่าที่ถูกต้อง
  assert.equal(errs((c) => (c.layers[0].enter = { type: 'pop', from: 'auto', duration: 0.7 })), '');
  assert.equal(errs((c) => (c.layers[0].enter = { type: 'slide', offset: [420, 0], duration: 0.7 })), '');
  assert.equal(errs((c) => (c.layers[0].exit = { type: 'slide', from: 'left' })), '');
});
