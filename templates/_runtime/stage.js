// Stage: หน้าเดียวที่แสดงทุกโปรเจกต์ (preview / edit / render)
// - โหลด config จาก /__config.json แล้วสร้างทุก layer จากโมดูลใน elements/<type>/
// - ส่วนกลางจัดการ ตำแหน่ง ลำดับการทับ ธีม เวลาโผล่/หาย และท่าเข้า/ออก
//   ส่วนตัวชิ้นทำแค่หน้าตาและท่าวนของตัวเอง
// - เปิด window.overlay = { ready, config, renderFrame(t) } ให้ renderer เรียกทีละเฟรม
//
// กติกา: ทุกแอนิเมชันต้องคำนวณจากเวลา t เท่านั้น (ห้ามใช้ CSS animation / setTimeout)
// เพื่อให้เรนเดอร์ได้ผลเหมือนเดิมทุกครั้ง และวนลูปได้ไม่มีรอยต่อ

import { el, applyStyle } from './dom.js';
import { makeCycle, layerSpan, layerMotion } from './timing.js';
import { CATALOG } from '../../elements/catalog.js';

const params = new URLSearchParams(location.search);
export const mode = ['render', 'edit'].includes(params.get('mode')) ? params.get('mode') : 'preview';
/** ชื่องานที่เปิดอยู่ (?c=) ใช้ตอนโหลด/บันทึก config ในหน้า Studio */
export const configName = params.get('c');
const withC = (u) => (configName ? `${u}${u.includes('?') ? '&' : '?'}c=${encodeURIComponent(configName)}` : u);
export const configUrl = () => withC('/__config.json');
export const saveUrl = () => withC('/__save');
/** ลิงก์ไปหน้าเดียวกันในโหมดอื่น (preview / edit) โดยคงงานที่เลือกไว้ */
export function modeUrl(m) {
  const q = new URLSearchParams(location.search);
  if (m === 'preview') q.delete('mode');
  else q.set('mode', m);
  q.delete('embed');
  return `${location.pathname}?${q}`;
}

// โมดูลของแต่ละชนิด โหลดครั้งเดียวพร้อม style.css
const modules = {};
function loadType(type) {
  if (!CATALOG[type]) return Promise.resolve(null);
  if (!modules[type]) {
    const link = el('link', '', document.head);
    link.rel = 'stylesheet';
    link.href = `/elements/${type}/style.css`;
    const css = new Promise((res) => {
      link.onload = res;
      link.onerror = res;
    });
    modules[type] = Promise.all([import(`/elements/${type}/index.js`), css]).then(([m]) => m.default);
  }
  return modules[type];
}

/** แสดงกล่องเตือนแทนชิ้นที่ใช้ไม่ได้ ชิ้นอื่นยังทำงานต่อ */
function markBroken(item, message) {
  item.broken = message;
  item.root.className = 'el el-broken';
  item.root.replaceChildren();
  item.root.textContent = `⚠ ${message}`;
}

const loadedFonts = new Map();

/** โหลดไฟล์ฟอนต์ (เช่น assets/fonts/uploads/x.ttf) คืนชื่อ family ที่ใช้ใน CSS หรือ null ถ้าโหลดไม่ได้ */
export async function loadUserFont(file) {
  if (loadedFonts.has(file)) return loadedFonts.get(file);
  const family = `UserFont-${file.replace(/[^\w]+/g, '_')}`;
  const src = file.startsWith('/') ? file : `/${file}`;
  try {
    const face = new FontFace(family, `url("${encodeURI(src)}")`);
    await face.load();
    document.fonts.add(face);
    loadedFonts.set(file, family);
    return family;
  } catch (err) {
    console.warn(`โหลดฟอนต์ไม่ได้: ${file}`, err);
    loadedFonts.set(file, null);
    return null;
  }
}

/**
 * ใส่ธีมเป็น CSS variable (ใช้ทั้งธีมของโปรเจกต์ที่ #stage และธีมเฉพาะชิ้นที่ .layer)
 * fontFile = ฟอนต์ที่ผู้ใช้อัปโหลด: โหลดให้เสร็จก่อนวาด เพื่อให้ทุกเฟรมที่เรนเดอร์ใช้ฟอนต์เดียวกัน
 */
