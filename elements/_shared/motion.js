// สูตรท่าวนที่ชิ้นชุดคลิปเกมใช้ร่วมกัน (ย้ายมาจาก templates/sponsor-gaming/timeline.js)

import { clamp01, lerp, ease } from '../../templates/_runtime/timing.js';

/** ตำแหน่งแสงวิ่ง: วิ่งผ่านช่วงแรก 25% ของรอบ แล้วรอนอกกรอบ */
export function shineX(phase, width) {
  const p = clamp01(phase / 0.25);
  return lerp(-160, width + 160, ease.inOutSine(p));
}
/** จังหวะเด้งสั้นๆ ต้นรอบ (0 → 1 → 0) */
export const bump = (phase, len = 0.15) => (phase < len ? Math.sin((Math.PI * phase) / len) : 0);
/** คลื่นนุ่มๆ 0..1 */
export const wave = (phase) => 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
