// ตัวช่วยสร้าง DOM ที่ใช้ร่วมกันทั้ง stage, หน้าแก้ไข และชิ้นส่วน

const NS = 'http://www.w3.org/2000/svg';

/** ตัวช่วยสร้าง element */
export function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

/** ตัวช่วยสร้าง element ของ SVG */
export function svgEl(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
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

/** path ของไฟล์ในโปรเจกต์ (เช่น assets/logo.png) → URL ที่เซิร์ฟเวอร์เสิร์ฟ */
export const assetUrl = (p) => (!p || /^(https?:|data:|\/)/.test(p) ? p : `/${p}`);
