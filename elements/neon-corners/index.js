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
