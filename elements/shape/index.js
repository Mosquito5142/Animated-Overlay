// กล่อง/รูปทรง: สี่เหลี่ยมมุมมน วงกลม หรือเส้น (ไม่ใส่สีพื้น = สีพื้นกล่องของธีม)
import { el } from '../../templates/_runtime/dom.js';

export default {
  build(root, props) {
    const shape = props.shape ?? 'rect';
    const box = el('div', `shape ${shape}`, root);
    const w = props.width ?? 400;
    const h = shape === 'line' ? Math.max(1, props.strokeWidth || 6) : shape === 'circle' ? w : props.height ?? 120;
    Object.assign(box.style, {
      width: `${w}px`,
      height: `${h}px`,
      background: shape === 'line' ? props.stroke || props.fill || 'var(--accent)' : props.fill || 'var(--panel)',
      borderRadius: shape === 'circle' ? '50%' : shape === 'line' ? `${h / 2}px` : `${props.radius ?? 0}px`,
    });
    if (shape !== 'line' && props.stroke && props.strokeWidth > 0) box.style.border = `${props.strokeWidth}px solid ${props.stroke}`;
    return null;
  },
};
