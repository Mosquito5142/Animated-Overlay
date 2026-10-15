// หน้าแรกของ Studio: รายการงาน + สร้างงานใหม่ + สั่งเรนเดอร์ + คลังไฟล์ + สถานะเครื่อง

import { uploadFile, pickFiles, kindOf, listAssets } from '/templates/_runtime/upload.js';

const $ = (sel) => document.querySelector(sel);
function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}

async function api(url, body) {
  const res = await fetch(url, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const TEMPLATE_NAMES = {
  'sponsor-gaming': 'ชุดโฆษณาคลิปเกม',
  'sponsor-popup': 'ป้ายสปอนเซอร์เด้งเข้ามุมจอ',
  'neon-frame': 'กรอบไฟนีออน',
};
const pageUrl = (template, c, mode) =>
  `/templates/${template}/index.html?c=${encodeURIComponent(c)}${mode ? `&mode=${mode}` : ''}`;
const orientation = (res) => (res && res[1] > res[0] ? 'แนวตั้ง' : 'แนวนอน');

/** ภาพตัวอย่างที่ขยับได้ (iframe ของหน้า preview แบบ embed) */
function thumb(parent, template, c, res) {
  const box = el('div', 'thumb', parent);
  const [W, H] = res || [1920, 1080];
  const h = 200;
  const w = Math.min(box.clientWidth || 360, (W / H) * h);
  const frame = el('iframe', '', box);
  frame.loading = 'lazy';
  frame.title = c;
  frame.src = `${pageUrl(template, c)}&embed=1`;
  const size = () => {
    const bw = box.clientWidth || 360;
    const fw = Math.min(bw, (W / H) * h);
    frame.style.width = `${fw}px`;
    frame.style.height = `${(fw * H) / W}px`;
  };
  frame.style.width = `${w}px`;
  frame.style.height = `${(w * H) / W}px`;
  requestAnimationFrame(size);
  window.addEventListener('resize', size);
  return box;
}

function linkBtn(parent, text, href, cls = '') {
  const a = el('a', `btn ${cls}`, parent, text);
  a.href = href;
  return a;
}

function suggestName(base, taken) {
  let i = 1;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

let configs = [];

async function renderConfigs() {
  configs = await api('/__api/configs');
  const box = $('#configs');
  box.replaceChildren();
  if (!configs.length) {
    el('div', 'empty', box, 'ยังไม่มีงาน เลือกเทมเพลตด้านล่างเพื่อเริ่มสร้าง');
    return;
  }
  for (const c of configs) {
    const card = el('div', 'card', box);
    if (c.error) {
      const body = el('div', 'body', card);
      el('b', '', el('div', 'title', body), c.name);
      el('div', 'status err', body, `ไฟล์ config มีปัญหา: ${c.error}`);
      continue;
    }
    thumb(card, c.template, c.name, c.resolution);
    const body = el('div', 'body', card);
    const title = el('div', 'title', body);
    el('b', '', title, c.name);
    el('span', 'tag', title, TEMPLATE_NAMES[c.template] || c.template);
    el('span', 'tag', title, `${orientation(c.resolution)} ${c.resolution.join('×')}`);
    el('span', 'tag', title, `${c.duration} วิ`);

    const row = el('div', 'row', body);
    linkBtn(row, '✏️ ปรับแต่ง', pageUrl(c.template, c.name, 'edit'), 'primary');
    linkBtn(row, '▶ ดูตัวอย่าง', pageUrl(c.template, c.name));
    const renderBtn = el('button', 'btn', row, '🎬 เรนเดอร์');
    const dupBtn = el('button', 'btn', row, '⧉ ทำสำเนา');
    const delBtn = el('button', 'btn danger', row, '🗑 ลบ');
    delBtn.addEventListener('click', async () => {
      if (!confirm(`ลบงาน "${c.name}" ?\n(ไฟล์จะถูกย้ายไปไว้ในโฟลเดอร์ .trash กู้คืนได้ ส่วนไฟล์ที่เรนเดอร์แล้วยังอยู่)`)) return;
      try {
        await api('/__api/delete', { name: c.name });
        await renderConfigs();
        await renderAssets();
      } catch (err) {
        alert(err.message);
      }
    });

    const bar = el('div', 'bar', body);
    bar.hidden = true;
    const fill = el('div', '', bar);
    const status = el('div', 'status', body);
    const outs = el('div', 'outputs', body);
    showOutputs(outs, c.outputs);

    renderBtn.addEventListener('click', () => runRender(c.name, { renderBtn, bar, fill, status, outs }));
    dupBtn.addEventListener('click', async () => {
      const name = prompt('ชื่องานใหม่ (ตัวอักษร ตัวเลข _ -)', suggestName(c.name, new Set(configs.map((x) => x.name))));
      if (!name) return;
      try {
        await api('/__api/new', { from: c.name, name });
        await renderConfigs();
      } catch (err) {
        alert(err.message);
      }
    });
    card.dataset.name = c.name;
    card._ui = { renderBtn, bar, fill, status, outs };
  }
}

function showOutputs(box, files) {
  box.replaceChildren();
  if (!files?.length) return;
  el('span', 'muted', box, 'ไฟล์ที่ได้:');
  for (const f of files) {
    const a = el('a', '', box, f);
    a.href = `/output/${encodeURIComponent(f)}`;
    a.download = f;
  }
}

async function runRender(name, ui, existing) {
  ui.renderBtn.disabled = true;
  ui.bar.hidden = false;
  ui.status.className = 'status run';
  try {
    let job = existing || (await api('/__api/render', { name }));
    while (job.status === 'running') {
      const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
      ui.fill.style.width = `${job.phase === 'encode' ? 100 : pct}%`;
      ui.status.textContent = job.phase === 'encode'
        ? `กำลังเข้ารหัสเป็น ${job.format} ...`
        : `กำลังเรนเดอร์ ${job.done}/${job.total || '?'} เฟรม (${pct}%)`;
      await new Promise((r) => setTimeout(r, 700));
      job = await api(`/__api/jobs/${job.id}`);
    }
    if (job.status === 'error') throw new Error(job.error);
    ui.status.className = 'status ok';
    ui.status.textContent = '✓ เรนเดอร์เสร็จแล้ว ไฟล์อยู่ในโฟลเดอร์ output/';
    const fresh = (await api('/__api/configs')).find((x) => x.name === name);
    showOutputs(ui.outs, fresh?.outputs);
  } catch (err) {
    ui.status.className = 'status err';
    ui.status.textContent = `✗ ${err.message}`;
  } finally {
    ui.renderBtn.disabled = false;
    ui.bar.hidden = true;
  }
}

async function renderTemplates() {
  const templates = await api('/__api/templates');
  const box = $('#templates');
  box.replaceChildren();
  for (const t of templates) {
    const card = el('div', 'card', box);
    thumb(card, t.name, `@${t.name}`, t.resolution);
    const body = el('div', 'body', card);
    const title = el('div', 'title', body);
    el('b', '', title, TEMPLATE_NAMES[t.name] || t.name);
    el('span', 'tag', title, t.name);
    el('div', 'desc', body, t.description);

    const row1 = el('div', 'row', body);
    const name = el('input', '', row1);
    name.type = 'text';
    name.placeholder = 'ตั้งชื่องาน';
    name.value = suggestName(t.name.split('-')[1] || t.name, new Set(configs.map((x) => x.name)));
    const orient = el('select', '', row1);
    for (const [v, label] of [['h', 'แนวนอน 1920×1080'], ['v', 'แนวตั้ง 1080×1920']]) {
      const o = el('option', '', orient, label);
      o.value = v;
    }
    orient.style.flex = '0 0 auto';

    const row2 = el('div', 'row', body);
    const create = el('button', 'btn primary', row2, '＋ ใช้เทมเพลตนี้');
    linkBtn(row2, 'ลองปรับดูก่อน', pageUrl(t.name, `@${t.name}`, 'edit'));
    const status = el('div', 'status', body);

    create.addEventListener('click', async () => {
      create.disabled = true;
      try {
        const res = await api('/__api/new', { template: t.name, name: name.value.trim(), vertical: orient.value === 'v' });
        location.href = pageUrl(t.name, res.name, 'edit');
      } catch (err) {
        status.className = 'status err';
        status.textContent = `✗ ${err.message}`;
        create.disabled = false;
      }
    });
  }
}

// ---------- คลังไฟล์ ----------
const fmtSize = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
let fontCount = 0;

async function renderAssets() {
  const box = $('#assets');
  const items = await listAssets();
  box.replaceChildren();
  if (!items.length) el('div', 'muted', box, 'ยังไม่มีไฟล์');
  for (const a of items) {
    const card = el('div', 'asset', box);
    const pic = el('div', 'pic', card);
    const src = `/${a.path.split('/').map(encodeURIComponent).join('/')}`;
    if (a.type === 'image') el('img', '', pic).src = src;
    else if (a.type === 'video') Object.assign(el('video', '', pic), { src, muted: true, loop: true, autoplay: true });
    else {
      // ตัวอย่างฟอนต์: โหลดฟอนต์จากไฟล์แล้วแสดงข้อความตัวอย่าง
      const family = `AssetFont${fontCount++}`;
      new FontFace(family, `url("${src}")`).load().then((f) => document.fonts.add(f)).catch(() => {});
      const sample = el('span', 'font-sample', pic, 'กขค Aa 123');
      sample.style.fontFamily = `"${family}", sans-serif`;
    }
    const info = el('div', 'info', card);
    el('div', 'name', info, a.name);
    el('div', 'muted', info, `${fmtSize(a.size)}${a.builtin ? ' · ตัวอย่างมากับโปรแกรม' : ''}`);
    el('div', 'muted', info, a.usedBy.length ? `ใช้ใน: ${a.usedBy.join(', ')}` : 'ยังไม่มีงานไหนใช้');
    if (!a.builtin) {
      const del = el('button', 'btn danger', info, '🗑 ลบ');
      del.disabled = a.usedBy.length > 0;
      del.title = del.disabled ? 'ไฟล์นี้ยังถูกใช้อยู่ เอาออกจากงานก่อนถึงจะลบได้' : '';
      del.addEventListener('click', async () => {
        if (!confirm(`ลบ "${a.name}" ? (ย้ายไปไว้ในโฟลเดอร์ .trash)`)) return;
        try {
          await api('/__api/delete-asset', { path: a.path });
          await renderAssets();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }
}

async function uploadMany(files) {
  const status = $('#upload-status');
  let ok = 0;
  const errors = [];
  for (const [i, f] of files.entries()) {
    status.className = 'status run';
    status.textContent = `กำลังอัปโหลด ${i + 1}/${files.length}: ${f.name}`;
    try {
      await uploadFile(f, kindOf(f));
      ok++;
    } catch (err) {
      errors.push(err.message);
    }
  }
  status.className = errors.length ? 'status err' : 'status ok';
  status.textContent = errors.length ? `อัปโหลดได้ ${ok} ไฟล์ · ✗ ${errors.join(' · ')}` : `✓ อัปโหลด ${ok} ไฟล์แล้ว`;
  await renderAssets();
}

function setupLibrary() {
  $('#upload-btn').addEventListener('click', async () => {
    const files = await pickFiles('any', true);
    if (files.length) uploadMany(files);
  });
  const zone = $('#dropzone');
  zone.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      zone.classList.add('drop');
    }
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drop'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drop');
    uploadMany([...e.dataTransfer.files]);
  });
  for (const b of document.querySelectorAll('[data-open]')) {
    b.addEventListener('click', () => api('/__api/open-folder', { which: b.dataset.open }).catch((err) => alert(err.message)));
  }
}

// ---------- สถานะเครื่อง ----------
async function renderHealth() {
  const h = await api('/__api/health').catch(() => null);
  const box = $('#health');
  if (!h || (h.ffmpeg.ok && h.browser.ok)) {
    box.hidden = true;
    return;
  }
  box.replaceChildren();
  el('b', '', box, '⚠ เครื่องยังไม่พร้อมเรนเดอร์ (ปรับแต่งและดูตัวอย่างได้ตามปกติ)');
  const ul = el('ul', '', box);
  if (!h.ffmpeg.ok) {
    el('li', '', ul, h.ffmpeg.source
      ? `FFmpeg ที่เจอไม่มี encoder ครบ (${Object.entries(h.ffmpeg.encoders).filter(([, v]) => !v).map(([k]) => k).join(', ')}) ลองรัน npm install ใหม่`
      : 'ไม่พบ FFmpeg: ปิดโปรแกรมแล้วรัน npm install ใหม่ (หรือดับเบิลคลิก start.bat) ระบบจะดาวน์โหลดมาให้');
  }
  if (!h.browser.ok) {
    el('li', '', ul, 'เปิดเบราว์เซอร์สำหรับเรนเดอร์ไม่ได้: ติดตั้ง Microsoft Edge หรือ Google Chrome หรือรัน npx playwright install chromium');
  }
  box.hidden = false;
}

async function resumeRunning() {
  const job = await api('/__api/running').catch(() => ({}));
  if (!job.id) return;
  const card = document.querySelector(`.card[data-name="${CSS.escape(job.name)}"]`);
  if (card?._ui) runRender(job.name, card._ui, job);
}

(async () => {
  try {
    setupLibrary();
    await renderConfigs();
    await renderTemplates();
    await renderAssets();
    await resumeRunning();
    renderHealth();
  } catch (err) {
    el('div', 'empty', $('main'), `โหลดข้อมูลไม่ได้: ${err.message} (เปิดหน้านี้ผ่าน npm start หรือยัง?)`);
  }
})();
