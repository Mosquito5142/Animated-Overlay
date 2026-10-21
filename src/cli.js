#!/usr/bin/env node
import path from 'node:path';
import { readFile, writeFile, access } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadConfig, ROOT } from './config.js';
import { startStudio, listPresets } from './studio.js';
import { openExternal } from './open.js';
import { composite, findFfmpeg } from './encode.js';

const HELP = `
Animated-Overlay — สร้างกรอบ/โฆษณาเคลื่อนไหวพื้นหลังโปร่งใสสำหรับวางทับคลิป

คำสั่ง:
  start                   เปิดหน้า Studio ในเบราว์เซอร์: รวมงานทั้งหมด สร้าง/ปรับแต่ง/ดูตัวอย่าง/เรนเดอร์
  preview                 เหมือน start แต่บอกลิงก์หน้าดูตัวอย่างของ config ที่เลือก
  edit                    เหมือน start แต่บอกลิงก์หน้าปรับแต่งของ config ที่เลือก
  render                  เรนเดอร์ไฟล์ overlay ตาม config
  render --still [วินาที]  เรนเดอร์ภาพนิ่ง PNG โปร่งใส (ค่าเริ่มต้นที่วินาทีที่ 1)
  composite --bg <ไฟล์>    ซ้อน overlay ลงบนคลิป/รูป เพื่อตรวจผล (ได้ไฟล์ .mp4)
  templates               ดูรายชื่อเทมเพลต (preset) ที่มี รวมหน้าเปล่า (blank)
  new <เทมเพลต> <ไฟล์>     สร้าง config ใหม่ เช่น new blank my.config.json หรือ new neon-frame my.config.json
                          (ใส่ --vertical เพื่อทำขนาดแนวตั้ง 1080x1920)
  check                   ตรวจว่าเครื่องมี FFmpeg / Chromium พร้อมใช้

ตัวเลือก:
  -c, --config <ไฟล์>     ไฟล์ config (ค่าเริ่มต้น: overlay.config.json)
  -o, --out <โฟลเดอร์>    โฟลเดอร์ผลลัพธ์ (ค่าเริ่มต้น: output)
  -f, --format <รายการ>   prores,webm,png (ทับค่าใน config)
  -d, --duration <วินาที>  ความยาว (ทับค่าใน config)
      --fps <ตัวเลข>       เฟรมต่อวินาที (ทับค่าใน config)
      --no-open           start: ไม่ต้องเปิดเบราว์เซอร์ให้อัตโนมัติ
      --overlay <ไฟล์>     ไฟล์ overlay ที่ใช้กับ composite (ค่าเริ่มต้น: output/<name>.mov)
  -p, --port <ตัวเลข>      พอร์ตของ Studio (ค่าเริ่มต้น: 5173)
  -h, --help
`;

function parse() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: 'string', short: 'c', default: 'overlay.config.json' },
      out: { type: 'string', short: 'o', default: 'output' },
      format: { type: 'string', short: 'f' },
      duration: { type: 'string', short: 'd' },
      fps: { type: 'string' },
      still: { type: 'boolean' },
      vertical: { type: 'boolean' },
      bg: { type: 'string' },
      overlay: { type: 'string' },
      port: { type: 'string', short: 'p', default: '5173' },
      help: { type: 'boolean', short: 'h' },
      'no-open': { type: 'boolean' },
    },
  });
  const overrides = {};
  if (values.format) overrides.format = values.format;
  if (values.duration) overrides.duration = Number(values.duration);
  if (values.fps) overrides.fps = Number(values.fps);
  return { cmd: positionals[0], rest: positionals.slice(1), values, overrides };
}

/** โหลด Playwright เฉพาะคำสั่งที่ต้องเรนเดอร์ (preview / edit ไม่ต้องใช้) */
async function loadRenderer() {
  try {
    return await import('./render.js');
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && /playwright/.test(err.message)) {
      throw new Error('ยังไม่ได้ติดตั้งแพ็กเกจ ให้รันในโฟลเดอร์โปรเจกต์:\n    npm install\n    npx playwright install chromium');
    }
    throw err;
  }
}

