// Studio: หน้าเว็บรวมงานทั้งหมด (npm start)
// - งานแต่ละชิ้นคือไฟล์ <ชื่อ>.config.json ในโฟลเดอร์โปรเจกต์
// - หน้าเว็บเลือกงานด้วย ?c=<ชื่อ> และดูตัวอย่างของ preset ด้วย ?c=@<preset>
// - API สำหรับสร้าง/ทำสำเนางาน และสั่งเรนเดอร์พร้อมแสดงความคืบหน้า

import { readFile, writeFile, readdir, access, mkdir, rename, stat, open as openFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, ROOT } from './config.js';
import { validateProject } from './validate.js';
import { startServer, readJson, sendJson, saveUpload } from './server.js';
import { findFfmpeg } from './encode.js';
import { openExternal } from './open.js';

const NAME_RE = /^[\w฀-๿-]{1,60}$/; // อังกฤษ ตัวเลข _ - และภาษาไทย
const SUFFIX = '.config.json';
const exists = (p) => access(p).then(() => true, () => false);
const MB = 1024 * 1024;

// ไฟล์ที่อัปโหลดได้ (รูปชนิดอื่นจะถูกแปลงเป็น PNG ในเบราว์เซอร์ก่อนส่งมา)
const UPLOAD_KINDS = {
  image: { dir: 'assets/uploads', exts: ['png', 'svg'], limit: 25 * MB },
  background: { dir: 'assets/uploads', exts: ['png', 'svg', 'jpg', 'jpeg', 'webp', 'mp4', 'webm'], limit: 500 * MB },
  font: { dir: 'assets/fonts/uploads', exts: ['ttf', 'otf', 'woff', 'woff2'], limit: 25 * MB },
};
// โฟลเดอร์ที่หน้าคลังไฟล์แสดง (builtin = ไฟล์ตัวอย่างที่มากับโปรแกรม ลบไม่ได้)
const LIBRARY_DIRS = [
  { dir: 'assets/uploads', builtin: false },
  { dir: 'assets/fonts/uploads', builtin: false },
  { dir: 'assets/logos', builtin: true },
];
const typeOf = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['png', 'svg', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
  return null;
};

