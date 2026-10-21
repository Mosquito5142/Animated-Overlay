// รูปภาพ: กำหนดความกว้าง (ความสูงตามสัดส่วน) ความโค้งมุม และความทึบ
import { el, assetUrl } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    if (!props.src) {
      el('div', 'empty', root, 'ยังไม่ได้เลือกรูป');
      return null;
    }
    const img = el('img', '', root);
    img.src = assetUrl(props.src);
    img.alt = '';
    Object.assign(img.style, {
      width: `${props.width ?? 300}px`,
      borderRadius: `${props.radius ?? 0}px`,
      opacity: String(props.opacity ?? 1),
    });
    return null;
  },
};