async function applyTheme(node, theme = {}) {
  const { fontFile, ...vars } = theme;
  for (const [k, v] of Object.entries(vars)) node.style.setProperty(`--${k}`, v);
  if (fontFile) {
    const family = await loadUserFont(fontFile);
    if (family) node.style.setProperty('--font', `"${family}", Kanit`);
  }
}

/** มีตำแหน่งแล้วหรือยัง (ยังไม่มี → stage จัดให้ เช่น กลางจอ) */
const isPlaced = (s) => !!s && ['left', 'right', 'top', 'bottom'].some((k) => s[k] != null && s[k] !== 'auto');

function waitForImages(root) {
  const imgs = [...root.querySelectorAll('img')];
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', () => {
              console.warn('โหลดรูปไม่ได้:', img.src);
              res();
            }, { once: true });
          }),
    ),
  );
}

export async function run() {
  const res = await fetch(configUrl(), { cache: 'no-store' });
  const config = await res.json();
  if (!res.ok) throw new Error(config.error || res.statusText);
  const [W, H] = config.resolution;

  document.documentElement.classList.add(`mode-${mode}`);
  const stage = document.getElementById('stage');
  for (const node of [stage, document.getElementById('viewport')]) {
    node.style.width = `${W}px`;
    node.style.height = `${H}px`;
  }

  const ctx = { width: W, height: H, duration: config.duration, cycle: makeCycle(config.duration) };
  let items = [];

  // สร้างทุก layer จาก config (หน้าแก้ไขเรียกซ้ำได้ทุกครั้งที่ config เปลี่ยน)
  const mount = async (cfg) => {
    ctx.config = cfg;
    // หน้าแก้ไขเปิดค่านี้ไว้ เพื่อให้ชิ้นที่โผล่เป็นช่วงๆ แสดงค้างให้ลากได้
    ctx.showAll ??= mode === 'edit';
    // เลย์เอาต์: "auto" = เลือกตามขนาด (สูงกว่ากว้าง → portrait)
    ctx.layout = cfg.layout && cfg.layout !== 'auto' ? cfg.layout : H > W ? 'portrait' : 'landscape';
    stage.replaceChildren();
    stage.className = ctx.layout;
    stage.removeAttribute('style');
    stage.style.width = `${W}px`;
    stage.style.height = `${H}px`;
    await applyTheme(stage, cfg.theme);

    items = [];
    for (const layer of cfg.layers || []) {
      if (layer.hidden) continue;
      const def = CATALOG[layer.type];
      const wrap = el('div', `layer${def?.fullscreen ? ' fullscreen' : ''}`, stage);
      wrap.dataset.id = layer.id;
      const motion = el('div', 'motion', wrap);
      const root = el('div', `el el-${layer.type}`, motion);
      await applyTheme(wrap, layer.theme);
      if (!def?.fullscreen) applyStyle(wrap, layer.style);
      const item = { layer, def, wrap, motion, root, mod: null, state: null, broken: null };
      items.push(item);
      const mod = await loadType(layer.type);
      if (!mod) {
        markBroken(item, `ไม่รู้จักชิ้น "${layer.type}"`);
        continue;
      }
      item.mod = mod;
      try {
        item.state = mod.build(root, layer.props || {}, ctx, layer);
      } catch (err) {
        console.error(err);
        markBroken(item, `${def.label}: ${err.message}`);
      }
    }

    await document.fonts.ready;
    await waitForImages(stage);
    for (const item of items) {
      if (item.broken) continue;
      try {
        item.mod.measure?.(item.state, ctx);
      } catch (err) {
        console.error(err);
        markBroken(item, `${item.def.label}: ${err.message}`);
      }
    }
    // ชิ้นที่ยังไม่มีตำแหน่ง: ให้โมดูลจัดเอง (เช่น ป้ายนีออนกลางขอบบน) หรือวางกลางจอ
    for (const item of items) {
      if (item.def?.fullscreen || isPlaced(item.layer.style)) continue;
      const pos = (!item.broken && item.mod?.place?.(item.wrap, ctx)) || {
        left: Math.round((W - item.wrap.offsetWidth) / 2),
        top: Math.round((H - item.wrap.offsetHeight) / 2),
      };
      item.wrap.style.left = `${pos.left}px`;
      item.wrap.style.top = `${pos.top}px`;
    }

    const problems = items.filter((i) => i.broken).map((i) => `${i.layer.id}: ${i.broken}`);
    if (mode === 'render' && problems.length) throw new Error(`มีชิ้นที่ใช้ไม่ได้:\n${problems.join('\n')}`);
  };
  await mount(config);

  const renderFrame = (t) => {
    // อ่านตำแหน่งทั้งหมดก่อน แล้วค่อยเขียน (ไม่ให้เบราว์เซอร์คำนวณ layout ซ้ำ)
    const boxes = items.map(({ wrap }) => ({ x: wrap.offsetLeft, y: wrap.offsetTop, w: wrap.offsetWidth, h: wrap.offsetHeight }));
    items.forEach((item, i) => {
      const span = layerSpan(item.layer, t, ctx.duration);
      span.showAll = !!ctx.showAll;
      const visible = span.showAll || span.visible;
      item.wrap.style.visibility = visible ? '' : 'hidden';
      if (!visible) return;
      const m = span.showAll ? null : layerMotion(item.layer, span, boxes[i], W, H);
      const moved = m && (m.x || m.y || m.scale !== 1);
      item.motion.style.transform = moved ? `translate(${m.x}px, ${m.y}px) scale(${m.scale})` : '';
      item.motion.style.opacity = m && m.opacity !== 1 ? String(m.opacity) : '';
      if (item.broken || !item.mod.frame) return;
      try {
        item.mod.frame(item.state, t, span, ctx);
      } catch (err) {
        console.error(err);
        markBroken(item, `${item.def.label}: ${err.message}`);
        if (mode === 'render') throw err;
      }
    });
  };
  renderFrame(0);

  window.overlay = { ready: true, config, renderFrame };

  if (mode === 'preview') startPreview(stage, ctx, renderFrame);
  if (mode === 'edit') {
    const { startEditor } = await import('./editor/index.js');
    await startEditor({ stage, ctx, mount, renderFrame });
  }
}

