# งาน 1: คลังชิ้นส่วน + โปรเจกต์เปล่า — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนเทมเพลตตายตัว 3 แบบเป็นคลังชิ้นส่วน 15 ชนิดที่ใส่ได้หลายอัน ผสมข้ามแบบได้ เริ่มจากหน้าเปล่าได้ และแปลงงานเดิมให้อัตโนมัติโดยหน้าตาไม่เปลี่ยน

**Architecture:** ไฟล์โปรเจกต์ version 2 มี `layers` เรียงลำดับ หน้า `templates/_runtime/stage.html` หน้าเดียวโหลดโมดูล `elements/<type>/index.js` เฉพาะชนิดที่ใช้ ส่วนกลาง (`stage.js` + `timing.js`) ห่อทุกชิ้นด้วย `.layer > .motion > .el` และจัดการตำแหน่ง ธีม เวลาโผล่/หาย และท่าเข้า/ออก ส่วนตัวชิ้นทำแค่หน้าตาและท่าวนของตัวเอง ข้อมูลของชนิด (ชื่อ หมวด ค่าเริ่มต้น fields) อยู่ใน `elements/catalog.js` ซึ่งเป็นข้อมูลล้วน ใช้ได้ทั้งเบราว์เซอร์และ Node

**Tech Stack:** Node ≥ 22 (ESM), `node:test`, Playwright 1.56.1 (มีอยู่แล้ว), เว็บ vanilla JS ไม่มี build step

**สเปก:** [docs/superpowers/specs/2026-10-21-element-library-design.md](../specs/2026-10-21-element-library-design.md)

## Global Constraints

- ห้ามเพิ่มแพ็กเกจ npm ใหม่ ใช้แค่ `playwright` ที่มีอยู่ + โมดูลที่มากับ Node
- ข้อความทุกอย่างที่ผู้ใช้เห็นเป็นภาษาไทย คอมเมนต์ในโค้ดเป็นภาษาไทยตามสไตล์เดิม
- ทุกท่าทางคำนวณจากเวลา `t` เท่านั้น ห้ามใช้ CSS animation, transition หรือ setTimeout ใน stage/ชิ้นส่วน
- ไฟล์โปรเจกต์: `"version": 2`, ฟิลด์ layer ได้แก่ `id`, `type`, `name`, `hidden`, `start`, `end`, `enter`, `exit`, `style`, `theme`, `props`
- theme กลางมี 5 ค่า: `primary`, `accent`, `panel`, `text`, `font`
- ชนิดท่าเข้า: `none` / `fade` / `slide` / `pop` และชนิดท่าออก: `none` / `fade` / `slide` / `pop`
- งานเดิมต้องได้ภาพเหมือนเดิม: ต่างกันไม่เกิน 0.5% ของพิกเซล (พิกเซลที่ช่องสีใดต่างเกิน 24)
- ไฟล์สำรองตอนแปลง: `backup/<ชื่อ>.v1.json` ถ้ามีอยู่แล้วใช้ `.v1-2.json`, `.v1-3.json` ...
- ทุก commit ลงท้ายด้วยบรรทัด `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- คำสั่งเทสต์: `npm test` (= `node --test "test/*.test.js"`)

## โครงไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `elements/catalog.js` | ข้อมูลทุกชนิด: label, icon, category, fullscreen, defaults, fields (ไม่มี import) |
| `elements/_shared/motion.js` | สูตรแสงวิ่ง/คลื่นที่ชิ้นชุดเกมใช้ร่วมกัน |
| `elements/<type>/index.js`, `style.css` | หน้าตา + ท่าวนของชิ้น 15 ชนิด |
| `elements/neon-frame/geometry.js` | สี่เหลี่ยมกรอบนีออนที่หลอดไฟ/มุมกรอบ/ป้ายนีออนใช้ร่วมกัน |
| `templates/_runtime/dom.js` | `el`, `svgEl`, `applyStyle`, `assetUrl` |
| `templates/_runtime/timing.js` | ease, cycle, `layerSpan`, `layerMotion` (ฟังก์ชันล้วน) |
| `templates/_runtime/stage.html`, `stage.js` | หน้าแสดงผลเดียว (แทน `templates/*/index.html` + `runtime.js`) |
| `templates/_runtime/editor/index.js` | หน้าแก้ไข: สถานะ ประวัติ บันทึก ลาก (แทน `editor.js`) |
| `templates/_runtime/editor/commands.js` | เพิ่ม/ทำสำเนา/ลบ/เลื่อน/ซ่อน/เปลี่ยนชื่อ layer (ฟังก์ชันล้วน) |
| `templates/_runtime/editor/library.js`, `layers.js`, `inspector.js` | หน้าต่างคลัง, รายการ Layers, แผงคุณสมบัติ |
| `src/migrate.js` | `migrate(v1) → v2` (ฟังก์ชันล้วน) |
| `src/validate.js` | `validateProject(cfg, { strict })` (ฟังก์ชันล้วน) |
| `src/config.js` | `loadConfig` แบบ v2: แปลง + สำรอง + ตรวจ |
| `presets/*.json` | blank, sponsor-gaming, sponsor-popup, neon-frame |
| `test/` | เทสต์ + fixtures v1 + ภาพต้นแบบ |

---

### Task 1: ชุดทดสอบ + ภาพต้นแบบจากโค้ดเดิม

ต้องทำก่อนแก้โค้ดใดๆ เพราะภาพต้นแบบต้องมาจากเทมเพลตเดิม

**Files:**
- Modify: `package.json` (เพิ่ม script `test`)
- Create: `test/fixtures/v1/overlay.config.json`, `vertical.config.json`, `popup.config.json`, `neon.config.json`, `sponsor-gaming.default.json`, `sponsor-popup.default.json`, `neon-frame.default.json`
- Create: `test/helpers/browser.js`, `test/helpers/cases.js`, `test/tools/make-baseline.js`
- Create: `test/baseline/*.png` (สร้างโดยสคริปต์)

**Interfaces:**
- Produces: `launch(): Promise<Browser|null>`, `shoot(browser, cfg, pagePath, times): Promise<{ shots: Buffer[], logs: string[] }>` (throw ถ้าหน้ามี `window.overlay.error`), `diffRatio(browser, pngA, pngB): Promise<number>` (0..1), `CASES: { name, file, times }[]`, `fixture(file): Promise<object>`

- [ ] **Step 1: คัดลอก config เดิมเป็น fixtures**

```bash
mkdir -p test/fixtures/v1
cp overlay.config.json vertical.config.json popup.config.json neon.config.json test/fixtures/v1/
cp templates/sponsor-gaming/default.config.json test/fixtures/v1/sponsor-gaming.default.json
cp templates/sponsor-popup/default.config.json test/fixtures/v1/sponsor-popup.default.json
cp templates/neon-frame/default.config.json test/fixtures/v1/neon-frame.default.json
```

- [ ] **Step 2: เพิ่ม script ทดสอบใน `package.json`**

ในก้อน `"scripts"` เพิ่มบรรทัดนี้ต่อจาก `"new"` (อย่าลืมจุลภาคท้ายบรรทัด `"new"`):

```json
    "test": "node --test \"test/*.test.js\""
```

- [ ] **Step 3: เขียน `test/helpers/cases.js`**

```js
// งานเดิมที่ใช้เทียบภาพก่อน/หลังยกเครื่อง และจุดเวลาที่จับภาพ
import { readFile } from 'node:fs/promises';

export const CASES = [
  { name: 'overlay', file: 'overlay.config.json', times: [0.5, 2, 5, 9] },
  { name: 'vertical', file: 'vertical.config.json', times: [0.5, 2, 5, 9] },
  // popup: กำลังเด้งเข้า / ค้าง / ป้าย 2 ค้าง / ป้าย 2 กำลังออก
  { name: 'popup', file: 'popup.config.json', times: [1.2, 4, 8.5, 13.4] },
  { name: 'neon', file: 'neon.config.json', times: [0.5, 2, 5, 7.5] },
];

export async function fixture(file) {
  return JSON.parse(await readFile(new URL(`../fixtures/v1/${file}`, import.meta.url), 'utf8'));
}
```

- [ ] **Step 4: เขียน `test/helpers/browser.js`**

```js
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

/** เปิด pagePath โดยเสิร์ฟ cfg เป็น /__config.json แล้วจับภาพโปร่งใสทีละเวลา */
export async function shoot(browser, cfg, pagePath, times) {
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
    for (const t of times) {
      await page.evaluate((x) => window.overlay.renderFrame(x), t);
      shots.push(await page.screenshot({ omitBackground: true, type: 'png' }));
    }
    return { shots, logs };
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
```

- [ ] **Step 5: เขียน `test/tools/make-baseline.js`**

```js
// สร้างภาพต้นแบบจากโค้ดเทมเพลตเดิม (รันครั้งเดียวก่อนเริ่มยกเครื่อง)
//   node test/tools/make-baseline.js
import { writeFile, mkdir } from 'node:fs/promises';
import { launch, shoot } from '../helpers/browser.js';
import { CASES, fixture } from '../helpers/cases.js';

const browser = await launch();
if (!browser) throw new Error('เปิด Chromium ไม่ได้ ลองรัน: npx playwright install chromium');
const dir = new URL('../baseline/', import.meta.url);
await mkdir(dir, { recursive: true });
try {
  for (const c of CASES) {
    const cfg = await fixture(c.file);
    const { shots, logs } = await shoot(browser, cfg, `/templates/${cfg.template}/index.html?mode=render`, c.times);
    if (logs.length) console.warn(`  ${c.name}:`, logs);
    for (const [i, buf] of shots.entries()) await writeFile(new URL(`${c.name}-${c.times[i]}.png`, dir), buf);
    console.log(`✓ ${c.name} (${shots.length} ภาพ)`);
  }
} finally {
  await browser.close();
}
```

- [ ] **Step 6: สร้างภาพต้นแบบ**

Run: `node test/tools/make-baseline.js`
Expected: `✓ overlay (4 ภาพ)`, `✓ vertical (4 ภาพ)`, `✓ popup (4 ภาพ)`, `✓ neon (4 ภาพ)` และมีไฟล์ PNG 16 ไฟล์ใน `test/baseline/`
ถ้าเปิด Chromium ไม่ได้ ให้รัน `npx playwright install chromium` ก่อน

- [ ] **Step 7: เปิดภาพ `test/baseline/overlay-2.png` และ `popup-1.2.png` ด้วยตา**

ต้องเห็นป้ายครบบนพื้นโปร่งใส (popup-1.2 คือการ์ดกำลังเด้งเข้า) ถ้าภาพว่าง แปลว่า `shoot` ผิด ต้องแก้ก่อนไปต่อ

- [ ] **Step 8: Commit**

```bash
git add package.json test/
git commit -m "Add test harness, v1 fixtures and baseline renders from current templates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: สูตรเวลาและท่าเข้า/ออก (`timing.js`) + ตัวช่วย DOM (`dom.js`)

**Files:**
- Create: `templates/_runtime/timing.js`, `templates/_runtime/dom.js`
- Test: `test/timing.test.js`

**Interfaces:**
- Produces (timing.js): `clamp01(x)`, `lerp(a,b,p)`, `progress(t,start,dur)`, `ease.{linear,outCubic,inCubic,inOutSine,outBack,inBack}`, `makeCycle(duration) → (t, approxPeriod) => 0..1`, `ENTER_TYPES`, `EXIT_TYPES`, `DIRECTIONS`, `layerSpan(layer, t, duration) → { visible, local, length, enter, exit }`, `nearestEdge(box, W, H) → 'left'|'right'|'top'|'bottom'`, `offscreen(from, box, W, H) → [dx, dy]`, `layerMotion(layer, span, box, W, H) → { x, y, scale, opacity }` (โดย `box = { x, y, w, h }`)
- Produces (dom.js): `el(tag, className, parent, text)`, `svgEl(tag, attrs, parent)`, `applyStyle(node, style)`, `assetUrl(path)`

- [ ] **Step 1: เขียนเทสต์ `test/timing.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerSpan, layerMotion, nearestEdge, offscreen, ease, makeCycle } from '../templates/_runtime/timing.js';

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
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL จาก `Cannot find module '.../templates/_runtime/timing.js'`

- [ ] **Step 3: เขียน `templates/_runtime/timing.js`**

```js
// สูตรเวลาที่ใช้ร่วมกัน (ไม่มี DOM จึงทดสอบด้วย node ได้)
// - ease / cycle: ใช้ทำท่าวนของแต่ละชิ้น
// - layerSpan: ชิ้นนี้แสดงอยู่ไหมที่เวลา t และผ่านไปกี่วินาทีแล้ว
// - layerMotion: ท่าเข้า/ออกที่ส่วนกลางใส่ให้ทุกชิ้น

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, p) => a + (b - a) * p;
/** ความคืบหน้า 0..1 ของช่วงเวลาที่เริ่ม start และยาว dur */
export const progress = (t, start, dur) => clamp01((t - start) / dur);

export const ease = {
  linear: (p) => p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inCubic: (p) => p * p * p,
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  inBack: (p) => 2.70158 * p * p * p - 1.70158 * p * p,
};

/**
 * สร้างฟังก์ชันหาเฟส 0..1 ของแอนิเมชันที่วนซ้ำ โดยปัดคาบให้หารความยาวคลิปลงตัว
 * ทำให้เฟรมสุดท้ายต่อกับเฟรมแรกได้เนียน
 */
export function makeCycle(duration) {
  return (t, approxPeriod) => {
    const n = Math.max(1, Math.round(duration / approxPeriod));
    const x = (t * n) / duration;
    return x - Math.floor(x);
  };
}

export const ENTER_TYPES = ['none', 'fade', 'slide', 'pop'];
export const EXIT_TYPES = ['none', 'fade', 'slide', 'pop'];
export const DIRECTIONS = ['auto', 'left', 'right', 'top', 'bottom'];
const DEFAULT_MOTION = 0.6;

const motionLength = (m) => (m?.type && m.type !== 'none' ? m.duration ?? DEFAULT_MOTION : 0);

/**
 * ช่วงเวลาที่ชิ้นแสดง
 * - end = null → แสดงตั้งแต่ start จนจบคลิป (ไม่มีท่าออก)
 * - end > duration → ส่วนที่เกินวนไปแสดงต้นคลิป (เหมือนป้ายเด้งเดิม)
 * คืน { visible, local (วินาทีนับจากโผล่), length (ความยาวช่วง), enter, exit (ความยาวท่าเข้า/ออก) }
 */
export function layerSpan(layer, t, duration) {
  const start = Number(layer.start) || 0;
  const enter = motionLength(layer.enter);
  if (layer.end == null) {
    return { visible: t >= start, local: t - start, length: duration - start, enter, exit: 0 };
  }
  const length = layer.end - start;
  const local = (((t - start) % duration) + duration) % duration;
  return { visible: local < length, local, length, enter, exit: motionLength(layer.exit) };
}

/** ขอบจอที่ใกล้กล่องที่สุด */
export function nearestEdge(box, W, H) {
  const d = { left: box.x, right: W - (box.x + box.w), top: box.y, bottom: H - (box.y + box.h) };
  return Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a));
}

/** ระยะเลื่อนที่พากล่องออกไปพ้นขอบจอด้าน from */
export function offscreen(from, box, W, H) {
  return {
    left: [-(box.x + box.w + 40), 0],
    right: [W - box.x + 40, 0],
    top: [0, -(box.y + box.h + 40)],
    bottom: [0, H - box.y + 40],
  }[from];
}

const IDENTITY = { x: 0, y: 0, scale: 1, opacity: 1 };

/**
 * ท่าเข้า/ออกของ layer ที่เวลา span.local
 * box = ตำแหน่งของ layer บนจอ ใช้หาทิศ "auto" และระยะเลื่อนออกนอกจอ
 */
export function layerMotion(layer, span, box, W, H) {
  const dirOf = (m) => {
    const f = m.from ?? layer.enter?.from;
    return f && f !== 'auto' ? f : nearestEdge(box, W, H);
  };
  if (span.enter > 0 && span.local < span.enter) {
    const m = layer.enter;
    const p = span.local / span.enter;
    if (m.type === 'fade') return { ...IDENTITY, opacity: ease.outCubic(p) };
    const k = ease.outBack(p);
    if (m.type === 'slide') {
      const [dx, dy] = m.offset ?? offscreen(dirOf(m), box, W, H);
      return { x: dx * (1 - k), y: dy * (1 - k), scale: 1, opacity: clamp01(p * 2.5) };
    }
    if (m.type === 'pop') {
      const [dx, dy] = offscreen(dirOf(m), box, W, H);
      return { x: dx * (1 - k), y: dy * (1 - k), scale: lerp(0.7, 1, k), opacity: clamp01(p * 3) };
    }
  }
  if (span.exit > 0 && span.local > span.length - span.exit) {
    const m = layer.exit;
    const q = clamp01((span.local - (span.length - span.exit)) / span.exit);
    if (m.type === 'fade') return { ...IDENTITY, opacity: 1 - ease.outCubic(q) };
    const [dx, dy] = offscreen(dirOf(m), box, W, H);
    if (m.type === 'slide') {
      const k = ease.inCubic(q);
      return { x: dx * k, y: dy * k, scale: 1, opacity: clamp01((1 - q) * 2.5) };
    }
    if (m.type === 'pop') {
      const k = ease.inBack(q);
      return { x: dx * k, y: dy * k, scale: 1 - 0.15 * q, opacity: 1 - 0.3 * q };
    }
  }
  return IDENTITY;
}
```

- [ ] **Step 4: เขียน `templates/_runtime/dom.js`**

```js
// ตัวช่วยสร้าง DOM ที่ใช้ร่วมกันทั้ง stage, หน้าแก้ไข และชิ้นส่วน

const NS = 'http://www.w3.org/2000/svg';

/** ตัวช่วยสร้าง element */
export function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

/** ตัวช่วยสร้าง element ของ SVG */
export function svgEl(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/** ใส่ style ที่ผู้ใช้กำหนดเองใน config (เช่น ย้ายตำแหน่ง) ให้ element */
export function applyStyle(node, style) {
  if (!style) return;
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith('--')) node.style.setProperty(k, v);
    else node.style[k] = typeof v === 'number' ? `${v}px` : v;
  }
}

/** path ของไฟล์ในโปรเจกต์ (เช่น assets/logo.png) → URL ที่เซิร์ฟเวอร์เสิร์ฟ */
export const assetUrl = (p) => (!p || /^(https?:|data:|\/)/.test(p) ? p : `/${p}`);
```

- [ ] **Step 5: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้ง 9 เทสต์ใน `timing.test.js`

- [ ] **Step 6: Commit**

```bash
git add templates/_runtime/timing.js templates/_runtime/dom.js test/timing.test.js
git commit -m "Add shared timing (layer span, enter/exit motion) and DOM helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Catalog ของชิ้นส่วน + ตัวแปลงงานเดิม (`migrate`)

**Files:**
- Create: `elements/catalog.js`, `src/migrate.js`
- Test: `test/migrate.test.js`

**Interfaces:**
- Consumes: ไม่มี
- Produces: `CATEGORIES: [key, label][]`, `CATALOG: { [type]: { label, icon, category, fullscreen?, defaults: { props, style?, timing? }, fields: { [prop]: { label, type, choices? } } } }`, `migrate(v1) → v2` (คืน `v1` ตัวเดิมถ้า `version === 2`, throw `Error('แปลงงานเดิมไม่ได้: ไม่รู้จักเทมเพลต "x"')`)

- [ ] **Step 1: เขียนเทสต์ `test/migrate.test.js`**

```js
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
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL จาก `Cannot find module '.../src/migrate.js'`

- [ ] **Step 3: เขียน `elements/catalog.js`**

```js
// รายชื่อชิ้นส่วนทั้งหมด (ข้อมูลล้วน ไม่มี import จึงใช้ได้ทั้งในเบราว์เซอร์และ node)
// - หน้าคลังชิ้นส่วนใช้ label / icon / category
// - แผงคุณสมบัติใช้ fields สร้างช่องแก้ไข
// - ตัวแปลงงานเดิมและตัวตรวจ config ใช้เช็กว่ามีชนิดนี้จริง
// โค้ดหน้าตา/ท่าทางของแต่ละชนิดอยู่ใน elements/<type>/index.js และ style.css
//
// ชนิดของ field: text | number | color | boolean | select (choices) | image | list | messages | size
// defaults.style  = style เริ่มต้นตอนเพิ่มชิ้น (ไม่มีตำแหน่ง → stage จัดไว้กลางจอ)
// defaults.timing = start / end / enter / exit เริ่มต้นตอนเพิ่มชิ้น

export const CATEGORIES = [
  ['basic', 'พื้นฐาน'],
  ['banner', 'ป้ายและกล่อง'],
  ['frame', 'กรอบ'],
  ['ticker', 'ข้อความวิ่ง'],
];

const MOTION_SPEED = { label: 'ความเร็ว (วินาทีต่อรอบ)', type: 'number' };

