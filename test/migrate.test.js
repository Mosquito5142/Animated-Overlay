import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/migrate.js';
import { CATALOG } from '../elements/catalog.js';
import { fixture } from './helpers/cases.js';

const types = (cfg) => cfg.layers.map((l) => l.type);
const byType = (cfg, type) => cfg.layers.find((l) => l.type === type);

test('overlay (ชุดเกมแนวนอน): 7 ชิ้นเรียงตามลำดับเดิม พร้อมตำแหน่งเริ่มต้นจาก CSS เดิม', async () => {
  const v2 = migrate(await fixture('overlay.config.json'));
  assert.equal(v2.version, 2);
  assert.deepEqual(types(v2), ['highlight', 'top-donate', 'sponsor-logo', 'webcam-frame', 'promo-bar', 'ticker', 'notice']);
  assert.deepEqual(v2.layers.map((l) => l.id), [
    'highlight-1', 'top-donate-1', 'sponsor-logo-1', 'webcam-frame-1', 'promo-bar-1', 'ticker-1', 'notice-1',
  ]);
  assert.deepEqual(byType(v2, 'highlight').style, { top: 30, right: 40 });
  assert.deepEqual(byType(v2, 'ticker').style, { left: 720, right: 380, bottom: 26 });
  assert.deepEqual(byType(v2, 'webcam-frame').props.camSize, [398, 292]);
  assert.equal(byType(v2, 'highlight').name, CATALOG.highlight.label);
  assert.equal(byType(v2, 'highlight').hidden, false);
  assert.equal(byType(v2, 'highlight').start, 0);
  assert.equal(byType(v2, 'highlight').end, null);
  assert.deepEqual(byType(v2, 'highlight').enter, { type: 'none' });
  assert.equal(v2.theme.text, '#ffffff');
  for (const k of ['template', 'intro', 'elements']) assert.equal(k in v2, false, k);
});

test('vertical: ใช้ตำแหน่งแนวตั้งเดิม', async () => {
  const v2 = migrate(await fixture('vertical.config.json'));
  assert.deepEqual(byType(v2, 'highlight').style, { top: 150, right: 40 });
  assert.deepEqual(byType(v2, 'notice').style, { left: 30, bottom: 470 });
});

test('popup: แปลง start/hold เป็น start/end + ท่า pop', async () => {
  const v2 = migrate(await fixture('popup.config.json'));
  assert.deepEqual(types(v2), ['popup-card', 'popup-card', 'popup-card', 'popup-card']);
  const [p1, p2, p3, badge] = v2.layers;
  assert.equal(p1.start, 1);
  assert.equal(p1.end, 7.15);
  assert.deepEqual(p1.enter, { type: 'pop', from: 'auto', duration: 0.7 });
  assert.deepEqual(p1.exit, { type: 'pop', duration: 0.45 });
  for (const k of ['start', 'hold', 'from']) assert.equal(k in p1.props, false, k);
  assert.equal(p2.end, 13.65);
  assert.deepEqual(p2.style, { left: 40, right: 'auto', top: 'auto', bottom: 60, 'transform-origin': 'left bottom' });
  assert.equal(p3.enter.from, 'top');
  assert.equal(p3.end, 19.65);
  assert.equal(badge.start, 0);
  assert.equal(badge.end, null);
  assert.deepEqual(badge.enter, { type: 'none' });
  assert.equal(badge.props.persistent, true);
  assert.equal(badge.name, 'POWERED BY');
  assert.equal(p1.name, 'YOUR BRAND');
});

test('neon: secondary → accent และป้ายนีออนไม่มี style (ให้ stage จัดกลางขอบบน)', async () => {
  const v2 = migrate(await fixture('neon.config.json'));
  assert.deepEqual(types(v2), ['neon-frame', 'neon-bulbs', 'neon-corners', 'neon-label']);
  assert.equal(v2.theme.accent, '#ff2bd6');
  assert.equal('secondary' in v2.theme, false);
  assert.equal('style' in byType(v2, 'neon-label'), false);
  assert.equal('style' in byType(v2, 'neon-frame'), false);
});

test('enabled: false → hidden: true (ชิ้นยังอยู่)', () => {
  const v2 = migrate({ template: 'sponsor-gaming', elements: { highlight: { enabled: false, text: 'X' } } });
  assert.equal(v2.layers.length, 1);
  assert.equal(v2.layers[0].hidden, true);
  assert.deepEqual(v2.layers[0].props, { text: 'X' });
});

test('intro: true → ท่า slide ตามจังหวะเดิม', () => {
  const v2 = migrate({
    template: 'sponsor-gaming', intro: true,
    elements: { highlight: { text: 'H' }, topDonate: { name: 'A', amount: 1 } },
  });
  assert.equal(v2.layers[0].start, 0);
  assert.deepEqual(v2.layers[0].enter, { type: 'slide', offset: [420, 0], duration: 0.7 });
  assert.equal(v2.layers[1].start, 0.15);
});

test('เก็บ description ของเทมเพลตไว้ (ใช้ทำ preset)', async () => {
  const v2 = migrate(await fixture('sponsor-gaming.default.json'));
  assert.ok(v2.description.length > 0);
});

test('เทมเพลตที่ไม่รู้จัก: throw', () => {
  assert.throws(() => migrate({ template: 'my-own', elements: {} }), /ไม่รู้จักเทมเพลต "my-own"/);
});

test('ไฟล์ version 2 อยู่แล้ว: คืนตัวเดิม', () => {
  const v2 = { version: 2, layers: [] };
  assert.equal(migrate(v2), v2);
});
