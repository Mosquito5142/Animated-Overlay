// เทมเพลต neon-frame: กรอบไฟนีออนรอบจอ
// - frame:   เส้นนีออน เลือก effect ได้ chase (แสงวิ่ง) / blink (กะพริบ) / pulse (หายใจ) / rainbow (เปลี่ยนสี)
// - bulbs:   หลอดไฟเรียงรอบขอบ pattern alternate (สลับติด) / chase (ไล่ไฟ) / twinkle (ระยิบ)
// - corners: มุมกรอบรูปตัว L ที่แวบแสงเป็นจังหวะ
// - label:   ป้ายข้อความ ลากย้ายได้ (ค่าเริ่มต้นอยู่กลางขอบบน)

import { el, applyStyle } from '/templates/_runtime/runtime.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const on = (c) => c && c.enabled !== false;
const wave = (p) => 0.5 - 0.5 * Math.cos(2 * Math.PI * p);
// ตัวเลขสุ่มแบบคงที่ (เรนเดอร์กี่ครั้งก็ได้ค่าเดิม)
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** จุดเรียงรอบสี่เหลี่ยมมุมมน ห่างกันประมาณ spacing */
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
  fixed: ['frame', 'bulbs', 'corners'],
  choices: {
    effect: ['chase', 'blink', 'pulse', 'rainbow'],
    pattern: ['alternate', 'chase', 'twinkle'],
  },
  labels: { frame: 'กรอบนีออน', bulbs: 'หลอดไฟรอบขอบ', corners: 'มุมกรอบ', label: 'ป้ายข้อความ' },

  build(stage, ctx) {
    const E = ctx.config.elements || {};
    const W = ctx.width;
    const H = ctx.height;
    const n = (this.nodes = {});
    const fc = E.frame || {};
    const inset = fc.inset ?? 16;
    const th = fc.thickness ?? 8;
    const r = fc.radius ?? 22;
    const rect = { x: inset + th / 2, y: inset + th / 2, w: W - 2 * inset - th, h: H - 2 * inset - th };
    const perimeter = 2 * (rect.w + rect.h);

    if (on(E.frame)) {
      const root = el('div', 'el full', stage);
      const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
      const attrs = { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: r, fill: 'none', 'stroke-width': th };
      const g = svgEl('g', { class: 'glow-a' }, svg);
      const base = svgEl('rect', { ...attrs, stroke: 'var(--primary)' }, g);
      const g2 = svgEl('g', { class: 'glow-b' }, svg);
      const segs = Math.max(1, fc.segments ?? 3);
      const run = svgEl('rect', {
        ...attrs, stroke: 'var(--secondary)', 'stroke-linecap': 'round',
        'stroke-dasharray': `${(perimeter / segs) * 0.35} ${(perimeter / segs) * 0.65}`,
      }, g2);
      n.frame = { root, svg, base, run, segs, perimeter, c: fc };
    }

    if (on(E.bulbs)) {
      const c = E.bulbs;
      const root = el('div', 'el full', stage);
      const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
      const gap = c.gap ?? 26;
      const size = c.size ?? 7;
      const pts = perimeterPoints(rect.x + gap, rect.y + gap, rect.w - 2 * gap, rect.h - 2 * gap, c.spacing ?? 60);
      const ga = svgEl('g', { class: 'glow-a' }, svg);
      const gb = svgEl('g', { class: 'glow-b' }, svg);
      const bulbs = pts.map(([x, y], i) =>
        svgEl('circle', { cx: x, cy: y, r: size, fill: i % 2 ? 'var(--secondary)' : 'var(--primary)' }, i % 2 ? gb : ga),
      );
      n.bulbs = { root, bulbs, c };
    }

    if (on(E.corners)) {
      const c = E.corners;
      const root = el('div', 'el full', stage);
      const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
      const g = svgEl('g', { class: 'glow-b' }, svg);
      const L = c.length ?? 90;
      const t2 = c.thickness ?? 12;
      const m = inset - 4;
      const paths = [
        `M ${m} ${m + L} V ${m} H ${m + L}`,
        `M ${W - m - L} ${m} H ${W - m} V ${m + L}`,
        `M ${W - m} ${H - m - L} V ${H - m} H ${W - m - L}`,
        `M ${m + L} ${H - m} H ${m} V ${H - m - L}`,
      ].map((d) => svgEl('path', {
        d, fill: 'none', stroke: 'var(--secondary)', 'stroke-width': t2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }, g));
      n.corners = { root, g, paths, c };
    }

    if (on(E.label)) {
      const c = E.label;
      const root = el('div', 'el label', stage);
      const dot = c.dot !== false ? el('div', 'dot', root) : null;
      el('div', 'text', root, c.text ?? 'LIVE');
      if (c.sub) el('div', 'sub', root, c.sub);
      n.label = { root, dot, c };
      applyStyle(root, c.style);
    }

    for (const [key, node] of Object.entries(n)) node.root.dataset.key = key;
  },

  measure(stage, ctx) {
    // ป้ายที่ยังไม่เคยถูกย้าย ให้อยู่กลางขอบบน ทับเส้นกรอบพอดี
    const lb = this.nodes.label;
    if (lb && !lb.c.style) {
      const inset = ctx.config.elements?.frame?.inset ?? 16;
      lb.root.style.left = `${Math.round((ctx.width - lb.root.offsetWidth) / 2)}px`;
      lb.root.style.top = `${Math.max(0, Math.round(inset - lb.root.offsetHeight / 2 + 4))}px`;
    }
  },

  frame(t, ctx) {
    const n = this.nodes;
    const { cycle } = ctx;

    if (n.frame) {
      const f = n.frame;
      const period = f.c.period ?? 2.5;
      const effect = f.c.effect ?? 'chase';
      const ph = cycle(t, period);
      f.run.style.display = effect === 'chase' || effect === 'rainbow' ? '' : 'none';
      f.run.style.strokeDashoffset = String(-ph * (f.perimeter / f.segs));
      let baseOpacity = 1;
      if (effect === 'chase') baseOpacity = 0.55;
      if (effect === 'pulse') baseOpacity = 0.35 + 0.65 * wave(ph);
      if (effect === 'blink') baseOpacity = cycle(t, period / 4) < 0.5 ? 1 : 0.12;
      f.base.style.opacity = String(baseOpacity);
      f.svg.style.filter = effect === 'rainbow' ? `hue-rotate(${Math.round(cycle(t, period * 2) * 360)}deg)` : '';
    }

    if (n.bulbs) {
      const b = n.bulbs;
      const pattern = b.c.pattern ?? 'alternate';
      const ph = cycle(t, b.c.period ?? 1);
      b.bulbs.forEach((node, i) => {
        let v;
        if (pattern === 'chase') v = (i + Math.floor(ph * 3)) % 3 === 0 ? 1 : 0.15;
        else if (pattern === 'twinkle') v = 0.2 + 0.8 * wave((ph + hash(i)) % 1);
        else v = (i + (ph < 0.5 ? 0 : 1)) % 2 === 0 ? 1 : 0.15;
        node.style.opacity = String(v);
      });
    }

    if (n.corners) {
      const c = n.corners;
      const ph = cycle(t, c.c.period ?? 2);
      const flash = ph < 0.15 ? Math.sin((Math.PI * ph) / 0.15) : 0;
      c.g.style.opacity = String(0.6 + 0.4 * flash);
      c.paths.forEach((p) => (p.style.strokeWidth = String((c.c.thickness ?? 12) * (1 + 0.35 * flash))));
    }

    if (n.label) {
      const l = n.label;
      if (l.dot) l.dot.style.opacity = cycle(t, 1) < 0.55 ? '1' : '0.2';
      const g = wave(cycle(t, 2.5));
      l.root.style.boxShadow = `0 0 ${8 + 14 * g}px var(--primary), inset 0 0 10px color-mix(in srgb, var(--primary) 30%, transparent)`;
    }
  },
};
