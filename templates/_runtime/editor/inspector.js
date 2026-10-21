// แผงคุณสมบัติของชิ้นที่เลือก:
// ชื่อ • ตำแหน่ง/ขนาด • เวลาเริ่ม/จบ • ท่าเข้า/ออก • สีของชิ้นนี้ • ค่าของชิ้นตาม fields ใน catalog

import { el } from '../dom.js';
import { CATALOG } from '../../../elements/catalog.js';
import { ENTER_TYPES, EXIT_TYPES, DIRECTIONS } from '../timing.js';
import { imageField, fontSelect } from './media.js';

const ALIGN = [['', 'ค่าเริ่มต้น'], ['left', 'ซ้าย'], ['center', 'กลาง'], ['right', 'ขวา']];
const MOTION_LABELS = { none: 'ไม่มี', fade: 'จางเข้า/ออก', slide: 'เลื่อน', pop: 'เด้ง' };
const DIR_LABELS = { auto: 'อัตโนมัติ (ขอบที่ใกล้สุด)', left: 'จากซ้าย', right: 'จากขวา', top: 'จากบน', bottom: 'จากล่าง' };
const COLOR_KEYS = { primary: 'สีหลัก', accent: 'สีเน้น', panel: 'สีพื้นกล่อง', text: 'สีตัวอักษร' };
const POSITION_KEYS = ['left', 'right', 'top', 'bottom', 'width', 'transform-origin', 'transformOrigin'];

/** ป้ายชื่อ + แถวสำหรับวางช่องกรอก (block = ใช้ div แทน label สำหรับรายการหลายช่อง) */
export function field(parent, label, block = false) {
  const wrap = el(block ? 'div' : 'label', 'ed-field', parent);
  el('span', 'ed-label', wrap, label);
  return el('div', 'ed-row', wrap);
}

function selectBox(parent, options, value, labels = {}) {
  const s = el('select', '', parent);
  for (const o of options) {
    const opt = el('option', '', s, labels[o] ?? o);
    opt.value = o;
  }
  s.value = value;
  return s;
}

function numberBox(parent, value, attrs = {}) {
  const inp = el('input', '', parent);
  Object.assign(inp, { type: 'number', step: 'any', value: value ?? '', ...attrs });
  return inp;
}

function textBox(parent, value, placeholder = '') {
  const inp = el('input', '', parent);
  Object.assign(inp, { type: 'text', value: value ?? '', placeholder });
  return inp;
}

function button(parent, text, onClick) {
  const b = el('button', '', parent, text);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });
  return b;
}

export function renderInspector(box, store) {
  box.replaceChildren();
  const layer = store.selected && store.layer(store.selected);
  if (!layer) {
    el('p', 'ed-hint', box, 'คลิกชิ้นส่วนบนจอหรือในรายการ Layers เพื่อแก้ไข');
    return;
  }
  const def = CATALOG[layer.type];
  if (!def) {
    el('p', 'ed-warn', box, `ไม่รู้จักชิ้น "${layer.type}" ลบออกได้จากรายการ Layers`);
    return;
  }

  const nameIn = textBox(field(box, 'ชื่อ'), layer.name);
  nameIn.addEventListener('input', store.onEdit((n) => (layer.name = n.value)));

  if (def.fullscreen) el('p', 'ed-hint', box, 'ชิ้นนี้เต็มจอ ปรับได้จากค่าด้านล่าง');
  else positionSection(box, store, layer);

  timeSection(box, store, layer);
  motionSection(box, store, layer, 'enter', 'ท่าเข้า', def.fullscreen ? ['none', 'fade'] : ENTER_TYPES);
  motionSection(box, store, layer, 'exit', 'ท่าออก', def.fullscreen ? ['none', 'fade'] : EXIT_TYPES);
  colorSection(box, store, layer);

  el('div', 'ed-group', box, 'ค่าของชิ้น');
  layer.props ||= {};
  for (const [k, f] of Object.entries(def.fields)) propField(box, store, layer.props, k, f);
}