export const CATALOG = {
  // ---------- พื้นฐาน ----------
  text: {
    label: 'ข้อความ', icon: '📝', category: 'basic',
    defaults: { props: { text: 'ข้อความ', size: 64, color: '', weight: '700', align: 'left', stroke: '', strokeWidth: 0, shadow: true } },
    fields: {
      text: { label: 'ข้อความ', type: 'text' },
      size: { label: 'ขนาดตัวอักษร (px)', type: 'number' },
      color: { label: 'สีตัวอักษร', type: 'color' },
      weight: { label: 'ความหนา', type: 'select', choices: ['400', '600', '700', '800', '900'] },
      align: { label: 'จัดแนว', type: 'select', choices: ['left', 'center', 'right'] },
      stroke: { label: 'สีขอบตัวอักษร', type: 'color' },
      strokeWidth: { label: 'ความหนาขอบ (px)', type: 'number' },
      shadow: { label: 'เงา', type: 'boolean' },
    },
  },
  image: {
    label: 'รูปภาพ', icon: '🖼️', category: 'basic',
    defaults: { props: { src: 'assets/logos/sponsor-placeholder.svg', width: 300, radius: 0, opacity: 1 } },
    fields: {
      src: { label: 'ไฟล์รูป', type: 'image' },
      width: { label: 'ความกว้าง (px)', type: 'number' },
      radius: { label: 'ความโค้งมุม (px)', type: 'number' },
      opacity: { label: 'ความทึบ (0–1)', type: 'number' },
    },
  },
  shape: {
    label: 'กล่อง/รูปทรง', icon: '⬛', category: 'basic',
    defaults: { props: { shape: 'rect', width: 400, height: 120, fill: '', stroke: '', strokeWidth: 0, radius: 16 } },
    fields: {
      shape: { label: 'รูปทรง', type: 'select', choices: ['rect', 'circle', 'line'] },
      width: { label: 'กว้าง (px)', type: 'number' },
      height: { label: 'สูง (px)', type: 'number' },
      fill: { label: 'สีพื้น', type: 'color' },
      stroke: { label: 'สีขอบ', type: 'color' },
      strokeWidth: { label: 'ความหนาขอบ (px)', type: 'number' },
      radius: { label: 'ความโค้งมุม (px)', type: 'number' },
    },
  },

  // ---------- ป้ายและกล่อง ----------
  highlight: {
    label: 'ป้าย HIGHLIGHT', icon: '⚡', category: 'banner',
    defaults: { props: { text: 'HIGHLIGHT' } },
    fields: { text: { label: 'ข้อความ', type: 'text' } },
  },
  'top-donate': {
    label: 'TOP DONATE', icon: '👑', category: 'banner',
    defaults: { props: { name: 'TNP', amount: 20000, currency: '฿', badge: 'TOP', badge2: 'DONATE' } },
    fields: {
      name: { label: 'ชื่อ', type: 'text' },
      amount: { label: 'จำนวนเงิน', type: 'number' },
      currency: { label: 'สกุลเงิน', type: 'text' },
      badge: { label: 'ป้ายบรรทัด 1', type: 'text' },
      badge2: { label: 'ป้ายบรรทัด 2', type: 'text' },
    },
  },
  'promo-bar': {
    label: 'แถบโปรโมชัน', icon: '🏷️', category: 'banner',
    defaults: { props: { logo: 'assets/logos/game-placeholder.svg', text: 'แพ็คใหญ่จุใจ', oldPrice: '29,999', price: '8,230', unit: 'THB', note: 'ระบบ Drop Link' } },
    fields: {
      logo: { label: 'ไฟล์โลโก้', type: 'image' },
      text: { label: 'ข้อความ', type: 'text' },
      oldPrice: { label: 'ราคาเดิม', type: 'text' },
      price: { label: 'ราคา', type: 'text' },
      unit: { label: 'หน่วย', type: 'text' },
      note: { label: 'หมายเหตุ', type: 'text' },
    },
  },
  notice: {
    label: 'กล่องประกาศ', icon: '💬', category: 'banner',
    defaults: { props: { secondsEach: 5, messages: [{ title: '📢 ประกาศ', text: 'ไลฟ์ทุกวัน 2 ทุ่มเป็นต้นไป' }] } },
    fields: {
      messages: { label: 'ข้อความ', type: 'messages' },
      secondsEach: { label: 'วินาทีต่อข้อความ', type: 'number' },
    },
  },
  'popup-card': {
    label: 'การ์ดสปอนเซอร์เด้ง', icon: '🎁', category: 'banner',
    defaults: {
      props: { tag: 'SPONSORED BY', image: 'assets/logos/sponsor-placeholder.svg', title: 'YOUR BRAND', subtitle: 'ผู้สนับสนุนหลักของช่อง', color: '#ff3d57', compact: false, persistent: false },
      timing: { start: 0, end: 6.15, enter: { type: 'pop', from: 'auto', duration: 0.7 }, exit: { type: 'pop', duration: 0.45 } },
    },
    fields: {
      tag: { label: 'ป้ายหัว', type: 'text' },
      image: { label: 'ไฟล์โลโก้', type: 'image' },
      title: { label: 'หัวข้อ', type: 'text' },
      subtitle: { label: 'ข้อความรอง', type: 'text' },
      color: { label: 'สีการ์ด', type: 'color' },
      compact: { label: 'แบบเล็ก', type: 'boolean' },
      persistent: { label: 'ลอยขึ้นลงตลอด (ไม่มีแถบเวลา)', type: 'boolean' },
    },
  },
  'neon-label': {
    label: 'ป้ายนีออน', icon: '💡', category: 'banner',
    defaults: { props: { text: 'LIVE NOW', sub: 'ไลฟ์ทุกวัน 2 ทุ่ม', dot: true } },
    fields: {
      text: { label: 'ข้อความ', type: 'text' },
      sub: { label: 'ข้อความรอง', type: 'text' },
      dot: { label: 'จุดกะพริบ', type: 'boolean' },
    },
  },
  'sponsor-logo': {
    label: 'โลโก้สปอนเซอร์', icon: '🏢', category: 'banner',
    defaults: { props: { image: 'assets/logos/sponsor-placeholder.svg', text: 'SPONSOR' } },
    fields: {
      image: { label: 'ไฟล์รูป', type: 'image' },
      text: { label: 'ข้อความ (ใช้เมื่อไม่มีรูป)', type: 'text' },
    },
  },

  // ---------- กรอบ ----------
  'webcam-frame': {
    label: 'กรอบกล้อง', icon: '📷', category: 'frame',
    defaults: { props: { channel: 'BANK', label: 'OVERTIME', live: true, camSize: [398, 292], borderWidth: 6 } },
    fields: {
      channel: { label: 'ชื่อช่อง', type: 'text' },
      label: { label: 'ข้อความกลาง', type: 'text' },
      live: { label: 'แสดง LIVE', type: 'boolean' },
      camSize: { label: 'ขนาดกล้อง (กว้าง, สูง)', type: 'size' },
      borderWidth: { label: 'ความหนาขอบ', type: 'number' },
    },
  },
  'neon-frame': {
    label: 'กรอบนีออน', icon: '🌈', category: 'frame', fullscreen: true,
    defaults: { props: { effect: 'chase', thickness: 8, inset: 16, radius: 22, segments: 3, period: 2.5 } },
    fields: {
      effect: { label: 'เอฟเฟกต์', type: 'select', choices: ['chase', 'blink', 'pulse', 'rainbow'] },
      thickness: { label: 'ความหนา', type: 'number' },
      inset: { label: 'ระยะห่างขอบจอ', type: 'number' },
      radius: { label: 'ความโค้งมุม', type: 'number' },
      segments: { label: 'จำนวนแสงวิ่ง', type: 'number' },
      period: MOTION_SPEED,
    },
  },
  'neon-bulbs': {
    label: 'หลอดไฟรอบขอบ', icon: '✨', category: 'frame', fullscreen: true,
    defaults: { props: { pattern: 'alternate', spacing: 60, size: 7, gap: 26, period: 1 } },
    fields: {
      pattern: { label: 'รูปแบบ', type: 'select', choices: ['alternate', 'chase', 'twinkle'] },
      spacing: { label: 'ระยะห่างหลอดไฟ', type: 'number' },
      size: { label: 'ขนาด', type: 'number' },
      gap: { label: 'ระยะหลอดไฟจากกรอบ', type: 'number' },
      period: MOTION_SPEED,
    },
  },
  'neon-corners': {
    label: 'มุมกรอบ', icon: '📐', category: 'frame', fullscreen: true,
    defaults: { props: { length: 90, thickness: 12, period: 2 } },
    fields: {
      length: { label: 'ความยาวขา', type: 'number' },
      thickness: { label: 'ความหนา', type: 'number' },
      period: MOTION_SPEED,
    },
  },

  // ---------- ข้อความวิ่ง ----------
  ticker: {
    label: 'ข้อความวิ่ง', icon: '📰', category: 'ticker',
    defaults: {
      props: { tag: 'PROMO', items: ['ข้อความวิ่งอันที่ 1', 'ข้อความวิ่งอันที่ 2'], speed: 110 },
      style: { width: 1000 },
    },
    fields: {
      tag: { label: 'ป้ายหัว', type: 'text' },
      items: { label: 'ข้อความ', type: 'list' },
      speed: { label: 'ความเร็ว (px/วินาที)', type: 'number' },
    },
  },
};
```

- [ ] **Step 4: เขียน `src/migrate.js`**

```js
// แปลงไฟล์งานแบบเดิม (version 1: template + elements) เป็นแบบใหม่ (version 2: layers)
// ฟังก์ชันล้วน ไม่อ่าน/เขียนไฟล์ จึงทดสอบได้ตรงๆ (การสำรองไฟล์อยู่ใน config.js)

import { CATALOG } from '../elements/catalog.js';

// key เดิม → ชนิดใหม่ เรียงตามลำดับที่เทมเพลตเดิมสร้าง DOM (= ลำดับการทับ)
const TYPE_MAP = {
  'sponsor-gaming': [
    ['highlight', 'highlight'], ['topDonate', 'top-donate'], ['sponsorLogo', 'sponsor-logo'],
    ['webcamFrame', 'webcam-frame'], ['promoBar', 'promo-bar'], ['ticker', 'ticker'], ['notice', 'notice'],
  ],
  'neon-frame': [['frame', 'neon-frame'], ['bulbs', 'neon-bulbs'], ['corners', 'neon-corners'], ['label', 'neon-label']],
};

// ตำแหน่งเริ่มต้นที่เคยอยู่ใน templates/sponsor-gaming/style.css
const GAMING_POSITIONS = {
  landscape: {
    highlight: { top: 30, right: 40 },
    'top-donate': { top: 568, right: 26 },
    'sponsor-logo': { top: 668, right: 22 },
    'webcam-frame': { left: 15, top: 624 },
    'promo-bar': { left: 15, bottom: 12 },
    ticker: { left: 720, right: 380, bottom: 26 },
    notice: { left: 15, top: 534 },
  },
  portrait: {
    highlight: { top: 150, right: 40 },
    'top-donate': { top: 260, right: 40 },
    'sponsor-logo': { top: 360, right: 40 },
    'webcam-frame': { left: 30, top: 150 },
    'promo-bar': { left: 30, bottom: 360 },
    ticker: { left: 30, right: 160, bottom: 296 },
    notice: { left: 30, bottom: 470 },
  },
};
const POPUP_POSITION = { top: 40, right: 40 };

// จังหวะเข้าฉากเดิมของ sponsor-gaming (intro: true)
const GAMING_ENTER = {
  highlight: { x: 420, y: 0, delay: 0 },
  'top-donate': { x: 360, y: 0, delay: 0.15 },
  'sponsor-logo': { x: 380, y: 0, delay: 0.3 },
  'webcam-frame': { x: -460, y: 0, delay: 0.1 },
  notice: { x: -460, y: 0, delay: 0.25 },
  'promo-bar': { x: 0, y: 160, delay: 0.2 },
  ticker: { x: 0, y: 120, delay: 0.35 },
};
const POP_IN = 0.7;
const POP_OUT = 0.45;

const round3 = (x) => Math.round(x * 1000) / 1000;
const none = () => ({ type: 'none' });

function nextId(layers, type) {
  let i = 1;
  while (layers.some((l) => l.id === `${type}-${i}`)) i++;
  return `${type}-${i}`;
}

/** ป้ายเด้งเดิม: start + hold → start / end + ท่า pop (ป้าย persistent แสดงตลอด) */
function applyPopupTiming(layer, props) {
  const { start, hold, from, persistent } = props;
  delete props.start;
  delete props.hold;
  delete props.from;
  if (persistent) return;
  layer.start = Number(start) || 0;
  layer.end = round3(layer.start + POP_IN + Math.max(0.5, Number(hold) || 5) + POP_OUT);
  layer.enter = { type: 'pop', from: from ?? 'auto', duration: POP_IN };
  layer.exit = { type: 'pop', duration: POP_OUT };
}

export function migrate(v1) {
  if (v1?.version === 2) return v1;
  const template = v1.template ?? 'sponsor-gaming';
  if (!['sponsor-gaming', 'sponsor-popup', 'neon-frame'].includes(template)) {
    throw new Error(`แปลงงานเดิมไม่ได้: ไม่รู้จักเทมเพลต "${template}"`);
  }
  const resolution = v1.resolution ?? [1920, 1080];
  const [W, H] = resolution;
  const layout = v1.layout && v1.layout !== 'auto' ? v1.layout : H > W ? 'portrait' : 'landscape';
  const elements = v1.elements ?? {};

  const theme = { ...(v1.theme ?? {}) };
  if (theme.secondary && !theme.accent) theme.accent = theme.secondary;
  delete theme.secondary;
  theme.text ??= '#ffffff';

  const entries = template === 'sponsor-popup'
    ? Object.entries(elements).map(([, c]) => ['popup-card', c])
    : TYPE_MAP[template].filter(([key]) => elements[key]).map(([key, type]) => [type, elements[key]]);

  const layers = [];
  for (const [type, c] of entries) {
    const { enabled, style, ...props } = c;
    const layer = {
      id: nextId(layers, type),
      type,
      name: type === 'popup-card' ? props.title || props.tag || CATALOG[type].label : CATALOG[type].label,
      hidden: enabled === false,
      start: 0,
      end: null,
      enter: none(),
      exit: none(),
    };
    const base = template === 'sponsor-gaming' ? GAMING_POSITIONS[layout][type] : type === 'popup-card' ? POPUP_POSITION : null;
    if (base || style) layer.style = { ...base, ...style };
    if (type === 'popup-card') applyPopupTiming(layer, props);
    if (template === 'sponsor-gaming' && v1.intro) {
      const e = GAMING_ENTER[type];
      layer.start = e.delay;
      layer.enter = { type: 'slide', offset: [e.x, e.y], duration: 0.7 };
    }
    layer.props = props;
    layers.push(layer);
  }

  const out = { version: 2 };
  if (v1.description) out.description = v1.description;
  Object.assign(out, {
    resolution,
    fps: v1.fps ?? 30,
    duration: v1.duration ?? 10,
    format: v1.format ?? ['prores', 'webm'],
    theme,
    preview: v1.preview ?? { background: '' },
  });
  if (v1.layout) out.layout = v1.layout;
  out.layers = layers;
  return out;
}
```

- [ ] **Step 5: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด (timing 9 + migrate 9)

- [ ] **Step 6: Commit**

```bash
git add elements/catalog.js src/migrate.js test/migrate.test.js
git commit -m "Add element catalog and v1-to-v2 project migration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ตัวตรวจโปรเจกต์ + ตัวโหลด v2 ที่แปลงและสำรองไฟล์ให้

`loadConfig` เดิมยังต้องใช้กับเทมเพลตเดิมไปจนถึง Task 10 จึงเพิ่ม `loadProject` แยกไว้ก่อน

**Files:**
- Create: `src/validate.js`
- Modify: `src/config.js` (เพิ่ม `loadProject` + ฟังก์ชันตรวจค่าพื้นฐานที่ใช้ร่วมกัน)
- Modify: `.gitignore` (เพิ่ม `backup/`)
- Test: `test/validate.test.js`, `test/config.test.js`

**Interfaces:**
- Consumes: `migrate` (Task 3), `CATALOG` (Task 3), `ENTER_TYPES`/`EXIT_TYPES` (Task 2)
- Produces: `validateProject(cfg, { strict = false } = {}) → string[]` (`strict` = ต้องรู้จักทุก `type` ใช้ตอนบันทึก), `loadProject(configPath, overrides = {}, { backupDir } = {}) → Promise<cfg>` (เติมค่าเริ่มต้น v2, แปลง + สำรอง + เขียนทับถ้าเป็น v1, throw พร้อมรายการข้อผิดพลาดภาษาไทย)

- [ ] **Step 1: เขียนเทสต์ `test/validate.test.js`**

```js
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
```

- [ ] **Step 2: เขียนเทสต์ `test/config.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadProject } from '../src/config.js';
import { fixture } from './helpers/cases.js';

async function tmp() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'overlay-test-'));
  return { dir, backupDir: path.join(dir, 'backup') };
}

test('ไฟล์ v1: แปลงเป็น v2 เขียนทับ และเก็บสำเนาเดิมใน backup/', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'demo.config.json');
  const original = JSON.stringify(await fixture('overlay.config.json'), null, 2);
  await writeFile(file, original);

  const cfg = await loadProject(file, {}, { backupDir });
  assert.equal(cfg.version, 2);
  assert.equal(cfg.layers.length, 7);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).version, 2);
  assert.equal(await readFile(path.join(backupDir, 'demo.v1.json'), 'utf8'), original);

  // โหลดซ้ำ: เป็น v2 แล้ว ไม่สร้างสำรองเพิ่ม
  await loadProject(file, {}, { backupDir });
  assert.deepEqual(await readdir(backupDir), ['demo.v1.json']);
});

test('มีไฟล์สำรองชื่อเดิมอยู่แล้ว: ใช้ .v1-2.json', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'demo.config.json');
  const v1 = JSON.stringify(await fixture('neon.config.json'));
  await writeFile(file, v1);
  await loadProject(file, {}, { backupDir });
  await writeFile(file, v1);
  await loadProject(file, {}, { backupDir });
  assert.deepEqual((await readdir(backupDir)).sort(), ['demo.v1-2.json', 'demo.v1.json']);
});

test('แปลงไม่ได้: ไม่แตะไฟล์และไม่สร้างสำรอง', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'bad.config.json');
  const raw = JSON.stringify({ template: 'my-own', elements: {} });
  await writeFile(file, raw);
  await assert.rejects(loadProject(file, {}, { backupDir }), /ไม่รู้จักเทมเพลต "my-own"/);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readdir(backupDir));
});

test('v2 ที่ค่าผิด: throw พร้อมรายการข้อผิดพลาด', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'x.config.json');
  await writeFile(file, JSON.stringify({ version: 2, duration: 5, layers: [{ id: 'a', type: 'text', start: 9 }] }));
  await assert.rejects(loadProject(file, {}, { backupDir }), /start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป/);
});
```

- [ ] **Step 3: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL จาก `Cannot find module '.../src/validate.js'` และ `loadProject` ไม่มีใน `config.js`

- [ ] **Step 4: เขียน `src/validate.js`**

```js
// ตรวจโครงสร้างโปรเจกต์ version 2 (ฟังก์ชันล้วน)
// strict: ต้องรู้จักทุกชนิดใน catalog (ใช้ตอนบันทึก ส่วนตอนโหลดยอมให้ผ่าน เพื่อเปิดไปลบชิ้นนั้นได้)

import { CATALOG } from '../elements/catalog.js';
import { ENTER_TYPES, EXIT_TYPES } from '../templates/_runtime/timing.js';

export function validateProject(cfg, { strict = false } = {}) {
  const errors = [];
  if (cfg.version !== 2) errors.push('version ต้องเป็น 2');
  if (!Array.isArray(cfg.layers)) {
    errors.push('layers ต้องเป็นรายการ (array)');
    return errors;
  }
  const ids = new Set();
  cfg.layers.forEach((l, i) => {
    const where = `layers[${i}]${l?.id ? ` (${l.id})` : ''}`;
    if (!l || typeof l !== 'object' || Array.isArray(l)) {
      errors.push(`${where} ต้องเป็นออบเจกต์`);
      return;
    }
    if (typeof l.id !== 'string' || !l.id) errors.push(`${where}: ต้องมี id`);
    else if (ids.has(l.id)) errors.push(`${where}: id ซ้ำกับชิ้นอื่น`);
    else ids.add(l.id);

    if (typeof l.type !== 'string' || !/^[a-z0-9-]+$/.test(l.type)) errors.push(`${where}: ชนิด "${l.type}" ไม่ถูกต้อง`);
    else if (strict && !CATALOG[l.type]) errors.push(`${where}: ไม่รู้จักชิ้น "${l.type}"`);

    if (l.hidden !== undefined && typeof l.hidden !== 'boolean') errors.push(`${where}: hidden ต้องเป็น true/false`);
    if (!(typeof l.start === 'number' && l.start >= 0 && l.start < cfg.duration)) {
      errors.push(`${where}: start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป`);
    }
    if (!(l.end == null || (typeof l.end === 'number' && l.end > l.start))) errors.push(`${where}: end ต้องว่างหรือมากกว่า start`);
    if (l.enter && !ENTER_TYPES.includes(l.enter.type)) errors.push(`${where}: ไม่รู้จักท่าเข้า "${l.enter.type}"`);
    if (l.exit && !EXIT_TYPES.includes(l.exit.type)) errors.push(`${where}: ไม่รู้จักท่าออก "${l.exit.type}"`);
    if (l.props !== undefined && (typeof l.props !== 'object' || l.props === null || Array.isArray(l.props))) {
      errors.push(`${where}: props ต้องเป็นออบเจกต์`);
    }
  });
  return errors;
}
```

- [ ] **Step 5: แก้ `src/config.js`**

