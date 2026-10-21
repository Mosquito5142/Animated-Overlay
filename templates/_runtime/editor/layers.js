// รายการ Layers: ชิ้นบนสุดอยู่บนสุด (กลับด้านจากลำดับใน config)
// 👁 ซ่อน/แสดง • คลิกเพื่อเลือก • ดับเบิลคลิกชื่อเพื่อเปลี่ยนชื่อ • ↑↓ เลื่อนลำดับการทับ • ⧉ ทำสำเนา • 🗑 ลบ

import { el } from '../dom.js';
import { CATALOG } from '../../../elements/catalog.js';
import * as commands from './commands.js';

function iconButton(parent, text, title, onClick) {
  const b = el('button', 'ed-icon', parent, text);
  b.title = title;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** เปลี่ยนชื่อในแถว: Enter/คลิกที่อื่น = บันทึก, Esc = ยกเลิก */
function rename(span, layer, store) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = layer.name || '';
  span.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (commit && v && v !== layer.name) store.act((cfg) => commands.renameLayer(cfg, layer.id, v));
    else store.refreshLayers();
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
}

export function renderLayers(box, store) {
  box.replaceChildren();
  const { layers } = store.working;
  if (!layers.length) {
    el('p', 'ed-hint', box, 'ยังไม่มีชิ้นส่วน — กด ＋ เพิ่มชิ้น เพื่อเริ่ม');
    return;
  }
  const top = layers.length - 1;
  [...layers].reverse().forEach((layer, i) => {
    const index = top - i;
    const active = layer.id === store.selected;
    const row = el('div', `ed-item${active ? ' active' : ''}${layer.hidden ? ' hidden' : ''}`, box);
    row.addEventListener('click', () => store.select(layer.id));

    iconButton(row, layer.hidden ? '🚫' : '👁', layer.hidden ? 'แสดง' : 'ซ่อน', () =>
      store.act((cfg) => commands.toggleHidden(cfg, layer.id)));
    el('span', 'ed-type', row, CATALOG[layer.type]?.icon ?? '⚠');
    const name = el('span', 'ed-name', row, layer.name || layer.id);
    name.title = 'ดับเบิลคลิกเพื่อเปลี่ยนชื่อ';
    // คลิกแรกเลือกชิ้นและวาดรายการใหม่ (span เดิมหายไป) เบราว์เซอร์จึงไม่ส่ง dblclick
    // ใช้ click ที่ detail = 2 แทน ซึ่งยังนับต่อแม้ span ถูกแทนที่
    name.addEventListener('click', (e) => {
      if (e.detail !== 2) return;
      e.stopPropagation();
      rename(name, layer, store);
    });

    iconButton(row, '↑', 'เลื่อนขึ้น (ทับชิ้นอื่น)', () => store.act((cfg) => commands.moveLayer(cfg, layer.id, 1)))
      .disabled = index === top;
    iconButton(row, '↓', 'เลื่อนลง', () => store.act((cfg) => commands.moveLayer(cfg, layer.id, -1)))
      .disabled = index === 0;

    if (active) {
      iconButton(row, '⧉', 'ทำสำเนา', async () => {
        const id = await store.act((cfg) => commands.duplicateLayer(cfg, layer.id, store.ctx.duration));
        store.select(id);
      });
      iconButton(row, '🗑', 'ลบ', async () => {
        if (!confirm(`ลบ "${layer.name || layer.id}" ?`)) return;
        await store.act((cfg) => commands.removeLayer(cfg, layer.id));
        store.select(null);
      });
    }
  });
}