function positionSection(box, store, layer) {
  const node = store.nodeOf(layer.id);
  box.appendChild(store.coords);
  store.coords.textContent = node ? `x ${node.offsetLeft}  y ${node.offsetTop}` : '(ซ่อนอยู่)';

  const row = field(box, 'ขนาด');
  const sc = el('input', '', row);
  Object.assign(sc, { type: 'range', min: 0.4, max: 2.5, step: 0.05, value: Number(layer.style?.scale ?? 1) });
  const label = el('span', 'ed-num', row, `${Number(sc.value).toFixed(2)}×`);
  sc.addEventListener('pointerdown', () => store.snapshot());
  sc.addEventListener('input', () => {
    const v = Number(sc.value);
    label.textContent = `${v.toFixed(2)}×`;
    layer.style = { ...(layer.style || {}) };
    if (Math.abs(v - 1) < 0.001) delete layer.style.scale;
    else layer.style.scale = String(v);
    const n = store.nodeOf(layer.id);
    if (!layer.style['transform-origin'] && n) {
      const W = store.ctx.width;
      const H = store.ctx.height;
      const right = n.offsetLeft + n.offsetWidth / 2 > W / 2;
      const bottom = n.offsetTop + n.offsetHeight / 2 > H / 2;
      layer.style['transform-origin'] = `${right ? 'right' : 'left'} ${bottom ? 'bottom' : 'top'}`;
    }
    if (n) {
      n.style.scale = layer.style.scale || '';
      n.style.transformOrigin = layer.style['transform-origin'];
    }
    store.markDirty();
  });

  button(el('div', 'ed-row', box), 'คืนตำแหน่ง/ขนาดเริ่มต้น', () =>
    store.act(() => {
      if (!layer.style) return;
      for (const k of [...POSITION_KEYS, 'scale']) delete layer.style[k];
      if (!Object.keys(layer.style).length) delete layer.style;
    }));

  // จัดข้อความ ซ้าย/กลาง/ขวา (มีผลกับข้อความหลายบรรทัด)
  const alignRow = field(box, 'จัดข้อความ');
  alignRow.classList.add('ed-seg');
  for (const [value, label] of ALIGN) {
    const b = el('button', (layer.style?.['text-align'] || '') === value ? 'active' : '', alignRow, label);
    b.type = 'button';
    b.addEventListener('click', (e) => {
      e.preventDefault();
      store.snapshot();
      layer.style = { ...(layer.style || {}) };
      if (value) layer.style['text-align'] = value;
      else delete layer.style['text-align'];
      if (!Object.keys(layer.style).length) delete layer.style;
      const n = store.nodeOf(layer.id);
      if (n) n.style.textAlign = value;
      store.markDirty();
      for (const x of alignRow.children) x.classList.toggle('active', x === b);
    });
  }
}

function timeSection(box, store, layer) {
  el('div', 'ed-group', box, 'เวลา');
  const D = store.ctx.duration;
  const row = field(box, 'เริ่ม / จบ (วินาที)');
  const startIn = numberBox(row, layer.start ?? 0, { min: 0 });
  startIn.classList.add('ed-small');
  startIn.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (n.value === '' || !(v >= 0 && v < D)) return false;
    const prevStart = layer.start ?? 0;
    layer.start = v;
    // เริ่มเลยเวลาจบ: เลื่อนเวลาจบตามไป โดยคงความยาวเดิม (ไม่มีความยาวเดิม → 1 วินาที) ไม่ให้บันทึกไม่ผ่าน
    if (layer.end != null && layer.end <= v) {
      const length = layer.end - prevStart;
      layer.end = Math.round((v + (length > 0 ? length : 1)) * 1000) / 1000;
      endIn.value = String(layer.end);
    }
  }));
  const endIn = numberBox(row, layer.end ?? D, { min: 0 });
  endIn.classList.add('ed-small');
  endIn.disabled = layer.end == null;
  endIn.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (n.value === '' || !(v > (layer.start ?? 0))) return false;
    layer.end = v;
  }));

  const untilRow = el('label', 'ed-row ed-check', box);
  const until = el('input', '', untilRow);
  until.type = 'checkbox';
  until.checked = layer.end == null;
  el('span', '', untilRow, 'แสดงจนจบคลิป');
  until.addEventListener('change', store.onEdit((n) => {
    if (n.checked) layer.end = null;
    else {
      const v = Number(endIn.value);
      layer.end = v > (layer.start ?? 0) ? v : (layer.start ?? 0) + 5;
      endIn.value = String(layer.end);
    }
    endIn.disabled = n.checked;
  }));
}

