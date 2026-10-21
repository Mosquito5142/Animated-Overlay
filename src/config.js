import { readFile, writeFile, copyFile, mkdir, access, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate, projectKind } from './migrate.js';
import { validateProject } from './validate.js';

// fileURLToPath ให้ path ที่ถูกต้องทั้งบน Windows (C:\...) และ macOS/Linux
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FORMATS = ['prores', 'webm', 'png'];

const exists = (p) => access(p).then(() => true, () => false);

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
/** เขียนไฟล์แบบปลอดภัย: เขียนลงไฟล์ชั่วคราวก่อนแล้วค่อยเปลี่ยนชื่อทับ (ไฟล์เดิมไม่เสียถ้าเขียนไม่จบ) */
async function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, text);
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/** รวมค่าเริ่มต้น + ตรวจทั้งหมด คืนรายการข้อผิดพลาด */
function prepare(raw, overrides) {
  const cfg = { ...DEFAULTS_V2, ...raw, ...overrides };
  if (typeof cfg.format === 'string') cfg.format = cfg.format.split(',').map((s) => s.trim());
  if (!Array.isArray(cfg.format)) cfg.format = [];
  return { cfg, errors: [...basicErrors(cfg), ...validateProject(cfg)] };
}

/**
 * อ่านโปรเจกต์แบบ version 2
 * - ไฟล์แบบเดิม (v1): แปลงให้ ตรวจผล แล้วเก็บสำเนาเดิมไว้ใน backup/ ก่อนเขียนไฟล์ใหม่ทับ
 * - ไฟล์ที่มี layers แต่ไม่มี version: ถือเป็น v2 (ไม่แปลงและไม่เขียนทับ)
 * - เวอร์ชันอื่น / แปลงไม่ได้ / แปลงแล้วค่าผิด → throw และไม่แตะไฟล์
 */
export async function loadConfig(configPath, overrides = {}, { backupDir = path.join(ROOT, 'backup') } = {}) {
  const file = path.resolve(configPath);
  let raw = await readJson(file);
  let kind;
  try {
    kind = projectKind(raw);
  } catch (err) {
    throw new Error(`${err.message} (${file})`);
  }
  if (kind === 'v1') {
    let v2;
    try {
      v2 = migrate(raw);
    } catch (err) {
      throw new Error(`${err.message} (${file})`);
    }
    const { errors } = prepare(v2, {});
    if (errors.length) throw fail(file, errors);
    await backupOriginal(file, backupDir);
    await writeAtomic(file, JSON.stringify(v2, null, 2) + '\n');
    console.log(`แปลงงาน ${path.basename(file)} เป็นรูปแบบใหม่แล้ว (สำเนาเดิมอยู่ใน backup/)`);
    raw = v2;
  } else if (raw.version == null) {
    raw = { ...raw, version: 2 };
  }
  const { cfg, errors } = prepare(raw, overrides);
  if (errors.length) throw fail(file, errors);
  return cfg;
}
