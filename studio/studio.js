// หน้าแรกของ Studio: รายการงาน + สร้างงานใหม่ + สั่งเรนเดอร์

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

async function resumeRunning() {
  const job = await api('/__api/running').catch(() => ({}));
  if (!job.id) return;
  const card = document.querySelector(`.card[data-name="${CSS.escape(job.name)}"]`);
  if (card?._ui) runRender(job.name, card._ui, job);
}

(async () => {
  try {
    await renderConfigs();
    await renderTemplates();
    await resumeRunning();
  } catch (err) {
    el('div', 'empty', $('main'), `โหลดข้อมูลไม่ได้: ${err.message} (เปิดหน้านี้ผ่าน npm start หรือยัง?)`);
  }
})();
