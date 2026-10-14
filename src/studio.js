// Studio: หน้าเว็บรวมงานทั้งหมด (npm start)
// - งานแต่ละชิ้นคือไฟล์ <ชื่อ>.config.json ในโฟลเดอร์โปรเจกต์
// - หน้าเว็บเลือกงานด้วย ?c=<ชื่อ> และดู config เริ่มต้นของเทมเพลตด้วย ?c=@<เทมเพลต>
// - API สำหรับสร้าง/ทำสำเนางาน และสั่งเรนเดอร์พร้อมแสดงความคืบหน้า

import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, ROOT } from './config.js';
import { startServer, readJson, sendJson } from './server.js';

const NAME_RE = /^[\w฀-๿-]{1,60}$/; // อังกฤษ ตัวเลข _ - และภาษาไทย
const SUFFIX = '.config.json';
const exists = (p) => access(p).then(() => true, () => false);

export async function listTemplates() {
  const dirs = await readdir(path.join(ROOT, 'templates'), { withFileTypes: true });
  const out = [];
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith('_')) continue;
    const cfg = await readFile(path.join(ROOT, 'templates', d.name, 'default.config.json'), 'utf8')
      .then(JSON.parse, () => ({}));
    out.push({ name: d.name, description: cfg.description || '', resolution: cfg.resolution });
  }
  return out;
}

/** สร้างไฟล์งานใหม่จาก config เริ่มต้นของเทมเพลต หรือจากงานที่มีอยู่ (from) */
export async function createConfig({ template, from, name, vertical }, configDir = ROOT) {
  if (!NAME_RE.test(name || '')) throw new Error('ชื่องานใช้ได้แค่ ตัวอักษร ตัวเลข _ - (ไม่เกิน 60 ตัว)');
  const out = path.join(configDir, `${name}${SUFFIX}`);
  if (await exists(out)) throw new Error(`มีงานชื่อ "${name}" อยู่แล้ว`);
  let src;
  if (from) {
    if (!NAME_RE.test(from)) throw new Error('ชื่องานต้นฉบับไม่ถูกต้อง');
    src = path.join(configDir, `${from}${SUFFIX}`);
  } else {
    if (!/^[\w-]+$/.test(template || '')) throw new Error('เทมเพลตไม่ถูกต้อง');
    src = path.join(ROOT, 'templates', template, 'default.config.json');
  }
  const data = JSON.parse(await readFile(src, 'utf8').catch(() => {
    throw new Error(from ? `ไม่พบงาน "${from}"` : `ไม่พบเทมเพลต "${template}"`);
  }));
  delete data.description;
  delete data.name;
  if (vertical === true) data.resolution = [1080, 1920];
  if (vertical === false) data.resolution = [1920, 1080];
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
      return { name: c, ...(await loadConfig(path.join(ROOT, 'templates', t, 'default.config.json'))) };
    }
    return { name: c, ...(await loadConfig(fileOf(c))) };
  }

  async function onSave(data, url) {
    const c = url.searchParams.get('c') || Object.keys(extra)[0] || 'overlay';
    if (c.startsWith('@')) throw new Error('นี่คือตัวอย่างของเทมเพลต กด "ใช้เทมเพลตนี้" ที่หน้าแรกเพื่อสร้างงานของคุณก่อน');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('config ต้องเป็นออบเจกต์');
    delete data.name;
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
          template: cfg.template,
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

  async function handle(req, res, url) {
    if (!url.pathname.startsWith('/__api/')) return false;
    const route = `${req.method} ${url.pathname}`;
    try {
      if (route === 'GET /__api/configs') return sendJson(res, 200, await listConfigs()), true;
      if (route === 'GET /__api/templates') return sendJson(res, 200, await listTemplates()), true;
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
      sendJson(res, 404, { error: 'ไม่พบ API' });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  return startServer(getConfig, port, { onSave, handle, home: '/studio/index.html' });
}
