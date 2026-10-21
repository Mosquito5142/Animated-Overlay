// Runtime ที่ทุกเทมเพลตใช้ร่วมกัน
// - โหลด config จาก /__config.json (เซิร์ฟเวอร์ของ cli.js เป็นคนเสิร์ฟ)
// - เปิด window.overlay = { ready, config, renderFrame(t) } ให้ renderer เรียกทีละเฟรม
// - โหมด preview: วนเล่นตามเวลาจริง มีพื้นหลังลายตาราง/รูปพื้นหลัง และแถบเลื่อนเวลา
//
// กติกาของเทมเพลต: ทุกแอนิเมชันต้องคำนวณจากเวลา t เท่านั้น (ห้ามใช้ CSS animation / setTimeout)
// เพื่อให้เรนเดอร์ได้ผลเหมือนเดิมทุกครั้ง และวนลูปได้ไม่มีรอยต่อ

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

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, p) => a + (b - a) * p;
/** ความคืบหน้า 0..1 ของช่วงเวลาที่เริ่ม start และยาว dur */
export const progress = (t, start, dur) => clamp01((t - start) / dur);

export const ease = {
  linear: (p) => p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outBack: (p) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
};

/**
 * สร้างฟังก์ชันหาเฟส 0..1 ของแอนิเมชันที่วนซ้ำ โดยปัดคาบให้หารความยาวคลิปลงตัว
 * ทำให้เฟรมสุดท้ายต่อกับเฟรมแรกได้เนียน
 */
export function makeCycle(duration) {
  return (t, approxPeriod) => {
    const n = Math.max(1, Math.round(duration / approxPeriod));
    const x = (t * n) / duration;
    return x - Math.floor(x);
  };
}

/** ตัวช่วยสร้าง element */
export function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

/** ใส่ style ที่ผู้ใช้กำหนดเองใน config (เช่น ย้ายตำแหน่ง) ให้ element */
export function applyStyle(node, style) {
  if (!style) return;
  for (const [k, v] of Object.entries(style)) {
    if (k.startsWith('--')) node.style.setProperty(k, v);
    else node.style[k] = typeof v === 'number' ? `${v}px` : v;
  }
}

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

export async function run(template) {
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

  const ctx = {
    width: W,
    height: H,
    duration: config.duration,
    cycle: makeCycle(config.duration),
  };

  // สร้างทุกชิ้นจาก config (หน้าแก้ไขเรียกซ้ำได้ทุกครั้งที่ config เปลี่ยน)
  const mount = async (cfg) => {
    ctx.config = cfg;
    ctx.intro = !!cfg.intro && mode !== 'edit';
    // หน้าแก้ไขเปิดค่านี้ไว้ เพื่อให้ชิ้นที่โผล่เป็นช่วงๆ (เช่น ป้ายเด้ง) แสดงค้างให้ลากได้
    ctx.showAll ??= mode === 'edit';
    // เลย์เอาต์: "auto" = เลือกตามขนาด (สูงกว่ากว้าง → portrait)
    ctx.layout = cfg.layout && cfg.layout !== 'auto' ? cfg.layout : H > W ? 'portrait' : 'landscape';
    stage.replaceChildren();
    stage.className = ctx.layout;
    stage.removeAttribute('style');
    stage.style.width = `${W}px`;
    stage.style.height = `${H}px`;
    const { fontFile, ...themeVars } = cfg.theme || {};
    for (const [k, v] of Object.entries(themeVars)) stage.style.setProperty(`--${k}`, v);
    // ฟอนต์ที่ผู้ใช้อัปโหลด: โหลดให้เสร็จก่อนวาด เพื่อให้ทุกเฟรมที่เรนเดอร์ใช้ฟอนต์เดียวกัน
    if (fontFile) {
      const family = await loadUserFont(fontFile);
      if (family) stage.style.setProperty('--font', `"${family}", Kanit`);
    }

    await template.build(stage, ctx);
    await document.fonts.ready;
    await waitForImages(stage);
    if (template.measure) template.measure(stage, ctx);
  };
  await mount(config);

  const renderFrame = (t) => template.frame(t, ctx);
  renderFrame(0);

  window.overlay = { ready: true, config, renderFrame };

  if (mode === 'preview') startPreview(stage, ctx, renderFrame);
  if (mode === 'edit') {
    const { startEditor } = await import('./editor.js');
    await startEditor({ stage, ctx, template, mount, renderFrame });
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
