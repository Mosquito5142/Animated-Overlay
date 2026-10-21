// การ์ดสปอนเซอร์เด้ง: ท่าเด้งเข้า/สไลด์ออกเป็นของส่วนกลาง (enter/exit แบบ pop)
// ตัวการ์ดทำท่าลอยตอนค้าง แสงวิ่งหลังเด้งเข้า และแถบเวลาที่เหลือ
// persistent = แสดงตลอด ลอยขึ้นลงช้าๆ ไม่มีแถบเวลา
import { el, assetUrl } from '../../templates/_runtime/dom.js';
import { clamp01, lerp, ease } from '../../templates/_runtime/timing.js';

export default {
  build(root, props) {
    if (props.compact) root.classList.add('compact');
    if (props.color) root.style.setProperty('--c', props.color);
    const card = el('div', 'card', root);
    if (props.tag !== '') el('div', 'tag', card, props.tag ?? 'SPONSORED BY');
    const row = el('div', 'row', card);
    if (props.image) {
      const img = el('img', '', el('div', 'logo', row));
      img.src = assetUrl(props.image);
      img.alt = props.title || 'sponsor';
    }
    const texts = el('div', 'texts', row);
    if (props.title) el('div', 'title', texts, props.title);
    if (props.subtitle) el('div', 'subtitle', texts, props.subtitle);
    const bar = props.persistent ? null : el('div', 'bar', card);
    const shine = el('div', 'shine', card);
    return { card, bar, shine, persistent: !!props.persistent };
  },
  frame(s, t, span, ctx) {
    const sw = s.card.offsetWidth;
    if (s.persistent) {
      s.card.style.transform = `translateY(${-3 * Math.sin(2 * Math.PI * ctx.cycle(t, 3))}px)`;
      const ph = ctx.cycle(t, 6);
      s.shine.style.transform = `translateX(${lerp(-160, sw + 160, clamp01(ph / 0.2))}px) skewX(-20deg)`;
      return;
    }
    const IN = span.enter;
    const hold = Math.max(0.001, span.length - span.enter - span.exit);
    const holding = span.showAll || (span.local >= IN && span.local < IN + hold);
    const float = holding ? -4 * Math.sin((2 * Math.PI * (span.local - IN)) / 2.5) : 0;
    s.card.style.transform = `translateY(${float}px)`;
    const sp = span.showAll ? 1 : clamp01((span.local - IN) / 0.8);
    s.shine.style.transform = `translateX(${lerp(-160, sw + 160, ease.inOutSine(sp))}px) skewX(-20deg)`;
    if (s.bar) s.bar.style.transform = `scaleX(${span.showAll ? 1 : 1 - clamp01((span.local - IN) / hold)})`;
  },
};