function motionSection(box, store, layer, key, label, types) {
  const m = layer[key] ?? { type: 'none' };
  const row = field(box, label);
  const typeSel = selectBox(row, types, types.includes(m.type) ? m.type : 'none', MOTION_LABELS);
  const onType = store.onEdit((n) => {
    // offset เป็นของท่า slide เดิม (intro) เปลี่ยนท่าแล้วทิ้งไป เพื่อให้เลือกทิศได้
    const { offset, ...prev } = layer[key] ?? {};
    layer[key] = n.value === 'none' ? { type: 'none' } : { ...prev, type: n.value, duration: prev.duration ?? 0.6 };
  });
  typeSel.addEventListener('change', (e) => {
    onType(e);
    store.refresh();
  });
  if (m.type === 'none') return;

  // ท่า slide ที่กำหนด offset ไว้ (มาจาก intro เดิม) ไม่มีทิศให้เลือก
  if ((m.type === 'slide' || m.type === 'pop') && !m.offset) {
    const dir = selectBox(row, DIRECTIONS, m.from ?? (key === 'exit' ? layer.enter?.from : null) ?? 'auto', DIR_LABELS);
    dir.addEventListener('change', store.onEdit((n) => (layer[key].from = n.value)));
  }
  const dur = numberBox(row, m.duration ?? 0.6, { min: 0.1, step: 0.1 });
  dur.classList.add('ed-small');
  dur.title = 'ความยาว (วินาที)';
  dur.addEventListener('input', store.onEdit((n) => {
    const v = Number(n.value);
    if (!(v > 0)) return false;
    layer[key].duration = v;
  }));
}

function colorSection(box, store, layer) {
  el('div', 'ed-group', box, 'สีของชิ้นนี้');
  const theme = store.working.theme;
  for (const [k, label] of Object.entries(COLOR_KEYS)) {
    const own = layer.theme?.[k];
    const row = field(box, own ? label : `${label} (ใช้สีธีม)`);
    const inp = el('input', '', row);
    Object.assign(inp, { type: 'color', value: own ?? theme[k] ?? '#ffffff' });
    inp.addEventListener('input', store.onEdit((n) => (layer.theme = { ...(layer.theme ?? {}), [k]: n.value })));
    inp.addEventListener('change', () => store.refresh());
    if (own) {
      button(row, '↺ ใช้สีธีม', () =>
        store.act(() => {
          delete layer.theme[k];
          if (!Object.keys(layer.theme).length) delete layer.theme;
        }));
    }
  }
  fontSelect(box, 'ฟอนต์ของชิ้นนี้', layer.theme?.fontFile, 'ใช้ฟอนต์ของธีม', (file) =>
    store.change(() => {
      if (file) layer.theme = { ...(layer.theme ?? {}), fontFile: file };
      else if (layer.theme) {
        delete layer.theme.fontFile;
        if (!Object.keys(layer.theme).length) delete layer.theme;
      }
    }));
}

