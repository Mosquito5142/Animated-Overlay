// แถบโปรโมชัน: โลโก้ + ข้อความ + ราคา (ราคาเด้งเป็นจังหวะ มีแสงวิ่งผ่าน)
import { el, assetUrl } from '../../templates/_runtime/dom.js';
import { shineX, bump } from '../_shared/motion.js';

export default {
  build(root, props) {
    if (props.logo) {
      const logo = el('div', 'logo', root);
      const img = el('img', '', logo);
      img.src = assetUrl(props.logo);
      img.alt = 'logo';
    }
    if (props.text) el('div', 'text', root, props.text);
    const box = el('div', 'price-box', root);
    if (props.oldPrice) el('div', 'old', box, props.oldPrice);
    const row = el('div', 'price-row', box);
    el('div', 'price', row, props.price ?? '');
    if (props.unit) el('div', 'unit', row, props.unit);
    if (props.note) el('div', 'note', box, props.note);
    return { root, row, shine: el('div', 'shine', root) };
  },
  measure(s) {
    s.width = s.root.offsetWidth;
  },
  frame(s, t, span, ctx) {
    s.row.style.transform = `scale(${1 + 0.08 * bump(ctx.cycle(t, 2.5), 0.2)})`;
    const sh = (ctx.cycle(t, 5) + 0.25) % 1;
    s.shine.style.transform = `translateX(${shineX(sh, s.width)}px) skewX(-20deg)`;
  },
};
