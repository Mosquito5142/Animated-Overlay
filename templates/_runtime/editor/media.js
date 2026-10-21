// ช่องเลือกไฟล์ในหน้าแก้ไข
// - imageField: รูปย่อ + อัปโหลด + เลือกจากคลัง + ล้าง และลากไฟล์มาวางได้ (รูปที่ไม่ใช่ PNG ถูกแปลงให้ใน upload.js)
// - fontSelect: ฟอนต์ค่าเริ่มต้น หรือฟอนต์ที่อัปโหลดเอง

import { el } from '../dom.js';
import { uploadFile, pickFiles, listAssets } from '../upload.js';

// รายการไฟล์ในคลัง: เก็บไว้ชั่วครู่ แผงวาดใหม่บ่อยจะได้ไม่ยิงคำขอทุกครั้ง (อัปโหลดเสร็จจะล้างให้)
let assetsCache = null;
let assetsAt = 0;
function assets(refresh = false) {
  if (refresh || !assetsCache || Date.now() - assetsAt > 5000) {
    assetsAt = Date.now();
    assetsCache = listAssets().catch((err) => {
      assetsCache = null;
      throw err;
    });
  }
  return assetsCache;
}

/**
 * kind = 'image' (รูปในชิ้นส่วน) หรือ 'background' (รูป/คลิปพื้นหลังตัวอย่าง)
 * apply(path) ถูกเรียกเมื่อเลือกไฟล์ใหม่ ('' = ไม่ใช้รูป) ผู้เรียกจัดการ snapshot / rebuild เอง
 */
export function imageField(parent, label, kind, value, apply) {
  const wrapEl = el('div', 'ed-field ed-image', parent);
  el('span', 'ed-label', wrapEl, label);
  const top = el('div', 'ed-row', wrapEl);
  const thumb = el('div', 'ed-thumb', top);
  const buttons = el('div', 'ed-row ed-wrap', top);
  const upBtn = el('button', '', buttons, '📁 อัปโหลด');
  const libBtn = el('button', '', buttons, '🖼 คลัง');
  const clearBtn = el('button', '', buttons, '✕');
  clearBtn.title = 'ไม่ใช้รูป';
  for (const b of [upBtn, libBtn, clearBtn]) b.type = 'button';
  const pathEl = el('div', 'ed-path', wrapEl);
  const msg = el('div', 'ed-msg', wrapEl);
  const lib = el('div', 'ed-lib', wrapEl);
  lib.hidden = true;

  let current = value || '';
  const show = () => {
    thumb.replaceChildren();
    pathEl.textContent = current || '(ยังไม่มีรูป) ลากไฟล์มาวางตรงนี้ได้';
    if (!current) return;
    const src = current.startsWith('/') || /^https?:/.test(current) ? current : `/${current}`;
    if (/\.(mp4|webm|mov)$/i.test(current)) el('span', '', thumb, '🎬');
    else el('img', '', thumb).src = src;
  };
  const choose = async (val) => {
    current = val;
    show();
    await apply(val);
  };
  const doUpload = async (files) => {
    const file = files[0];
    if (!file) return;
    msg.className = 'ed-msg';
    msg.textContent = `กำลังอัปโหลด ${file.name} ...`;
    try {
      const res = await uploadFile(file, kind);
      assets(true).catch(() => {});
      await choose(res.path);
      msg.textContent = res.converted ? `✓ แปลงเป็น ${res.name} แล้ว` : `✓ อัปโหลด ${res.name} แล้ว`;
    } catch (err) {
      msg.className = 'ed-msg bad';
      msg.textContent = `✗ ${err.message}`;
    }
  };

  upBtn.addEventListener('click', async () => doUpload(await pickFiles(kind)));
  clearBtn.addEventListener('click', () => choose(''));
  libBtn.addEventListener('click', async () => {
    if (!lib.hidden) {
      lib.hidden = true;
      return;
    }
    lib.replaceChildren();
    const items = (await assets()).filter((a) => a.type === 'image' || (kind === 'background' && a.type === 'video'));
    if (!items.length) el('div', 'ed-hint', lib, 'ยังไม่มีรูปในคลัง กด 📁 อัปโหลด');
    for (const a of items) {
      const b = el('button', 'ed-lib-item', lib);
      b.type = 'button';
      b.title = a.name;
      if (a.type === 'video') el('span', '', b, '🎬');
      else el('img', '', b).src = `/${a.path}`;
      b.addEventListener('click', () => {
        lib.hidden = true;
        choose(a.path);
      });
    }
    lib.hidden = false;
  });
  wrapEl.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      wrapEl.classList.add('drop');
    }
  });
  wrapEl.addEventListener('dragleave', () => wrapEl.classList.remove('drop'));
  wrapEl.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapEl.classList.remove('drop');
    doUpload([...e.dataTransfer.files]);
  });
  show();
}

/** เลือกฟอนต์: ค่าเริ่มต้น ('' ) หรือฟอนต์ที่อัปโหลด (path) พร้อมปุ่มอัปโหลดฟอนต์ใหม่ */
export function fontSelect(parent, label, current, defaultLabel, onChange) {
  const wrapEl = el('div', 'ed-field', parent);
  el('span', 'ed-label', wrapEl, label);
  const row = el('div', 'ed-row', wrapEl);
  const sel = el('select', '', row);
  const upBtn = el('button', '', row, '📁 อัปโหลด');
  upBtn.type = 'button';
  const msg = el('div', 'ed-msg', wrapEl);
  const fill = async (value) => {
    let fonts = [];
    try {
      fonts = (await assets()).filter((a) => a.type === 'font');
    } catch {
      msg.className = 'ed-msg bad';
      msg.textContent = '✗ โหลดรายการฟอนต์ไม่ได้';
    }
    sel.replaceChildren();
    el('option', '', sel, defaultLabel).value = '';
    for (const f of fonts) el('option', '', sel, f.name).value = f.path;
    sel.value = value || '';
  };
  sel.addEventListener('change', () => onChange(sel.value));
  upBtn.addEventListener('click', async () => {
    const [file] = await pickFiles('font');
    if (!file) return;
    msg.className = 'ed-msg';
    msg.textContent = `กำลังอัปโหลด ${file.name} ...`;
    try {
      const res = await uploadFile(file, 'font');
      assets(true).catch(() => {});
      await onChange(res.path);
      await fill(res.path);
      msg.textContent = `✓ ใช้ฟอนต์ ${res.name} แล้ว`;
    } catch (err) {
      msg.className = 'ed-msg bad';
      msg.textContent = `✗ ${err.message}`;
    }
  });
  fill(current);
}