function propField(box, store, props, k, f) {
  if (f.type === 'image') {
    imageField(box, f.label, 'image', props[k], (path) => store.change(() => (props[k] = path)));
    return;
  }
  const block = f.type === 'list' || f.type === 'messages';
  const row = field(box, f.label, block);
  const v = props[k];
  switch (f.type) {
    case 'boolean': {
      const cb = el('input', '', row);
      cb.type = 'checkbox';
      cb.checked = !!v;
      cb.addEventListener('change', store.onEdit((n) => (props[k] = n.checked)));
      return;
    }
    case 'number': {
      const inp = numberBox(row, v);
      inp.addEventListener('input', store.onEdit((n) => {
        if (n.value === '' || Number.isNaN(Number(n.value))) return false;
        props[k] = Number(n.value);
      }));
      return;
    }
    case 'color': {
      const inp = el('input', '', row);
      Object.assign(inp, { type: 'color', value: v || store.working.theme.text || '#ffffff' });
      inp.addEventListener('input', store.onEdit((n) => (props[k] = n.value)));
      if (v) button(row, '↺ ค่าเริ่มต้น', () => store.act(() => (props[k] = '')));
      else el('span', 'ed-hint', row, 'ค่าเริ่มต้น');
      return;
    }
    case 'select': {
      const sel = selectBox(row, f.choices, v ?? f.choices[0]);
      sel.addEventListener('change', store.onEdit((n) => (props[k] = n.value)));
      return;
    }
    case 'size': {
      const pair = Array.isArray(v) ? v : [0, 0];
      pair.forEach((num, i) => {
        const inp = numberBox(row, num);
        inp.classList.add('ed-small');
        inp.addEventListener('input', store.onEdit((n) => {
          if (n.value === '') return false;
          props[k] = (Array.isArray(props[k]) ? props[k] : [0, 0]).map((x, j) => (j === i ? Number(n.value) : x));
        }));
      });
      return;
    }
    case 'list':
      return listField(row, store, props, k);
    case 'messages':
      return messagesField(row, store, props, k);
    default: {
      // ข้อความ: กด Enter เพื่อขึ้นบรรทัดใหม่ ช่องจะสูงขึ้นตามจำนวนบรรทัด
      const ta = el('textarea', 'ed-text', row);
      ta.value = v ?? '';
      ta.placeholder = 'Enter = ขึ้นบรรทัดใหม่';
      const grow = () => (ta.rows = Math.max(1, ta.value.split('\n').length));
      grow();
      ta.addEventListener('input', grow);
      ta.addEventListener('input', store.onEdit((n) => (props[k] = n.value)));
    }
  }
}

/** รายการข้อความ: แก้ทีละแถว ✕ ลบแถว ＋ เพิ่มบรรทัด */
function listField(row, store, props, k) {
  row.classList.add('ed-col');
  const items = Array.isArray(props[k]) ? props[k] : [];
  items.forEach((text, i) => {
    const r = el('div', 'ed-row', row);
    const inp = textBox(r, text);
    inp.addEventListener('input', store.onEdit((n) => (props[k] = props[k].map((x, j) => (j === i ? n.value : x)))));
    button(r, '✕', () => store.act(() => (props[k] = props[k].filter((_, j) => j !== i)))).classList.add('ed-icon');
  });
  // ใช้ props[k] ปัจจุบัน (ไม่ใช่ items ตอนวาด) เพื่อไม่ให้ทับสิ่งที่เพิ่งพิมพ์
  button(row, '＋ เพิ่มบรรทัด', () => store.act(() => (props[k] = [...(Array.isArray(props[k]) ? props[k] : []), 'ข้อความใหม่'])));
}

/** รายการ { หัวข้อ, ข้อความ } สองช่องต่อแถว */
function messagesField(row, store, props, k) {
  row.classList.add('ed-col');
  // อ่าน props[k] ใหม่ทุกครั้ง: แก้หัวข้อแล้วแก้ข้อความต่อ ต้องไม่ทับหัวข้อที่เพิ่งแก้
  const current = () => (Array.isArray(props[k]) ? props[k] : []).map((m) => (typeof m === 'string' ? { text: m } : m));
  const items = current();
  const update = (i, patch) => (props[k] = current().map((m, j) => (j === i ? { ...m, ...patch } : m)));
  items.forEach((m, i) => {
    const r = el('div', 'ed-row', row);
    const title = textBox(r, m.title, 'หัวข้อ');
    title.classList.add('ed-small');
    title.addEventListener('input', store.onEdit((n) => update(i, { title: n.value })));
    const text = textBox(r, m.text, 'ข้อความ');
    text.addEventListener('input', store.onEdit((n) => update(i, { text: n.value })));
    button(r, '✕', () => store.act(() => (props[k] = current().filter((_, j) => j !== i)))).classList.add('ed-icon');
  });
  button(row, '＋ เพิ่มข้อความ', () => store.act(() => (props[k] = [...current(), { title: '', text: 'ข้อความใหม่' }])));
}
