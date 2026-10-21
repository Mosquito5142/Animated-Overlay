// อัปโหลดไฟล์จากเบราว์เซอร์เข้าโฟลเดอร์ assets/ ของโปรเจกต์ (ใช้ทั้งหน้าปรับแต่งและหน้า Studio)
// รูปที่ไม่ใช่ PNG/SVG จะถูกแปลงเป็น PNG ในเบราว์เซอร์ก่อนส่ง จึงไม่ต้องไปแปลงด้วยโปรแกรมอื่น

const MAX_SIDE = 3840; // รูปที่ใหญ่กว่านี้จะถูกย่อลงตามสัดส่วน
const FONT_EXT = /\.(ttf|otf|woff2?)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;

export const ACCEPT = {
  image: 'image/*,.svg',
  background: 'image/*,.svg,video/mp4,video/webm',
  font: '.ttf,.otf,.woff,.woff2',
  any: 'image/*,.svg,video/mp4,video/webm,.ttf,.otf,.woff,.woff2',
};

const isSvg = (file) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
const isPng = (file) => file.type === 'image/png' || /\.png$/i.test(file.name);

/** แปลงรูปเป็น PNG (ถ้าจำเป็น) และย่อรูปที่ใหญ่เกิน คืน File ที่พร้อมอัปโหลด */
export async function prepareImage(file) {
  if (isSvg(file)) return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`เปิดรูป "${file.name}" ไม่ได้ เบราว์เซอร์ไม่รู้จักไฟล์ชนิดนี้ (ลองใช้ .png .jpg .webp)`);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (isPng(file) && scale === 1) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error(`แปลงรูป "${file.name}" เป็น PNG ไม่สำเร็จ`);
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.png`;
  return new File([blob], name, { type: 'image/png' });
}

/**
 * อัปโหลดไฟล์ 1 ไฟล์ kind = 'image' | 'background' | 'font'
 * คืน { path: 'assets/uploads/x.png', name, converted }
 */
export async function uploadFile(file, kind) {
  let ready = file;
  if (kind === 'font') {
    if (!FONT_EXT.test(file.name)) throw new Error(`"${file.name}" ไม่ใช่ไฟล์ฟอนต์ (.ttf .otf .woff .woff2)`);
  } else if (kind === 'background' && (VIDEO_EXT.test(file.name) || file.type.startsWith('video/'))) {
    ready = file;
  } else {
    if (!file.type.startsWith('image/') && !isSvg(file)) {
      throw new Error(`"${file.name}" ไม่ใช่ไฟล์รูป`);
    }
    ready = await prepareImage(file);
  }
  const url = `/__api/upload?kind=${kind}&name=${encodeURIComponent(ready.name)}`;
  const res = await fetch(url, { method: 'POST', body: ready, headers: { 'content-type': 'application/octet-stream' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return { ...data, converted: ready !== file };
}

/** เปิดหน้าต่างเลือกไฟล์ คืนรายการ File ที่เลือก (ว่างถ้ากดยกเลิก) */
export function pickFiles(kind, multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT[kind] || '';
    input.multiple = multiple;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve([...input.files]);
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve([]);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** เดาชนิดการอัปโหลดจากไฟล์ (ใช้กับการลากหลายไฟล์มาวางในคลังไฟล์) */
export function kindOf(file) {
  if (FONT_EXT.test(file.name)) return 'font';
  if (VIDEO_EXT.test(file.name) || file.type.startsWith('video/')) return 'background';
  return 'image';
}

export async function listAssets() {
  const res = await fetch('/__api/assets', { cache: 'no-store' });
  if (!res.ok) throw new Error('โหลดรายการไฟล์ไม่ได้');
  return res.json();
}