async function main() {
  const { cmd, rest, values, overrides } = parse();
  if (!cmd || values.help) {
    console.log(HELP);
    return;
  }
  if (cmd === 'templates') {
    for (const t of await listPresets()) console.log(`  ${t.name.padEnd(18)} ${t.description}`);
    return;
  }
  if (cmd === 'new') {
    const [template, target] = rest;
    if (!template || !target) throw new Error('ใช้แบบนี้: new <เทมเพลต> <ไฟล์.config.json> [--vertical]');
    const src = path.join(ROOT, 'presets', `${template}.json`);
    const data = JSON.parse(await readFile(src, 'utf8').catch(() => {
      throw new Error(`ไม่พบเทมเพลต "${template}" (ดูรายชื่อด้วยคำสั่ง templates)`);
    }));
    const out = path.resolve(target);
    if (await access(out).then(() => true, () => false)) throw new Error(`มีไฟล์ ${target} อยู่แล้ว จะไม่เขียนทับ`);
    delete data.description;
    if (values.vertical) data.resolution = [1080, 1920];
    await writeFile(out, JSON.stringify(data, null, 2) + '\n');
    console.log(`สร้าง ${target} แล้ว ต่อไป:`);
    console.log('  npm start                        เปิด Studio แล้วกด "ปรับแต่ง" ที่งานนี้');
    console.log(`  npm run render -- -c ${target}   เรนเดอร์`);
    return;
  }

  const configPath = path.resolve(values.config);
  const outDir = path.resolve(values.out);
  const nameFromConfig = path.basename(configPath, '.json').replace(/\.config$/, '');
  const load = async () => ({ name: nameFromConfig, ...(await loadConfig(configPath, overrides)) });

  switch (cmd) {
    case 'start':
    case 'preview':
    case 'edit': {
      // config ที่อยู่ในโฟลเดอร์โปรเจกต์ใช้ชื่อไฟล์เป็นชื่องาน ส่วนที่อยู่ที่อื่นส่งเข้าไปเป็น extra
      const inRoot = path.dirname(configPath) === ROOT && configPath.endsWith('.config.json');
      const extra = inRoot ? {} : { [nameFromConfig]: configPath };
      const { url } = await startStudio({ port: Number(values.port), extra, loadRenderer });
      const cfg = await load().catch(() => null);
      console.log(`\n  Animated-Overlay Studio: ${url}\n`);
      if (cfg && cmd !== 'start') {
        const page = `${url}/templates/_runtime/stage.html?c=${encodeURIComponent(nameFromConfig)}`;
        console.log(`  ${cmd === 'edit' ? 'หน้าปรับแต่ง' : 'หน้าดูตัวอย่าง'}: ${page}${cmd === 'edit' ? '&mode=edit' : ''}\n`);
      }
      console.log('  เปิดลิงก์ด้านบนในเบราว์เซอร์ | ปิดหน้าต่างนี้หรือกด Ctrl+C เพื่อปิดโปรแกรม');
      if (cmd === 'start' && !values['no-open']) openExternal(url);
      return;
    }
    case 'render': {
      const cfg = await load();
      const started = Date.now();
      const { renderStill, renderVideo } = await loadRenderer();
      const outputs = values.still
        ? await renderStill(cfg, outDir, rest[0] != null ? Number(rest[0]) : 1)
        : await renderVideo(cfg, outDir);
      console.log(`เสร็จใน ${((Date.now() - started) / 1000).toFixed(1)} วินาที`);
      for (const o of outputs) console.log(`  → ${path.relative(process.cwd(), o) || o}`);
      return;
    }
    case 'composite': {
      if (!values.bg) throw new Error('ต้องระบุ --bg <ไฟล์คลิปหรือรูป>');
      const cfg = await load();
      const overlay = path.resolve(values.overlay || path.join(outDir, `${cfg.name}.mov`));
      const out = path.join(outDir, `${cfg.name}-composite.mp4`);
      await composite({ background: path.resolve(values.bg), overlay, out, duration: cfg.duration });
      console.log(`  → ${path.relative(process.cwd(), out)}`);
      return;
    }
    case 'check': {
      const ff = await findFfmpeg();
      if (!ff.path) console.log('✗ FFmpeg (รัน npm install ใหม่ จะดาวน์โหลดมาให้)');
      else {
        console.log(`✓ FFmpeg (${ff.source === 'bundled' ? 'ติดมากับโปรแกรม' : 'ในเครื่อง'}: ${ff.path})`);
        for (const [enc, ok] of Object.entries(ff.encoders)) console.log(`  ${ok ? '✓' : '✗'} encoder ${enc}`);
      }
      try {
        const { checkBrowser } = await loadRenderer();
        console.log(`✓ เบราว์เซอร์สำหรับเรนเดอร์: ${await checkBrowser()}`);
      } catch (err) {
        console.log(`✗ ${err.message}`);
      }
      console.log(`โฟลเดอร์โปรเจกต์: ${ROOT}`);
      return;
    }
    default:
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
