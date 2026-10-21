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
