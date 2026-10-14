// หน้าแก้ไขแบบลากวาง (npm run edit)
// - ลากชิ้นส่วนบนจอเพื่อย้าย / ปุ่มลูกศรขยับทีละ 1px (Shift = 10px)
// - เปิด/ปิด, แก้ข้อความ, ปรับขนาด, เปลี่ยนสี จากแผงด้านขวา
// - บันทึก (Ctrl+S) จะเขียนกลับลงไฟล์ config ผ่าน POST /__save

import { el, applyStyle, setPreviewBackground } from './runtime.js';

const FIELD_LABELS = {
  text: 'ข้อความ', name: 'ชื่อ', amount: 'จำนวนเงิน', currency: 'สกุลเงิน',
  badge: 'ป้ายบรรทัด 1', badge2: 'ป้ายบรรทัด 2', image: 'ไฟล์รูป', logo: 'ไฟล์โลโก้',
  channel: 'ชื่อช่อง', label: 'ข้อความกลาง', live: 'แสดง LIVE', camSize: 'ขนาดกล้อง (กว้าง, สูง)',
  borderWidth: 'ความหนาขอบ', oldPrice: 'ราคาเดิม', price: 'ราคา', unit: 'หน่วย', note: 'หมายเหตุ',
  tag: 'ป้ายหัว', items: 'ข้อความ (บรรทัดละ 1 อัน)', speed: 'ความเร็ว (px/วินาที)',
  secondsEach: 'วินาทีต่อข้อความ', messages: 'ข้อความ (บรรทัดละ 1 อัน: หัวข้อ | ข้อความ)',
  title: 'หัวข้อ', subtitle: 'ข้อความรอง', start: 'เริ่มโผล่ที่วินาที', hold: 'ค้างไว้ (วินาที)',
  color: 'สี', persistent: 'แสดงตลอด (ไม่เด้งเข้าออก)', compact: 'แบบเล็ก', from: 'เด้งเข้าจากทิศ',
  effect: 'เอฟเฟกต์', thickness: 'ความหนา', inset: 'ระยะห่างขอบจอ', radius: 'ความโค้งมุม',
  segments: 'จำนวนแสงวิ่ง', spacing: 'ระยะห่างหลอดไฟ', size: 'ขนาด', pattern: 'รูปแบบ',
  period: 'ความเร็ว (วินาทีต่อรอบ)', gap: 'ระยะหลอดไฟจากกรอบ', length: 'ความยาวขา', sub: 'ข้อความรอง', dot: 'จุดกะพริบ',
};
const THEME_LABELS = { primary: 'สีหลัก', accent: 'สีเน้น', panel: 'สีพื้นกล่อง', font: 'ฟอนต์' };
const POSITION_KEYS = ['left', 'right', 'top', 'bottom', 'width', 'transform-origin', 'transformOrigin'];

