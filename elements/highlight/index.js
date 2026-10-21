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
