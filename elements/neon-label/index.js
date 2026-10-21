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