export async function startEditor({ stage, ctx, template, mount, renderFrame }) {
  const W = ctx.width;
  const H = ctx.height;
  const D = ctx.duration;
  const labels = template.labels || {};
  const fixed = new Set(template.fixed || []); // ชิ้นที่เต็มจอ ลากไม่ได้ (เช่น กรอบ)
  const labelOf = (key) => template.labelFor?.(key, working.elements[key]) || labels[key] || key;

  // สำเนาที่กำลังแก้ (ไม่รวม name ที่ cli ใส่มาให้)
  const working = structuredClone(ctx.config);
  const configName = working.name;
  delete working.name;
  working.elements ||= {};
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
  const panel = el('aside', '', document.body);
  panel.id = 'editor-panel';

  const head = el('div', 'ed-head', panel);
  el('div', 'ed-title', head, `แก้ไข: ${configName || 'config'}`);
  const status = el('div', 'ed-status', head, 'บันทึกแล้ว');
  const headBtns = el('div', 'ed-row', head);
  const undoBtn = el('button', '', headBtns, '↶ ย้อนกลับ');
  const saveBtn = el('button', 'primary', headBtns, '💾 บันทึก');

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

  const listSec = section('ชิ้นส่วน (ติ๊กเพื่อเปิด/ปิด, คลิกชื่อเพื่อเลือก)');
  const list = el('div', 'ed-list', listSec);

  const propSec = section('ชิ้นที่เลือก');
  const props = el('div', '', propSec);

  const themeSec = section('สีและฟอนต์');
  const generalSec = section('ทั่วไป');

  el('p', 'ed-hint', panel,
    'ลากชิ้นส่วนบนจอเพื่อย้าย • ลูกศรขยับ 1px (Shift = 10px) • Ctrl+S บันทึก • Ctrl+Z ย้อนกลับ\n' +
    'ตำแหน่งจะยึดกับขอบจอที่ใกล้ที่สุด เมื่อเสร็จแล้วสั่ง npm run render');

  function section(title) {
    const s = el('section', 'ed-sec', panel);
    el('h3', '', s, title);
    return s;
  }

  // ---------- ย่อ/ขยายจอให้พอดี ----------
  let scale = 1;
  const fit = () => {
    const availW = window.innerWidth - panel.offsetWidth - 32;
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
    markDirty();
    setPreviewBackground(working.preview?.background);
    await rebuild();
    renderPanel();
  }

  async function rebuild() {
    await mount(structuredClone(working));
    renderFrame(t);
    markSelected();
  }

  let rebuildTimer = null;
  function rebuildSoon() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuild, 250);
  }

  async function save() {
    saveBtn.disabled = true;
    try {
      const res = await fetch('/__save', {
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
      saveBtn.disabled = false;
    }
  }

  saveBtn.addEventListener('click', save);
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
  const nodeOf = (key) => stage.querySelector(`[data-key="${key}"]`);

  function markSelected() {
    for (const n of stage.querySelectorAll('.ed-selected')) n.classList.remove('ed-selected');
    const node = selected && nodeOf(selected);
    if (node) node.classList.add('ed-selected');
  }

  function select(key) {
    selected = key;
    markSelected();
    renderPanel();
  }

  /** แปลงตำแหน่งปัจจุบันของ node เป็น style ที่ยึดขอบจอที่ใกล้ที่สุด แล้วเก็บลง config */
  function commitPosition(key, node, keepWidth) {
    const x = node.offsetLeft;
    const y = node.offsetTop;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const useRight = x + w / 2 > W / 2;
    const useBottom = y + h / 2 > H / 2;
    const cfg = (working.elements[key] ||= {});
    const style = { ...(cfg.style || {}) };
    for (const k of POSITION_KEYS) delete style[k];
    if (useRight) Object.assign(style, { left: 'auto', right: Math.round(W - x - w) });
    else Object.assign(style, { left: Math.round(x), right: 'auto' });
    if (useBottom) Object.assign(style, { top: 'auto', bottom: Math.round(H - y - h) });
    else Object.assign(style, { top: Math.round(y), bottom: 'auto' });
    if (keepWidth) style.width = Math.round(w);
    style['transform-origin'] = `${useRight ? 'right' : 'left'} ${useBottom ? 'bottom' : 'top'}`;
    cfg.style = style;
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
    const node = e.target.closest('[data-key]');
    if (!node) return;
    e.preventDefault();
    const key = node.dataset.key;
    if (selected !== key) select(key);
    if (fixed.has(key)) return;
    snapshot();
    const { start, keepWidth } = beginMove(node);
    drag = { key, node, start, keepWidth, px: e.clientX, py: e.clientY, moved: false };
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
    if (drag.moved) commitPosition(drag.key, drag.node, drag.keepWidth);
    else history.pop();
    drag = null;
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      undo();
      return;
    }
    if (typing || !selected || fixed.has(selected)) return;
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

  // ---------- แผงด้านขวา ----------
  const coords = el('div', 'ed-coords');

  function renderPanel() {
    renderList();
    renderProps();
    renderTheme();
    renderGeneral();
  }

  function renderList() {
    list.replaceChildren();
    for (const key of Object.keys(working.elements)) {
      const cfg = working.elements[key];
      const row = el('div', `ed-item${key === selected ? ' active' : ''}`, list);
      const cb = el('input', '', row);
      cb.type = 'checkbox';
      cb.checked = cfg.enabled !== false;
      cb.addEventListener('change', async () => {
        snapshot();
        cfg.enabled = cb.checked;
        markDirty();
        await rebuild();
      });
      const name = el('span', '', row, labelOf(key));
      name.addEventListener('click', () => select(key));
    }
  }

  function renderProps() {
    props.replaceChildren();
    if (!selected || !working.elements[selected]) {
      el('p', 'ed-hint', props, 'คลิกชิ้นส่วนบนจอหรือในรายการเพื่อแก้ไข');
      return;
    }
    const key = selected;
    const cfg = working.elements[key];
    el('div', 'ed-subtitle', props, labelOf(key));
    props.appendChild(coords);
    const node = nodeOf(key);
    coords.textContent = node ? `x ${node.offsetLeft}  y ${node.offsetTop}` : '(ปิดอยู่)';

    if (template.dynamic) {
      const row = el('div', 'ed-row', props);
      const dup = el('button', '', row, '⧉ ทำสำเนา');
      const del = el('button', 'danger', row, '🗑 ลบ');
      dup.addEventListener('click', () => duplicate(key));
      del.addEventListener('click', () => removeElement(key));
    }

    if (fixed.has(key)) {
      el('p', 'ed-hint', props, 'ชิ้นนี้เต็มจอ ปรับได้จากค่าด้านล่าง');
      for (const [k, v] of Object.entries(cfg)) {
        if (k === 'enabled' || k === 'style') continue;
        addField(props, cfg, k, v);
      }
      return;
    }

    // ขนาด
    const scaleRow = field(props, 'ขนาด');
    const sc = el('input', '', scaleRow);
    Object.assign(sc, { type: 'range', min: 0.4, max: 2.5, step: 0.05, value: Number(cfg.style?.scale ?? 1) });
    const scLabel = el('span', 'ed-num', scaleRow, `${Number(sc.value).toFixed(2)}×`);
    sc.addEventListener('pointerdown', snapshot);
    sc.addEventListener('input', () => {
      const v = Number(sc.value);
      scLabel.textContent = `${v.toFixed(2)}×`;
      cfg.style = { ...(cfg.style || {}) };
      if (Math.abs(v - 1) < 0.001) delete cfg.style.scale;
      else cfg.style.scale = String(v);
      if (!cfg.style['transform-origin'] && node) {
        const right = node.offsetLeft + node.offsetWidth / 2 > W / 2;
        const bottom = node.offsetTop + node.offsetHeight / 2 > H / 2;
        cfg.style['transform-origin'] = `${right ? 'right' : 'left'} ${bottom ? 'bottom' : 'top'}`;
      }
      if (node) {
        node.style.scale = cfg.style.scale || '';
        node.style.transformOrigin = cfg.style['transform-origin'];
      }
      markDirty();
    });

    const resetBtn = el('button', '', el('div', 'ed-row', props), 'คืนตำแหน่ง/ขนาดเริ่มต้น');
    resetBtn.addEventListener('click', async () => {
      snapshot();
      if (cfg.style) {
        for (const k of [...POSITION_KEYS, 'scale']) delete cfg.style[k];
        if (!Object.keys(cfg.style).length) delete cfg.style;
      }
      markDirty();
      await rebuild();
      renderPanel();
    });

    // ฟิลด์อื่นๆ ตามชนิดข้อมูล
    for (const [k, v] of Object.entries(cfg)) {
      if (k === 'enabled' || k === 'style') continue;
      addField(props, cfg, k, v);
    }
  }

  async function duplicate(key) {
    snapshot();
    const base = key.replace(/_?\d+$/, '');
    let i = 2;
    while (working.elements[`${base}${i}`]) i++;
    const copy = structuredClone(working.elements[key]);
    // เลื่อนสำเนาเข้าด้านในจอ 40px จะได้ไม่ทับของเดิม
    for (const side of ['left', 'right', 'top', 'bottom']) {
      if (typeof copy.style?.[side] === 'number') copy.style[side] += 40;
    }
    template.onDuplicate?.(copy, ctx);
    working.elements[`${base}${i}`] = copy;
    markDirty();
    await rebuild();
    select(`${base}${i}`);
  }

  async function removeElement(key) {
    if (!confirm(`ลบ "${labelOf(key)}" ?`)) return;
    snapshot();
    delete working.elements[key];
    selected = null;
    markDirty();
    await rebuild();
    renderPanel();
  }

  function field(parent, label) {
    const wrapEl = el('label', 'ed-field', parent);
    el('span', 'ed-label', wrapEl, label);
    return el('div', 'ed-row', wrapEl);
  }

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
      renderList(); // ชื่อในรายการอาจเปลี่ยนตามข้อความ
    };
  }

  function addField(parent, obj, k, v) {
    const row = field(parent, FIELD_LABELS[k] || k);
    if (typeof v === 'boolean') {
      const cb = el('input', '', row);
      cb.type = 'checkbox';
      cb.checked = v;
      cb.addEventListener('change', onEdit((n) => (obj[k] = n.checked)));
    } else if (typeof v === 'number') {
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'number', value: v });
      inp.addEventListener('input', onEdit((n) => {
        if (n.value === '' || Number.isNaN(Number(n.value))) return false;
        obj[k] = Number(n.value);
      }));
    } else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) {
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'color', value: v });
      inp.addEventListener('input', onEdit((n) => (obj[k] = n.value)));
    } else if (typeof v === 'string' && Array.isArray(template.choices?.[k])) {
      const sel = el('select', '', row);
      for (const opt of template.choices[k]) {
        const o = el('option', '', sel, opt);
        o.value = opt;
      }
      sel.value = v;
      sel.addEventListener('change', onEdit((n) => (obj[k] = n.value)));
    } else if (typeof v === 'string') {
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'text', value: v });
      inp.addEventListener('input', onEdit((n) => (obj[k] = n.value)));
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) {
      v.forEach((num, i) => {
        const inp = el('input', 'ed-small', row);
        Object.assign(inp, { type: 'number', value: num });
        inp.addEventListener('input', onEdit((n) => {
          if (n.value === '') return false;
          obj[k] = obj[k].map((x, j) => (j === i ? Number(n.value) : x));
        }));
      });
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      const ta = el('textarea', '', row);
      ta.rows = Math.max(2, v.length);
      ta.value = v.join('\n');
      ta.addEventListener('input', onEdit((n) => (obj[k] = n.value.split('\n').filter((s) => s.trim()))));
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string' || (x && typeof x === 'object' && 'text' in x))) {
      // ข้อความที่มีหัวข้อ เช่น notice.messages → "หัวข้อ | ข้อความ"
      const ta = el('textarea', '', row);
      ta.rows = Math.max(2, v.length);
      ta.value = v.map((m) => (typeof m === 'string' ? m : m.title ? `${m.title} | ${m.text}` : m.text)).join('\n');
      ta.addEventListener('input', onEdit((n) => {
        obj[k] = n.value.split('\n').filter((s) => s.trim()).map((line) => {
          const i = line.indexOf('|');
          return i < 0 ? { text: line.trim() } : { title: line.slice(0, i).trim(), text: line.slice(i + 1).trim() };
        });
      }));
    } else {
      // โครงสร้างอื่น: แก้เป็น JSON
      const ta = el('textarea', 'ed-json', row);
      ta.rows = 4;
      ta.value = JSON.stringify(v, null, 1);
      ta.addEventListener('input', onEdit((n) => {
        try {
          obj[k] = JSON.parse(n.value);
          n.classList.remove('bad');
        } catch {
          n.classList.add('bad');
          return false;
        }
      }));
    }
  }

  function renderTheme() {
    const box = themeSec.querySelector('.ed-body') || el('div', 'ed-body', themeSec);
    box.replaceChildren();
    for (const [k, v] of Object.entries(working.theme)) {
      const row = field(box, THEME_LABELS[k] || k);
      const isColor = /^#[0-9a-f]{6}$/i.test(v);
      const inp = el('input', '', row);
      Object.assign(inp, { type: isColor ? 'color' : 'text', value: v });
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
    const bgRow = field(box, 'รูป/คลิปพื้นหลังตัวอย่าง (ไว้ใน assets/)');
    const bg = el('input', '', bgRow);
    Object.assign(bg, { type: 'text', value: working.preview.background || '', placeholder: 'assets/sample.jpg' });
    bg.addEventListener('change', () => {
      snapshot();
      working.preview.background = bg.value.trim();
      setPreviewBackground(working.preview.background);
      markDirty();
    });
  }

  renderPanel();
}
