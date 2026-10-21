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
