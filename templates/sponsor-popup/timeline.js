// เทมเพลต sponsor-popup: ป้ายสปอนเซอร์เด้งเข้ามุมจอทีละอัน แล้วสไลด์ออก
// ทุกชิ้นใน config.elements คือป้าย 1 อัน (เพิ่ม/ลบ/ทำสำเนาได้ในหน้าแก้ไข)
// ป้ายจะเด้งเข้ามาจากขอบจอที่ใกล้ที่สุด หรือกำหนดเองด้วย "from"

import { el, applyStyle, ease, clamp01, lerp } from '/templates/_runtime/runtime.js';

const asset = (p) => (!p || /^(https?:|data:|\/)/.test(p) ? p : `/${p}`);
const IN = 0.7; // วินาทีตอนเด้งเข้า
const OUT = 0.45; // วินาทีตอนสไลด์ออก
const inBack = (p) => 2.70158 * p * p * p - 1.70158 * p * p;

export default {
  dynamic: true,
  choices: { from: ['auto', 'left', 'right', 'top', 'bottom'] },
  labelFor: (key, cfg) => {
    const name = cfg?.title || cfg?.tag || key;
    return cfg?.persistent ? `${name} (แสดงตลอด)` : name;
  },
  // ป้ายที่ทำสำเนา ให้โผล่ต่อจากป้ายเดิม ไม่ซ้อนเวลากัน
  onDuplicate(copy, ctx) {
    if (copy.persistent) return;
    const next = (Number(copy.start) || 0) + (Number(copy.hold) || 5) + IN + OUT + 0.3;
    copy.start = Math.round((next % ctx.duration) * 10) / 10;
  },

  build(stage, ctx) {
    this.items = [];
    for (const [key, c] of Object.entries(ctx.config.elements || {})) {
      if (c.enabled === false) continue;
      const root = el('div', `el popup${c.compact ? ' compact' : ''}`, stage);
      root.dataset.key = key;
      if (c.color) root.style.setProperty('--c', c.color);
      const card = el('div', 'card', root);
      if (c.tag !== '') el('div', 'tag', card, c.tag ?? 'SPONSORED BY');
      const row = el('div', 'row', card);
      if (c.image) {
        const img = el('img', '', el('div', 'logo', row));
        img.src = asset(c.image);
        img.alt = c.title || 'sponsor';
      }
      const texts = el('div', 'texts', row);
      if (c.title) el('div', 'title', texts, c.title);
      if (c.subtitle) el('div', 'subtitle', texts, c.subtitle);
      const bar = c.persistent ? null : el('div', 'bar', card);
      const shine = el('div', 'shine', card);
      applyStyle(root, c.style);
      this.items.push({ key, c, root, card, bar, shine });
    }
  },

  frame(t, ctx) {
    const W = ctx.width;
    const H = ctx.height;
    const D = ctx.duration;

    // อ่านตำแหน่งทั้งหมดก่อน แล้วค่อยเขียน (ไม่ให้เบราว์เซอร์คำนวณ layout ซ้ำ)
    const boxes = this.items.map((it) => ({
      x: it.root.offsetLeft, y: it.root.offsetTop, w: it.root.offsetWidth, h: it.root.offsetHeight,
    }));

    this.items.forEach((it, i) => {
      const { c, card, bar, shine } = it;
      const b = boxes[i];
      const sw = card.offsetWidth;

      if (c.persistent) {
        card.style.opacity = '1';
        card.style.transform = `translateY(${-3 * Math.sin(2 * Math.PI * ctx.cycle(t, 3))}px)`;
        const ph = ctx.cycle(t, 6);
        shine.style.transform = `translateX(${lerp(-160, sw + 160, clamp01(ph / 0.2))}px) skewX(-20deg)`;
        return;
      }

      const hold = Math.max(0.5, Number(c.hold) || 5);
      const local = ((((t - (Number(c.start) || 0)) % D) + D) % D); // เวลาที่ผ่านไปนับจากเริ่ม (วนลูป)
      let pIn = 1;
      let pOut = 0;
      let visible = true;
      if (!ctx.showAll) {
        if (local < IN) pIn = local / IN;
        else if (local < IN + hold) pIn = 1;
        else if (local < IN + hold + OUT) pOut = (local - IN - hold) / OUT;
        else visible = false;
      }
      if (!visible) {
        card.style.opacity = '0';
        return;
      }

      // ทิศที่เด้งเข้า: ขอบที่ใกล้ที่สุด
      let from = c.from && c.from !== 'auto' ? c.from : null;
      if (!from) {
        const d = { left: b.x, right: W - (b.x + b.w), top: b.y, bottom: H - (b.y + b.h) };
        from = Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a));
      }
      const dist = {
        left: [-(b.x + b.w + 40), 0],
        right: [W - b.x + 40, 0],
        top: [0, -(b.y + b.h + 40)],
        bottom: [0, H - b.y + 40],
      }[from];

      const k = pOut > 0 ? inBack(pOut) : 1 - ease.outBack(pIn);
      const scale = pOut > 0 ? 1 - 0.15 * pOut : lerp(0.7, 1, ease.outBack(pIn));
      const float = pOut === 0 && pIn === 1 ? -4 * Math.sin((2 * Math.PI * (local - IN)) / 2.5) : 0;
      card.style.opacity = String(clamp01(pIn * 3) * (1 - pOut * 0.3));
      card.style.transform = `translate(${dist[0] * k}px, ${dist[1] * k + float}px) scale(${scale})`;

      // แสงวิ่งผ่านหลังเด้งเข้า + แถบเวลาที่เหลือ
      const sp = ctx.showAll ? 1 : clamp01((local - IN) / 0.8);
      shine.style.transform = `translateX(${lerp(-160, sw + 160, ease.inOutSine(sp))}px) skewX(-20deg)`;
      if (bar) {
        const remain = ctx.showAll ? 1 : 1 - clamp01((local - IN) / hold);
        bar.style.transform = `scaleX(${remain})`;
      }
    });
  },
};