/** ชื่อไฟล์ที่ปลอดภัย: เหลือแค่ชื่อไฟล์ (ตัด path ทิ้ง) อักษรไทย/อังกฤษ/ตัวเลข/_-. เท่านั้น */
export function safeFileName(name, allowedExts) {
  const base = String(name || '').split(/[\\/]/).pop();
  const ext = path.extname(base).slice(1).toLowerCase();
  if (!allowedExts.includes(ext)) {
    throw new Error(`ไม่รองรับไฟล์ .${ext || '?'} (ใช้ได้: ${allowedExts.map((e) => `.${e}`).join(' ')})`);
  }
  const stem = path.basename(base, path.extname(base))
    .replace(/[^\w\u0E00-\u0E7F.-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80) || 'file';
  return `${stem}.${ext}`;
}

// ตรวจเนื้อไฟล์จริงจาก byte แรกๆ (กันไฟล์เสีย หรือไฟล์อื่นที่ถูกเปลี่ยนนามสกุล)
const SIGNATURES = {
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8,
  webp: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  svg: (b) => /<svg[\s>]/i.test(b.toString('utf8')),
  mp4: (b) => b.toString('latin1', 4, 8) === 'ftyp',
  webm: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  ttf: (b) => b.readUInt32BE(0) === 0x00010000 || b.toString('latin1', 0, 4) === 'true',
  otf: (b) => b.toString('latin1', 0, 4) === 'OTTO',
  woff: (b) => b.toString('latin1', 0, 4) === 'wOFF',
  woff2: (b) => b.toString('latin1', 0, 4) === 'wOF2',
};
SIGNATURES.jpeg = SIGNATURES.jpg;

async function checkSignature(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const fh = await openFile(file, 'r');
  try {
    const buf = Buffer.alloc(1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    const head = buf.subarray(0, bytesRead);
    // ttf/otf บางไฟล์ใช้ header ของอีกแบบ จึงยอมรับทั้งสองแบบสำหรับฟอนต์ OpenType
    const ok = bytesRead >= 12 && (SIGNATURES[ext]?.(head) || (['ttf', 'otf'].includes(ext) && (SIGNATURES.ttf(head) || SIGNATURES.otf(head))));
    if (!ok) throw new Error(`ไฟล์เสียหรือไม่ใช่ไฟล์ .${ext} จริง`);
  } finally {
    await fh.close();
  }
}

async function uniquePath(dir, file) {
  const ext = path.extname(file);
  const stem = path.basename(file, ext);
  let candidate = file;
  for (let i = 2; await exists(path.join(dir, candidate)); i++) candidate = `${stem}-${i}${ext}`;
  return path.join(dir, candidate);
}

/** ย้ายไฟล์ไปถังขยะ .trash/ (กู้คืนได้ด้วยการย้ายกลับ) */
async function moveToTrash(file) {
  const trash = path.join(ROOT, '.trash');
  await mkdir(trash, { recursive: true });
  const dest = await uniquePath(trash, path.basename(file));
  await rename(file, dest);
  return dest;
}

const PRESETS = path.join(ROOT, 'presets');

/** รายชื่อ preset (หน้าเปล่า + เทมเพลต) หน้าเปล่ามาก่อนเสมอ */
export async function listPresets() {
  const out = [];
  for (const f of await readdir(PRESETS)) {
    if (!f.endsWith('.json')) continue;
    const cfg = JSON.parse(await readFile(path.join(PRESETS, f), 'utf8'));
    out.push({ name: f.slice(0, -5), description: cfg.description || '', resolution: cfg.resolution, layers: cfg.layers.length });
  }
  return out.sort((a, b) => (a.name === 'blank' ? -1 : b.name === 'blank' ? 1 : a.name.localeCompare(b.name)));
}

const orientationOf = ([w, h]) => (h > w ? 'portrait' : 'landscape');

/**
 * เปลี่ยนขนาดจอเป็นแนวตั้ง (vertical = true) / แนวนอน (false) / คงเดิม (undefined)
 * ถ้า preset มี orientations.<แนว> = { <id ชิ้น>: style } จะใช้ style นั้นแทนของเดิม
 * (ตำแหน่งใน preset เป็นพิกเซลของแนวเดิม เปลี่ยนแนวแล้วชิ้นจะล้นหรือบีบจนหาย)
 * ลบ orientations / description ออกเสมอ เพราะไม่ใช่ส่วนของงาน
 */
export function applyOrientation(data, vertical) {
  const { orientations = {}, ...out } = data;
  delete out.description;
  if (vertical === true || vertical === false) {
    const resolution = vertical ? [1080, 1920] : [1920, 1080];
    const target = orientationOf(resolution);
    if (Array.isArray(out.resolution) && orientationOf(out.resolution) !== target && orientations[target]) {
      const styles = orientations[target];
      out.layers = (out.layers || []).map((l) => (styles[l.id] ? { ...l, style: { ...styles[l.id] } } : l));
    }
    out.resolution = resolution;
  }
  return out;
}

/** อ่าน preset แล้วคืนข้อมูลงานใหม่ (ใช้ทั้งหน้า Studio และคำสั่ง new ใน CLI) */
export async function presetProject(preset, vertical) {
  if (!/^[\w-]+$/.test(preset || '')) throw new Error('เทมเพลตไม่ถูกต้อง');
  const data = JSON.parse(await readFile(path.join(PRESETS, `${preset}.json`), 'utf8').catch(() => {
    throw new Error(`ไม่พบเทมเพลต "${preset}"`);
  }));
  return applyOrientation(data, vertical);
}

/** สร้างไฟล์งานใหม่จาก preset (หน้าเปล่า/เทมเพลต) หรือทำสำเนาจากงานที่มีอยู่ (from) */
export async function createConfig({ preset, from, name, vertical }, configDir = ROOT) {
  if (!NAME_RE.test(name || '')) throw new Error('ชื่องานใช้ได้แค่ ตัวอักษร ตัวเลข _ - (ไม่เกิน 60 ตัว)');
  const out = path.join(configDir, `${name}${SUFFIX}`);
  if (await exists(out)) throw new Error(`มีงานชื่อ "${name}" อยู่แล้ว`);
  let data;
  if (from) {
    if (!NAME_RE.test(from)) throw new Error('ชื่องานต้นฉบับไม่ถูกต้อง');
    const src = path.join(configDir, `${from}${SUFFIX}`);
    if (!(await exists(src))) throw new Error(`ไม่พบงาน "${from}"`);
    data = applyOrientation(await loadConfig(src), vertical);
  } else {
    data = await presetProject(preset, vertical);
  }
  delete data.name;
  await writeFile(out, JSON.stringify(data, null, 2) + '\n');
  return { name, file: out };
}

/**
 * เปิดเซิร์ฟเวอร์ studio
 * extra: { name: path } สำหรับ config ที่อยู่นอกโฟลเดอร์โปรเจกต์ (ส่งมาด้วย -c)
 */
export async function startStudio({ port = 5173, extra = {}, loadRenderer }) {
  const fileOf = (name) => {
    if (extra[name]) return extra[name];
    if (!NAME_RE.test(name || '')) throw new Error(`ชื่องานไม่ถูกต้อง: ${name}`);
    return path.join(ROOT, `${name}${SUFFIX}`);
  };

  async function getConfig(url) {
    const c = url.searchParams.get('c') || Object.keys(extra)[0] || 'overlay';
    if (c.startsWith('@')) {
      const t = c.slice(1);
      if (!/^[\w-]+$/.test(t)) throw new Error('เทมเพลตไม่ถูกต้อง');
      return { name: c, ...(await loadConfig(path.join(PRESETS, `${t}.json`))) };
    }
    return { name: c, ...(await loadConfig(fileOf(c))) };
  }

  async function onSave(data, url) {
    const c = url.searchParams.get('c') || Object.keys(extra)[0] || 'overlay';
    if (c.startsWith('@')) throw new Error('นี่คือตัวอย่างของเทมเพลต กด "ใช้เทมเพลตนี้" ที่หน้าแรกเพื่อสร้างงานของคุณก่อน');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('config ต้องเป็นออบเจกต์');
    delete data.name;
    const errors = validateProject(data, { strict: true });
    if (errors.length) throw new Error(`บันทึกไม่ได้:\n  - ${errors.join('\n  - ')}`);
    const file = fileOf(c);
    const before = await readFile(file, 'utf8');
    await writeFile(file, JSON.stringify(data, null, 2) + '\n');
    try {
      await loadConfig(file);
    } catch (err) {
      await writeFile(file, before); // ค่าที่ส่งมาใช้ไม่ได้ คืนไฟล์เดิม
      throw err;
    }
    console.log(`บันทึก ${c} แล้ว (${new Date().toLocaleTimeString()})`);
  }

  async function listConfigs() {
    const names = new Set(Object.keys(extra));
    for (const f of await readdir(ROOT)) {
      if (f.endsWith(SUFFIX) && NAME_RE.test(f.slice(0, -SUFFIX.length))) names.add(f.slice(0, -SUFFIX.length));
    }
    const outputs = await readdir(path.join(ROOT, 'output')).catch(() => []);
    const list = [];
    for (const name of [...names].sort()) {
      try {
        const cfg = await loadConfig(fileOf(name));
        list.push({
          name,
          layers: cfg.layers.length,
          resolution: cfg.resolution,
          duration: cfg.duration,
          format: cfg.format,
          outputs: outputs.filter((o) => /\.(mov|webm|png|mp4)$/i.test(o) && (o.startsWith(`${name}.`) || o.startsWith(`${name}-composite.`))),
        });
      } catch (err) {
        list.push({ name, error: err.message });
      }
    }
    return list;
  }

  // งานเรนเดอร์ทำทีละงาน
  const jobs = new Map();
  let running = null;

  async function startRender(name, still) {
    if (running) throw new Error(`กำลังเรนเดอร์ "${running.name}" อยู่ รอให้เสร็จก่อน`);
    const cfg = { name, ...(await loadConfig(fileOf(name))) };
    const { renderStill, renderVideo } = await loadRenderer();
    const job = { id: `${Date.now()}`, name, status: 'running', phase: 'start', done: 0, total: 0, outputs: [] };
    jobs.set(job.id, job);
    running = job;
    const outDir = path.join(ROOT, 'output');
    const started = Date.now();
    (still
      ? renderStill(cfg, outDir, Math.min(1, cfg.duration / 2))
      : renderVideo(cfg, outDir, { onProgress: (p) => Object.assign(job, p) })
    )
      .then((outs) => {
        job.status = 'done';
        job.outputs = outs.map((o) => path.relative(ROOT, o).split(path.sep).join('/'));
        console.log(`เรนเดอร์ ${name} เสร็จใน ${((Date.now() - started) / 1000).toFixed(1)} วินาที`);
      })
      .catch((err) => {
        job.status = 'error';
        job.error = err.message;
        console.error(`เรนเดอร์ ${name} ไม่สำเร็จ: ${err.message}`);
      })
      .finally(() => {
        running = null;
      });
    return job;
  }

  async function readAllConfigs() {
    const out = [];
    const names = new Set(Object.keys(extra));
    for (const f of await readdir(ROOT)) {
      if (f.endsWith(SUFFIX)) names.add(f.slice(0, -SUFFIX.length));
    }
    for (const name of names) {
      try {
        out.push({ name, text: await readFile(fileOf(name), 'utf8') });
      } catch {
        // ชื่อไฟล์ไม่ตรงรูปแบบ หรืออ่านไม่ได้ ข้ามไป
      }
    }
    return out;
  }

  async function listAssets() {
    const configs = await readAllConfigs();
    const list = [];
    for (const { dir, builtin } of LIBRARY_DIRS) {
      const files = await readdir(path.join(ROOT, dir)).catch(() => []);
      for (const f of files) {
        const type = typeOf(f);
        if (!type || f.endsWith('.part')) continue;
        const rel = `${dir}/${f}`;
        const info = await stat(path.join(ROOT, dir, f));
        // config เก็บ path เป็น JSON string จึงหาแบบ JSON.stringify เพื่อให้ตรงกับอักขระที่ถูก escape
        const needle = JSON.stringify(rel).slice(1, -1);
        const usedBy = configs.filter((c) => c.text.includes(needle)).map((c) => c.name);
        list.push({ path: rel, name: f, type, size: info.size, builtin, usedBy, mtime: info.mtimeMs });
      }
    }
    return list.sort((a, b) => a.builtin - b.builtin || b.mtime - a.mtime);
  }

  async function upload(req, url) {
    const kind = UPLOAD_KINDS[url.searchParams.get('kind')];
    if (!kind) throw new Error('ชนิดไฟล์ไม่ถูกต้อง');
    const file = safeFileName(url.searchParams.get('name'), kind.exts);
    const dir = path.join(ROOT, kind.dir);
    await mkdir(dir, { recursive: true });
    const dest = await uniquePath(dir, file);
    await saveUpload(req, dest, kind.limit);
    try {
      await checkSignature(dest);
    } catch (err) {
      await unlink(dest).catch(() => {});
      throw err;
    }
    const rel = `${kind.dir}/${path.basename(dest)}`;
    console.log(`อัปโหลด ${rel}`);
    return { path: rel, name: path.basename(dest) };
  }

  async function deleteProject(name) {
    if (!NAME_RE.test(name || '') || extra[name]) throw new Error('ลบงานนี้จากหน้าเว็บไม่ได้');
    const file = fileOf(name);
    if (running?.name === name) throw new Error('งานนี้กำลังเรนเดอร์อยู่ รอให้เสร็จก่อน');
    if (!(await exists(file))) throw new Error(`ไม่พบงาน "${name}"`);
    await moveToTrash(file);
    console.log(`ย้ายงาน ${name} ไปที่ .trash/ แล้ว`);
  }

  async function deleteAsset(rel) {
    const assets = await listAssets();
    const item = assets.find((a) => a.path === rel);
    if (!item) throw new Error('ไม่พบไฟล์');
    if (item.builtin) throw new Error('ไฟล์ตัวอย่างที่มากับโปรแกรมลบไม่ได้');
    if (item.usedBy.length) throw new Error(`ไฟล์นี้ยังถูกใช้ในงาน: ${item.usedBy.join(', ')}`);
    await moveToTrash(path.join(ROOT, rel));
    console.log(`ย้าย ${rel} ไปที่ .trash/ แล้ว`);
  }

  let health = null;
  async function checkHealth(refresh) {
    if (health && !refresh) return health;
    const ff = await findFfmpeg();
    const result = {
      ffmpeg: { ok: !!ff.path && Object.values(ff.encoders).every(Boolean), source: ff.source, encoders: ff.encoders },
      browser: { ok: false },
    };
    try {
      const { checkBrowser } = await loadRenderer();
      result.browser = { ok: true, name: await checkBrowser() };
    } catch (err) {
      result.browser = { ok: false, error: err.message };
    }
    return (health = result);
  }

  const FOLDERS = { output: 'output', assets: 'assets/uploads' };

  async function handle(req, res, url) {
    if (!url.pathname.startsWith('/__api/')) return false;
    const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /__api/configs') return sendJson(res, 200, await listConfigs()), true;
      if (route === 'GET /__api/templates') return sendJson(res, 200, await listPresets()), true;
      if (route === 'POST /__api/new') {
        const { name } = await createConfig(await readJson(req));
        console.log(`สร้างงาน ${name} แล้ว`);
        return sendJson(res, 200, { name }), true;
      }
      if (route === 'POST /__api/render') {
        const body = await readJson(req);
        const job = await startRender(body.name, !!body.still);
        return sendJson(res, 200, job), true;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/__api/jobs/')) {
        const job = jobs.get(url.pathname.slice('/__api/jobs/'.length));
        return sendJson(res, job ? 200 : 404, job || { error: 'ไม่พบงานเรนเดอร์' }), true;
      }
      if (route === 'GET /__api/running') return sendJson(res, 200, running || {}), true;
      if (route === 'POST /__api/upload') return sendJson(res, 200, await upload(req, url)), true;
      if (route === 'GET /__api/assets') return sendJson(res, 200, await listAssets()), true;
      if (route === 'POST /__api/delete') {
        await deleteProject((await readJson(req)).name);
        return sendJson(res, 200, { ok: true }), true;
      }
      if (route === 'POST /__api/delete-asset') {
        await deleteAsset((await readJson(req)).path);
        return sendJson(res, 200, { ok: true }), true;
      }
      if (route === 'GET /__api/health') {
        return sendJson(res, 200, await checkHealth(url.searchParams.get('refresh') === '1')), true;
      }
      if (route === 'POST /__api/open-folder') {
        const rel = FOLDERS[(await readJson(req)).which];
        if (!rel) throw new Error('เปิดได้เฉพาะโฟลเดอร์ output หรือ assets');
        const dir = path.join(ROOT, rel);
        await mkdir(dir, { recursive: true });
        openExternal(dir);
        return sendJson(res, 200, { ok: true, path: dir }), true;
      }
      sendJson(res, 404, { error: 'ไม่พบ API' });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  return startServer(getConfig, port, { onSave, handle, home: '/studio/index.html' });
}