แทนที่ทั้งไฟล์ด้วยเวอร์ชันนี้ (`loadConfig` เดิมยังทำงานเหมือนเดิม แค่ย้ายการตรวจค่าพื้นฐานไปไว้ใน `basicErrors` เพื่อใช้ร่วมกัน):

```js
import { readFile, writeFile, copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';
import { validateProject } from './validate.js';

// fileURLToPath ให้ path ที่ถูกต้องทั้งบน Windows (C:\...) และ macOS/Linux
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FORMATS = ['prores', 'webm', 'png'];

const exists = (p) => access(p).then(() => true, () => false);

const DEFAULTS = {
  template: 'sponsor-gaming',
  resolution: [1920, 1080],
  fps: 30,
  duration: 10,
  intro: false,
  format: ['prores', 'webm'],
  theme: {},
  preview: {},
  elements: {},
};

const DEFAULTS_V2 = {
  resolution: [1920, 1080],
  fps: 30,
  duration: 10,
  format: ['prores', 'webm'],
  theme: {},
  preview: {},
  layers: [],
};

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`อ่านไฟล์ config ไม่ได้: ${file}\n  ${err.message}`);
  }
}

/** ตรวจค่าที่ทุกเวอร์ชันมีเหมือนกัน: ขนาดจอ fps ความยาว รูปแบบไฟล์ */
function basicErrors(cfg) {
  const errors = [];
  if (!Array.isArray(cfg.resolution) || cfg.resolution.length !== 2 || !cfg.resolution.every((n) => Number.isInteger(n) && n > 0 && n % 2 === 0)) {
    errors.push('resolution ต้องเป็น [กว้าง, สูง] ที่เป็นเลขคู่ เช่น [1920, 1080]');
  }
  if (!(cfg.fps > 0 && cfg.fps <= 120)) errors.push('fps ต้องอยู่ระหว่าง 1–120');
  if (!(cfg.duration > 0 && cfg.duration <= 600)) errors.push('duration (วินาที) ต้องอยู่ระหว่าง 0–600');
  const bad = cfg.format.filter((f) => !FORMATS.includes(f));
  if (bad.length) errors.push(`format ไม่รู้จัก: ${bad.join(', ')} (ใช้ได้: ${FORMATS.join(', ')})`);
  return errors;
}

const fail = (file, errors) => new Error(`config ไม่ถูกต้อง (${file}):\n  - ${errors.join('\n  - ')}`);

/** อ่าน config แล้วเติมค่าเริ่มต้น + ตรวจค่า ถ้าผิดจะ throw พร้อมข้อความภาษาไทย */
export async function loadConfig(configPath, overrides = {}) {
  const file = path.resolve(configPath);
  const raw = await readJson(file);
  const cfg = { ...DEFAULTS, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());

  const errors = basicErrors(cfg);
  if (!/^[\w-]+$/.test(cfg.template)) errors.push(`template ไม่ถูกต้อง: "${cfg.template}"`);
  const templateDir = path.join(ROOT, 'templates', cfg.template);
  try {
    await access(path.join(templateDir, 'index.html'));
  } catch {
    errors.push(`ไม่พบเทมเพลต: templates/${cfg.template}/index.html`);
  }
  if (errors.length) throw fail(file, errors);
  return cfg;
}

/** เก็บสำเนาไฟล์เดิมก่อนเขียนทับ: backup/<ชื่อ>.v1.json (ชื่อซ้ำ → .v1-2.json, .v1-3.json ...) */
async function backupOriginal(file, backupDir) {
  await mkdir(backupDir, { recursive: true });
  const base = path.basename(file).replace(/(\.config)?\.json$/, '');
  let target = path.join(backupDir, `${base}.v1.json`);
  for (let i = 2; await exists(target); i++) target = path.join(backupDir, `${base}.v1-${i}.json`);
  await copyFile(file, target);
}

/**
 * อ่านโปรเจกต์แบบ version 2
 * ถ้าเป็นไฟล์แบบเดิม จะแปลงให้ เก็บสำเนาเดิมไว้ใน backup/ แล้วเขียนไฟล์ใหม่ทับ
 * (แปลงไม่ได้ → throw และไม่แตะไฟล์)
 */
export async function loadProject(configPath, overrides = {}, { backupDir = path.join(ROOT, 'backup') } = {}) {
  const file = path.resolve(configPath);
  let raw = await readJson(file);
  if (raw.version !== 2) {
    let v2;
    try {
      v2 = migrate(raw);
    } catch (err) {
      throw new Error(`${err.message} (${file})`);
    }
    await backupOriginal(file, backupDir);
    await writeFile(file, JSON.stringify(v2, null, 2) + '\n');
    console.log(`แปลงงาน ${path.basename(file)} เป็นรูปแบบใหม่แล้ว (สำเนาเดิมอยู่ใน backup/)`);
    raw = v2;
  }
  const cfg = { ...DEFAULTS_V2, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());
  const errors = [...basicErrors(cfg), ...validateProject(cfg)];
  if (errors.length) throw fail(file, errors);
  return cfg;
}
```

- [ ] **Step 6: เพิ่ม `backup/` ใน `.gitignore`**

`.gitignore` ทั้งไฟล์:

```
node_modules/
output/
backup/
```

- [ ] **Step 7: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด (timing, migrate, validate 3, config 4)

- [ ] **Step 8: Commit**

```bash
git add src/validate.js src/config.js .gitignore test/validate.test.js test/config.test.js
git commit -m "Add project validation and v2 loader with automatic migration and backup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Stage หน้าเดียว + ชิ้นชุดเกม 7 ชนิด

**Files:**
- Create: `templates/_runtime/stage.html`, `templates/_runtime/stage.js`
- Modify: `templates/_runtime/base.css` (ค่าธีมเริ่มต้น, `.layer/.motion/.el`, selector หน้าแก้ไข)
- Create: `elements/_shared/motion.js`
- Create: `elements/{highlight,top-donate,sponsor-logo,webcam-frame,promo-bar,ticker,notice}/index.js` + `style.css`
- Test: `test/visual.test.js`

(`src/render.js` ยังเปิดเทมเพลตเดิมจนถึง Task 9 เพื่อให้ `npm run render` ใช้ได้ตลอดระหว่างทาง)

**Interfaces:**
- Consumes: `el`, `applyStyle` (dom.js), `makeCycle`, `layerSpan`, `layerMotion` (timing.js), `CATALOG`
- Produces (stage.js): `mode`, `configName`, `configUrl()`, `saveUrl()`, `modeUrl(m)`, `setPreviewBackground(bg)`, `run()` และตอน edit เรียก `startEditor({ stage, ctx, mount, renderFrame })` จาก `./editor/index.js` (สร้างใน Task 9)
- Produces (สัญญาโมดูลชิ้น): `export default { build(root, props, ctx, layer) → state, measure?(state, ctx), frame?(state, t, span, ctx), place?(wrap, ctx) → { left, top } }` โดย `span = { visible, local, length, enter, exit, showAll }`
- DOM ต่อ layer: `<div class="layer[ fullscreen]" data-id="…"><div class="motion"><div class="el el-<type>">`

- [ ] **Step 1: เขียนเทสต์ `test/visual.test.js`**

เปิดใช้ทีละงานโดยอัตโนมัติ เมื่อโมดูลของทุกชนิดในงานนั้นมีครบ (popup และ neon จะเริ่มทดสอบใน Task 6)

```js
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
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: เทสต์ `overlay` และ `vertical` FAIL (`stage.html` ยังไม่มี: หน้า 404 แล้ว `waitForFunction` หมดเวลา) ส่วน `popup` และ `neon` ถูกข้าม

- [ ] **Step 3: เขียน `templates/_runtime/stage.html`**

```html
<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>Animated-Overlay</title>
  <link rel="stylesheet" href="/templates/_runtime/base.css">
</head>
<body>
  <div id="preview-wrap">
    <div id="viewport">
      <div id="stage"></div>
    </div>
  </div>
  <div id="preview-ui" hidden>
    <button data-play title="เล่น/หยุด (Space)">❚❚</button>
    <input data-scrub type="range" min="0" step="0.01" value="0">
    <span data-time></span>
  </div>
  <script type="module">
    import { run } from '/templates/_runtime/stage.js';
    run().catch((err) => {
      console.error(err);
      window.overlay = { error: String(err && err.stack || err) };
    });
  </script>
</body>
</html>
```

- [ ] **Step 4: เขียน `templates/_runtime/stage.js`**

```js
// Stage: หน้าเดียวที่แสดงทุกโปรเจกต์ (preview / edit / render)
// - โหลด config จาก /__config.json แล้วสร้างทุก layer จากโมดูลใน elements/<type>/
// - ส่วนกลางจัดการ ตำแหน่ง ลำดับการทับ ธีม เวลาโผล่/หาย และท่าเข้า/ออก
//   ส่วนตัวชิ้นทำแค่หน้าตาและท่าวนของตัวเอง
// - เปิด window.overlay = { ready, config, renderFrame(t) } ให้ renderer เรียกทีละเฟรม
//
// กติกา: ทุกแอนิเมชันต้องคำนวณจากเวลา t เท่านั้น (ห้ามใช้ CSS animation / setTimeout)
// เพื่อให้เรนเดอร์ได้ผลเหมือนเดิมทุกครั้ง และวนลูปได้ไม่มีรอยต่อ

import { el, applyStyle } from './dom.js';
import { makeCycle, layerSpan, layerMotion } from './timing.js';
import { CATALOG } from '../../elements/catalog.js';

const params = new URLSearchParams(location.search);
export const mode = ['render', 'edit'].includes(params.get('mode')) ? params.get('mode') : 'preview';
/** ชื่องานที่เปิดอยู่ (?c=) ใช้ตอนโหลด/บันทึก config ในหน้า Studio */
export const configName = params.get('c');
const withC = (u) => (configName ? `${u}${u.includes('?') ? '&' : '?'}c=${encodeURIComponent(configName)}` : u);
export const configUrl = () => withC('/__config.json');
export const saveUrl = () => withC('/__save');
/** ลิงก์ไปหน้าเดียวกันในโหมดอื่น (preview / edit) โดยคงงานที่เลือกไว้ */
export function modeUrl(m) {
  const q = new URLSearchParams(location.search);
  if (m === 'preview') q.delete('mode');
  else q.set('mode', m);
  q.delete('embed');
  return `${location.pathname}?${q}`;
}

// โมดูลของแต่ละชนิด โหลดครั้งเดียวพร้อม style.css
const modules = {};
function loadType(type) {
  if (!CATALOG[type]) return Promise.resolve(null);
  if (!modules[type]) {
    const link = el('link', '', document.head);
    link.rel = 'stylesheet';
    link.href = `/elements/${type}/style.css`;
    const css = new Promise((res) => {
      link.onload = res;
      link.onerror = res;
    });
    modules[type] = Promise.all([import(`/elements/${type}/index.js`), css]).then(([m]) => m.default);
  }
  return modules[type];
}

/** แสดงกล่องเตือนแทนชิ้นที่ใช้ไม่ได้ ชิ้นอื่นยังทำงานต่อ */
function markBroken(item, message) {
  item.broken = message;
  item.root.className = 'el el-broken';
  item.root.replaceChildren();
  item.root.textContent = `⚠ ${message}`;
}

/** มีตำแหน่งแล้วหรือยัง (ยังไม่มี → stage จัดให้ เช่น กลางจอ) */
const isPlaced = (s) => !!s && ['left', 'right', 'top', 'bottom'].some((k) => s[k] != null && s[k] !== 'auto');

function waitForImages(root) {
  const imgs = [...root.querySelectorAll('img')];
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', () => {
              console.warn('โหลดรูปไม่ได้:', img.src);
              res();
            }, { once: true });
          }),
    ),
  );
}

export async function run() {
  const res = await fetch(configUrl(), { cache: 'no-store' });
  const config = await res.json();
  if (!res.ok) throw new Error(config.error || res.statusText);
  const [W, H] = config.resolution;

  document.documentElement.classList.add(`mode-${mode}`);
  const stage = document.getElementById('stage');
  for (const node of [stage, document.getElementById('viewport')]) {
    node.style.width = `${W}px`;
    node.style.height = `${H}px`;
  }

  const ctx = { width: W, height: H, duration: config.duration, cycle: makeCycle(config.duration) };
  let items = [];

  // สร้างทุก layer จาก config (หน้าแก้ไขเรียกซ้ำได้ทุกครั้งที่ config เปลี่ยน)
  const mount = async (cfg) => {
    ctx.config = cfg;
    // หน้าแก้ไขเปิดค่านี้ไว้ เพื่อให้ชิ้นที่โผล่เป็นช่วงๆ แสดงค้างให้ลากได้
    ctx.showAll ??= mode === 'edit';
    // เลย์เอาต์: "auto" = เลือกตามขนาด (สูงกว่ากว้าง → portrait)
    ctx.layout = cfg.layout && cfg.layout !== 'auto' ? cfg.layout : H > W ? 'portrait' : 'landscape';
    stage.replaceChildren();
    stage.className = ctx.layout;
    stage.removeAttribute('style');
    stage.style.width = `${W}px`;
    stage.style.height = `${H}px`;
    for (const [k, v] of Object.entries(cfg.theme || {})) stage.style.setProperty(`--${k}`, v);

    items = [];
    for (const layer of cfg.layers || []) {
      if (layer.hidden) continue;
      const def = CATALOG[layer.type];
      const wrap = el('div', `layer${def?.fullscreen ? ' fullscreen' : ''}`, stage);
      wrap.dataset.id = layer.id;
      const motion = el('div', 'motion', wrap);
      const root = el('div', `el el-${layer.type}`, motion);
      for (const [k, v] of Object.entries(layer.theme || {})) wrap.style.setProperty(`--${k}`, v);
      if (!def?.fullscreen) applyStyle(wrap, layer.style);
      const item = { layer, def, wrap, motion, root, mod: null, state: null, broken: null };
      items.push(item);
      const mod = await loadType(layer.type);
      if (!mod) {
        markBroken(item, `ไม่รู้จักชิ้น "${layer.type}"`);
        continue;
      }
      item.mod = mod;
      try {
        item.state = mod.build(root, layer.props || {}, ctx, layer);
      } catch (err) {
        console.error(err);
        markBroken(item, `${def.label}: ${err.message}`);
      }
    }

    await document.fonts.ready;
    await waitForImages(stage);
    for (const item of items) {
      if (item.broken) continue;
      try {
        item.mod.measure?.(item.state, ctx);
      } catch (err) {
        console.error(err);
        markBroken(item, `${item.def.label}: ${err.message}`);
      }
    }
    // ชิ้นที่ยังไม่มีตำแหน่ง: ให้โมดูลจัดเอง (เช่น ป้ายนีออนกลางขอบบน) หรือวางกลางจอ
    for (const item of items) {
      if (item.def?.fullscreen || isPlaced(item.layer.style)) continue;
      const pos = (!item.broken && item.mod?.place?.(item.wrap, ctx)) || {
        left: Math.round((W - item.wrap.offsetWidth) / 2),
        top: Math.round((H - item.wrap.offsetHeight) / 2),
      };
      item.wrap.style.left = `${pos.left}px`;
      item.wrap.style.top = `${pos.top}px`;
    }

    const problems = items.filter((i) => i.broken).map((i) => `${i.layer.id}: ${i.broken}`);
    if (mode === 'render' && problems.length) throw new Error(`มีชิ้นที่ใช้ไม่ได้:\n${problems.join('\n')}`);
  };
  await mount(config);

  const renderFrame = (t) => {
    // อ่านตำแหน่งทั้งหมดก่อน แล้วค่อยเขียน (ไม่ให้เบราว์เซอร์คำนวณ layout ซ้ำ)
    const boxes = items.map(({ wrap }) => ({ x: wrap.offsetLeft, y: wrap.offsetTop, w: wrap.offsetWidth, h: wrap.offsetHeight }));
    items.forEach((item, i) => {
      const span = layerSpan(item.layer, t, ctx.duration);
      span.showAll = !!ctx.showAll;
      const visible = span.showAll || span.visible;
      item.wrap.style.visibility = visible ? '' : 'hidden';
      if (!visible) return;
      const m = span.showAll ? null : layerMotion(item.layer, span, boxes[i], W, H);
      const moved = m && (m.x || m.y || m.scale !== 1);
      item.motion.style.transform = moved ? `translate(${m.x}px, ${m.y}px) scale(${m.scale})` : '';
      item.motion.style.opacity = m && m.opacity !== 1 ? String(m.opacity) : '';
      if (item.broken || !item.mod.frame) return;
      try {
        item.mod.frame(item.state, t, span, ctx);
      } catch (err) {
        console.error(err);
        markBroken(item, `${item.def.label}: ${err.message}`);
        if (mode === 'render') throw err;
      }
    });
  };
  renderFrame(0);

  window.overlay = { ready: true, config, renderFrame };

  if (mode === 'preview') startPreview(stage, ctx, renderFrame);
  if (mode === 'edit') {
    const { startEditor } = await import('./editor/index.js');
    await startEditor({ stage, ctx, mount, renderFrame });
  }
}

/** ใส่รูป/คลิปพื้นหลังใต้ overlay (เฉพาะ preview/edit ไม่ติดไปในไฟล์ที่เรนเดอร์) */
export function setPreviewBackground(bg) {
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  viewport.querySelector('.preview-bg')?.remove();
  viewport.classList.toggle('has-bg', !!bg);
  if (!bg) return;
  const isVideo = /\.(mp4|webm|mov)$/i.test(bg);
  const media = el(isVideo ? 'video' : 'img', 'preview-bg');
  media.src = bg.startsWith('/') || /^https?:/.test(bg) ? bg : `/${bg}`;
  if (isVideo) Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true });
  viewport.insertBefore(media, stage);
}

function startPreview(stage, ctx, renderFrame) {
  const { width: W, height: H, duration: D } = ctx;
  const viewport = document.getElementById('viewport');
  setPreviewBackground(params.get('bg') || ctx.config.preview?.background);
  // embed=1: ภาพตัวอย่างเล็กในหน้า Studio ไม่ต้องมีแถบควบคุม
  const embed = params.get('embed') === '1';
  if (embed) document.documentElement.classList.add('embed');
  const fit = () => {
    const bar = embed ? 0 : 56;
    const s = Math.min(window.innerWidth / W, (window.innerHeight - bar) / H);
    viewport.style.transform = `scale(${s})`;
    document.getElementById('preview-wrap').style.height = `${H * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  const ui = document.getElementById('preview-ui');
  ui.hidden = embed;
  if (!embed) {
    // ปุ่มไปหน้าปรับแต่ง / หน้าแรก
    const edit = el('a', 'pv-btn primary', ui, '✏️ ปรับแต่ง');
    edit.href = modeUrl('edit');
    const home = el('a', 'pv-btn', ui, '🏠 หน้าแรก');
    home.href = '/studio/index.html';
    ui.prepend(home);
    ui.append(edit);
  }
  const playBtn = ui.querySelector('[data-play]');
  const scrub = ui.querySelector('[data-scrub]');
  const label = ui.querySelector('[data-time]');
  scrub.max = String(D);

  let playing = true;
  let t = 0;
  let last = performance.now();
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
  });
  scrub.addEventListener('input', () => {
    t = Number(scrub.value);
    playing = false;
    playBtn.textContent = '▶';
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  });

  const loop = (now) => {
    if (playing) t = (t + (now - last) / 1000) % D;
    last = now;
    renderFrame(t);
    scrub.value = String(t);
    label.textContent = `${t.toFixed(2)} / ${D.toFixed(2)} s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
```

- [ ] **Step 5: แก้ `templates/_runtime/base.css`**

(ก) แทนที่ก้อน `#stage { ... }` เดิม (บรรทัด 10–17) ด้วย:

```css
#stage {
  /* ค่าธีมเริ่มต้น (config.theme ทับได้ และ layer.theme ทับเฉพาะชิ้น) */
  --primary: #e3122c;
  --accent: #ffd400;
  --panel: #141418;
  --panel-2: #23232a;
  --text: #ffffff;
  position: absolute;
  inset: 0 auto auto 0;
  overflow: hidden;
  font-family: var(--font, 'Kanit'), sans-serif;
  color: var(--text, #fff);
  -webkit-font-smoothing: antialiased;
}

/* ทุกชิ้น: .layer (ตำแหน่ง/ขนาด/ธีม) > .motion (ท่าเข้า/ออก) > .el (หน้าตาของชิ้น) */
.layer { position: absolute; font-family: var(--font, 'Kanit'), sans-serif; color: var(--text, #fff); }
.layer.fullscreen { inset: 0; pointer-events: none; }
.layer.fullscreen .motion, .layer.fullscreen .el { width: 100%; height: 100%; }
.motion { transform-origin: 50% 50%; }
.el { position: relative; }
.el-broken {
  padding: 12px 18px; border: 2px dashed #fca5a5; border-radius: 8px;
  background: rgba(127, 29, 29, .9); color: #fff;
  font: 600 22px/1.3 system-ui, sans-serif; white-space: nowrap;
}
```

(ข) แทนที่ 4 บรรทัด selector หน้าแก้ไข `html.mode-edit #stage [data-key] ...` และ `html.mode-edit #stage img ...` ด้วย:

```css
html.mode-edit #stage .layer { cursor: move; user-select: none; }
html.mode-edit #stage .layer:hover { outline: 3px dashed rgba(255, 255, 255, .45); outline-offset: 4px; }
html.mode-edit #stage .layer.ed-selected { outline: 4px dashed #22d3ee; outline-offset: 4px; }
html.mode-edit #stage .layer.fullscreen { cursor: default; }
html.mode-edit #stage .layer.fullscreen.ed-selected { outline-offset: -8px; }
html.mode-edit #stage img { pointer-events: none; }
```

- [ ] **Step 6: เขียน `elements/_shared/motion.js`**

```js
// สูตรท่าวนที่ชิ้นชุดคลิปเกมใช้ร่วมกัน (ย้ายมาจาก templates/sponsor-gaming/timeline.js)

import { clamp01, lerp, ease } from '../../templates/_runtime/timing.js';

/** ตำแหน่งแสงวิ่ง: วิ่งผ่านช่วงแรก 25% ของรอบ แล้วรอนอกกรอบ */
export function shineX(phase, width) {
  const p = clamp01(phase / 0.25);
  return lerp(-160, width + 160, ease.inOutSine(p));
}
/** จังหวะเด้งสั้นๆ ต้นรอบ (0 → 1 → 0) */
export const bump = (phase, len = 0.15) => (phase < len ? Math.sin((Math.PI * phase) / len) : 0);
/** คลื่นนุ่มๆ 0..1 */
export const wave = (phase) => 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
```

- [ ] **Step 7: เขียนชิ้น `highlight`**

`elements/highlight/index.js`:

```js
// ป้าย HIGHLIGHT สีหลัก มีแสงวิ่งผ่านเป็นจังหวะ
import { el } from '../../templates/_runtime/dom.js';
import { shineX } from '../_shared/motion.js';

export default {
  build(root, props) {
    el('div', 'label', root, props.text ?? 'HIGHLIGHT');
    return { root, shine: el('div', 'shine', root) };
  },
  measure(s) {
    s.width = s.root.offsetWidth;
  },
  frame(s, t, span, ctx) {
    s.shine.style.transform = `translateX(${shineX(ctx.cycle(t, 4), s.width)}px) skewX(-20deg)`;
  },
};
```

`elements/highlight/style.css`:

```css
.el-highlight {
  will-change: transform, opacity;
  height: 86px; padding: 0 34px;
  display: flex; align-items: center;
  background: var(--primary);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .45), inset 0 -6px 0 rgba(0, 0, 0, .18);
  overflow: hidden;
}
.el-highlight .label {
  font-size: 54px; font-weight: 900; font-style: italic;
  letter-spacing: 1px; line-height: 1;
  text-shadow: 0 3px 0 rgba(0, 0, 0, .25);
}
.el-highlight .shine {
  position: absolute; top: -20%; bottom: -20%; left: 0;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .75), transparent);
  transform: translateX(-200px) skewX(-20deg);
  pointer-events: none;
}
#stage.portrait .el-highlight { height: 80px; padding: 0 28px; }
#stage.portrait .el-highlight .label { font-size: 48px; }
```

- [ ] **Step 8: เขียนชิ้น `top-donate`**

`elements/top-donate/index.js`:

```js
// กล่อง TOP DONATE: มงกุฎลอยขึ้นลง แสงวิ่ง และยอดเงินนับขึ้นตอนชิ้นเข้าฉาก (เมื่อมีท่าเข้า)
import { el } from '../../templates/_runtime/dom.js';
import { ease, progress } from '../../templates/_runtime/timing.js';
import { shineX } from '../_shared/motion.js';

const fmtNumber = (n) => Math.round(n).toLocaleString('en-US');

export default {
  build(root, props) {
    const badge = el('div', 'badge', root);
    const crown = el('div', 'crown', badge, '♛');
    el('div', '', badge, props.badge ?? 'TOP');
    el('div', '', badge, props.badge2 ?? 'DONATE');
    const body = el('div', 'body', root);
    el('div', 'name', body, props.name ?? '');
    const amount = el('div', 'amount', body);
    return { root, crown, amount, shine: el('div', 'shine', root), props };
  },
  measure(s) {
    s.width = s.root.offsetWidth;
  },
  frame(s, t, span, ctx) {
    const total = Number(s.props.amount) || 0;
    const shown = span.enter > 0 ? total * ease.outCubic(progress(span.local, 0.15, 1.6)) : total;
    s.amount.textContent = `${fmtNumber(shown)}${s.props.currency ?? '฿'}`;
    s.crown.style.transform = `translateY(${-3 * Math.sin(2 * Math.PI * ctx.cycle(t, 1.25))}px)`;
    const ph = (ctx.cycle(t, 5) + 0.5) % 1;
    s.shine.style.transform = `translateX(${shineX(ph, s.width)}px) skewX(-20deg)`;
  },
};
```

`elements/top-donate/style.css`:

```css
.el-top-donate {
  will-change: transform, opacity;
  width: 280px; height: 74px;
  display: flex;
  background: var(--panel);
  border: 2px solid rgba(255, 255, 255, .12);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .45);
  overflow: hidden;
}
.el-top-donate .badge {
  width: 86px; flex: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--primary);
  font-weight: 800; font-style: italic; line-height: .95; text-align: center;
  font-size: 17px;
}
.el-top-donate .crown { font-size: 22px; line-height: 1; color: var(--accent); margin-bottom: 2px; }
.el-top-donate .body { flex: 1; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center; }
.el-top-donate .name { font-size: 26px; font-weight: 700; line-height: 1.05; }
.el-top-donate .amount { font-size: 26px; font-weight: 700; line-height: 1.05; color: var(--accent); font-variant-numeric: tabular-nums; }
.el-top-donate .shine {
  position: absolute; top: -20%; bottom: -20%; left: 0;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .75), transparent);
  transform: translateX(-200px) skewX(-20deg);
  pointer-events: none;
}
```

- [ ] **Step 9: เขียนชิ้น `sponsor-logo`**

`elements/sponsor-logo/index.js`:

```js
// โลโก้สปอนเซอร์ในกรอบเรืองแสงสีหลัก (ไม่มีรูป → แสดงข้อความแทน)
import { el, assetUrl } from '../../templates/_runtime/dom.js';
import { wave } from '../_shared/motion.js';

export default {
  build(root, props) {
    if (props.image) {
      const img = el('img', '', root);
      img.src = assetUrl(props.image);
      img.alt = props.text || 'sponsor';
    } else {
      el('div', 'text', root, props.text ?? 'SPONSOR');
    }
    return { root };
  },
  frame(s, t, span, ctx) {
    const g = wave(ctx.cycle(t, 2));
    s.root.style.boxShadow = `0 6px 18px rgba(0,0,0,.45), 0 0 ${6 + 18 * g}px ${1 + 2 * g}px var(--primary)`;
  },
};
```

`elements/sponsor-logo/style.css`:

```css
.el-sponsor-logo {
  will-change: transform, opacity;
  width: 300px; height: 90px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: var(--panel);
  border: 3px solid var(--primary);
  border-radius: 10px;
  overflow: hidden;
}
.el-sponsor-logo img { max-width: 260px; max-height: 66px; object-fit: contain; }
.el-sponsor-logo .text { font-size: 40px; font-weight: 900; font-style: italic; letter-spacing: 1px; }
```

- [ ] **Step 10: เขียนชิ้น `webcam-frame`**

`elements/webcam-frame/index.js`:

```js
// กรอบกล้อง: แถบชื่อช่อง + LIVE และขอบที่มีแสงวิ่งรอบ ตรงกลางโปร่งใสให้เห็นกล้องจากคลิปจริง
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const [w, h] = props.camSize || [398, 292];
    root.style.width = `${w}px`;
    const bar = el('div', 'bar', root);
    el('div', 'channel', bar, props.channel ?? 'CHANNEL');
    el('div', 'label', bar, props.label ?? '');
    let dot = null;
    if (props.live !== false) {
      const live = el('div', 'live', bar);
      dot = el('div', 'dot', live);
      el('span', '', live, 'LIVE');
    }
    const cam = el('div', 'cam', root);
    cam.style.width = `${w}px`;
    cam.style.height = `${h}px`;
    const sw = props.borderWidth ?? 6;
    const P = 2 * (w + h);
    cam.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
              fill="none" stroke="var(--panel)" stroke-width="${sw}"/>
        <rect class="run" x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
              fill="none" stroke="var(--primary)" stroke-width="${sw}" stroke-linecap="round"
              stroke-dasharray="${P * 0.22} ${P * 0.28}"
              style="filter: drop-shadow(0 0 6px var(--primary))"/>
      </svg>`;
    return { dot, run: cam.querySelector('.run'), perimeter: P };
  },
  frame(s, t, span, ctx) {
    s.run.style.strokeDashoffset = String(-ctx.cycle(t, 3) * s.perimeter);
    if (s.dot) s.dot.style.opacity = String(0.25 + 0.75 * (ctx.cycle(t, 1) < 0.55 ? 1 : 0));
  },
};
```

`elements/webcam-frame/style.css`:

```css
.el-webcam-frame { will-change: transform, opacity; }
.el-webcam-frame .bar {
  display: flex; align-items: stretch; height: 38px;
  border-radius: 6px 6px 0 0; overflow: hidden;
  font-weight: 700;
}
.el-webcam-frame .channel {
  display: flex; align-items: center; padding: 0 16px;
  background: var(--primary); font-size: 20px; font-style: italic; font-weight: 800;
}
.el-webcam-frame .label {
  flex: 1; display: flex; align-items: center; justify-content: center;
  background: var(--panel); font-size: 20px; font-style: italic; font-weight: 800; letter-spacing: 1px;
}
.el-webcam-frame .live {
  display: flex; align-items: center; gap: 6px; padding: 0 12px;
  background: var(--panel-2); font-size: 15px;
}
.el-webcam-frame .dot { width: 11px; height: 11px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); }
.el-webcam-frame .cam { position: relative; }
.el-webcam-frame .cam svg { position: absolute; inset: 0; overflow: visible; }
```

- [ ] **Step 11: เขียนชิ้น `promo-bar`**

`elements/promo-bar/index.js`:

```js
// แถบโปรโมชัน: โลโก้ + ข้อความ + ราคา (ราคาเด้งเป็นจังหวะ มีแสงวิ่งผ่าน)
import { el, assetUrl } from '../../templates/_runtime/dom.js';
import { shineX, bump } from '../_shared/motion.js';

