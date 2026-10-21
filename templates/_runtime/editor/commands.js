// คำสั่งจัดการ layer ในงานที่กำลังแก้ (ฟังก์ชันล้วน แก้ cfg.layers ตรงๆ ทดสอบด้วย node ได้)
// ลำดับใน cfg.layers: ตัวแรกอยู่ล่างสุด ตัวท้ายอยู่บนสุด

import { CATALOG } from '../../../elements/catalog.js';

const round1 = (x) => Math.round(x * 10) / 10;
const round3 = (x) => Math.round(x * 1000) / 1000;
const indexOf = (cfg, id) => cfg.layers.findIndex((l) => l.id === id);
const find = (cfg, id) => cfg.layers.find((l) => l.id === id);

export function nextId(cfg, type) {
  let i = 1;
  while (cfg.layers.some((l) => l.id === `${type}-${i}`)) i++;
  return `${type}-${i}`;
}

/** เพิ่มชิ้นใหม่ไว้บนสุด (ไม่มีตำแหน่ง → stage วางกลางจอจนกว่าจะลากย้าย) */
export function addLayer(cfg, type) {
  const def = CATALOG[type];
  if (!def) throw new Error(`ไม่รู้จักชิ้น "${type}"`);
  const layer = {
    id: nextId(cfg, type),
    type,
    name: def.label,
    hidden: false,
    start: 0,
    end: null,
    enter: { type: 'none' },
    exit: { type: 'none' },
    ...structuredClone(def.defaults.timing || {}),
    props: structuredClone(def.defaults.props),
  };
  if (def.defaults.style) layer.style = structuredClone(def.defaults.style);
  cfg.layers.push(layer);
  return layer.id;
}

/** ทำสำเนาไว้เหนือชิ้นเดิม เลื่อนเข้าในจอ 40px ถ้าชิ้นเดิมมีช่วงเวลา ให้โผล่ต่อจากชิ้นเดิม */
export function duplicateLayer(cfg, id, duration) {
  const i = indexOf(cfg, id);
  const src = cfg.layers[i];
  const copy = structuredClone(src);
  copy.id = nextId(cfg, src.type);
  copy.name = `${src.name} (สำเนา)`;
  for (const side of ['left', 'right', 'top', 'bottom']) {
    if (typeof copy.style?.[side] === 'number') copy.style[side] += 40;
  }
  if (src.end != null) {
    const length = src.end - src.start;
    copy.start = round1((src.end + 0.3) % duration);
    copy.end = round3(copy.start + length); // สำเนายาวเท่าชิ้นเดิมพอดี (round3 แค่ตัดเศษทศนิยมคลาดเคลื่อน)
  }
  cfg.layers.splice(i + 1, 0, copy);
  return copy.id;
}

export function removeLayer(cfg, id) {
  const i = indexOf(cfg, id);
  if (i >= 0) cfg.layers.splice(i, 1);
}

/** เลื่อนลำดับการทับ: +1 = ขึ้นไปทับชิ้นถัดไป, -1 = ลง คืน false ถ้าเลื่อนไม่ได้ */
export function moveLayer(cfg, id, delta) {
  const i = indexOf(cfg, id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cfg.layers.length) return false;
  const [layer] = cfg.layers.splice(i, 1);
  cfg.layers.splice(j, 0, layer);
  return true;
}

export function toggleHidden(cfg, id) {
  const layer = find(cfg, id);
  layer.hidden = !layer.hidden;
}

export function renameLayer(cfg, id, name) {
  find(cfg, id).name = name;
}
