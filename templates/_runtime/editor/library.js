// หน้าต่างคลังชิ้นส่วน: แบ่งหมวด กดการ์ดแล้วเรียก onPick(type) และปิดหน้าต่าง
// ปิดได้ด้วย Esc, ปุ่ม ✕ หรือคลิกนอกหน้าต่าง

import { el } from '../dom.js';
import { CATALOG, CATEGORIES } from '../../../elements/catalog.js';

export function openLibrary(onPick) {
  const back = el('div', 'ed-modal-back', document.body);
  const box = el('div', 'ed-modal', back);
  const head = el('div', 'ed-modal-head', box);
  el('b', '', head, 'เพิ่มชิ้นส่วน');
  const closeBtn = el('button', 'ed-icon', head, '✕');

  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };
  function close() {
    back.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', close);
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });

  for (const [category, title] of CATEGORIES) {
    const types = Object.entries(CATALOG).filter(([, def]) => def.category === category);
    if (!types.length) continue;
    el('h4', '', box, title);
    const grid = el('div', 'ed-picker-grid', box);
    for (const [type, def] of types) {
      const card = el('button', 'ed-picker-card', grid);
      el('span', 'ed-picker-icon', card, def.icon);
      el('span', '', card, def.label);
      card.addEventListener('click', () => {
        close();
        onPick(type);
      });
    }
  }
}