export default {
  build(root, props) {
    if (props.logo) {
      const logo = el('div', 'logo', root);
      const img = el('img', '', logo);
      img.src = assetUrl(props.logo);
      img.alt = 'logo';
    }
    if (props.text) el('div', 'text', root, props.text);
    const box = el('div', 'price-box', root);
    if (props.oldPrice) el('div', 'old', box, props.oldPrice);
    const row = el('div', 'price-row', box);
    el('div', 'price', row, props.price ?? '');
    if (props.unit) el('div', 'unit', row, props.unit);
    if (props.note) el('div', 'note', box, props.note);
    return { root, row, shine: el('div', 'shine', root) };
  },
  measure(s) {
    s.width = s.root.offsetWidth;
  },
  frame(s, t, span, ctx) {
    s.row.style.transform = `scale(${1 + 0.08 * bump(ctx.cycle(t, 2.5), 0.2)})`;
    const sh = (ctx.cycle(t, 5) + 0.25) % 1;
    s.shine.style.transform = `translateX(${shineX(sh, s.width)}px) skewX(-20deg)`;
  },
};
```

`elements/promo-bar/style.css`:

```css
.el-promo-bar {
  will-change: transform, opacity;
  height: 94px;
  display: flex; align-items: center;
  background: linear-gradient(90deg, var(--panel) 0%, rgba(20, 20, 24, .92) 100%);
  border: 2px solid rgba(255, 255, 255, .1);
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .45);
  overflow: hidden;
}
.el-promo-bar .logo {
  height: 100%; padding: 0 16px; display: flex; align-items: center;
  background: rgba(255, 255, 255, .04);
}
.el-promo-bar .logo img { max-height: 74px; max-width: 160px; object-fit: contain; }
.el-promo-bar .text { padding: 0 22px; font-size: 44px; font-weight: 700; white-space: nowrap; }
.el-promo-bar .price-box {
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
  height: 100%; padding: 0 22px 0 18px;
  background: rgba(0, 0, 0, .35);
}
.el-promo-bar .old { font-size: 18px; color: #fff; background: #2563eb; padding: 0 8px; border-radius: 4px; line-height: 1.35; text-decoration: line-through; }
.el-promo-bar .price-row { display: flex; align-items: baseline; gap: 6px; transform-origin: left center; }
.el-promo-bar .price { font-size: 46px; font-weight: 700; line-height: 1; }
.el-promo-bar .unit { font-size: 18px; font-weight: 600; color: var(--accent); }
.el-promo-bar .note { font-size: 15px; opacity: .85; line-height: 1.2; }
.el-promo-bar .shine {
  position: absolute; top: -20%; bottom: -20%; left: 0;
  width: 90px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .75), transparent);
  transform: translateX(-200px) skewX(-20deg);
  pointer-events: none;
}
```

- [ ] **Step 12: เขียนชิ้น `ticker`**

`elements/ticker/index.js`:

```js
// ข้อความวิ่ง: ป้ายหัว + ข้อความวนจากขวาไปซ้ายต่อกันไม่มีรอยต่อ
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    if (props.tag) el('div', 'tag', root, props.tag);
    const win = el('div', 'window', root);
    const track = el('div', 'track', win);
    const items = Array.isArray(props.items) ? props.items : [props.text ?? ''];
    const unit = el('div', 'unit', track);
    unit.style.display = 'flex';
    for (const text of items) el('div', 'item', unit, text);
    return { win, track, unit, speed: props.speed ?? 110 };
  },
  measure(s) {
    s.unitWidth = s.unit.offsetWidth;
    const copies = Math.ceil(s.win.offsetWidth / Math.max(1, s.unitWidth)) + 1;
    for (let i = 0; i < copies; i++) s.track.appendChild(s.unit.cloneNode(true));
  },
  frame(s, t, span, ctx) {
    const ph = ctx.cycle(t, s.unitWidth / s.speed);
    s.track.style.transform = `translateX(${-ph * s.unitWidth}px)`;
  },
};
```

`elements/ticker/style.css`:

```css
.el-ticker {
  will-change: transform, opacity;
  height: 46px;
  display: flex;
  background: rgba(20, 20, 24, .88);
  border-radius: 8px;
  overflow: hidden;
}
.el-ticker .tag {
  flex: none; display: flex; align-items: center; padding: 0 16px;
  background: var(--primary); font-size: 20px; font-weight: 800; font-style: italic;
}
.el-ticker .window { position: relative; flex: 1; overflow: hidden; }
.el-ticker .track { position: absolute; top: 0; bottom: 0; left: 0; display: flex; align-items: center; white-space: nowrap; }
.el-ticker .item { font-size: 22px; font-weight: 600; padding-right: 60px; }
.el-ticker .item::after { content: '◆'; color: var(--accent); margin-left: 60px; font-size: 14px; vertical-align: middle; }
```

- [ ] **Step 13: เขียนชิ้น `notice`**

`elements/notice/index.js`:

```js
// กล่องประกาศ: วนเปลี่ยนข้อความทีละอัน จางเข้า/ออกพร้อมเลื่อนขึ้นเล็กน้อย
import { el } from '../../templates/_runtime/dom.js';
import { clamp01, ease } from '../../templates/_runtime/timing.js';

