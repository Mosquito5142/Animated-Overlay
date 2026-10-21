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
