// กรอบกล้อง: แถบชื่อช่อง + LIVE และขอบที่มีแสงวิ่งรอบ ตรงกลางโปร่งใสให้เห็นกล้องจากคลิปจริง
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const [w, h] = props.camSize || [398, 292];
    root.style.width = `${w}px`;
    const bar = el('div', 'bar', root);
    el('div', 'channel', bar, props.channel ?? 'CHANNEL');
    el('div', 'label', bar, props.label ?? '');
    let dot = null;
    if (props.live !== false) {
      const live = el('div', 'live', bar);
      dot = el('div', 'dot', live);
      el('span', '', live, 'LIVE');
    }
    const cam = el('div', 'cam', root);
    cam.style.width = `${w}px`;
    cam.style.height = `${h}px`;
    const sw = props.borderWidth ?? 6;
    const P = 2 * (w + h);
    cam.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
              fill="none" stroke="var(--panel)" stroke-width="${sw}"/>
        <rect class="run" x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
              fill="none" stroke="var(--primary)" stroke-width="${sw}" stroke-linecap="round"
              stroke-dasharray="${P * 0.22} ${P * 0.28}"
              style="filter: drop-shadow(0 0 6px var(--primary))"/>
      </svg>`;
    return { dot, run: cam.querySelector('.run'), perimeter: P };
  },
  frame(s, t, span, ctx) {
    s.run.style.strokeDashoffset = String(-ctx.cycle(t, 3) * s.perimeter);
    if (s.dot) s.dot.style.opacity = String(0.25 + 0.75 * (ctx.cycle(t, 1) < 0.55 ? 1 : 0));
  },
};