export default {
  build(root, props) {
    const messages = props.messages || [];
    if (!messages.length) return null;
    const msgs = messages.map((m) => {
      const box = el('div', 'msg', root);
      const obj = typeof m === 'string' ? { text: m } : m;
      if (obj.title) el('div', 'title', box, obj.title);
      el('div', 'line', box, obj.text);
      return box;
    });
    return { msgs, each: props.secondsEach ?? 4 };
  },
  frame(s, t, span, ctx) {
    if (!s) return;
    const count = s.msgs.length;
    const ph = ctx.cycle(t, s.each * count) * count;
    const idx = Math.floor(ph);
    const local = ph - idx;
    s.msgs.forEach((box, i) => {
      if (i !== idx) {
        box.style.opacity = '0';
        return;
      }
      const fadeIn = count > 1 ? clamp01(local / 0.08) : 1;
      const fadeOut = count > 1 ? clamp01((1 - local) / 0.08) : 1;
      box.style.opacity = String(Math.min(fadeIn, fadeOut));
      box.style.transform = `translateY(${(1 - ease.outCubic(fadeIn)) * 16 - (1 - fadeOut) * 16}px)`;
    });
  },
};
```

`elements/notice/style.css`:

```css
.el-notice { will-change: transform, opacity; width: 400px; height: 70px; }
.el-notice .msg {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 16px;
  background: rgba(20, 20, 24, .85);
  border-left: 5px solid var(--accent);
  border-radius: 6px;
}
.el-notice .title { font-size: 16px; color: var(--accent); font-weight: 600; line-height: 1.2; }
.el-notice .line { font-size: 21px; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#stage.portrait .el-notice { width: 560px; }
```

- [ ] **Step 14: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: `overlay` และ `vertical` PASS (ภาพต่างจากต้นแบบไม่เกิน 0.5% ทุกจุดเวลา) ส่วน `popup` และ `neon` ถูกข้าม
ถ้าภาพต่างเกิน ให้เทียบตำแหน่ง/ขนาดที่ผิดกับ `templates/sponsor-gaming/style.css` (ยังไม่ได้ลบ) โดยเปิดภาพที่ได้ด้วยการเขียนไฟล์ชั่วคราวจาก `shots` แล้วดูด้วยตา

- [ ] **Step 15: Commit**

```bash
git add templates/_runtime/stage.html templates/_runtime/stage.js templates/_runtime/base.css elements/ test/visual.test.js
git commit -m "Add single stage page and port the seven sponsor-gaming elements

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ชิ้นการ์ดเด้ง + ชุดนีออน 4 ชนิด

**Files:**
- Create: `elements/popup-card/index.js`, `style.css`
- Create: `elements/neon-frame/geometry.js`, `index.js`, `style.css`
- Create: `elements/neon-bulbs/index.js`, `style.css`
- Create: `elements/neon-corners/index.js`, `style.css`
- Create: `elements/neon-label/index.js`, `style.css`
- Test: `test/visual.test.js` (ไม่ต้องแก้ เคส popup/neon จะเปิดเอง)

**Interfaces:**
- Consumes: สัญญาโมดูลจาก Task 5, `span.enter/exit/length/local/showAll`
- Produces: `neonFrame(ctx) → { inset, th, r, rect: { x, y, w, h } }` (อ่านจาก layer `neon-frame` ตัวแรก ถ้าไม่มีใช้ค่าเริ่มต้น)

- [ ] **Step 1: รันเทสต์ดูว่าเคส popup/neon ยังถูกข้าม**

Run: `npm test`
Expected: `popup` และ `neon` ขึ้นว่า skipped "ยังไม่มีโมดูลของบางชิ้น"

- [ ] **Step 2: เขียนชิ้น `popup-card`**

`elements/popup-card/index.js`:

```js
// การ์ดสปอนเซอร์เด้ง: ท่าเด้งเข้า/สไลด์ออกเป็นของส่วนกลาง (enter/exit แบบ pop)
// ตัวการ์ดทำท่าลอยตอนค้าง แสงวิ่งหลังเด้งเข้า และแถบเวลาที่เหลือ
// persistent = แสดงตลอด ลอยขึ้นลงช้าๆ ไม่มีแถบเวลา
import { el, assetUrl } from '../../templates/_runtime/dom.js';
import { clamp01, lerp, ease } from '../../templates/_runtime/timing.js';

export default {
  build(root, props) {
    if (props.compact) root.classList.add('compact');
    if (props.color) root.style.setProperty('--c', props.color);
    const card = el('div', 'card', root);
    if (props.tag !== '') el('div', 'tag', card, props.tag ?? 'SPONSORED BY');
    const row = el('div', 'row', card);
    if (props.image) {
      const img = el('img', '', el('div', 'logo', row));
      img.src = assetUrl(props.image);
      img.alt = props.title || 'sponsor';
    }
    const texts = el('div', 'texts', row);
    if (props.title) el('div', 'title', texts, props.title);
    if (props.subtitle) el('div', 'subtitle', texts, props.subtitle);
    const bar = props.persistent ? null : el('div', 'bar', card);
    const shine = el('div', 'shine', card);
    return { card, bar, shine, persistent: !!props.persistent };
  },
  frame(s, t, span, ctx) {
    const sw = s.card.offsetWidth;
    if (s.persistent) {
      s.card.style.transform = `translateY(${-3 * Math.sin(2 * Math.PI * ctx.cycle(t, 3))}px)`;
      const ph = ctx.cycle(t, 6);
      s.shine.style.transform = `translateX(${lerp(-160, sw + 160, clamp01(ph / 0.2))}px) skewX(-20deg)`;
      return;
    }
    const IN = span.enter;
    const hold = Math.max(0.001, span.length - span.enter - span.exit);
    const holding = span.showAll || (span.local >= IN && span.local < IN + hold);
    const float = holding ? -4 * Math.sin((2 * Math.PI * (span.local - IN)) / 2.5) : 0;
    s.card.style.transform = `translateY(${float}px)`;
    const sp = span.showAll ? 1 : clamp01((span.local - IN) / 0.8);
    s.shine.style.transform = `translateX(${lerp(-160, sw + 160, ease.inOutSine(sp))}px) skewX(-20deg)`;
    if (s.bar) s.bar.style.transform = `scaleX(${span.showAll ? 1 : 1 - clamp01((span.local - IN) / hold)})`;
  },
};
```

`elements/popup-card/style.css`:

```css
.el-popup-card { --c: var(--primary); }
.el-popup-card .card {
  position: relative;
  display: flex; flex-direction: column;
  min-width: 300px; max-width: 640px;
  background: var(--panel);
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .5), 0 0 0 3px var(--c);
  overflow: hidden;
  will-change: transform, opacity;
}
.el-popup-card .tag {
  align-self: flex-start;
  padding: 4px 16px 4px 14px;
  background: var(--c);
  border-bottom-right-radius: 12px;
  font-size: 16px; font-weight: 700; letter-spacing: 2px;
}
.el-popup-card .row { display: flex; align-items: center; gap: 18px; padding: 14px 26px 18px 20px; }
.el-popup-card .logo { flex: none; display: flex; align-items: center; justify-content: center; }
.el-popup-card .logo img { max-height: 84px; max-width: 220px; object-fit: contain; }
.el-popup-card .texts { display: flex; flex-direction: column; min-width: 0; }
.el-popup-card .title { font-size: 40px; font-weight: 700; line-height: 1.1; white-space: nowrap; }
.el-popup-card .subtitle { font-size: 24px; font-weight: 400; line-height: 1.25; opacity: .9; white-space: nowrap; color: var(--accent); }
.el-popup-card .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--c); transform-origin: left center; }

/* แบบเล็ก: ป้ายถาวรมุมจอ */
.el-popup-card.compact .card { min-width: 0; border-radius: 12px; box-shadow: 0 6px 18px rgba(0, 0, 0, .45), 0 0 0 2px var(--c); }
.el-popup-card.compact .tag { font-size: 12px; padding: 2px 10px; letter-spacing: 1.5px; }
.el-popup-card.compact .row { gap: 10px; padding: 6px 16px 10px 12px; }
.el-popup-card.compact .logo img { max-height: 40px; max-width: 120px; }
.el-popup-card.compact .title { font-size: 22px; }
.el-popup-card.compact .subtitle { font-size: 15px; }

.el-popup-card .shine {
  position: absolute; top: -20%; bottom: -20%; left: 0;
  width: 110px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .35), transparent);
  transform: translateX(-200px) skewX(-20deg);
  pointer-events: none;
}
```

- [ ] **Step 3: เขียน `elements/neon-frame/geometry.js`**

```js
// สี่เหลี่ยมของเส้นกรอบนีออน ใช้ร่วมกันระหว่างกรอบนีออน หลอดไฟ มุมกรอบ และป้ายนีออน
// อ่านค่าจากกรอบนีออนชิ้นแรกในโปรเจกต์ (ถ้าไม่มีใช้ค่าเริ่มต้น)

export function frameRect(props, W, H) {
  const inset = props.inset ?? 16;
  const th = props.thickness ?? 8;
  return { inset, th, r: props.radius ?? 22, rect: { x: inset + th / 2, y: inset + th / 2, w: W - 2 * inset - th, h: H - 2 * inset - th } };
}

export function neonFrame(ctx) {
  const props = ctx.config.layers?.find((l) => l.type === 'neon-frame')?.props || {};
  return frameRect(props, ctx.width, ctx.height);
}
```

- [ ] **Step 4: เขียนชิ้น `neon-frame`**

`elements/neon-frame/index.js`:

```js
// กรอบนีออนรอบจอ: effect chase (แสงวิ่ง) / blink (กะพริบ) / pulse (หายใจ) / rainbow (เปลี่ยนสี)
import { svgEl } from '../../templates/_runtime/dom.js';
import { frameRect } from './geometry.js';

const wave = (p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p);

export default {
  build(root, props, ctx) {
    const W = ctx.width;
    const H = ctx.height;
    const { th, r, rect } = frameRect(props, W, H);
    const perimeter = 2 * (rect.w + rect.h);
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    const attrs = { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: r, fill: 'none', 'stroke-width': th };
    const g = svgEl('g', { class: 'glow-a' }, svg);
    const base = svgEl('rect', { ...attrs, stroke: 'var(--primary)' }, g);
    const g2 = svgEl('g', { class: 'glow-b' }, svg);
    const segs = Math.max(1, props.segments ?? 3);
    const run = svgEl('rect', {
      ...attrs, stroke: 'var(--accent)', 'stroke-linecap': 'round',
      'stroke-dasharray': `${(perimeter / segs) * 0.35} ${(perimeter / segs) * 0.65}`,
    }, g2);
    return { svg, base, run, segs, perimeter, props };
  },
  frame(s, t, span, ctx) {
    const period = s.props.period ?? 2.5;
    const effect = s.props.effect ?? 'chase';
    const ph = ctx.cycle(t, period);
    s.run.style.display = effect === 'chase' || effect === 'rainbow' ? '' : 'none';
    s.run.style.strokeDashoffset = String(-ph * (s.perimeter / s.segs));
    let baseOpacity = 1;
    if (effect === 'chase') baseOpacity = 0.55;
    if (effect === 'pulse') baseOpacity = 0.35 + 0.65 * wave(ph);
    if (effect === 'blink') baseOpacity = ctx.cycle(t, period / 4) < 0.5 ? 1 : 0.12;
    s.base.style.opacity = String(baseOpacity);
    s.svg.style.filter = effect === 'rainbow' ? `hue-rotate(${Math.round(ctx.cycle(t, period * 2) * 360)}deg)` : '';
  },
};
```

`elements/neon-frame/style.css`:

```css
.el-neon-frame svg { position: absolute; inset: 0; overflow: visible; }
.el-neon-frame svg * { pointer-events: visiblePainted; }
.el-neon-frame .glow-a { filter: drop-shadow(0 0 4px var(--primary)) drop-shadow(0 0 12px var(--primary)); }
.el-neon-frame .glow-b { filter: drop-shadow(0 0 4px var(--accent)) drop-shadow(0 0 12px var(--accent)); }
```

- [ ] **Step 5: เขียนชิ้น `neon-bulbs`**

`elements/neon-bulbs/index.js`:

```js
// หลอดไฟเรียงรอบขอบ: pattern alternate (สลับติด) / chase (ไล่ไฟ) / twinkle (ระยิบ)
import { svgEl } from '../../templates/_runtime/dom.js';
import { neonFrame } from '../neon-frame/geometry.js';

const wave = (p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p);
// ตัวเลขสุ่มแบบคงที่ (เรนเดอร์กี่ครั้งก็ได้ค่าเดิม)
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** จุดเรียงรอบสี่เหลี่ยม ห่างกันประมาณ spacing */
function perimeterPoints(x, y, w, h, spacing) {
  const pts = [];
  const nx = Math.max(2, Math.round(w / spacing));
  const ny = Math.max(2, Math.round(h / spacing));
  for (let i = 0; i < nx; i++) pts.push([x + (w * i) / nx, y]);
  for (let i = 0; i < ny; i++) pts.push([x + w, y + (h * i) / ny]);
  for (let i = 0; i < nx; i++) pts.push([x + w - (w * i) / nx, y + h]);
  for (let i = 0; i < ny; i++) pts.push([x, y + h - (h * i) / ny]);
  return pts;
}

export default {
  build(root, props, ctx) {
    const W = ctx.width;
    const H = ctx.height;
    const { rect } = neonFrame(ctx);
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    const gap = props.gap ?? 26;
    const size = props.size ?? 7;
    const pts = perimeterPoints(rect.x + gap, rect.y + gap, rect.w - 2 * gap, rect.h - 2 * gap, props.spacing ?? 60);
    const ga = svgEl('g', { class: 'glow-a' }, svg);
    const gb = svgEl('g', { class: 'glow-b' }, svg);
    const bulbs = pts.map(([x, y], i) =>
      svgEl('circle', { cx: x, cy: y, r: size, fill: i % 2 ? 'var(--accent)' : 'var(--primary)' }, i % 2 ? gb : ga),
    );
    return { bulbs, props };
  },
  frame(s, t, span, ctx) {
    const pattern = s.props.pattern ?? 'alternate';
    const ph = ctx.cycle(t, s.props.period ?? 1);
    s.bulbs.forEach((node, i) => {
      let v;
      if (pattern === 'chase') v = (i + Math.floor(ph * 3)) % 3 === 0 ? 1 : 0.15;
      else if (pattern === 'twinkle') v = 0.2 + 0.8 * wave((ph + hash(i)) % 1);
      else v = (i + (ph < 0.5 ? 0 : 1)) % 2 === 0 ? 1 : 0.15;
      node.style.opacity = String(v);
    });
  },
};
```

`elements/neon-bulbs/style.css`:

```css
.el-neon-bulbs svg { position: absolute; inset: 0; overflow: visible; }
.el-neon-bulbs svg * { pointer-events: visiblePainted; }
.el-neon-bulbs .glow-a { filter: drop-shadow(0 0 4px var(--primary)) drop-shadow(0 0 12px var(--primary)); }
.el-neon-bulbs .glow-b { filter: drop-shadow(0 0 4px var(--accent)) drop-shadow(0 0 12px var(--accent)); }
```

- [ ] **Step 6: เขียนชิ้น `neon-corners`**

`elements/neon-corners/index.js`:

```js
// มุมกรอบรูปตัว L ทั้ง 4 มุม แวบแสงเป็นจังหวะ
import { svgEl } from '../../templates/_runtime/dom.js';
import { neonFrame } from '../neon-frame/geometry.js';

export default {
  build(root, props, ctx) {
    const W = ctx.width;
    const H = ctx.height;
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    const g = svgEl('g', { class: 'glow-b' }, svg);
    const L = props.length ?? 90;
    const thickness = props.thickness ?? 12;
    const m = neonFrame(ctx).inset - 4;
    const paths = [
      `M ${m} ${m + L} V ${m} H ${m + L}`,
      `M ${W - m - L} ${m} H ${W - m} V ${m + L}`,
      `M ${W - m} ${H - m - L} V ${H - m} H ${W - m - L}`,
      `M ${m + L} ${H - m} H ${m} V ${H - m - L}`,
    ].map((d) => svgEl('path', {
      d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': thickness, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, g));
    return { g, paths, props };
  },
  frame(s, t, span, ctx) {
    const ph = ctx.cycle(t, s.props.period ?? 2);
    const flash = ph < 0.15 ? Math.sin((Math.PI * ph) / 0.15) : 0;
    s.g.style.opacity = String(0.6 + 0.4 * flash);
    s.paths.forEach((p) => (p.style.strokeWidth = String((s.props.thickness ?? 12) * (1 + 0.35 * flash))));
  },
};
```

`elements/neon-corners/style.css`:

```css
.el-neon-corners svg { position: absolute; inset: 0; overflow: visible; }
.el-neon-corners svg * { pointer-events: visiblePainted; }
.el-neon-corners .glow-b { filter: drop-shadow(0 0 4px var(--accent)) drop-shadow(0 0 12px var(--accent)); }
```

- [ ] **Step 7: เขียนชิ้น `neon-label`**

`elements/neon-label/index.js`:

```js
// ป้ายนีออนทรงแคปซูล: จุดกะพริบ + ข้อความเรืองแสง
// ยังไม่เคยถูกย้าย (ไม่มี style) → วางกลางขอบบน ทับเส้นกรอบนีออนพอดี
import { el } from '../../templates/_runtime/dom.js';
import { neonFrame } from '../neon-frame/geometry.js';

const wave = (p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p);

export default {
  build(root, props) {
    const dot = props.dot !== false ? el('div', 'dot', root) : null;
    el('div', 'text', root, props.text ?? 'LIVE');
    if (props.sub) el('div', 'sub', root, props.sub);
    return { root, dot };
  },
  place(wrap, ctx) {
    const { inset } = neonFrame(ctx);
    return {
      left: Math.round((ctx.width - wrap.offsetWidth) / 2),
      top: Math.max(0, Math.round(inset - wrap.offsetHeight / 2 + 4)),
    };
  },
  frame(s, t, span, ctx) {
    if (s.dot) s.dot.style.opacity = ctx.cycle(t, 1) < 0.55 ? '1' : '0.2';
    const g = wave(ctx.cycle(t, 2.5));
    s.root.style.boxShadow = `0 0 ${8 + 14 * g}px var(--primary), inset 0 0 10px color-mix(in srgb, var(--primary) 30%, transparent)`;
  },
};
```

`elements/neon-label/style.css`:

```css
.el-neon-label {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 28px;
  background: var(--panel);
  border: 3px solid var(--primary);
  border-radius: 999px;
  box-shadow: 0 0 12px var(--primary), inset 0 0 10px color-mix(in srgb, var(--primary) 30%, transparent);
  white-space: nowrap;
}
.el-neon-label .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
.el-neon-label .text { font-size: 34px; font-weight: 700; line-height: 1.1; letter-spacing: 1px; text-shadow: 0 0 10px var(--primary); }
.el-neon-label .sub { font-size: 20px; opacity: .85; color: var(--primary); }
```

- [ ] **Step 8: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: `visual` ทั้ง 4 เคส PASS (ไม่มีเคสถูกข้าม)

- [ ] **Step 9: Commit**

```bash
git add elements/popup-card elements/neon-frame elements/neon-bulbs elements/neon-corners elements/neon-label
git commit -m "Port popup card and neon elements to the element library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ชิ้นพื้นฐาน (ข้อความ / รูปภาพ / รูปทรง) + เทสต์ทุกชิ้นในคลัง

**Files:**
- Create: `elements/text/index.js`, `style.css`
- Create: `elements/image/index.js`, `style.css`
- Create: `elements/shape/index.js`, `style.css`
- Test: `test/elements.test.js`

**Interfaces:**
- Consumes: `CATALOG`, สัญญาโมดูล, `shoot`/`launch`
- Produces: ไม่มีอะไรใหม่ให้ task อื่น

- [ ] **Step 1: เขียนเทสต์ `test/elements.test.js`**

```js
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
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL ที่ `text/index.js` ไม่มี

- [ ] **Step 3: เขียนชิ้น `text`**

`elements/text/index.js`:

```js
// ข้อความอิสระ: ขนาด/สี/ความหนา/จัดแนว/ขอบ/เงา ตั้งได้ (ไม่ใส่สี = ใช้สีตัวอักษรของธีม)
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const node = el('div', 'text', root, props.text ?? '');
    Object.assign(node.style, {
      fontSize: `${props.size ?? 64}px`,
      fontWeight: String(props.weight ?? '700'),
      textAlign: props.align ?? 'left',
    });
    if (props.color) node.style.color = props.color;
    if (props.stroke && props.strokeWidth > 0) node.style.webkitTextStroke = `${props.strokeWidth}px ${props.stroke}`;
    if (props.shadow !== false) node.style.textShadow = '0 3px 8px rgba(0, 0, 0, .55)';
    return null;
  },
};
```

`elements/text/style.css`:

```css
.el-text .text { white-space: pre; line-height: 1.15; paint-order: stroke fill; }
```

- [ ] **Step 4: เขียนชิ้น `image`**

`elements/image/index.js`:

```js
// รูปภาพ: กำหนดความกว้าง (ความสูงตามสัดส่วน) ความโค้งมุม และความทึบ
import { el, assetUrl } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    if (!props.src) {
      el('div', 'empty', root, 'ยังไม่ได้เลือกรูป');
      return null;
    }
    const img = el('img', '', root);
    img.src = assetUrl(props.src);
    img.alt = '';
    Object.assign(img.style, {
      width: `${props.width ?? 300}px`,
      borderRadius: `${props.radius ?? 0}px`,
      opacity: String(props.opacity ?? 1),
    });
    return null;
  },
};
```

`elements/image/style.css`:

```css
.el-image img { display: block; height: auto; }
.el-image .empty {
  padding: 24px 32px; border: 2px dashed rgba(255, 255, 255, .5); border-radius: 8px;
  font-size: 22px; color: rgba(255, 255, 255, .7); white-space: nowrap;
}
```

- [ ] **Step 5: เขียนชิ้น `shape`**

`elements/shape/index.js`:

```js
// กล่อง/รูปทรง: สี่เหลี่ยมมุมมน วงกลม หรือเส้น (ไม่ใส่สีพื้น = สีพื้นกล่องของธีม)
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const shape = props.shape ?? 'rect';
    const box = el('div', `shape ${shape}`, root);
    const w = props.width ?? 400;
    const h = shape === 'line' ? Math.max(1, props.strokeWidth || 6) : shape === 'circle' ? w : props.height ?? 120;
    Object.assign(box.style, {
      width: `${w}px`,
      height: `${h}px`,
      background: shape === 'line' ? props.stroke || props.fill || 'var(--accent)' : props.fill || 'var(--panel)',
      borderRadius: shape === 'circle' ? '50%' : shape === 'line' ? `${h / 2}px` : `${props.radius ?? 0}px`,
    });
    if (shape !== 'line' && props.stroke && props.strokeWidth > 0) box.style.border = `${props.strokeWidth}px solid ${props.stroke}`;
    return null;
  },
};
```

`elements/shape/style.css`:

```css
.el-shape .shape { box-sizing: border-box; }
```

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด รวม `elements.test.js` 3 เทสต์

- [ ] **Step 7: Commit**

```bash
git add elements/text elements/image elements/shape test/elements.test.js
git commit -m "Add basic text, image and shape elements with a full-catalog render test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: คำสั่งจัดการ layer (ฟังก์ชันล้วน)

**Files:**
- Create: `templates/_runtime/editor/commands.js`
- Test: `test/commands.test.js`

**Interfaces:**
- Consumes: `CATALOG`
- Produces: `nextId(cfg, type) → string`, `addLayer(cfg, type) → id` (ใส่บนสุด), `duplicateLayer(cfg, id, duration) → newId` (วางเหนือชิ้นเดิม), `removeLayer(cfg, id)`, `moveLayer(cfg, id, delta) → boolean` (`+1` = ขึ้นไปทับ, `-1` = ลง), `toggleHidden(cfg, id)`, `renameLayer(cfg, id, name)` — ทุกฟังก์ชันแก้ `cfg.layers` ตรงๆ

- [ ] **Step 1: เขียนเทสต์ `test/commands.test.js`**

```js
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
  assert.equal(copy.end, 12.6);
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
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL จาก `Cannot find module '.../editor/commands.js'`

- [ ] **Step 3: เขียน `templates/_runtime/editor/commands.js`**

```js
// คำสั่งจัดการ layer ในงานที่กำลังแก้ (ฟังก์ชันล้วน แก้ cfg.layers ตรงๆ ทดสอบด้วย node ได้)
// ลำดับใน cfg.layers: ตัวแรกอยู่ล่างสุด ตัวท้ายอยู่บนสุด

import { CATALOG } from '../../../elements/catalog.js';

const round1 = (x) => Math.round(x * 10) / 10;
const indexOf = (cfg, id) => cfg.layers.findIndex((l) => l.id === id);
const find = (cfg, id) => cfg.layers.find((l) => l.id === id);

export function nextId(cfg, type) {
  let i = 1;
  while (cfg.layers.some((l) => l.id === `${type}-${i}`)) i++;
  return `${type}-${i}`;
}

/** เพิ่มชิ้นใหม่ไว้บนสุด (ไม่มีตำแหน่ง → stage วางกลางจอจนกว่าจะลากย้าย) */
export function addLayer(cfg, type) {
  const def = CATALOG[type];
  if (!def) throw new Error(`ไม่รู้จักชิ้น "${type}"`);
  const layer = {
    id: nextId(cfg, type),
    type,
    name: def.label,
    hidden: false,
    start: 0,
    end: null,
    enter: { type: 'none' },
    exit: { type: 'none' },
    ...structuredClone(def.defaults.timing || {}),
    props: structuredClone(def.defaults.props),
  };
  if (def.defaults.style) layer.style = structuredClone(def.defaults.style);
  cfg.layers.push(layer);
  return layer.id;
}

/** ทำสำเนาไว้เหนือชิ้นเดิม เลื่อนเข้าในจอ 40px ถ้าชิ้นเดิมมีช่วงเวลา ให้โผล่ต่อจากชิ้นเดิม */
export function duplicateLayer(cfg, id, duration) {
  const i = indexOf(cfg, id);
  const src = cfg.layers[i];
  const copy = structuredClone(src);
  copy.id = nextId(cfg, src.type);
  copy.name = `${src.name} (สำเนา)`;
  for (const side of ['left', 'right', 'top', 'bottom']) {
    if (typeof copy.style?.[side] === 'number') copy.style[side] += 40;
  }
  if (src.end != null) {
    const length = src.end - src.start;
    copy.start = round1((src.end + 0.3) % duration);
    copy.end = round1(copy.start + length);
  }
  cfg.layers.splice(i + 1, 0, copy);
  return copy.id;
}

export function removeLayer(cfg, id) {
  cfg.layers.splice(indexOf(cfg, id), 1);
}

/** เลื่อนลำดับการทับ: +1 = ขึ้นไปทับชิ้นถัดไป, -1 = ลง คืน false ถ้าเลื่อนไม่ได้ */
export function moveLayer(cfg, id, delta) {
  const i = indexOf(cfg, id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cfg.layers.length) return false;
  const [layer] = cfg.layers.splice(i, 1);
  cfg.layers.splice(j, 0, layer);
  return true;
}

export function toggleHidden(cfg, id) {
  const layer = find(cfg, id);
  layer.hidden = !layer.hidden;
}

export function renameLayer(cfg, id, name) {
  find(cfg, id).name = name;
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด รวม `commands.test.js` 5 เทสต์

- [ ] **Step 5: Commit**

```bash
git add templates/_runtime/editor/commands.js test/commands.test.js
git commit -m "Add pure layer commands for add, duplicate, remove, reorder, hide and rename

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Studio ใช้ระบบใหม่ทั้งหมด + preset + ลบเทมเพลตเดิม

ตั้งแต่ task นี้ทุกหน้าใช้ `stage.html` ส่วนหน้าแก้ไข (`mode=edit`) จะใช้ได้หลัง Task 10

**Files:**
- Create: `presets/blank.json`, `presets/sponsor-gaming.json`, `presets/sponsor-popup.json`, `presets/neon-frame.json`
- Modify: `src/config.js` (`loadConfig` = ตัวโหลด v2, ลบตัวโหลดเดิม)
- Modify: `src/studio.js` (preset, `createConfig`, `getConfig`, `onSave`, `listConfigs`, API)
- Modify: `src/cli.js` (`templates`, `new`, ลิงก์, ตัด `--intro`)
- Modify: `src/render.js:28` (เปิด `stage.html`)
- Modify: `studio/index.html`, `studio/studio.js`, `studio/studio.css`
- Modify: `test/config.test.js` (`loadProject` → `loadConfig`)
- Delete: `templates/sponsor-gaming/`, `templates/sponsor-popup/`, `templates/neon-frame/`, `templates/_runtime/runtime.js`
- Modify: `overlay.config.json`, `vertical.config.json`, `popup.config.json`, `neon.config.json` (ถูกแปลงเป็น v2)
- Test: `test/studio.test.js`

**Interfaces:**
- Consumes: `migrate`, `validateProject`, ตัวโหลด v2 จาก Task 4
- Produces: `loadConfig(configPath, overrides = {}, { backupDir } = {})` (ชื่อเดิม พฤติกรรม v2), `listPresets() → { name, description, resolution, layers }[]` (blank มาก่อน), `createConfig({ preset, from, name, vertical }, configDir = ROOT) → { name, file }`, `GET /__api/templates` คืน `listPresets()`, `POST /__api/new { preset | from, name, vertical }`, `GET /__api/configs` คืน `{ name, layers, resolution, duration, format, outputs }`

- [ ] **Step 1: เขียนเทสต์ `test/studio.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listPresets, createConfig } from '../src/studio.js';

const tmp = () => mkdtemp(path.join(os.tmpdir(), 'overlay-studio-'));
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));

test('listPresets: หน้าเปล่ามาก่อน ตามด้วยเทมเพลต 3 แบบ', async () => {
  const presets = await listPresets();
  assert.deepEqual(presets.map((p) => p.name), ['blank', 'neon-frame', 'sponsor-gaming', 'sponsor-popup']);
  assert.equal(presets[0].layers, 0);
  assert.ok(presets.every((p) => p.description));
});

test('createConfig: หน้าเปล่า = layers ว่าง ไม่มี description', async () => {
  const dir = await tmp();
  const { file } = await createConfig({ preset: 'blank', name: 'empty1' }, dir);
  const cfg = await read(file);
  assert.equal(cfg.version, 2);
  assert.deepEqual(cfg.layers, []);
  assert.equal('description' in cfg, false);
});

test('createConfig: จาก preset แนวตั้ง และทำสำเนาจากงานที่มี', async () => {
  const dir = await tmp();
  const { file } = await createConfig({ preset: 'sponsor-gaming', name: 'game', vertical: true }, dir);
  const cfg = await read(file);
  assert.deepEqual(cfg.resolution, [1080, 1920]);
  assert.equal(cfg.layers.length, 7);
  const copy = await createConfig({ from: 'game', name: 'game2' }, dir);
  assert.equal((await read(copy.file)).layers.length, 7);
  await assert.rejects(createConfig({ preset: 'blank', name: 'game' }, dir), /มีงานชื่อ "game" อยู่แล้ว/);
  await assert.rejects(createConfig({ preset: 'nope', name: 'x' }, dir), /ไม่พบเทมเพลต "nope"/);
});
```

- [ ] **Step 2: รันเทสต์ให้ล้มก่อน**

Run: `npm test`
Expected: FAIL จาก `listPresets` ไม่มีใน `src/studio.js`

- [ ] **Step 3: สร้าง preset จากเทมเพลตเดิม**

```bash
mkdir -p presets
node --input-type=module -e "
import { readFile, writeFile } from 'node:fs/promises';
import { migrate } from './src/migrate.js';
for (const t of ['sponsor-gaming', 'sponsor-popup', 'neon-frame']) {
  const v1 = JSON.parse(await readFile('test/fixtures/v1/' + t + '.default.json', 'utf8'));
  await writeFile('presets/' + t + '.json', JSON.stringify(migrate(v1), null, 2) + '\n');
}
console.log('ok');"
```

Expected: `ok` และมี 3 ไฟล์ใน `presets/` ที่ขึ้นต้นด้วย `"version": 2` ตามด้วย `"description"`

- [ ] **Step 4: เขียน `presets/blank.json`**

```json
{
  "version": 2,
  "description": "เริ่มจากจอว่าง แล้วกด ＋ เพิ่มชิ้น เลือกชิ้นส่วนจากคลังมาจัดวางเอง",
  "resolution": [1920, 1080],
  "fps": 30,
  "duration": 10,
  "format": ["prores", "webm"],
  "theme": { "primary": "#e3122c", "accent": "#ffd400", "panel": "#141418", "text": "#ffffff", "font": "Kanit" },
  "preview": { "background": "" },
  "layers": []
}
```

- [ ] **Step 5: แก้ `src/config.js` ให้ `loadConfig` เป็นตัวโหลด v2**

ใน `src/config.js`:
1. ลบค่าคงที่ `DEFAULTS` (แบบเดิมที่มี `template`/`intro`/`elements`) และลบฟังก์ชัน `loadConfig` เดิมทั้งฟังก์ชัน
2. เปลี่ยนชื่อ `loadProject` เป็น `loadConfig` (ทั้งบรรทัด `export async function` และคอมเมนต์เหนือฟังก์ชันคงไว้)
3. ลบ `access` ออกจาก import ถ้าไม่มีที่ใช้แล้ว (ยังใช้ใน `exists` จึงต้องคงไว้)

ใน `test/config.test.js` แทน `loadProject` ทุกจุดด้วย `loadConfig` (ทั้งบรรทัด import และการเรียก)

- [ ] **Step 6: แก้ `src/studio.js`**

(ก) แทนที่ import บรรทัด 6–9 ด้วย:

```js
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, ROOT } from './config.js';
import { validateProject } from './validate.js';
import { startServer, readJson, sendJson } from './server.js';
```

(ข) แก้คอมเมนต์หัวไฟล์บรรทัด 3 เป็น:

```js
// - หน้าเว็บเลือกงานด้วย ?c=<ชื่อ> และดูตัวอย่างของ preset ด้วย ?c=@<preset>
```

(ค) แทนที่ `listTemplates` และ `createConfig` ทั้งสองฟังก์ชัน (บรรทัด 15–49) ด้วย:

```js
const PRESETS = path.join(ROOT, 'presets');

/** รายชื่อ preset (หน้าเปล่า + เทมเพลต) หน้าเปล่ามาก่อนเสมอ */
export async function listPresets() {
  const out = [];
  for (const f of await readdir(PRESETS)) {
    if (!f.endsWith('.json')) continue;
    const cfg = JSON.parse(await readFile(path.join(PRESETS, f), 'utf8'));
    out.push({ name: f.slice(0, -5), description: cfg.description || '', resolution: cfg.resolution, layers: cfg.layers.length });
  }
  return out.sort((a, b) => (a.name === 'blank' ? -1 : b.name === 'blank' ? 1 : a.name.localeCompare(b.name)));
}

/** สร้างไฟล์งานใหม่จาก preset (หน้าเปล่า/เทมเพลต) หรือทำสำเนาจากงานที่มีอยู่ (from) */
export async function createConfig({ preset, from, name, vertical }, configDir = ROOT) {
  if (!NAME_RE.test(name || '')) throw new Error('ชื่องานใช้ได้แค่ ตัวอักษร ตัวเลข _ - (ไม่เกิน 60 ตัว)');
  const out = path.join(configDir, `${name}${SUFFIX}`);
  if (await exists(out)) throw new Error(`มีงานชื่อ "${name}" อยู่แล้ว`);
  let data;
  if (from) {
    if (!NAME_RE.test(from)) throw new Error('ชื่องานต้นฉบับไม่ถูกต้อง');
    const src = path.join(configDir, `${from}${SUFFIX}`);
    if (!(await exists(src))) throw new Error(`ไม่พบงาน "${from}"`);
    data = await loadConfig(src);
  } else {
    if (!/^[\w-]+$/.test(preset || '')) throw new Error('เทมเพลตไม่ถูกต้อง');
    data = JSON.parse(await readFile(path.join(PRESETS, `${preset}.json`), 'utf8').catch(() => {
      throw new Error(`ไม่พบเทมเพลต "${preset}"`);
    }));
  }
  delete data.description;
  delete data.name;
  if (vertical === true) data.resolution = [1080, 1920];
  if (vertical === false) data.resolution = [1920, 1080];
  await writeFile(out, JSON.stringify(data, null, 2) + '\n');
  return { name, file: out };
}
```

(ง) ใน `getConfig` แทนที่ก้อน `if (c.startsWith('@')) { ... }` ด้วย:

```js
    if (c.startsWith('@')) {
      const t = c.slice(1);
      if (!/^[\w-]+$/.test(t)) throw new Error('เทมเพลตไม่ถูกต้อง');
      return { name: c, ...(await loadConfig(path.join(PRESETS, `${t}.json`))) };
    }
```

(จ) ใน `onSave` เพิ่มการตรวจแบบ strict ก่อนเขียนไฟล์ ต่อจากบรรทัด `delete data.name;`:

```js
    const errors = validateProject(data, { strict: true });
    if (errors.length) throw new Error(`บันทึกไม่ได้:\n  - ${errors.join('\n  - ')}`);
```

(ฉ) ใน `listConfigs` แทน `template: cfg.template,` ด้วย:

```js
          layers: cfg.layers.length,
```

(ช) ใน `handle` แทน route templates ด้วย:

```js
      if (route === 'GET /__api/templates') return sendJson(res, 200, await listPresets()), true;
```

- [ ] **Step 7: แก้ `src/cli.js`**

(ก) บรรทัด import studio: `import { startStudio, listPresets } from './studio.js';`
(ข) ใน `HELP` แทน 3 บรรทัดของ `templates`/`new` และลบบรรทัด `--intro`:

```
  templates               ดูรายชื่อเทมเพลต (preset) ที่มี รวมหน้าเปล่า (blank)
  new <เทมเพลต> <ไฟล์>     สร้าง config ใหม่ เช่น new blank my.config.json หรือ new neon-frame my.config.json
                          (ใส่ --vertical เพื่อทำขนาดแนวตั้ง 1080x1920)
```

(ค) ใน `parse()` ลบ `intro: { type: 'boolean' },` และบรรทัด `if (values.intro) overrides.intro = true;`
(ง) แทนก้อน `if (cmd === 'templates') { ... }` ด้วย:

```js
  if (cmd === 'templates') {
    for (const t of await listPresets()) console.log(`  ${t.name.padEnd(18)} ${t.description}`);
    return;
  }
```

(จ) ในก้อน `if (cmd === 'new')` แทนบรรทัด `const src = ...` ด้วย:

```js
    const src = path.join(ROOT, 'presets', `${template}.json`);
```

(ฉ) ในก้อน `start/preview/edit` แทนบรรทัด `const page = ...` ด้วย:

```js
        const page = `${url}/templates/_runtime/stage.html?c=${encodeURIComponent(nameFromConfig)}`;
```

(ช) แก้ URL ใน `src/render.js` บรรทัด 28 จาก

```js
  await page.goto(`${url}/templates/${cfg.template}/index.html?mode=render`);
```

เป็น

```js
  await page.goto(`${url}/templates/_runtime/stage.html?mode=render`);
```

- [ ] **Step 8: แก้หน้าแรก `studio/index.html`**

แทนที่ก้อน `<div class="sec-head">` ของหัวข้อเทมเพลต:

```html
      <div class="sec-head">
        <h2>สร้างงานใหม่</h2>
        <span class="muted">เริ่มจากหน้าเปล่า หรือเลือกเทมเพลตที่มีชิ้นวางไว้ให้แล้ว (เพิ่ม/ลบชิ้นได้ทีหลัง)</span>
      </div>
```

และในก้อน "งานของฉัน" ข้อความ empty state ใน `studio.js` (ขั้นถัดไป) เปลี่ยนตามด้วย

- [ ] **Step 9: แก้ `studio/studio.js`**

(ก) แทนที่ `TEMPLATE_NAMES` และ `pageUrl` ด้วย:

```js
const PRESET_NAMES = {
  blank: 'หน้าเปล่า',
  'sponsor-gaming': 'ชุดโฆษณาคลิปเกม',
  'sponsor-popup': 'ป้ายสปอนเซอร์เด้งเข้ามุมจอ',
  'neon-frame': 'กรอบไฟนีออน',
};
const pageUrl = (c, mode) =>
  `/templates/_runtime/stage.html?c=${encodeURIComponent(c)}${mode ? `&mode=${mode}` : ''}`;
```

(ข) `thumb(parent, template, c, res)` → `thumb(parent, c, res)` และในฟังก์ชันใช้ `frame.src = \`${pageUrl(c)}&embed=1\`;`
(ค) ใน `renderConfigs`:
- ข้อความตอนไม่มีงาน: `'ยังไม่มีงาน เลือกหน้าเปล่าหรือเทมเพลตด้านล่างเพื่อเริ่มสร้าง'`
- `thumb(card, c.name, c.resolution);`
- แทน `el('span', 'tag', title, TEMPLATE_NAMES[c.template] || c.template);` ด้วย `el('span', 'tag', title, \`${c.layers} ชิ้น\`);`
- `linkBtn(row, '✏️ ปรับแต่ง', pageUrl(c.name, 'edit'), 'primary');` และ `linkBtn(row, '▶ ดูตัวอย่าง', pageUrl(c.name));`

(ง) แทน `renderTemplates` ทั้งฟังก์ชันด้วย:

```js
async function renderTemplates() {
  const presets = await api('/__api/templates');
  const box = $('#templates');
  box.replaceChildren();
  for (const t of presets) {
    const blank = t.name === 'blank';
    const card = el('div', 'card', box);
    if (blank) el('div', 'thumb blank', card, '⬜');
    else thumb(card, `@${t.name}`, t.resolution);
    const body = el('div', 'body', card);
    const title = el('div', 'title', body);
    el('b', '', title, PRESET_NAMES[t.name] || t.name);
    if (!blank) el('span', 'tag', title, `${t.layers} ชิ้น`);
    el('div', 'desc', body, t.description);

    const row1 = el('div', 'row', body);
    const name = el('input', '', row1);
    name.type = 'text';
    name.placeholder = 'ตั้งชื่องาน';
    name.value = suggestName(blank ? 'my' : t.name.split('-')[1] || t.name, new Set(configs.map((x) => x.name)));
    const orient = el('select', '', row1);
    for (const [v, label] of [['h', 'แนวนอน 1920×1080'], ['v', 'แนวตั้ง 1080×1920']]) {
      const o = el('option', '', orient, label);
      o.value = v;
    }
    orient.style.flex = '0 0 auto';

    const row2 = el('div', 'row', body);
    const create = el('button', 'btn primary', row2, blank ? '＋ สร้างหน้าเปล่า' : '＋ ใช้เทมเพลตนี้');
    if (!blank) linkBtn(row2, 'ลองปรับดูก่อน', pageUrl(`@${t.name}`, 'edit'));
    const status = el('div', 'status', body);

    create.addEventListener('click', async () => {
      create.disabled = true;
      try {
        const res = await api('/__api/new', { preset: t.name, name: name.value.trim(), vertical: orient.value === 'v' });
        location.href = pageUrl(res.name, 'edit');
      } catch (err) {
        status.className = 'status err';
        status.textContent = `✗ ${err.message}`;
        create.disabled = false;
      }
    });
  }
}
```

- [ ] **Step 10: เพิ่มสไตล์การ์ดหน้าเปล่าใน `studio/studio.css`**

ต่อจากกฎ `.thumb iframe { ... }`:

```css
.thumb.blank { font-size: 72px; color: rgba(255, 255, 255, .55); }
```

- [ ] **Step 11: ลบเทมเพลตเดิม**

```bash
git rm -r templates/sponsor-gaming templates/sponsor-popup templates/neon-frame templates/_runtime/runtime.js
```

(`templates/_runtime/editor.js` ยังอยู่ จะถูกลบใน Task 10)

- [ ] **Step 12: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: PASS ทั้งหมด รวม `studio.test.js` 3 เทสต์ และ `config.test.js` ที่เปลี่ยนชื่อเป็น `loadConfig`

- [ ] **Step 13: แปลง config ตัวอย่างใน repo และตรวจด้วยตา**

เริ่มเซิร์ฟเวอร์ใหม่ (หยุดตัวเดิมที่รันค้างอยู่ก่อน) แล้วเปิดหน้าแรก:

```bash
npm start
```

เปิด http://127.0.0.1:5173 ใน Browser pane แล้วตรวจ:
- คอนโซลเซิร์ฟเวอร์ขึ้น `แปลงงาน overlay.config.json เป็นรูปแบบใหม่แล้ว ...` ครบ 4 ไฟล์ และมีโฟลเดอร์ `backup/` ที่มี 4 ไฟล์ `.v1.json`
- การ์ดงานทั้ง 4 แสดงภาพตัวอย่างที่ขยับได้ และป้าย "7 ชิ้น" / "4 ชิ้น"
- การ์ด "หน้าเปล่า" อยู่ใบแรกของหัวข้อ "สร้างงานใหม่"
- กด "▶ ดูตัวอย่าง" ของงาน `popup` แล้วการ์ดเด้งเข้า/ออกเหมือนเดิม
- กด "🎬 เรนเดอร์" ของงาน `neon` แล้วได้ไฟล์ใน `output/`

- [ ] **Step 14: Commit**

```bash
git add -A presets src studio test overlay.config.json vertical.config.json popup.config.json neon.config.json templates
git commit -m "Switch Studio, CLI and renderer to layer projects with presets; remove old templates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: หน้าแก้ไขแบบใหม่ (คลังชิ้นส่วน + Layers + แผงคุณสมบัติ)

**Files:**
- Create: `templates/_runtime/editor/index.js`, `library.js`, `layers.js`, `inspector.js`
- Modify: `templates/_runtime/base.css` (สไตล์ Layers, inspector, หน้าต่างคลัง, ข้อความหน้าว่าง)
- Delete: `templates/_runtime/editor.js`

**Interfaces:**
- Consumes: `startEditor({ stage, ctx, mount, renderFrame })` ถูกเรียกจาก `stage.js` (Task 5), `commands.*` (Task 8), `CATALOG`/`CATEGORIES`, `ENTER_TYPES`/`EXIT_TYPES`/`DIRECTIONS`, `setPreviewBackground`/`saveUrl`/`modeUrl`/`configName` จาก `stage.js`
- Produces (store ที่ส่งให้แผงต่างๆ): `{ working, ctx, coords, selected (getter), layer(id), nodeOf(id), select(id|null), act(fn) → Promise<ผลของ fn>, onEdit(apply) → (event) => void, refresh(), refreshLayers(), commitPosition(id, node, keepWidth), beginMove(node) }`
- Produces: `openLibrary(onPick(type))`, `renderLayers(box, store)`, `renderInspector(box, store)`, `field(parent, label, block = false) → rowElement`

- [ ] **Step 1: เขียน `templates/_runtime/editor/library.js`**

```js
// หน้าต่างคลังชิ้นส่วน: แบ่งหมวด กดการ์ดแล้วเรียก onPick(type) และปิดหน้าต่าง
// ปิดได้ด้วย Esc, ปุ่ม ✕ หรือคลิกนอกหน้าต่าง

import { el } from '../dom.js';
import { CATALOG, CATEGORIES } from '../../../elements/catalog.js';

export function openLibrary(onPick) {
  const back = el('div', 'ed-modal-back', document.body);
  const box = el('div', 'ed-modal', back);
  const head = el('div', 'ed-modal-head', box);
  el('b', '', head, 'เพิ่มชิ้นส่วน');
  const closeBtn = el('button', 'ed-icon', head, '✕');

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  function close() {
    back.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', close);
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });

  for (const [category, title] of CATEGORIES) {
    const types = Object.entries(CATALOG).filter(([, def]) => def.category === category);
    if (!types.length) continue;
    el('h4', '', box, title);
    const grid = el('div', 'ed-lib-grid', box);
    for (const [type, def] of types) {
      const card = el('button', 'ed-lib-card', grid);
      el('span', 'ed-lib-icon', card, def.icon);
      el('span', '', card, def.label);
      card.addEventListener('click', () => {
        close();
        onPick(type);
      });
    }
  }
}
```

- [ ] **Step 2: เขียน `templates/_runtime/editor/layers.js`**

```js
// รายการ Layers: ชิ้นบนสุดอยู่บนสุด (กลับด้านจากลำดับใน config)
// 👁 ซ่อน/แสดง • คลิกเพื่อเลือก • ดับเบิลคลิกชื่อเพื่อเปลี่ยนชื่อ • ↑↓ เลื่อนลำดับการทับ • ⧉ ทำสำเนา • 🗑 ลบ

