// กล่องประกาศ: วนเปลี่ยนข้อความทีละอัน จางเข้า/ออกพร้อมเลื่อนขึ้นเล็กน้อย
import { el } from '../../templates/_runtime/dom.js';
import { clamp01, ease } from '../../templates/_runtime/timing.js';

export default {
  build(root, props) {
    const messages = props.messages || [];
    if (!messages.length) return null;
    const msgs = messages.map((m) => {
      const box = el('div', 'msg', root);
      const obj = typeof m === 'string' ? { text: m } : m;
      if (obj.title) el('div', 'title', box, obj.title);
      el('div', 'line', box, obj.text);
      return box;
    });
    return { msgs, each: props.secondsEach ?? 4 };
  },
  frame(s, t, span, ctx) {
    if (!s) return;
    const count = s.msgs.length;
    const ph = ctx.cycle(t, s.each * count) * count;
    const idx = Math.floor(ph);
    const local = ph - idx;
    s.msgs.forEach((box, i) => {
      if (i !== idx) {
        box.style.opacity = '0';
        return;
      }
      const fadeIn = count > 1 ? clamp01(local / 0.08) : 1;
      const fadeOut = count > 1 ? clamp01((1 - local) / 0.08) : 1;
      box.style.opacity = String(Math.min(fadeIn, fadeOut));
      box.style.transform = `translateY(${(1 - ease.outCubic(fadeIn)) * 16 - (1 - fadeOut) * 16}px)`;
    });
  },
};
