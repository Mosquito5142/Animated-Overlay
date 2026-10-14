// เทมเพลต sponsor-gaming: ป้ายโฆษณารอบขอบจอสำหรับคลิปเกม
// build() สร้าง DOM จาก config, frame(t) จัดท่าทางของทุกชิ้นที่เวลา t (วินาที)

import { el, applyStyle, progress, ease, lerp, clamp01 } from '/templates/_runtime/runtime.js';

const asset = (p) => (!p || /^(https?:|data:|\/)/.test(p) ? p : `/${p}`);
const fmtNumber = (n) => Math.round(n).toLocaleString('en-US');

// ทิศทางและจังหวะตอนเข้าฉาก (ใช้เมื่อ config.intro = true)
const ENTER = {
  highlight: { x: 420, y: 0, delay: 0.0 },
  topDonate: { x: 360, y: 0, delay: 0.15 },
  sponsorLogo: { x: 380, y: 0, delay: 0.3 },
  webcamFrame: { x: -460, y: 0, delay: 0.1 },
  notice: { x: -460, y: 0, delay: 0.25 },
  promoBar: { x: 0, y: 160, delay: 0.2 },
  ticker: { x: 0, y: 120, delay: 0.35 },
};
const ENTER_DUR = 0.7;

/** ตำแหน่งแสงวิ่ง: วิ่งผ่านช่วงแรก 25% ของรอบ แล้วรอนอกกรอบ */
function shineX(phase, width) {
  const p = clamp01(phase / 0.25);
  return lerp(-160, width + 160, ease.inOutSine(p));
}
/** จังหวะเด้งสั้นๆ ต้นรอบ (0 → 1 → 0) */
const bump = (phase, len = 0.15) => (phase < len ? Math.sin((Math.PI * phase) / len) : 0);
/** คลื่นนุ่มๆ 0..1 */
const wave = (phase) => 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);

function enabled(cfg) {
  return cfg && cfg.enabled !== false;
}