import { el } from '../dom.js';
import { CATALOG } from '../../../elements/catalog.js';
import * as commands from './commands.js';

function iconButton(parent, text, title, onClick) {
  const b = el('button', 'ed-icon', parent, text);
  b.title = title;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** เปลี่ยนชื่อในแถว: Enter/คลิกที่อื่น = บันทึก, Esc = ยกเลิก */
function rename(span, layer, store) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = layer.name || '';
  span.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (commit && v && v !== layer.name) store.act((cfg) => commands.renameLayer(cfg, layer.id, v));
    else store.refreshLayers();
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
}

export function renderLayers(box, store) {
  box.replaceChildren();
  const { layers } = store.working;
  if (!layers.length) {
    el('p', 'ed-hint', box, 'ยังไม่มีชิ้นส่วน — กด ＋ เพิ่มชิ้น เพื่อเริ่ม');
    return;
  }
  const top = layers.length - 1;
  [...layers].reverse().forEach((layer, i) => {
    const index = top - i;
    const active = layer.id === store.selected;
    const row = el('div', `ed-item${active ? ' active' : ''}${layer.hidden ? ' hidden' : ''}`, box);
    row.addEventListener('click', () => store.select(layer.id));

    iconButton(row, layer.hidden ? '🚫' : '👁', layer.hidden ? 'แสดง' : 'ซ่อน', () =>
      store.act((cfg) => commands.toggleHidden(cfg, layer.id)));
    el('span', 'ed-type', row, CATALOG[layer.type]?.icon ?? '⚠');
    const name = el('span', 'ed-name', row, layer.name || layer.id);
    name.title = 'ดับเบิลคลิกเพื่อเปลี่ยนชื่อ';
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      rename(name, layer, store);
    });

    iconButton(row, '↑', 'เลื่อนขึ้น (ทับชิ้นอื่น)', () => store.act((cfg) => commands.moveLayer(cfg, layer.id, 1)))
      .disabled = index === top;
    iconButton(row, '↓', 'เลื่อนลง', () => store.act((cfg) => commands.moveLayer(cfg, layer.id, -1)))
      .disabled = index === 0;

    if (active) {
      iconButton(row, '⧉', 'ทำสำเนา', async () => {
        const id = await store.act((cfg) => commands.duplicateLayer(cfg, layer.id, store.ctx.duration));
        store.select(id);
      });
      iconButton(row, '🗑', 'ลบ', async () => {
        if (!confirm(`ลบ "${layer.name || layer.id}" ?`)) return;
        await store.act((cfg) => commands.removeLayer(cfg, layer.id));
        store.select(null);
      });
    }
  });
}
```

- [ ] **Step 3: เขียน `templates/_runtime/editor/inspector.js`**

```js
// แผงคุณสมบัติของชิ้นที่เลือก:
// ชื่อ • ตำแหน่ง/ขนาด • เวลาเริ่ม/จบ • ท่าเข้า/ออก • สีของชิ้นนี้ • ค่าของชิ้นตาม fields ใน catalog

