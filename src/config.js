import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export const FORMATS = ['prores', 'webm', 'png'];

const DEFAULTS = {
  template: 'sponsor-gaming',
  resolution: [1920, 1080],
  fps: 30,
  duration: 10,
  intro: false,
  format: ['prores', 'webm'],
  theme: {},
  preview: {},
  elements: {},
};

/** อ่าน config แล้วเติมค่าเริ่มต้น + ตรวจค่า ถ้าผิดจะ throw พร้อมข้อความภาษาไทย */
export async function loadConfig(configPath, overrides = {}) {
  const file = path.resolve(configPath);
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`อ่านไฟล์ config ไม่ได้: ${file}\n  ${err.message}`);
  }
  const cfg = { ...DEFAULTS, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());

  const errors = [];
  if (!/^[\w-]+$/.test(cfg.template)) errors.push(`template ไม่ถูกต้อง: "${cfg.template}"`);
  if (!Array.isArray(cfg.resolution) || cfg.resolution.length !== 2 || !cfg.resolution.every((n) => Number.isInteger(n) && n > 0 && n % 2 === 0)) {
    errors.push('resolution ต้องเป็น [กว้าง, สูง] ที่เป็นเลขคู่ เช่น [1920, 1080]');
  }
  if (!(cfg.fps > 0 && cfg.fps <= 120)) errors.push('fps ต้องอยู่ระหว่าง 1–120');
  if (!(cfg.duration > 0 && cfg.duration <= 600)) errors.push('duration (วินาที) ต้องอยู่ระหว่าง 0–600');
  const bad = cfg.format.filter((f) => !FORMATS.includes(f));
  if (bad.length) errors.push(`format ไม่รู้จัก: ${bad.join(', ')} (ใช้ได้: ${FORMATS.join(', ')})`);

  const templateDir = path.join(ROOT, 'templates', cfg.template);
  try {
    await access(path.join(templateDir, 'index.html'));
  } catch {
    errors.push(`ไม่พบเทมเพลต: templates/${cfg.template}/index.html`);
  }
  if (errors.length) throw new Error(`config ไม่ถูกต้อง (${file}):\n  - ${errors.join('\n  - ')}`);
  return cfg;
}
