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
const EPS = 1e-6;

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
  // EPS: กันทศนิยมคลาดเคลื่อน เช่น (7.15 - 1) % 20 ได้ 6.1499999… ทำให้ยังแสดงอยู่ตอนถึง end พอดี
  return { visible: local < length - EPS, local, length, enter, exit: motionLength(layer.exit) };
}

/** ขอบจอที่ใกล้กล่องที่สุด */
export function nearestEdge(box, W, H) {
  const d = { left: box.x, right: W - (box.x + box.w), top: box.y, bottom: H - (box.y + box.h) };
  return Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a));
}

/** ระยะเลื่อนที่พากล่องออกไปพ้นขอบจอด้าน from (ทิศที่ไม่รู้จัก → ขอบที่ใกล้ที่สุด) */
export function offscreen(from, box, W, H) {
  const table = {
    left: [-(box.x + box.w + 40), 0],
    right: [W - box.x + 40, 0],
    top: [0, -(box.y + box.h + 40)],
    bottom: [0, H - box.y + 40],
  };
  return table[from] ?? table[nearestEdge(box, W, H)];
}

const pair = (s) => (Array.isArray(s) ? s : [s, s]);

/**
 * กล่องบนจอของชิ้นที่ถูกย่อ/ขยาย (CSS scale บน .layer)
 * box = กล่องก่อนย่อ/ขยาย, scale = ตัวเลข หรือ [sx, sy], origin = [ox, oy] จุดหมุน (px จากมุมซ้ายบนของกล่อง)
 */
export function scaledBox(box, scale, origin) {
  const [sx, sy] = pair(scale);
  const [ox, oy] = origin;
  return { x: box.x + ox * (1 - sx), y: box.y + oy * (1 - sy), w: box.w * sx, h: box.h * sy };
}

const IDENTITY = { x: 0, y: 0, scale: 1, opacity: 1 };

/**
 * ท่าเข้า/ออกของ layer ที่เวลา span.local
 * box = ตำแหน่งของ layer บนจอ (หลังย่อ/ขยายแล้ว) ใช้หาทิศ "auto" และระยะเลื่อนออกนอกจอ
 * scale = การย่อ/ขยายของ .layer (ตัวเลข หรือ [sx, sy]) ระยะเลื่อนใส่ที่ .motion ข้างใน จึงโดนคูณ scale
 *   ต้องหารออกก่อน เพื่อให้เลื่อนบนจอได้ระยะจริง
 */
export function layerMotion(layer, span, box, W, H, scale = 1) {
  const [sx, sy] = pair(scale);
  const m = motionAt(layer, span, box, W, H);
  return sx === 1 && sy === 1 ? m : { ...m, x: m.x / sx, y: m.y / sy };
}

function motionAt(layer, span, box, W, H) {
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