import { el } from '../dom.js';
import { CATALOG } from '../../../elements/catalog.js';
import { ENTER_TYPES, EXIT_TYPES, DIRECTIONS } from '../timing.js';

const MOTION_LABELS = { none: 'ไม่มี', fade: 'จางเข้า/ออก', slide: 'เลื่อน', pop: 'เด้ง' };
const DIR_LABELS = { auto: 'อัตโนมัติ (ขอบที่ใกล้สุด)', left: 'จากซ้าย', right: 'จากขวา', top: 'จากบน', bottom: 'จากล่าง' };
const COLOR_KEYS = { primary: 'สีหลัก', accent: 'สีเน้น', panel: 'สีพื้นกล่อง', text: 'สีตัวอักษร' };
const POSITION_KEYS = ['left', 'right', 'top', 'bottom', 'width', 'transform-origin', 'transformOrigin'];

/** ป้ายชื่อ + แถวสำหรับวางช่องกรอก (block = ใช้ div แทน label สำหรับรายการหลายช่อง) */
export function field(parent, label, block = false) {
  const wrap = el(block ? 'div' : 'label', 'ed-field', parent);
  el('span', 'ed-label', wrap, label);
  return el('div', 'ed-row', wrap);
}

function selectBox(parent, options, value, labels = {}) {
  const s = el('select', '', parent);
  for (const o of options) {
    const opt = el('option', '', s, labels[o] ?? o);
    opt.value = o;
  }
  s.value = value;
  return s;
}

function numberBox(parent, value, attrs = {}) {
  const inp = el('input', '', parent);
  Object.assign(inp, { type: 'number', step: 'any', value: value ?? '', ...attrs });
  return inp;
}

function textBox(parent, value, placeholder = '') {
  const inp = el('input', '', parent);
  Object.assign(inp, { type: 'text', value: value ?? '', placeholder });
  return inp;
}

function button(parent, text, onClick) {
  const b = el('button', '', parent, text);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });
  return b;
}

export function renderInspector(box, store) {
  box.replaceChildren();
  const layer = store.selected && store.layer(store.selected);
  if (!layer) {
    el('p', 'ed-hint', box, 'คลิกชิ้นส่วนบนจอหรือในรายการ Layers เพื่อแก้ไข');
    return;
  }
  const def = CATALOG[layer.type];
  if (!def) {
    el('p', 'ed-warn', box, `ไม่รู้จักชิ้น "${layer.type}" ลบออกได้จากรายการ Layers`);
    return;
  }

  const nameIn = textBox(field(box, 'ชื่อ'), layer.name);
  nameIn.addEventListener('input', store.onEdit((n) => (layer.name = n.value)));

  if (def.fullscreen) el('p', 'ed-hint', box, 'ชิ้นนี้เต็มจอ ปรับได้จากค่าด้านล่าง');
  else positionSection(box, store, layer);

  timeSection(box, store, layer);
  motionSection(box, store, layer, 'enter', 'ท่าเข้า', def.fullscreen ? ['none', 'fade'] : ENTER_TYPES);
  motionSection(box, store, layer, 'exit', 'ท่าออก', def.fullscreen ? ['none', 'fade'] : EXIT_TYPES);
  colorSection(box, store, layer);

  el('div', 'ed-group', box, 'ค่าของชิ้น');
  layer.props ||= {};
  for (const [k, f] of Object.entries(def.fields)) propField(box, store, layer.props, k, f);
}

function positionSection(box, store, layer) {
  const node = store.nodeOf(layer.id);
  box.appendChild(store.coords);
  store.coords.textContent = node ? `x ${node.offsetLeft}  y ${node.offsetTop}` : '(ซ่อนอยู่)';

  const row = field(box, 'ขนาด');
  const sc = el('input', '', row);
  Object.assign(sc, { type: 'range', min: 0.4, max: 2.5, step: 0.05, value: Number(layer.style?.scale ?? 1) });
  const label = el('span', 'ed-num', row, `${Number(sc.value).toFixed(2)}×`);
  sc.addEventListener('pointerdown', () => store.snapshot());
  sc.addEventListener('input', () => {
    const v = Number(sc.value);
    label.textContent = `${v.toFixed(2)}×`;
    layer.style = { ...(layer.style || {}) };
    if (Math.abs(v - 1) < 0.001) delete layer.style.scale;
    else layer.style.scale = String(v);
    const n = store.nodeOf(layer.id);
    if (!layer.style['transform-origin'] && n) {
      const W = store.ctx.width;
      const H = store.ctx.height;
      const right = n.offsetLeft + n.offsetWidth / 2 > W / 2;
      const bottom = n.offsetTop + n.offsetHeight / 2 > H / 2;
      layer.style['transform-origin'] = `${right ? 'right' : 'left'} ${bottom ? 'bottom' : 'top'}`;
    }
    if (n) {
      n.style.scale = layer.style.scale || '';
      n.style.transformOrigin = layer.style['transform-origin'];
    }
    store.markDirty();
  });

  button(el('div', 'ed-row', box), 'คืนตำแหน่ง/ขนาดเริ่มต้น', () =>
    store.act(() => {
      if (!layer.style) return;
      for (const k of [...POSITION_KEYS, 'scale']) delete layer.style[k];
      if (!Object.keys(layer.style).length) delete layer.style;
    }));
}

function timeSection(box, store, layer) {
  el('div', 'ed-group', box, 'เวลา');
  const D = store.ctx.duration;
  const row = field(box, 'เริ่ม / จบ (วินาที)');
  const startIn = numberBox(row, layer.start ?? 0, { min: 0 });
  startIn.classList.add('ed-small');
  startIn.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (n.value === '' || !(v >= 0 && v < D)) return false;
    layer.start = v;
  }));
  const endIn = numberBox(row, layer.end ?? D, { min: 0 });
  endIn.classList.add('ed-small');
  endIn.disabled = layer.end == null;
  endIn.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (n.value === '' || !(v > (layer.start ?? 0))) return false;
    layer.end = v;
  }));

  const untilRow = el('label', 'ed-row ed-check', box);
  const until = el('input', '', untilRow);
  until.type = 'checkbox';
  until.checked = layer.end == null;
  el('span', '', untilRow, 'แสดงจนจบคลิป');
  until.addEventListener('change', store.onEdit((n) => {
    if (n.checked) layer.end = null;
    else {
      const v = Number(endIn.value);
      layer.end = v > (layer.start ?? 0) ? v : (layer.start ?? 0) + 5;
      endIn.value = String(layer.end);
    }
    endIn.disabled = n.checked;
  }));
}

function motionSection(box, store, layer, key, label, types) {
  const m = layer[key] ?? { type: 'none' };
  const row = field(box, label);
  const typeSel = selectBox(row, types, types.includes(m.type) ? m.type : 'none', MOTION_LABELS);
  const onType = store.onEdit((n) => {
    layer[key] = n.value === 'none' ? { type: 'none' } : { ...(layer[key] ?? {}), type: n.value, duration: layer[key]?.duration ?? 0.6 };
  });
  typeSel.addEventListener('change', (e) => {
    onType(e);
    store.refresh();
  });
  if (m.type === 'none') return;

  // ท่า slide ที่กำหนด offset ไว้ (มาจาก intro เดิม) ไม่มีทิศให้เลือก
  if ((m.type === 'slide' || m.type === 'pop') && !m.offset) {
    const dir = selectBox(row, DIRECTIONS, m.from ?? (key === 'exit' ? layer.enter?.from : null) ?? 'auto', DIR_LABELS);
    dir.addEventListener('change', store.onEdit((n) => (layer[key].from = n.value)));
  }
  const dur = numberBox(row, m.duration ?? 0.6, { min: 0.1, step: 0.1 });
  dur.classList.add('ed-small');
  dur.title = 'ความยาว (วินาที)';
  dur.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (!(v > 0)) return false;
    layer[key].duration = v;
  }));
}

function colorSection(box, store, layer) {
  el('div', 'ed-group', box, 'สีของชิ้นนี้');
  const theme = store.working.theme;
  for (const [k, label] of Object.entries(COLOR_KEYS)) {
    const own = layer.theme?.[k];
    const row = field(box, own ? label : `${label} (ใช้สีธีม)`);
    const inp = el('input', '', row);
    Object.assign(inp, { type: 'color', value: own ?? theme[k] ?? '#ffffff' });
    inp.addEventListener('input', store.onEdit((n) => (layer.theme = { ...(layer.theme ?? {}), [k]: n.value })));
    if (own) {
      button(row, '↺ ใช้สีธีม', () =>
        store.act(() => {
          delete layer.theme[k];
          if (!Object.keys(layer.theme).length) delete layer.theme;
        }));
    }
  }
  const fontIn = textBox(field(box, layer.theme?.font ? 'ฟอนต์' : 'ฟอนต์ (ใช้ฟอนต์ธีม)'), layer.theme?.font, theme.font || 'Kanit');
  fontIn.addEventListener('input', store.onEdit((n) => {
    const v = n.value.trim();
    if (v) layer.theme = { ...(layer.theme ?? {}), font: v };
    else if (layer.theme) {
      delete layer.theme.font;
      if (!Object.keys(layer.theme).length) delete layer.theme;
    }
  }));
}

function propField(box, store, props, k, f) {
  const block = f.type === 'list' || f.type === 'messages';
  const row = field(box, f.label, block);
  const v = props[k];
  switch (f.type) {
    case 'boolean': {
      const cb = el('input', '', row);
      cb.type = 'checkbox';
      cb.checked = !!v;
      cb.addEventListener('change', store.onEdit((n) => (props[k] = n.checked)));
      return;
    }
    case 'number': {
      const inp = numberBox(row, v);
      inp.addEventListener('input', store.onEdit((n) => {
        if (n.value === '' || Number.isNaN(Number(n.value))) return false;
        props[k] = Number(n.value);
      }));
      return;
    }
    case 'color': {
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'color', value: v || store.working.theme.text || '#ffffff' });
      inp.addEventListener('input', store.onEdit((n) => (props[k] = n.value)));
      if (v) button(row, '↺ ค่าเริ่มต้น', () => store.act(() => (props[k] = '')));
      else el('span', 'ed-hint', row, 'ค่าเริ่มต้น');
      return;
    }
    case 'select': {
      const sel = selectBox(row, f.choices, v ?? f.choices[0]);
      sel.addEventListener('change', store.onEdit((n) => (props[k] = n.value)));
      return;
    }
    case 'size': {
      const pair = Array.isArray(v) ? v : [0, 0];
      pair.forEach((num, i) => {
        const inp = numberBox(row, num);
        inp.classList.add('ed-small');
        inp.addEventListener('input', store.onEdit((n) => {
          if (n.value === '') return false;
          props[k] = (Array.isArray(props[k]) ? props[k] : [0, 0]).map((x, j) => (j === i ? Number(n.value) : x));
        }));
      });
      return;
    }
    case 'list':
      return listField(row, store, props, k);
    case 'messages':
      return messagesField(row, store, props, k);
    default: {
      // text / image (งาน 3 จะเพิ่มปุ่มเลือกไฟล์ให้ช่อง image)
      const inp = textBox(row, v, f.type === 'image' ? 'assets/logo.png' : '');
      inp.addEventListener('input', store.onEdit((n) => (props[k] = n.value)));
    }
  }
}

/** รายการข้อความ: แก้ทีละแถว ✕ ลบแถว ＋ เพิ่มบรรทัด */
function listField(row, store, props, k) {
  row.classList.add('ed-col');
  const items = Array.isArray(props[k]) ? props[k] : [];
  items.forEach((text, i) => {
    const r = el('div', 'ed-row', row);
    const inp = textBox(r, text);
    inp.addEventListener('input', store.onEdit((n) => (props[k] = props[k].map((x, j) => (j === i ? n.value : x)))));
    button(r, '✕', () => store.act(() => (props[k] = props[k].filter((_, j) => j !== i)))).classList.add('ed-icon');
  });
  button(row, '＋ เพิ่มบรรทัด', () => store.act(() => (props[k] = [...items, 'ข้อความใหม่'])));
}

