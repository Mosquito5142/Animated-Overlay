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
