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