/** ใส่รูป/คลิปพื้นหลังใต้ overlay (เฉพาะ preview/edit ไม่ติดไปในไฟล์ที่เรนเดอร์) */
export function setPreviewBackground(bg) {
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  viewport.querySelector('.preview-bg')?.remove();
  viewport.classList.toggle('has-bg', !!bg);
  if (!bg) return;
  const isVideo = /\.(mp4|webm|mov)$/i.test(bg);
  const media = el(isVideo ? 'video' : 'img', 'preview-bg');
  media.src = bg.startsWith('/') || /^https?:/.test(bg) ? bg : `/${bg}`;
  if (isVideo) Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true });
  viewport.insertBefore(media, stage);
}

function startPreview(stage, ctx, renderFrame) {
  const { width: W, height: H, duration: D } = ctx;
  const viewport = document.getElementById('viewport');
  setPreviewBackground(params.get('bg') || ctx.config.preview?.background);
  // embed=1: ภาพตัวอย่างเล็กในหน้า Studio ไม่ต้องมีแถบควบคุม
  const embed = params.get('embed') === '1';
  if (embed) document.documentElement.classList.add('embed');
  const fit = () => {
    const bar = embed ? 0 : 56;
    const s = Math.min(window.innerWidth / W, (window.innerHeight - bar) / H);
    viewport.style.transform = `scale(${s})`;
    document.getElementById('preview-wrap').style.height = `${H * s}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  const ui = document.getElementById('preview-ui');
  ui.hidden = embed;
  if (!embed) {
    // ปุ่มไปหน้าปรับแต่ง / หน้าแรก
    const edit = el('a', 'pv-btn primary', ui, '✏️ ปรับแต่ง');
    edit.href = modeUrl('edit');
    const home = el('a', 'pv-btn', ui, '🏠 หน้าแรก');
    home.href = '/studio/index.html';
    ui.prepend(home);
    ui.append(edit);
  }
  const playBtn = ui.querySelector('[data-play]');
  const scrub = ui.querySelector('[data-scrub]');
  const label = ui.querySelector('[data-time]');
  scrub.max = String(D);

  let playing = true;
  let t = 0;
  let last = performance.now();
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
  });
  scrub.addEventListener('input', () => {
    t = Number(scrub.value);
    playing = false;
    playBtn.textContent = '▶';
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  });

  const loop = (now) => {
    if (playing) t = (t + (now - last) / 1000) % D;
    last = now;
    renderFrame(t);
    scrub.value = String(t);
    label.textContent = `${t.toFixed(2)} / ${D.toFixed(2)} s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