export default {
  build(stage, ctx) {
    const E = ctx.config.elements || {};
    const n = (this.nodes = {});

    // 1. HIGHLIGHT
    if (enabled(E.highlight)) {
      const c = E.highlight;
      const root = el('div', 'el highlight', stage);
      el('div', 'label', root, c.text ?? 'HIGHLIGHT');
      n.highlight = { root, shine: el('div', 'shine', root) };
      applyStyle(root, c.style);
    }

    // 2. TOP DONATE
    if (enabled(E.topDonate)) {
      const c = E.topDonate;
      const root = el('div', 'el donate', stage);
      const badge = el('div', 'badge', root);
      const crown = el('div', 'crown', badge, '♛');
      el('div', '', badge, c.badge ?? 'TOP');
      el('div', '', badge, c.badge2 ?? 'DONATE');
      const body = el('div', 'body', root);
      el('div', 'name', body, c.name ?? '');
      const amount = el('div', 'amount', body);
      n.topDonate = { root, crown, amount, shine: el('div', 'shine', root), cfg: c };
      applyStyle(root, c.style);
    }

    // 3. โลโก้สปอนเซอร์
    if (enabled(E.sponsorLogo)) {
      const c = E.sponsorLogo;
      const root = el('div', 'el sponsor', stage);
      if (c.image) {
        const img = el('img', '', root);
        img.src = asset(c.image);
        img.alt = c.text || 'sponsor';
      } else {
        el('div', 'text', root, c.text ?? 'SPONSOR');
      }
      n.sponsorLogo = { root };
      applyStyle(root, c.style);
    }

    // 4. กรอบกล้อง (ตรงกลางโปร่งใส ให้เห็นกล้องจากคลิปจริงด้านล่าง)
    if (enabled(E.webcamFrame)) {
      const c = E.webcamFrame;
      const [w, h] = c.camSize || [398, 292];
      const root = el('div', 'el webcam', stage);
      root.style.width = `${w}px`;
      const bar = el('div', 'bar', root);
      el('div', 'channel', bar, c.channel ?? 'CHANNEL');
      el('div', 'label', bar, c.label ?? '');
      let dot = null;
      if (c.live !== false) {
        const live = el('div', 'live', bar);
        dot = el('div', 'dot', live);
        el('span', '', live, 'LIVE');
      }
      const cam = el('div', 'cam', root);
      cam.style.width = `${w}px`;
      cam.style.height = `${h}px`;
      const sw = c.borderWidth ?? 6;
      const P = 2 * (w + h);
      cam.innerHTML = `
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
          <rect x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
                fill="none" stroke="var(--panel)" stroke-width="${sw}"/>
          <rect class="run" x="${sw / 2}" y="${sw / 2}" width="${w - sw}" height="${h - sw}" rx="4"
                fill="none" stroke="var(--primary)" stroke-width="${sw}" stroke-linecap="round"
                stroke-dasharray="${P * 0.22} ${P * 0.28}"
                style="filter: drop-shadow(0 0 6px var(--primary))"/>
        </svg>`;
      n.webcamFrame = { root, dot, run: cam.querySelector('.run'), perimeter: P };
      applyStyle(root, c.style);
    }

    // 5. แถบโปรโมชัน
    if (enabled(E.promoBar)) {
      const c = E.promoBar;
      const root = el('div', 'el promo', stage);
      if (c.logo) {
        const logo = el('div', 'logo', root);
        const img = el('img', '', logo);
        img.src = asset(c.logo);
        img.alt = 'logo';
      }
      if (c.text) el('div', 'text', root, c.text);
      const box = el('div', 'price-box', root);
      if (c.oldPrice) el('div', 'old', box, c.oldPrice);
      const row = el('div', 'price-row', box);
      el('div', 'price', row, c.price ?? '');
      if (c.unit) el('div', 'unit', row, c.unit);
      if (c.note) el('div', 'note', box, c.note);
      n.promoBar = { root, row, shine: el('div', 'shine', root) };
      applyStyle(root, c.style);
    }

    // 6. ตัววิ่ง
    if (enabled(E.ticker)) {
      const c = E.ticker;
      const root = el('div', 'el ticker', stage);
      if (c.tag) el('div', 'tag', root, c.tag);
      const win = el('div', 'window', root);
      const track = el('div', 'track', win);
      const items = Array.isArray(c.items) ? c.items : [c.text ?? ''];
      const unit = el('div', 'unit', track);
      unit.style.display = 'flex';
      for (const text of items) el('div', 'item', unit, text);
      n.ticker = { root, win, track, unit, speed: c.speed ?? 110 };
      applyStyle(root, c.style);
    }

    // 7. กล่องข้อความวนเปลี่ยน
    if (enabled(E.notice) && (E.notice.messages || []).length) {
      const c = E.notice;
      const root = el('div', 'el notice', stage);
      const msgs = c.messages.map((m) => {
        const box = el('div', 'msg', root);
        const obj = typeof m === 'string' ? { text: m } : m;
        if (obj.title) el('div', 'title', box, obj.title);
        el('div', 'line', box, obj.text);
        return box;
      });
      n.notice = { root, msgs, each: c.secondsEach ?? 4 };
      applyStyle(root, c.style);
    }
  },

  // วัดขนาดหลังโหลดฟอนต์/รูปเสร็จ
  measure() {
    const n = this.nodes;
    for (const key of ['highlight', 'topDonate', 'promoBar']) {
      if (n[key]) n[key].width = n[key].root.offsetWidth;
    }
    if (n.ticker) {
      const tk = n.ticker;
      tk.unitWidth = tk.unit.offsetWidth;
      const copies = Math.ceil(tk.win.offsetWidth / Math.max(1, tk.unitWidth)) + 1;
      for (let i = 0; i < copies; i++) tk.track.appendChild(tk.unit.cloneNode(true));
    }
  },

  frame(t, ctx) {
    const n = this.nodes;
    const { cycle } = ctx;

    // ตอนเข้าฉาก
    const enterP = {};
    for (const key of Object.keys(n)) {
      const node = n[key];
      const e = ENTER[key];
      let p = 1;
      if (ctx.intro && e) {
        p = progress(t, e.delay, ENTER_DUR);
        const k = ease.outBack(p);
        node.root.style.transform = `translate(${e.x * (1 - k)}px, ${e.y * (1 - k)}px)`;
        node.root.style.opacity = String(clamp01(p * 2.5));
      }
      enterP[key] = p;
    }

    if (n.highlight) {
      const ph = cycle(t, 4);
      n.highlight.shine.style.transform = `translateX(${shineX(ph, n.highlight.width)}px) skewX(-20deg)`;
    }

    if (n.topDonate) {
      const d = n.topDonate;
      const total = Number(d.cfg.amount) || 0;
      const shown = ctx.intro ? total * ease.outCubic(progress(t, 0.3, 1.6)) : total;
      d.amount.textContent = `${fmtNumber(shown)}${d.cfg.currency ?? '฿'}`;
      d.crown.style.transform = `translateY(${-3 * Math.sin(2 * Math.PI * cycle(t, 1.25))}px)`;
      const ph = (cycle(t, 5) + 0.5) % 1;
      d.shine.style.transform = `translateX(${shineX(ph, d.width)}px) skewX(-20deg)`;
    }

    if (n.sponsorLogo) {
      const g = wave(cycle(t, 2));
      n.sponsorLogo.root.style.boxShadow =
        `0 6px 18px rgba(0,0,0,.45), 0 0 ${6 + 18 * g}px ${1 + 2 * g}px var(--primary)`;
    }

    if (n.webcamFrame) {
      const w = n.webcamFrame;
      w.run.style.strokeDashoffset = String(-cycle(t, 3) * w.perimeter);
      if (w.dot) w.dot.style.opacity = String(0.25 + 0.75 * (cycle(t, 1) < 0.55 ? 1 : 0));
    }

    if (n.promoBar) {
      const p = n.promoBar;
      const ph = cycle(t, 2.5);
      p.row.style.transform = `scale(${1 + 0.08 * bump(ph, 0.2)})`;
      const sh = (cycle(t, 5) + 0.25) % 1;
      p.shine.style.transform = `translateX(${shineX(sh, p.width)}px) skewX(-20deg)`;
    }

    if (n.ticker) {
      const tk = n.ticker;
      const ph = cycle(t, tk.unitWidth / tk.speed);
      tk.track.style.transform = `translateX(${-ph * tk.unitWidth}px)`;
    }

    if (n.notice) {
      const nt = n.notice;
      const count = nt.msgs.length;
      const ph = cycle(t, nt.each * count) * count;
      const idx = Math.floor(ph);
      const local = ph - idx;
      nt.msgs.forEach((box, i) => {
        if (i !== idx) {
          box.style.opacity = '0';
          return;
        }
        const fadeIn = count > 1 ? clamp01(local / 0.08) : 1;
        const fadeOut = count > 1 ? clamp01((1 - local) / 0.08) : 1;
        const v = Math.min(fadeIn, fadeOut);
        box.style.opacity = String(v);
        box.style.transform = `translateY(${(1 - ease.outCubic(fadeIn)) * 16 - (1 - fadeOut) * 16}px)`;
      });
    }

    return enterP;
  },
};
