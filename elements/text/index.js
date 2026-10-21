// ข้อความอิสระ: ขนาด/สี/ความหนา/ขอบ/เงา ตั้งได้ (ไม่ใส่สี = ใช้สีตัวอักษรของธีม)
// การจัดซ้าย/กลาง/ขวา ใช้ปุ่ม "จัดข้อความ" ที่มีให้ทุกชิ้น (style.text-align)
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const node = el('div', 'text', root, props.text ?? '');
    Object.assign(node.style, {
      fontSize: `${props.size ?? 64}px`,
      fontWeight: String(props.weight ?? '700'),
    });
    if (props.color) node.style.color = props.color;
    if (props.stroke && props.strokeWidth > 0) node.style.webkitTextStroke = `${props.strokeWidth}px ${props.stroke}`;
    if (props.shadow !== false) node.style.textShadow = '0 3px 8px rgba(0, 0, 0, .55)';
    return null;
  },
};
