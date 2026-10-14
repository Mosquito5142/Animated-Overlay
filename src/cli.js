#!/usr/bin/env node
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { loadConfig, ROOT } from './config.js';
import { startServer } from './server.js';
import { renderStill, renderVideo } from './render.js';
import { composite, run } from './encode.js';

const HELP = `
Animated-Overlay — สร้างกรอบ/โฆษณาเคลื่อนไหวพื้นหลังโปร่งใสสำหรับวางทับคลิป

คำสั่ง:
  preview                 เปิดดูตัวอย่างในเบราว์เซอร์ (แก้ config แล้วรีเฟรชได้เลย)
  edit                    เปิดหน้าแก้ไขแบบลากวาง แล้วบันทึกกลับลงไฟล์ config
  render                  เรนเดอร์ไฟล์ overlay ตาม config
  render --still [วินาที]  เรนเดอร์ภาพนิ่ง PNG โปร่งใส (ค่าเริ่มต้นที่วินาทีที่ 1)
  composite --bg <ไฟล์>    ซ้อน overlay ลงบนคลิป/รูป เพื่อตรวจผล (ได้ไฟล์ .mp4)
  check                   ตรวจว่าเครื่องมี FFmpeg / Chromium พร้อมใช้

ตัวเลือก:
  -c, --config <ไฟล์>     ไฟล์ config (ค่าเริ่มต้น: overlay.config.json)
  -o, --out <โฟลเดอร์>    โฟลเดอร์ผลลัพธ์ (ค่าเริ่มต้น: output)
  -f, --format <รายการ>   prores,webm,png (ทับค่าใน config)
  -d, --duration <วินาที>  ความยาว (ทับค่าใน config)
      --fps <ตัวเลข>       เฟรมต่อวินาที (ทับค่าใน config)
      --intro             ใส่แอนิเมชันเข้าฉากตอนต้น (ไฟล์จะไม่วนลูปเนียน)
      --overlay <ไฟล์>     ไฟล์ overlay ที่ใช้กับ composite (ค่าเริ่มต้น: output/<name>.mov)
  -p, --port <ตัวเลข>      พอร์ตของ preview (ค่าเริ่มต้น: 5173)
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
      intro: { type: 'boolean' },
      still: { type: 'boolean' },
      bg: { type: 'string' },
      overlay: { type: 'string' },
      port: { type: 'string', short: 'p', default: '5173' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const overrides = {};
  if (values.format) overrides.format = values.format;
  if (values.duration) overrides.duration = Number(values.duration);
  if (values.fps) overrides.fps = Number(values.fps);
  if (values.intro) overrides.intro = true;
  return { cmd: positionals[0], rest: positionals.slice(1), values, overrides };
}

async function main() {
  const { cmd, rest, values, overrides } = parse();
  if (!cmd || values.help) {
    console.log(HELP);
    return;
  }
  const configPath = path.resolve(values.config);
  const outDir = path.resolve(values.out);
  const nameFromConfig = path.basename(configPath, '.json').replace(/\.config$/, '');
  const load = async () => ({ name: nameFromConfig, ...(await loadConfig(configPath, overrides)) });

  switch (cmd) {
    case 'preview': {
      await load(); // ตรวจ config ก่อนเปิดเซิร์ฟเวอร์
      const { url } = await startServer(load, Number(values.port));
      console.log(`เปิดดูตัวอย่างได้ที่: ${url}`);
      console.log('  ใส่ ?bg=assets/รูปหรือคลิป เพื่อดูบนพื้นหลังจริง | กด Ctrl+C เพื่อปิด');
      return;
    }
    case 'edit': {
      await load();
      const onSave = async (data) => {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('config ต้องเป็นออบเจกต์');
        delete data.name;
        const before = await readFile(configPath, 'utf8');
        await writeFile(configPath, JSON.stringify(data, null, 2) + '\n');
        try {
          await loadConfig(configPath);
        } catch (err) {
          await writeFile(configPath, before); // ค่าที่ส่งมาใช้ไม่ได้ คืนไฟล์เดิม
          throw err;
        }
        console.log(`บันทึก ${path.relative(process.cwd(), configPath)} แล้ว (${new Date().toLocaleTimeString()})`);
      };
      // หน้าแก้ไขต้องเห็นค่าในไฟล์จริง จึงไม่ใช้ค่าที่ทับจาก command line
      const loadRaw = async () => ({ name: nameFromConfig, ...(await loadConfig(configPath)) });
      const { url } = await startServer(loadRaw, Number(values.port), { onSave });
      console.log(`หน้าแก้ไข: ${url}/?mode=edit`);
      console.log(`  ไฟล์ที่แก้: ${path.relative(process.cwd(), configPath)} | กด Ctrl+C เพื่อปิด`);
      return;
    }
    case 'render': {
      const cfg = await load();
      const started = Date.now();
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
      const { out } = await run('ffmpeg', ['-hide_banner', '-encoders']);
      for (const enc of ['prores_ks', 'libvpx-vp9']) {
        console.log(`${out.includes(enc) ? '✓' : '✗'} ffmpeg encoder ${enc}`);
      }
      const { chromium } = await import('playwright');
      const b = await chromium.launch().catch((e) => e);
      if (b instanceof Error) console.log('✗ Chromium (รัน: npx playwright install chromium)');
      else {
        console.log('✓ Chromium');
        await b.close();
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
