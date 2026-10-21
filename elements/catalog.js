// รายชื่อชิ้นส่วนทั้งหมด (ข้อมูลล้วน ไม่มี import จึงใช้ได้ทั้งในเบราว์เซอร์และ node)
// - หน้าคลังชิ้นส่วนใช้ label / icon / category
// - แผงคุณสมบัติใช้ fields สร้างช่องแก้ไข
// - ตัวแปลงงานเดิมและตัวตรวจ config ใช้เช็กว่ามีชนิดนี้จริง
// โค้ดหน้าตา/ท่าทางของแต่ละชนิดอยู่ใน elements/<type>/index.js และ style.css
//
// ชนิดของ field: text | number | color | boolean | select (choices) | image | list | messages | size
// defaults.style  = style เริ่มต้นตอนเพิ่มชิ้น (ไม่มีตำแหน่ง → stage จัดไว้กลางจอ)
// defaults.timing = start / end / enter / exit เริ่มต้นตอนเพิ่มชิ้น

export const CATEGORIES = [
  ['basic', 'พื้นฐาน'],
  ['banner', 'ป้ายและกล่อง'],
  ['frame', 'กรอบ'],
  ['ticker', 'ข้อความวิ่ง'],
];

const MOTION_SPEED = { label: 'ความเร็ว (วินาทีต่อรอบ)', type: 'number' };

