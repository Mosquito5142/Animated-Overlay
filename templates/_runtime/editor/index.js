// หน้าแก้ไข (mode=edit)
// - สถานะงานที่กำลังแก้ ประวัติย้อนกลับ บันทึก (POST /__save) และเรนเดอร์
// - ลากชิ้นบนจอเพื่อย้าย / ปุ่มลูกศรขยับทีละ 1px (Shift = 10px) / คลิกที่ว่าง = ยกเลิกการเลือก
// - ลากไฟล์รูปมาวางบนจอ รูปจะเข้าชิ้นที่วางทับ (หรือชิ้นที่เลือกอยู่)
// - แผงคลังชิ้นส่วน / Layers / คุณสมบัติ แยกไฟล์ไว้ (งาน 2 จะย้ายไปวางในแผงใหม่)

import { el, applyStyle } from '../dom.js';
import { setPreviewBackground, saveUrl, modeUrl, configName } from '../stage.js';
import { uploadFile } from '../upload.js';
import { CATALOG } from '../../../elements/catalog.js';
import * as commands from './commands.js';
import { openLibrary } from './library.js';
import { renderLayers } from './layers.js';
import { renderInspector, field } from './inspector.js';
import { imageField, fontSelect } from './media.js';

const THEME_LABELS = { primary: 'สีหลัก', accent: 'สีเน้น', panel: 'สีพื้นกล่อง', text: 'สีตัวอักษร' };
const THEME_DEFAULTS = { primary: '#e3122c', accent: '#ffd400', panel: '#141418', text: '#ffffff' };
const POSITION_KEYS = ['left', 'right', 'top', 'bottom', 'width', 'transform-origin', 'transformOrigin'];

