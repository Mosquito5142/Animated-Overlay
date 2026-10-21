import { readFile, writeFile, copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';
import { validateProject } from './validate.js';

// fileURLToPath ให้ path ที่ถูกต้องทั้งบน Windows (C:\...) และ macOS/Linux
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FORMATS = ['prores', 'webm', 'png'];

const exists = (p) => access(p).then(() => true, () => false);

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

const DEFAULTS_V2 = {
  resolution: [1920, 1080],
  fps: 30,
  duration: 10,
  format: ['prores', 'webm'],
  theme: {},
  preview: {},
  layers: [],
};

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`อ่านไฟล์ config ไม่ได้: ${file}\n  ${err.message}`);
  }
}

/** ตรวจค่าที่ทุกเวอร์ชันมีเหมือนกัน: ขนาดจอ fps ความยาว รูปแบบไฟล์ */
function basicErrors(cfg) {
  const errors = [];
  if (!Array.isArray(cfg.resolution) || cfg.resolution.length !== 2 || !cfg.resolution.every((n) => Number.isInteger(n) && n > 0 && n % 2 === 0)) {
    errors.push('resolution ต้องเป็น [กว้าง, สูง] ที่เป็นเลขคู่ เช่น [1920, 1080]');
  }
  if (!(cfg.fps > 0 && cfg.fps <= 120)) errors.push('fps ต้องอยู่ระหว่าง 1–120');
  if (!(cfg.duration > 0 && cfg.duration <= 600)) errors.push('duration (วินาที) ต้องอยู่ระหว่าง 0–600');
  const bad = cfg.format.filter((f) => !FORMATS.includes(f));
  if (bad.length) errors.push(`format ไม่รู้จัก: ${bad.join(', ')} (ใช้ได้: ${FORMATS.join(', ')})`);
  return errors;
}

const fail = (file, errors) => new Error(`config ไม่ถูกต้อง (${file}):\n  - ${errors.join('\n  - ')}`);

/** อ่าน config แล้วเติมค่าเริ่มต้น + ตรวจค่า ถ้าผิดจะ throw พร้อมข้อความภาษาไทย */
export async function loadConfig(configPath, overrides = {}) {
  const file = path.resolve(configPath);
  const raw = await readJson(file);
  const cfg = { ...DEFAULTS, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());

  const errors = basicErrors(cfg);
  if (!/^[\w-]+$/.test(cfg.template)) errors.push(`template ไม่ถูกต้อง: "${cfg.template}"`);
  const templateDir = path.join(ROOT, 'templates', cfg.template);
  try {
    await access(path.join(templateDir, 'index.html'));
  } catch {
    errors.push(`ไม่พบเทมเพลต: templates/${cfg.template}/index.html`);
  }
  if (errors.length) throw fail(file, errors);
  return cfg;
}

/** เก็บสำเนาไฟล์เดิมก่อนเขียนทับ: backup/<ชื่อ>.v1.json (ชื่อซ้ำ → .v1-2.json, .v1-3.json ...) */
async function backupOriginal(file, backupDir) {
  await mkdir(backupDir, { recursive: true });
  const base = path.basename(file).replace(/(\.config)?\.json$/, '');
  let target = path.join(backupDir, `${base}.v1.json`);
  for (let i = 2; await exists(target); i++) target = path.join(backupDir, `${base}.v1-${i}.json`);
  await copyFile(file, target);
}

/**
 * อ่านโปรเจกต์แบบ version 2
 * ถ้าเป็นไฟล์แบบเดิม จะแปลงให้ เก็บสำเนาเดิมไว้ใน backup/ แล้วเขียนไฟล์ใหม่ทับ
 * (แปลงไม่ได้ → throw และไม่แตะไฟล์)
 */
export async function loadProject(configPath, overrides = {}, { backupDir = path.join(ROOT, 'backup') } = {}) {
  const file = path.resolve(configPath);
  let raw = await readJson(file);
  if (raw.version !== 2) {
    let v2;
    try {
      v2 = migrate(raw);
    } catch (err) {
      throw new Error(`${err.message} (${file})`);
    }
    await backupOriginal(file, backupDir);
    await writeFile(file, JSON.stringify(v2, null, 2) + '\n');
    console.log(`แปลงงาน ${path.basename(file)} เป็นรูปแบบใหม่แล้ว (สำเนาเดิมอยู่ใน backup/)`);
    raw = v2;
  }
  const cfg = { ...DEFAULTS_V2, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());
  const errors = [...basicErrors(cfg), ...validateProject(cfg)];
  if (errors.length) throw fail(file, errors);
  return cfg;
}
