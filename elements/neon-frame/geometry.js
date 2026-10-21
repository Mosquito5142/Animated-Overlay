// สี่เหลี่ยมของเส้นกรอบนีออน ใช้ร่วมกันระหว่างกรอบนีออน หลอดไฟ มุมกรอบ และป้ายนีออน
// อ่านค่าจากกรอบนีออนชิ้นแรกในโปรเจกต์ (ถ้าไม่มีใช้ค่าเริ่มต้น)

export function frameRect(props, W, H) {
  const inset = props.inset ?? 16;
  const th = props.thickness ?? 8;
  return { inset, th, r: props.radius ?? 22, rect: { x: inset + th / 2, y: inset + th / 2, w: W - 2 * inset - th, h: H - 2 * inset - th } };
}

export function neonFrame(ctx) {
  const props = ctx.config.layers?.find((l) => l.type === 'neon-frame')?.props || {};
  return frameRect(props, ctx.width, ctx.height);
}