/** รายการ { หัวข้อ, ข้อความ } สองช่องต่อแถว */
function messagesField(row, store, props, k) {
  row.classList.add('ed-col');
  const items = (Array.isArray(props[k]) ? props[k] : []).map((m) => (typeof m === 'string' ? { text: m } : m));
  const update = (i, patch) => (props[k] = items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  items.forEach((m, i) => {
    const r = el('div', 'ed-row', row);
    const title = textBox(r, m.title, 'หัวข้อ');
    title.classList.add('ed-small');
    title.addEventListener('input', store.onEdit((n) => update(i, { title: n.value })));
    const text = textBox(r, m.text, 'ข้อความ');
    text.addEventListener('input', store.onEdit((n) => update(i, { text: n.value })));
    button(r, '✕', () => store.act(() => (props[k] = items.filter((_, j) => j !== i)))).classList.add('ed-icon');
  });
  button(row, '＋ เพิ่มข้อความ', () => store.act(() => (props[k] = [...items, { title: '', text: 'ข้อความใหม่' }])));
}
```

- [ ] **Step 4: เขียน `templates/_runtime/editor/index.js`**

```js
// หน้าแก้ไข (mode=edit)
// - สถานะงานที่กำลังแก้ ประวัติย้อนกลับ บันทึก (POST /__save) และเรนเดอร์
// - ลากชิ้นบนจอเพื่อย้าย / ปุ่มลูกศรขยับทีละ 1px (Shift = 10px) / คลิกที่ว่าง = ยกเลิกการเลือก
// - แผงคลังชิ้นส่วน / Layers / คุณสมบัติ แยกไฟล์ไว้ (งาน 2 จะย้ายไปวางในแผงใหม่)

import { el, applyStyle } from '../dom.js';
import { setPreviewBackground, saveUrl, modeUrl, configName } from '../stage.js';
import { CATALOG } from '../../../elements/catalog.js';
import * as commands from './commands.js';
import { openLibrary } from './library.js';
import { renderLayers } from './layers.js';
import { renderInspector, field } from './inspector.js';

const THEME_LABELS = { primary: 'สีหลัก', accent: 'สีเน้น', panel: 'สีพื้นกล่อง', text: 'สีตัวอักษร', font: 'ฟอนต์' };
const THEME_DEFAULTS = { primary: '#e3122c', accent: '#ffd400', panel: '#141418', text: '#ffffff', font: 'Kanit' };
const POSITION_KEYS = ['left', 'right', 'top', 'bottom', 'width', 'transform-origin', 'transformOrigin'];

export async function startEditor({ stage, ctx, mount, renderFrame }) {
  const W = ctx.width;
  const H = ctx.height;
  const D = ctx.duration;

  // สำเนาที่กำลังแก้ (ไม่รวม name ที่เซิร์ฟเวอร์ใส่มาให้)
  const working = structuredClone(ctx.config);
  const configNameFallback = working.name;
  delete working.name;
  working.layers ||= [];
  working.theme ||= {};
  working.preview ||= {};

  let selected = null;
  let t = Math.min(1, D / 2); // เริ่มที่ 1 วินาที ทุกชิ้นโผล่ครบแล้ว
  let playing = false;
  let dirty = false;
  const history = [];

  // ---------- โครงหน้าจอ ----------
  const viewport = document.getElementById('viewport');
  const wrap = document.getElementById('preview-wrap');
  const emptyHint = el('div', 'ed-empty', wrap, 'ยังไม่มีชิ้นส่วน — กด ＋ เพิ่มชิ้น เพื่อเริ่ม');
  const panel = el('aside', '', document.body);
  panel.id = 'editor-panel';

  const head = el('div', 'ed-head', panel);
  el('div', 'ed-title', head, `ปรับแต่ง: ${configName || configNameFallback || 'config'}`);
  const status = el('div', 'ed-status', head, 'บันทึกแล้ว');
  const headBtns = el('div', 'ed-row', head);
  const undoBtn = el('button', '', headBtns, '↶ ย้อนกลับ');
  const saveBtn = el('button', 'primary', headBtns, '💾 บันทึก');
  const navBtns = el('div', 'ed-row ed-nav', head);
  const homeLink = el('a', 'ed-link', navBtns, '🏠 หน้าแรก');
  homeLink.href = '/studio/index.html';
  const previewLink = el('a', 'ed-link', navBtns, '▶ ดูตัวอย่าง');
  previewLink.href = modeUrl('preview');
  const renderBtn = el('button', '', navBtns, '🎬 เรนเดอร์');
  const isTemplateDemo = configName?.startsWith('@');
  if (isTemplateDemo) {
    renderBtn.disabled = true;
    saveBtn.disabled = true;
    el('div', 'ed-warn', head, 'นี่คือตัวอย่างของเทมเพลต ลองปรับดูได้ แต่ต้องกลับไปกด "ใช้เทมเพลตนี้" ที่หน้าแรกก่อนถึงจะบันทึกได้');
  }

  const timeSec = section('เวลา (ดูท่าทางแอนิเมชัน)');
  const timeRow = el('div', 'ed-row', timeSec);
  const playBtn = el('button', '', timeRow, '▶');
  const scrub = el('input', '', timeRow);
  Object.assign(scrub, { type: 'range', min: 0, max: D, step: 0.01, value: t });
  renderFrame(t);

  const showRow = el('label', 'ed-row ed-check', timeSec);
  const showAll = el('input', '', showRow);
  showAll.type = 'checkbox';
  showAll.checked = !!ctx.showAll;
  el('span', '', showRow, 'แสดงทุกชิ้นค้างไว้ (ปิดเพื่อดูจังหวะโผล่จริง)');
  showAll.addEventListener('change', () => {
    ctx.showAll = showAll.checked;
    renderFrame(t);
  });

  const layersSec = section('Layers');
  const layersHead = layersSec.querySelector('h3');
  layersHead.classList.add('ed-sec-head');
  const addBtn = el('button', 'primary', layersHead, '＋ เพิ่มชิ้น');
  const layersBox = el('div', 'ed-list', layersSec);

  const propSec = section('ชิ้นที่เลือก');
  const props = el('div', '', propSec);

  const themeSec = section('ธีมของโปรเจกต์');
  const generalSec = section('ทั่วไป');

  el('p', 'ed-hint', panel,
    'ลากชิ้นส่วนบนจอเพื่อย้าย • ลูกศรขยับ 1px (Shift = 10px) • Ctrl+S บันทึก • Ctrl+Z ย้อนกลับ\n' +
    'ตำแหน่งจะยึดกับขอบจอที่ใกล้ที่สุด');

  async function api(url, body) {
    const res = await fetch(url, body ? {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    } : { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function section(title) {
    const s = el('section', 'ed-sec', panel);
    el('h3', '', s, title);
    return s;
  }

  // ---------- ย่อ/ขยายจอให้พอดี ----------
  let scale = 1;
  const fit = () => {
    const availW = window.innerWidth - panel.offsetWidth - 48;
    const availH = window.innerHeight - 32;
    scale = Math.min(availW / W, availH / H);
    viewport.style.transform = `scale(${scale})`;
    wrap.style.width = `${W * scale}px`;
    wrap.style.height = `${H * scale}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  setPreviewBackground(working.preview.background);

  // ---------- สถานะ / ประวัติ ----------
  function markDirty() {
    dirty = true;
    status.textContent = '● ยังไม่ได้บันทึก';
    status.classList.add('dirty');
  }
  function snapshot() {
    history.push(JSON.stringify(working));
    if (history.length > 100) history.shift();
  }
  async function undo() {
    const prev = history.pop();
    if (!prev) return;
    const data = JSON.parse(prev);
    for (const k of Object.keys(working)) delete working[k];
    Object.assign(working, data);
    if (selected && !working.layers.some((l) => l.id === selected)) selected = null;
    markDirty();
    setPreviewBackground(working.preview?.background);
    await rebuild();
    renderPanel();
  }

  async function rebuild() {
    await mount(structuredClone(working));
    renderFrame(t);
    markSelected();
    emptyHint.hidden = working.layers.length > 0;
  }

  let rebuildTimer = null;
  function rebuildSoon() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 250);
  }

  async function save() {
    saveBtn.disabled = true;
    try {
      const res = await fetch(saveUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(working),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      dirty = false;
      status.textContent = '✓ บันทึกแล้ว';
      status.classList.remove('dirty');
    } catch (err) {
      status.textContent = `✗ บันทึกไม่ได้: ${err.message}`;
      status.classList.add('dirty');
    } finally {
      saveBtn.disabled = isTemplateDemo;
    }
  }

  saveBtn.addEventListener('click', save);

  // เรนเดอร์จากหน้าปรับแต่ง: บันทึกก่อน แล้วสั่งเซิร์ฟเวอร์เรนเดอร์ พร้อมแสดงความคืบหน้า
  renderBtn.addEventListener('click', async () => {
    if (dirty) await save();
    if (dirty) return;
    renderBtn.disabled = true;
    try {
      let job = await api('/__api/render', { name: configName || configNameFallback });
      while (job.status === 'running') {
        status.textContent = job.phase === 'encode'
          ? `🎬 กำลังเข้ารหัส ${job.format} ...`
          : `🎬 เรนเดอร์ ${job.done}/${job.total || '?'} เฟรม`;
        await new Promise((r) => setTimeout(r, 700));
        job = await api(`/__api/jobs/${job.id}`);
      }
      if (job.status === 'error') throw new Error(job.error);
      status.textContent = `✓ เรนเดอร์เสร็จ: ${job.outputs.join(', ')}`;
      status.classList.remove('dirty');
    } catch (err) {
      status.textContent = `✗ เรนเดอร์ไม่ได้: ${err.message}`;
      status.classList.add('dirty');
    } finally {
      renderBtn.disabled = false;
    }
  });
  undoBtn.addEventListener('click', undo);
  window.addEventListener('beforeunload', (e) => {
    if (dirty) e.preventDefault();
  });

  // ---------- เวลา ----------
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
  });
  scrub.addEventListener('input', () => {
    t = Number(scrub.value);
    renderFrame(t);
  });
  let last = performance.now();
  const loop = (now) => {
    if (playing) {
      t = (t + (now - last) / 1000) % D;
      scrub.value = String(t);
      renderFrame(t);
    }
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ---------- เลือก / ลาก ----------
  const nodeOf = (id) => stage.querySelector(`.layer[data-id="${CSS.escape(id)}"]`);
  const layerOf = (id) => working.layers.find((l) => l.id === id);
  const isFixed = (id) => !!CATALOG[layerOf(id)?.type]?.fullscreen;

  function markSelected() {
    for (const n of stage.querySelectorAll('.ed-selected')) n.classList.remove('ed-selected');
    const node = selected && nodeOf(selected);
    if (node) node.classList.add('ed-selected');
  }

  function select(id) {
    selected = id;
    markSelected();
    renderPanel();
  }

  /** แปลงตำแหน่งปัจจุบันของ node เป็น style ที่ยึดขอบจอที่ใกล้ที่สุด แล้วเก็บลง config */
  function commitPosition(id, node, keepWidth) {
    const x = node.offsetLeft;
    const y = node.offsetTop;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const useRight = x + w / 2 > W / 2;
    const useBottom = y + h / 2 > H / 2;
    const layer = layerOf(id);
    const style = { ...(layer.style || {}) };
    for (const k of POSITION_KEYS) delete style[k];
    if (useRight) Object.assign(style, { left: 'auto', right: Math.round(W - x - w) });
    else Object.assign(style, { left: Math.round(x), right: 'auto' });
    if (useBottom) Object.assign(style, { top: 'auto', bottom: Math.round(H - y - h) });
    else Object.assign(style, { top: Math.round(y), bottom: 'auto' });
    if (keepWidth) style.width = Math.round(w);
    style['transform-origin'] = `${useRight ? 'right' : 'left'} ${useBottom ? 'bottom' : 'top'}`;
    layer.style = style;
    applyStyle(node, style);
    markDirty();
    renderPanel();
  }

  /** เริ่มย้าย: ตรึงตำแหน่งเป็น left/top ก่อน (ถ้าชิ้นนั้นยืดตามจอ ให้ตรึงความกว้างไว้ด้วย) */
  function beginMove(node) {
    const w0 = node.offsetWidth;
    const start = { x: node.offsetLeft, y: node.offsetTop };
    Object.assign(node.style, {
      left: `${start.x}px`, top: `${start.y}px`, right: 'auto', bottom: 'auto',
    });
    const keepWidth = !!node.style.width || node.offsetWidth !== w0;
    if (keepWidth) node.style.width = `${w0}px`;
    return { start, keepWidth };
  }

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const node = e.target.closest('.layer');
    if (!node) {
      if (selected) select(null);
      return;
    }
    e.preventDefault();
    const id = node.dataset.id;
    if (selected !== id) select(id);
    if (isFixed(id)) return;
    snapshot();
    const { start, keepWidth } = beginMove(node);
    drag = { id, node, start, keepWidth, px: e.clientX, py: e.clientY, moved: false };
    node.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.px) / scale;
    const dy = (e.clientY - drag.py) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
    const x = Math.round(Math.min(W - 20, Math.max(20 - drag.node.offsetWidth, drag.start.x + dx)));
    const y = Math.round(Math.min(H - 20, Math.max(20 - drag.node.offsetHeight, drag.start.y + dy)));
    drag.node.style.left = `${x}px`;
    drag.node.style.top = `${y}px`;
    coords.textContent = `x ${x}  y ${y}`;
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) commitPosition(drag.id, drag.node, drag.keepWidth);
    else history.pop();
    drag = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!isTemplateDemo) save();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      undo();
      return;
    }
    if (typing || !selected || isFixed(selected)) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const node = nodeOf(selected);
    if (!node) return;
    snapshot();
    const { start, keepWidth } = beginMove(node);
    node.style.left = `${start.x + d[0]}px`;
    node.style.top = `${start.y + d[1]}px`;
    commitPosition(selected, node, keepWidth);
  });

  // ---------- store ที่แผงต่างๆ ใช้ ----------
  const coords = el('div', 'ed-coords');

  /** handler สำหรับช่องกรอก: snapshot ครั้งแรกที่แก้ช่องนี้ แล้ว rebuild แบบหน่วงเวลา */
  function onEdit(apply) {
    let snapped = false;
    return (e) => {
      if (!snapped) {
        snapshot();
        snapped = true;
      }
      if (apply(e.target) === false) return;
      markDirty();
      rebuildSoon();
      renderLayers(layersBox, store); // ชื่อในรายการอาจเปลี่ยน
    };
  }

  const store = {
    working,
    ctx,
    coords,
    get selected() {
      return selected;
    },
    layer: layerOf,
    nodeOf,
    select,
    snapshot,
    markDirty,
    onEdit,
    commitPosition,
    beginMove,
    refresh: () => renderPanel(),
    refreshLayers: () => renderLayers(layersBox, store),
    /** แก้ไขแบบมีประวัติ: snapshot → fn(working) → rebuild → วาดแผงใหม่ คืนค่าที่ fn คืน */
    async act(fn) {
      snapshot();
      const result = fn(working);
      markDirty();
      await rebuild();
      renderPanel();
      return result;
    },
  };

  addBtn.addEventListener('click', () =>
    openLibrary(async (type) => {
      const id = await store.act((cfg) => commands.addLayer(cfg, type));
      select(id);
    }));

  // ---------- แผงด้านขวา ----------
  function renderPanel() {
    renderLayers(layersBox, store);
    renderInspector(props, store);
    renderTheme();
    renderGeneral();
  }

  function renderTheme() {
    const box = themeSec.querySelector('.ed-body') || el('div', 'ed-body', themeSec);
    box.replaceChildren();
    for (const [k, label] of Object.entries(THEME_LABELS)) {
      const row = field(box, label);
      const value = working.theme[k] ?? THEME_DEFAULTS[k];
      const inp = el('input', '', row);
      Object.assign(inp, { type: k === 'font' ? 'text' : 'color', value });
      inp.addEventListener('input', onEdit((n) => {
        working.theme[k] = n.value;
        stage.style.setProperty(`--${k}`, n.value);
      }));
    }
  }

  function renderGeneral() {
    const box = generalSec.querySelector('.ed-body') || el('div', 'ed-body', generalSec);
    box.replaceChildren();
    el('div', 'ed-hint', box, `ขนาดจอ ${W}×${H} (เปลี่ยนได้ที่ resolution ในไฟล์ config)`);
    const durRow = field(box, 'ความยาว (วินาที) — มีผลตอน render');
    const dur = el('input', '', durRow);
    Object.assign(dur, { type: 'number', min: 1, value: working.duration });
    dur.addEventListener('input', () => {
      if (Number(dur.value) > 0) {
        snapshot();
        working.duration = Number(dur.value);
        markDirty();
      }
    });
    const bgRow = field(box, 'รูป/คลิปพื้นหลังตัวอย่าง (ไว้ใน assets/)');
    const bg = el('input', '', bgRow);
    Object.assign(bg, { type: 'text', value: working.preview.background || '', placeholder: 'assets/sample.jpg' });
    bg.addEventListener('change', () => {
      snapshot();
      working.preview.background = bg.value.trim();
      setPreviewBackground(working.preview.background);
      markDirty();
    });
  }

  emptyHint.hidden = working.layers.length > 0;
  renderPanel();
}
```

- [ ] **Step 5: เพิ่มสไตล์หน้าแก้ไขใน `templates/_runtime/base.css`**

(ก) แทนที่บรรทัด `.ed-item span { flex: 1; cursor: pointer; }` ด้วย:

```css
.ed-item { cursor: pointer; }
.ed-item .ed-type { flex: none; width: 22px; text-align: center; }
.ed-item .ed-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ed-item.hidden .ed-name, .ed-item.hidden .ed-type { opacity: .45; }
.ed-item input[type=text] { flex: 1; }
```

(ข) ต่อท้ายไฟล์:

```css
/* ---------- หน้าแก้ไข: Layers / คุณสมบัติ / คลังชิ้นส่วน ---------- */
.ed-empty {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: rgba(255, 255, 255, .55); font-size: 18px; pointer-events: none;
}
.ed-empty[hidden] { display: none; }
.ed-sec-head { display: flex; align-items: center; justify-content: space-between; }
#editor-panel button.ed-icon { padding: 2px 7px; background: transparent; }
#editor-panel button.ed-icon:hover { background: #3a3a44; }
#editor-panel button.ed-icon:disabled { opacity: .25; }
.ed-group { margin-top: 14px; padding-top: 8px; border-top: 1px dashed #33333c; font-size: 12px; font-weight: 700; color: #c4c7cf; }
.ed-col { flex-direction: column; align-items: stretch; }
.ed-row .ed-hint { margin: 0; }

.ed-modal-back {
  position: fixed; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, .6);
  font: 14px/1.4 system-ui, sans-serif; color: #e6e6ea;
}
.ed-modal { width: min(720px, 92vw); max-height: 86vh; overflow-y: auto; padding: 16px 20px 20px; border-radius: 12px; background: #24242b; }
.ed-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 17px; }
.ed-modal h4 { margin: 16px 0 8px; font-size: 13px; color: #9aa0ad; }
.ed-modal button.ed-icon { padding: 4px 10px; border: 0; border-radius: 6px; background: #3a3a44; color: #fff; cursor: pointer; }
.ed-lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.ed-lib-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; border: 1px solid #3a3a44; border-radius: 10px;
  background: #2c2c35; color: #fff; font: inherit; cursor: pointer;
}
.ed-lib-card:hover { border-color: #22d3ee; background: #164e63; }
.ed-lib-icon { font-size: 28px; }
```

- [ ] **Step 6: ลบ editor เดิม**

```bash
git rm templates/_runtime/editor.js
```

- [ ] **Step 7: รันเทสต์ (ต้องไม่มีอะไรพัง)**

Run: `npm test`
Expected: PASS ทั้งหมด

- [ ] **Step 8: ทดสอบหน้าแก้ไขใน Browser pane**

เริ่ม `npm start` ใหม่ แล้วเปิด http://127.0.0.1:5173 ทำตามนี้ทีละข้อ และจด/แก้สิ่งที่ไม่ตรง:
1. ตั้งชื่อ `blank-test` ที่การ์ดหน้าเปล่า แล้วกด "＋ สร้างหน้าเปล่า" ต้องเข้าหน้าแก้ไขที่จอว่าง มีข้อความ "ยังไม่มีชิ้นส่วน" ทั้งบนจอและใน Layers
2. กด "＋ เพิ่มชิ้น" หน้าต่างขึ้น 4 หมวด ครบ 15 การ์ด กด Esc แล้วหน้าต่างปิด
3. เพิ่มทุกชนิดทีละอัน ชิ้นที่มีตำแหน่งต้องโผล่กลางจอและถูกเลือก ส่วนชิ้นเต็มจอต้องเต็มจอ
4. ลากข้อความไปมุมขวาล่าง แล้วรีเฟรช (หลังบันทึก) ต้องอยู่ที่เดิม
5. ใน Layers: ↑↓ เปลี่ยนลำดับทับ, 👁 ซ่อน (ชิ้นหายจากจอ ชื่อจาง), ดับเบิลคลิกชื่อแล้วพิมพ์ชื่อใหม่ Enter, ⧉ ได้ชิ้น "(สำเนา)" เลื่อน 40px, 🗑 ถามยืนยันแล้วลบ
6. กด ↶ ย้อนกลับ ทีละขั้น ต้องย้อนทุกการกระทำในข้อ 5 ได้
7. การ์ดสปอนเซอร์เด้ง: เอาติ๊ก "แสดงทุกชิ้นค้างไว้" ออก แล้วกด ▶ ต้องเด้งเข้าที่ 0 วิ ค้าง แล้วออกที่ ~6 วิ เปลี่ยนท่าเข้าเป็น "จางเข้า/ออก" แล้วดูอีกครั้ง
8. ข้อความ: ตั้งเวลาเริ่ม 2 จบ 5 (เอาติ๊ก "แสดงจนจบคลิป" ออก) ต้องโผล่เฉพาะช่วงนั้น
9. เปลี่ยน "สีหลัก" ของแถบโปรโมชันเฉพาะชิ้น สีต้องเปลี่ยนแค่ชิ้นนั้น แล้วกด "↺ ใช้สีธีม" ต้องกลับเป็นสีธีม
10. ข้อความวิ่ง: กด "＋ เพิ่มบรรทัด" แก้ข้อความ และกด ✕ ลบบรรทัด ส่วนกล่องประกาศ: แก้หัวข้อ/ข้อความ
11. 💾 บันทึก แล้ว 🎬 เรนเดอร์ ต้องได้ไฟล์ `blank-test.mov` / `.webm` ใน `output/`
12. เปิดงาน `overlay` ที่ถูกแปลงแล้วใน "✏️ ปรับแต่ง" ต้องเห็น 7 ชิ้นตำแหน่งเดิม และลากได้เหมือนเดิม
13. หน้าแรก กด "ลองปรับดูก่อน" ของเทมเพลตนีออน ต้องแก้ได้แต่ปุ่มบันทึก/เรนเดอร์ถูกปิด

- [ ] **Step 9: Commit**

```bash
git add templates/_runtime
git commit -m "Add layer editor with element library, layers list and inspector

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: README + ตรวจรอบสุดท้าย

**Files:**
- Modify: `README.md` (ส่วน "วิธีสอนใช้" ขั้นที่ 2–3 และคำสั่ง `templates`/`new`)

- [ ] **Step 1: แก้ README ขั้นที่ 2**

แทนหัวข้อ "### ขั้นที่ 2: สร้างงานแรกจากเทมเพลต" ทั้งก้อน (จนถึงก่อน "### ขั้นที่ 3") ด้วย:

```markdown
### ขั้นที่ 2: สร้างงานใหม่

ที่หน้าแรก หัวข้อ **"สร้างงานใหม่"** มีให้เลือก 4 แบบ:

| แบบ | เหมาะกับ |
|---|---|
| หน้าเปล่า | อยากจัดเองทั้งหมด เริ่มจากจอว่างแล้วเพิ่มชิ้นที่ต้องการ |
| ชุดโฆษณาคลิปเกม | ป้าย HIGHLIGHT, กล่องโดเนท, กรอบกล้อง, แถบโปรโมชัน |
| ป้ายสปอนเซอร์เด้งเข้ามุมจอ | ป้ายโฆษณาที่เด้งเข้ามาทีละอัน |
| กรอบไฟนีออน | กรอบไฟรอบจอ มีแสงวิ่งหรือกะพริบ |

เทมเพลตก็คือโปรเจกต์ที่มีชิ้นวางไว้ให้แล้ว เพิ่ม/ลบ/ผสมชิ้นจากแบบอื่นได้ตามใจ

1. ในช่อง **ตั้งชื่องาน** พิมพ์ชื่อภาษาอังกฤษสั้นๆ เช่น `my-first`
2. เลือกขนาด: **แนวนอน 1920×1080** สำหรับ YouTube/คลิปทั่วไป หรือ **แนวตั้ง 1080×1920** สำหรับ TikTok/Shorts/Reels
3. กด **＋ สร้างหน้าเปล่า** หรือ **＋ ใช้เทมเพลตนี้** ระบบจะพาไปหน้าปรับแต่งทันที

> งานที่สร้างจากโปรแกรมรุ่นก่อนจะถูกแปลงเป็นรูปแบบใหม่ให้อัตโนมัติตอนเปิด หน้าตาเหมือนเดิม และเก็บไฟล์เดิมไว้ในโฟลเดอร์ `backup/`
```

- [ ] **Step 2: แก้ README ขั้นที่ 3**

ในรายการ bullet ของ "### ขั้นที่ 3" แทน bullet "เปิด/ปิดชิ้นส่วน" ด้วย bullet เหล่านี้ (คง bullet อื่นไว้):

```markdown
- **เพิ่มชิ้นส่วน:** กด **＋ เพิ่มชิ้น** ที่หัวข้อ Layers แล้วเลือกจากคลัง (ข้อความ, รูปภาพ, กล่อง/รูปทรง, ป้าย, กรอบ, ข้อความวิ่ง ฯลฯ) ใส่ชนิดเดียวกันกี่อันก็ได้
- **จัดการชิ้นใน Layers:** 👁 ซ่อน/แสดง, ↑↓ เลื่อนว่าชิ้นไหนทับชิ้นไหน, ดับเบิลคลิกชื่อเพื่อเปลี่ยนชื่อ, ⧉ ทำสำเนา, 🗑 ลบ
- **เวลาโผล่และท่าเข้า/ออก:** ในแผง "ชิ้นที่เลือก" ตั้งวินาทีเริ่ม/จบ และเลือกท่าเข้า/ออก (จางเข้า, เลื่อน, เด้ง)
- **สีเฉพาะชิ้น:** เปลี่ยนสีในหัวข้อ "สีของชิ้นนี้" กด ↺ เพื่อกลับไปใช้สีธีมของโปรเจกต์
```

และแทนประโยคเรื่อง "ติ๊กหรือเอาติ๊กออกหน้าชื่อชิ้นส่วน" ถ้ายังเหลือ

- [ ] **Step 3: แก้ส่วนคำสั่งใน README**

ค้นคำว่า `templates` และ `new` ใน README แล้วแก้ตัวอย่างให้เป็น:

```bash
npm run templates                                  # ดูรายชื่อเทมเพลต รวมหน้าเปล่า (blank)
npm run new -- blank my.config.json                # สร้างงานหน้าเปล่า
npm run new -- neon-frame my.config.json --vertical
```

- [ ] **Step 4: รันเทสต์ทั้งหมดรอบสุดท้าย**

Run: `npm test`
Expected: PASS ทั้งหมด ไม่มีเทสต์ถูกข้าม (ถ้ามี Chromium)

- [ ] **Step 5: ตรวจคำสั่ง CLI**

Run: `npm run templates`
Expected: แสดง 4 บรรทัด โดย `blank` อยู่บรรทัดแรก

Run: `npm run render -- --still 2`
Expected: ได้ `output/overlay.png` และเปิดดูแล้วหน้าตาตรงกับ `test/baseline/overlay-2.png`

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "Update README for blank projects, element library and layers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
