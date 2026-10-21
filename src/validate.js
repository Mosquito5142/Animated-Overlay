// ตรวจโครงสร้างโปรเจกต์ version 2 (ฟังก์ชันล้วน)
// strict: ต้องรู้จักทุกชนิดใน catalog (ใช้ตอนบันทึก ส่วนตอนโหลดยอมให้ผ่าน เพื่อเปิดไปลบชิ้นนั้นได้)

import { CATALOG } from '../elements/catalog.js';
import { ENTER_TYPES, EXIT_TYPES } from '../templates/_runtime/timing.js';

export function validateProject(cfg, { strict = false } = {}) {
  const errors = [];
  if (cfg.version !== 2) errors.push('version ต้องเป็น 2');
  if (!Array.isArray(cfg.layers)) {
    errors.push('layers ต้องเป็นรายการ (array)');
    return errors;
  }
  const ids = new Set();
  cfg.layers.forEach((l, i) => {
    const where = `layers[${i}]${l?.id ? ` (${l.id})` : ''}`;
    if (!l || typeof l !== 'object' || Array.isArray(l)) {
      errors.push(`${where} ต้องเป็นออบเจกต์`);
      return;
    }
    if (typeof l.id !== 'string' || !l.id) errors.push(`${where}: ต้องมี id`);
    else if (ids.has(l.id)) errors.push(`${where}: id ซ้ำกับชิ้นอื่น`);
    else ids.add(l.id);

    if (typeof l.type !== 'string' || !/^[a-z0-9-]+$/.test(l.type)) errors.push(`${where}: ชนิด "${l.type}" ไม่ถูกต้อง`);
    else if (strict && !CATALOG[l.type]) errors.push(`${where}: ไม่รู้จักชิ้น "${l.type}"`);

    if (l.hidden !== undefined && typeof l.hidden !== 'boolean') errors.push(`${where}: hidden ต้องเป็น true/false`);
    if (!(typeof l.start === 'number' && l.start >= 0 && l.start < cfg.duration)) {
      errors.push(`${where}: start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป`);
    }
    if (!(l.end == null || (typeof l.end === 'number' && l.end > l.start))) errors.push(`${where}: end ต้องว่างหรือมากกว่า start`);
    if (l.enter && !ENTER_TYPES.includes(l.enter.type)) errors.push(`${where}: ไม่รู้จักท่าเข้า "${l.enter.type}"`);
    if (l.exit && !EXIT_TYPES.includes(l.exit.type)) errors.push(`${where}: ไม่รู้จักท่าออก "${l.exit.type}"`);
    if (l.props !== undefined && (typeof l.props !== 'object' || l.props === null || Array.isArray(l.props))) {
      errors.push(`${where}: props ต้องเป็นออบเจกต์`);
    }
  });
  return errors;
}
