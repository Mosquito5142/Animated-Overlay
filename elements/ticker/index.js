// ข้อความวิ่ง: ป้ายหัว + ข้อความวนจากขวาไปซ้ายต่อกันไม่มีรอยต่อ
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    if (props.tag) el('div', 'tag', root, props.tag);
    const win = el('div', 'window', root);
    const track = el('div', 'track', win);
    const items = Array.isArray(props.items) ? props.items : [props.text ?? ''];
    const unit = el('div', 'unit', track);
    unit.style.display = 'flex';
    for (const text of items) el('div', 'item', unit, text);
    return { win, track, unit, speed: props.speed ?? 110 };
  },
  measure(s) {
    s.unitWidth = s.unit.offsetWidth;
    // ไม่มีข้อความ (กว้าง 0): ไม่ต้อง clone และไม่ต้องวิ่ง
    if (!s.unitWidth) return;
    const copies = Math.ceil(s.win.offsetWidth / s.unitWidth) + 1;
    for (let i = 0; i < copies; i++) s.track.appendChild(s.unit.cloneNode(true));
  },
  frame(s, t, span, ctx) {
    if (!s.unitWidth) return;
    const ph = ctx.cycle(t, s.unitWidth / s.speed);
    s.track.style.transform = `translateX(${-ph * s.unitWidth}px)`;
  },
};
