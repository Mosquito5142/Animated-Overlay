import { spawn } from 'node:child_process';

export function run(cmd, args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => {
      err += d;
      if (!quiet) process.stderr.write(d);
    });
    proc.on('error', (e) => reject(e.code === 'ENOENT' ? new Error(`ไม่พบโปรแกรม "${cmd}" กรุณาติดตั้งก่อน`) : e));
    proc.on('close', (code) =>
      code === 0 ? resolve({ out, err }) : reject(new Error(`${cmd} ล้มเหลว (code ${code}):\n${err.slice(-2000)}`)),
    );
  });
}

// ตั้งค่า FFmpeg สำหรับแต่ละ format (ทุกแบบเก็บ Alpha channel)
const PRESETS = {
  // ProRes 4444 + alpha: โปรแกรมตัดต่อแทบทุกตัวรองรับ (ไฟล์ใหญ่)
  prores: {
    ext: 'mov',
    args: ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-vendor', 'apl0', '-qscale:v', '9'],
  },
  // WebM VP9 + alpha: ไฟล์เล็ก ใช้กับ OBS / เว็บ / โปรแกรมที่รองรับ
  webm: {
    ext: 'webm',
    args: ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-row-mt', '1', '-auto-alt-ref', '0', '-deadline', 'good', '-cpu-used', '2'],
  },
};

/** รวมเฟรม PNG (frame-00000.png ...) เป็นวิดีโอ */
export async function encodeVideo(format, framesDir, fps, outBase) {
  const preset = PRESETS[format];
  const out = `${outBase}.${preset.ext}`;
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(fps),
    '-i', `${framesDir}/frame-%05d.png`,
    ...preset.args,
    out,
  ]);
  return out;
}

/** ซ้อน overlay ลงบนคลิป/รูปพื้นหลัง เพื่อดูผลจริง (หรือใช้เป็นไฟล์ส่งงานเลยก็ได้) */
export async function composite({ background, overlay, out, duration }) {
  const isImage = /\.(png|jpe?g|webp|bmp)$/i.test(background);
  const bgInput = isImage ? ['-loop', '1', '-i', background] : ['-i', background];
  // VP9 ต้องใช้ decoder libvpx ถึงจะอ่าน alpha ได้
  const ovDecoder = /\.webm$/i.test(overlay) ? ['-c:v', 'libvpx-vp9'] : [];
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...bgInput,
    '-stream_loop', '-1', ...ovDecoder, '-i', overlay,
    '-filter_complex',
    '[1:v][0:v]scale2ref=w=iw:h=ih[ov][bg];[bg][ov]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]',
    '-map', '[v]', '-map', '0:a?',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-c:a', 'copy',
  ];
  if (isImage) args.push('-t', String(duration));
  args.push(out);
  await run('ffmpeg', args);
  return out;
}