export const CATALOG = {
  // ---------- พื้นฐาน ----------
  text: {
    label: 'ข้อความ', icon: '📝', category: 'basic',
    defaults: { props: { text: 'ข้อความ', size: 64, color: '', weight: '700', stroke: '', strokeWidth: 0, shadow: true } },
    fields: {
      text: { label: 'ข้อความ', type: 'text' },
      size: { label: 'ขนาดตัวอักษร (px)', type: 'number' },
      color: { label: 'สีตัวอักษร', type: 'color' },
      weight: { label: 'ความหนา', type: 'select', choices: ['400', '600', '700', '800', '900'] },
      stroke: { label: 'สีขอบตัวอักษร', type: 'color' },
      strokeWidth: { label: 'ความหนาขอบ (px)', type: 'number' },
      shadow: { label: 'เงา', type: 'boolean' },
    },
  },
  image: {
    label: 'รูปภาพ', icon: '🖼️', category: 'basic',
    defaults: { props: { src: 'assets/logos/sponsor-placeholder.svg', width: 300, radius: 0, opacity: 1 } },
    fields: {
      src: { label: 'ไฟล์รูป', type: 'image' },
      width: { label: 'ความกว้าง (px)', type: 'number' },
      radius: { label: 'ความโค้งมุม (px)', type: 'number' },
      opacity: { label: 'ความทึบ (0–1)', type: 'number' },
    },
  },
  shape: {
    label: 'กล่อง/รูปทรง', icon: '⬛', category: 'basic',
    defaults: { props: { shape: 'rect', width: 400, height: 120, fill: '', stroke: '', strokeWidth: 0, radius: 16 } },
    fields: {
      shape: { label: 'รูปทรง', type: 'select', choices: ['rect', 'circle', 'line'] },
      width: { label: 'กว้าง (px)', type: 'number' },
      height: { label: 'สูง (px)', type: 'number' },
      fill: { label: 'สีพื้น', type: 'color' },
      stroke: { label: 'สีขอบ', type: 'color' },
      strokeWidth: { label: 'ความหนาขอบ (px)', type: 'number' },
      radius: { label: 'ความโค้งมุม (px)', type: 'number' },
    },
  },

  // ---------- ป้ายและกล่อง ----------
  highlight: {
    label: 'ป้าย HIGHLIGHT', icon: '⚡', category: 'banner',
    defaults: { props: { text: 'HIGHLIGHT' } },
    fields: { text: { label: 'ข้อความ', type: 'text' } },
  },
  'top-donate': {
    label: 'TOP DONATE', icon: '👑', category: 'banner',
    defaults: { props: { name: 'TNP', amount: 20000, currency: '฿', badge: 'TOP', badge2: 'DONATE' } },
    fields: {
      name: { label: 'ชื่อ', type: 'text' },
      amount: { label: 'จำนวนเงิน', type: 'number' },
      currency: { label: 'สกุลเงิน', type: 'text' },
      badge: { label: 'ป้ายบรรทัด 1', type: 'text' },
      badge2: { label: 'ป้ายบรรทัด 2', type: 'text' },
    },
  },
  'promo-bar': {
    label: 'แถบโปรโมชัน', icon: '🏷️', category: 'banner',
    defaults: { props: { logo: 'assets/logos/game-placeholder.svg', text: 'แพ็คใหญ่จุใจ', oldPrice: '29,999', price: '8,230', unit: 'THB', note: 'ระบบ Drop Link' } },
    fields: {
      logo: { label: 'ไฟล์โลโก้', type: 'image' },
      text: { label: 'ข้อความ', type: 'text' },
      oldPrice: { label: 'ราคาเดิม', type: 'text' },
      price: { label: 'ราคา', type: 'text' },
      unit: { label: 'หน่วย', type: 'text' },
      note: { label: 'หมายเหตุ', type: 'text' },
    },
  },
  notice: {
    label: 'กล่องประกาศ', icon: '💬', category: 'banner',
    defaults: { props: { secondsEach: 5, messages: [{ title: '📢 ประกาศ', text: 'ไลฟ์ทุกวัน 2 ทุ่มเป็นต้นไป' }] } },
    fields: {
      messages: { label: 'ข้อความ', type: 'messages' },
      secondsEach: { label: 'วินาทีต่อข้อความ', type: 'number' },
    },
  },
  'popup-card': {
    label: 'การ์ดสปอนเซอร์เด้ง', icon: '🎁', category: 'banner',
    defaults: {
      props: { tag: 'SPONSORED BY', image: 'assets/logos/sponsor-placeholder.svg', title: 'YOUR BRAND', subtitle: 'ผู้สนับสนุนหลักของช่อง', color: '#ff3d57', compact: false, persistent: false },
      timing: { start: 0, end: 6.15, enter: { type: 'pop', from: 'auto', duration: 0.7 }, exit: { type: 'pop', duration: 0.45 } },
    },
    fields: {
      tag: { label: 'ป้ายหัว', type: 'text' },
      image: { label: 'ไฟล์โลโก้', type: 'image' },
      title: { label: 'หัวข้อ', type: 'text' },
      subtitle: { label: 'ข้อความรอง', type: 'text' },
      color: { label: 'สีการ์ด', type: 'color' },
      compact: { label: 'แบบเล็ก', type: 'boolean' },
      persistent: { label: 'ลอยขึ้นลงตลอด (ไม่มีแถบเวลา)', type: 'boolean' },
    },
  },
  'neon-label': {
    label: 'ป้ายนีออน', icon: '💡', category: 'banner',
    defaults: { props: { text: 'LIVE NOW', sub: 'ไลฟ์ทุกวัน 2 ทุ่ม', dot: true } },
    fields: {
      text: { label: 'ข้อความ', type: 'text' },
      sub: { label: 'ข้อความรอง', type: 'text' },
      dot: { label: 'จุดกะพริบ', type: 'boolean' },
    },
  },
  'sponsor-logo': {
    label: 'โลโก้สปอนเซอร์', icon: '🏢', category: 'banner',
    defaults: { props: { image: 'assets/logos/sponsor-placeholder.svg', text: 'SPONSOR' } },
    fields: {
      image: { label: 'ไฟล์รูป', type: 'image' },
      text: { label: 'ข้อความ (ใช้เมื่อไม่มีรูป)', type: 'text' },
    },
  },

  // ---------- กรอบ ----------
  'webcam-frame': {
    label: 'กรอบกล้อง', icon: '📷', category: 'frame',
    defaults: { props: { channel: 'BANK', label: 'OVERTIME', live: true, camSize: [398, 292], borderWidth: 6 } },
    fields: {
      channel: { label: 'ชื่อช่อง', type: 'text' },
      label: { label: 'ข้อความกลาง', type: 'text' },
      live: { label: 'แสดง LIVE', type: 'boolean' },
      camSize: { label: 'ขนาดกล้อง (กว้าง, สูง)', type: 'size' },
      borderWidth: { label: 'ความหนาขอบ', type: 'number' },
    },
  },
  'neon-frame': {
    label: 'กรอบนีออน', icon: '🌈', category: 'frame', fullscreen: true,
    defaults: { props: { effect: 'chase', thickness: 8, inset: 16, radius: 22, segments: 3, period: 2.5 } },
    fields: {
      effect: { label: 'เอฟเฟกต์', type: 'select', choices: ['chase', 'blink', 'pulse', 'rainbow'] },
      thickness: { label: 'ความหนา', type: 'number' },
      inset: { label: 'ระยะห่างขอบจอ', type: 'number' },
      radius: { label: 'ความโค้งมุม', type: 'number' },
      segments: { label: 'จำนวนแสงวิ่ง', type: 'number' },
      period: MOTION_SPEED,
    },
  },
  'neon-bulbs': {
    label: 'หลอดไฟรอบขอบ', icon: '✨', category: 'frame', fullscreen: true,
    defaults: { props: { pattern: 'alternate', spacing: 60, size: 7, gap: 26, period: 1 } },
    fields: {
      pattern: { label: 'รูปแบบ', type: 'select', choices: ['alternate', 'chase', 'twinkle'] },
      spacing: { label: 'ระยะห่างหลอดไฟ', type: 'number' },
      size: { label: 'ขนาด', type: 'number' },
      gap: { label: 'ระยะหลอดไฟจากกรอบ', type: 'number' },
      period: MOTION_SPEED,
    },
  },
  'neon-corners': {
    label: 'มุมกรอบ', icon: '📐', category: 'frame', fullscreen: true,
    defaults: { props: { length: 90, thickness: 12, period: 2 } },
    fields: {
      length: { label: 'ความยาวขา', type: 'number' },
      thickness: { label: 'ความหนา', type: 'number' },
      period: MOTION_SPEED,
    },
  },

  // ---------- ข้อความวิ่ง ----------
  ticker: {
    label: 'ข้อความวิ่ง', icon: '📰', category: 'ticker',
    defaults: {
      props: { tag: 'PROMO', items: ['ข้อความวิ่งอันที่ 1', 'ข้อความวิ่งอันที่ 2'], speed: 110 },
      style: { width: 1000 },
    },
    fields: {
      tag: { label: 'ป้ายหัว', type: 'text' },
      items: { label: 'ข้อความ', type: 'list' },
      speed: { label: 'ความเร็ว (px/วินาที)', type: 'number' },
    },
  },
};