export async function startEditor({ stage, ctx, mount, renderFrame }) {
  const W = ctx.width;
  const H = ctx.height;
  const D = ctx.duration;

  // สำเนาที่กำลังแก้ (ไม่รวม name ที่เซิร์ฟเวอร์ใส่มาให้)
  const working = structuredClone(ctx.config);
  const configNameFallback = working.name;
  delete working.name;
  working.layers ||= [];
  working.theme ||= {};
  working.preview ||= {};

  let selected = null;
  let t = Math.min(1, D / 2); // เริ่มที่ 1 วินาที ทุกชิ้นโผล่ครบแล้ว
  let playing = false;
  let dirty = false;
  const history = [];

  // ---------- โครงหน้าจอ ----------
  const viewport = document.getElementById('viewport');
  const wrap = document.getElementById('preview-wrap');
  const emptyHint = el('div', 'ed-empty', wrap, 'ยังไม่มีชิ้นส่วน — กด ＋ เพิ่มชิ้น เพื่อเริ่ม');
  const panel = el('aside', '', document.body);
  panel.id = 'editor-panel';

  const head = el('div', 'ed-head', panel);
  el('div', 'ed-title', head, `ปรับแต่ง: ${configName || configNameFallback || 'config'}`);
  const status = el('div', 'ed-status', head, 'บันทึกแล้ว');
  const headBtns = el('div', 'ed-row', head);
  const undoBtn = el('button', '', headBtns, '↶ ย้อนกลับ');
  const saveBtn = el('button', 'primary', headBtns, '💾 บันทึก');
  const navBtns = el('div', 'ed-row ed-nav', head);
  const homeLink = el('a', 'ed-link', navBtns, '🏠 หน้าแรก');
  homeLink.href = '/studio/index.html';
  const previewLink = el('a', 'ed-link', navBtns, '▶ ดูตัวอย่าง');
  previewLink.href = modeUrl('preview');
  const renderBtn = el('button', '', navBtns, '🎬 เรนเดอร์');
  const isTemplateDemo = configName?.startsWith('@');
  if (isTemplateDemo) {
    renderBtn.disabled = true;
    saveBtn.disabled = true;
    el('div', 'ed-warn', head, 'นี่คือตัวอย่างของเทมเพลต ลองปรับดูได้ แต่ต้องกลับไปกด "ใช้เทมเพลตนี้" ที่หน้าแรกก่อนถึงจะบันทึกได้');
  }

  const timeSec = section('เวลา (ดูท่าทางแอนิเมชัน)');
  const timeRow = el('div', 'ed-row', timeSec);
  const playBtn = el('button', '', timeRow, '▶');
  const scrub = el('input', '', timeRow);
  Object.assign(scrub, { type: 'range', min: 0, max: D, step: 0.01, value: t });
  renderFrame(t);

  const showRow = el('label', 'ed-row ed-check', timeSec);
  const showAll = el('input', '', showRow);
  showAll.type = 'checkbox';
  showAll.checked = !!ctx.showAll;
  el('span', '', showRow, 'แสดงทุกชิ้นค้างไว้ (ปิดเพื่อดูจังหวะโผล่จริง)');
  showAll.addEventListener('change', () => {
    ctx.showAll = showAll.checked;
    renderFrame(t);
  });

  const layersSec = section('Layers');
  const layersHead = layersSec.querySelector('h3');
  layersHead.classList.add('ed-sec-head');
  const addBtn = el('button', 'primary', layersHead, '＋ เพิ่มชิ้น');
  const layersBox = el('div', 'ed-list', layersSec);

  const propSec = section('ชิ้นที่เลือก');
  const props = el('div', '', propSec);

  const themeSec = section('ธีมของโปรเจกต์');
  const generalSec = section('ทั่วไป');

  el('p', 'ed-hint', panel,
    'ลากชิ้นส่วนบนจอเพื่อย้าย • ลูกศรขยับ 1px (Shift = 10px) • Ctrl+S บันทึก • Ctrl+Z ย้อนกลับ\n' +
    'ตำแหน่งจะยึดกับขอบจอที่ใกล้ที่สุด');

  async function api(url, body) {
    const res = await fetch(url, body ? {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    } : { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function section(title) {
    const s = el('section', 'ed-sec', panel);
    el('h3', '', s, title);
    return s;
  }

  // ---------- ย่อ/ขยายจอให้พอดี ----------
  let scale = 1;
  const fit = () => {
    const availW = window.innerWidth - panel.offsetWidth - 48;
    const availH = window.innerHeight - 32;
    scale = Math.min(availW / W, availH / H);
    viewport.style.transform = `scale(${scale})`;
    wrap.style.width = `${W * scale}px`;
    wrap.style.height = `${H * scale}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  setPreviewBackground(working.preview.background);

  // ---------- สถานะ / ประวัติ ----------
  function markDirty() {
    dirty = true;
    status.textContent = '● ยังไม่ได้บันทึก';
    status.classList.add('dirty');
  }
  function snapshot() {
    history.push(JSON.stringify(working));
    if (history.length > 100) history.shift();
  }
  async function undo() {
    const prev = history.pop();
    if (!prev) return;
    const data = JSON.parse(prev);
    for (const k of Object.keys(working)) delete working[k];
    Object.assign(working, data);
    if (selected && !working.layers.some((l) => l.id === selected)) selected = null;
    markDirty();
    setPreviewBackground(working.preview?.background);
    await rebuild();
    renderPanel();
  }

  async function rebuild() {
    await mount(structuredClone(working));
    renderFrame(t);
    markSelected();
    emptyHint.hidden = working.layers.length > 0;
  }

  let rebuildTimer = null;
  function rebuildSoon() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 250);
  }

  async function save() {
    saveBtn.disabled = true;
    try {
      const res = await fetch(saveUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(working),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      dirty = false;
      status.textContent = '✓ บันทึกแล้ว';
      status.classList.remove('dirty');
    } catch (err) {
      status.textContent = `✗ บันทึกไม่ได้: ${err.message}`;
      status.classList.add('dirty');
    } finally {
      saveBtn.disabled = isTemplateDemo;
    }
  }

  saveBtn.addEventListener('click', save);

  // เรนเดอร์จากหน้าปรับแต่ง: บันทึกก่อน แล้วสั่งเซิร์ฟเวอร์เรนเดอร์ พร้อมแสดงความคืบหน้า
  renderBtn.addEventListener('click', async () => {
    if (dirty) await save();
    if (dirty) return;
    renderBtn.disabled = true;
    try {
      let job = await api('/__api/render', { name: configName || configNameFallback });
      while (job.status === 'running') {
        status.textContent = job.phase === 'encode'
          ? `🎬 กำลังเข้ารหัส ${job.format} ...`
          : `🎬 เรนเดอร์ ${job.done}/${job.total || '?'} เฟรม`;
        await new Promise((r) => setTimeout(r, 700));
        job = await api(`/__api/jobs/${job.id}`);
      }
      if (job.status === 'error') throw new Error(job.error);
      status.textContent = `✓ เรนเดอร์เสร็จ: ${job.outputs.join(', ')}`;
      status.classList.remove('dirty');
    } catch (err) {
      status.textContent = `✗ เรนเดอร์ไม่ได้: ${err.message}`;
      status.classList.add('dirty');
    } finally {
      renderBtn.disabled = false;
    }
  });
  undoBtn.addEventListener('click', undo);
  window.addEventListener('beforeunload', (e) => {
    if (dirty) e.preventDefault();
  });

  // ---------- เวลา ----------
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
  });
  scrub.addEventListener('input', () => {
    t = Number(scrub.value);
    renderFrame(t);
  });
  let last = performance.now();
  const loop = (now) => {
    if (playing) {
      t = (t + (now - last) / 1000) % D;
      scrub.value = String(t);
      renderFrame(t);
    }
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ---------- เลือก / ลาก ----------
  const nodeOf = (id) => stage.querySelector(`.layer[data-id="${CSS.escape(id)}"]`);
  const layerOf = (id) => working.layers.find((l) => l.id === id);
  const isFixed = (id) => !!CATALOG[layerOf(id)?.type]?.fullscreen;

  function markSelected() {
    for (const n of stage.querySelectorAll('.ed-selected')) n.classList.remove('ed-selected');
    const node = selected && nodeOf(selected);
    if (node) node.classList.add('ed-selected');
  }

  function select(id) {
    selected = id;
    markSelected();
    renderPanel();
  }

  /** แปลงตำแหน่งปัจจุบันของ node เป็น style ที่ยึดขอบจอที่ใกล้ที่สุด แล้วเก็บลง config */
  function commitPosition(id, node, keepWidth) {
    const x = node.offsetLeft;
    const y = node.offsetTop;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const useRight = x + w / 2 > W / 2;
    const useBottom = y + h / 2 > H / 2;
    const layer = layerOf(id);
    const style = { ...(layer.style || {}) };
    for (const k of POSITION_KEYS) delete style[k];
    if (useRight) Object.assign(style, { left: 'auto', right: Math.round(W - x - w) });
    else Object.assign(style, { left: Math.round(x), right: 'auto' });
    if (useBottom) Object.assign(style, { top: 'auto', bottom: Math.round(H - y - h) });
    else Object.assign(style, { top: Math.round(y), bottom: 'auto' });
    if (keepWidth) style.width = Math.round(w);
    style['transform-origin'] = `${useRight ? 'right' : 'left'} ${useBottom ? 'bottom' : 'top'}`;
    layer.style = style;
    applyStyle(node, style);
    markDirty();
    renderPanel();
  }

  /** เริ่มย้าย: ตรึงตำแหน่งเป็น left/top ก่อน (ถ้าชิ้นนั้นยืดตามจอ ให้ตรึงความกว้างไว้ด้วย) */
  function beginMove(node) {
    const w0 = node.offsetWidth;
    const start = { x: node.offsetLeft, y: node.offsetTop };
    Object.assign(node.style, {
      left: `${start.x}px`, top: `${start.y}px`, right: 'auto', bottom: 'auto',
    });
    const keepWidth = !!node.style.width || node.offsetWidth !== w0;
    if (keepWidth) node.style.width = `${w0}px`;
    return { start, keepWidth };
  }

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const node = e.target.closest('.layer');
    if (!node) {
      if (selected) select(null);
      return;
    }
    e.preventDefault();
    const id = node.dataset.id;
    if (selected !== id) select(id);
    if (isFixed(id)) return;
    snapshot();
    const { start, keepWidth } = beginMove(node);
    drag = { id, node, start, keepWidth, px: e.clientX, py: e.clientY, moved: false };
    node.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.px) / scale;
    const dy = (e.clientY - drag.py) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
    const x = Math.round(Math.min(W - 20, Math.max(20 - drag.node.offsetWidth, drag.start.x + dx)));
    const y = Math.round(Math.min(H - 20, Math.max(20 - drag.node.offsetHeight, drag.start.y + dy)));
    drag.node.style.left = `${x}px`;
    drag.node.style.top = `${y}px`;
    coords.textContent = `x ${x}  y ${y}`;
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) commitPosition(drag.id, drag.node, drag.keepWidth);
    else history.pop();
    drag = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!isTemplateDemo) save();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      undo();
      return;
    }
    if (typing || !selected || isFixed(selected)) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const node = nodeOf(selected);
    if (!node) return;
    snapshot();
    const { start, keepWidth } = beginMove(node);
    node.style.left = `${start.x + d[0]}px`;
    node.style.top = `${start.y + d[1]}px`;
    commitPosition(selected, node, keepWidth);
  });

  // ---------- store ที่แผงต่างๆ ใช้ ----------
  const coords = el('div', 'ed-coords');

  /** handler สำหรับช่องกรอก: snapshot ครั้งแรกที่แก้ช่องนี้ แล้ว rebuild แบบหน่วงเวลา */
  function onEdit(apply) {
    let snapped = false;
    return (e) => {
      if (!snapped) {
        snapshot();
        snapped = true;
      }
      if (apply(e.target) === false) return;
      markDirty();
      rebuildSoon();
      renderLayers(layersBox, store); // ชื่อในรายการอาจเปลี่ยน
    };
  }

  const store = {
    working,
    ctx,
    coords,
    get selected() {
      return selected;
    },
    layer: layerOf,
    nodeOf,
    select,
    snapshot,
    markDirty,
    onEdit,
    commitPosition,
    beginMove,
    refresh: () => renderPanel(),
    refreshLayers: () => renderLayers(layersBox, store),
    /** แก้ไขแบบมีประวัติ: snapshot → fn(working) → rebuild → วาดแผงใหม่ คืนค่าที่ fn คืน */
    async act(fn) {
      snapshot();
      const result = fn(working);
      markDirty();
      await rebuild();
      renderPanel();
      return result;
    },
    /** เหมือน act แต่ไม่วาดแผงใหม่ (ช่องอัปโหลดยังแสดงข้อความผลลัพธ์ต่อได้) */
    async change(fn) {
      snapshot();
      fn(working);
      markDirty();
      await rebuild();
    },
  };

  addBtn.addEventListener('click', () =>
    openLibrary(async (type) => {
      const id = await store.act((cfg) => commands.addLayer(cfg, type));
      select(id);
    }));

  // ลากไฟล์รูปมาวางบนจอ: ใส่ให้ชิ้นที่วางทับ (ถ้าไม่ทับชิ้นไหนใช้ชิ้นที่เลือกอยู่) ในช่องรูปช่องแรกของชิ้นนั้น
  viewport.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
  viewport.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    const id = e.target.closest?.('.layer')?.dataset.id || selected;
    const layer = id && layerOf(id);
    const imgKey = layer && Object.entries(CATALOG[layer.type]?.fields || {}).find(([, f]) => f.type === 'image')?.[0];
    if (!imgKey) {
      status.textContent = '✗ ชิ้นนี้ไม่มีช่องรูป (ลากไปวางบนชิ้นที่มีรูป/โลโก้ หรือเลือกชิ้นก่อน)';
      status.classList.add('dirty');
      return;
    }
    if (selected !== id) select(id);
    status.textContent = `กำลังอัปโหลด ${files[0].name} ...`;
    try {
      const res = await uploadFile(files[0], 'image');
      await store.act(() => (layer.props = { ...(layer.props || {}), [imgKey]: res.path }));
      status.textContent = res.converted ? `● แปลงเป็น ${res.name} แล้ว (ยังไม่ได้บันทึก)` : '● ยังไม่ได้บันทึก';
    } catch (err) {
      status.textContent = `✗ ${err.message}`;
      status.classList.add('dirty');
    }
  });

  // ---------- แผงด้านขวา ----------
  function renderPanel() {
    renderLayers(layersBox, store);
    renderInspector(props, store);
    renderTheme();
    renderGeneral();
  }

  function renderTheme() {
    const box = themeSec.querySelector('.ed-body') || el('div', 'ed-body', themeSec);
    box.replaceChildren();
    // ฟอนต์: Kanit ที่มากับโปรแกรม หรือฟอนต์ที่อัปโหลดเอง (theme.fontFile)
    fontSelect(box, 'ฟอนต์', working.theme.fontFile, 'Kanit (มากับโปรแกรม)', (file) =>
      store.change(() => {
        if (file) {
          working.theme.fontFile = file;
          working.theme.font = file.split('/').pop().replace(/\.[^.]+$/, '');
        } else {
          delete working.theme.fontFile;
          working.theme.font = 'Kanit';
        }
      }));
    for (const [k, label] of Object.entries(THEME_LABELS)) {
      const row = field(box, label);
      const value = working.theme[k] ?? THEME_DEFAULTS[k];
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'color', value });
      inp.addEventListener('input', onEdit((n) => {
        working.theme[k] = n.value;
        stage.style.setProperty(`--${k}`, n.value);
      }));
    }
  }

  function renderGeneral() {
    const box = generalSec.querySelector('.ed-body') || el('div', 'ed-body', generalSec);
    box.replaceChildren();
    el('div', 'ed-hint', box, `ขนาดจอ ${W}×${H} (เปลี่ยนได้ที่ resolution ในไฟล์ config)`);
    const durRow = field(box, 'ความยาว (วินาที) — มีผลตอน render');
    const dur = el('input', '', durRow);
    Object.assign(dur, { type: 'number', min: 1, value: working.duration });
    dur.addEventListener('input', () => {
      if (Number(dur.value) > 0) {
        snapshot();
        working.duration = Number(dur.value);
        markDirty();
      }
    });
    imageField(box, 'รูป/คลิปพื้นหลังตัวอย่าง (ใช้ดูตำแหน่งเท่านั้น ไม่ติดไปในไฟล์ที่เรนเดอร์)', 'background',
      working.preview.background, async (val) => {
        snapshot();
        working.preview.background = val;
        setPreviewBackground(val);
        markDirty();
      });
  }

  emptyHint.hidden = working.layers.length > 0;
  renderPanel();
}
