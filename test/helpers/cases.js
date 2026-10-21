// งานเดิมที่ใช้เทียบภาพก่อน/หลังยกเครื่อง และจุดเวลาที่จับภาพ
import { readFile } from 'node:fs/promises';

export const CASES = [
  { name: 'overlay', file: 'overlay.config.json', times: [0.5, 2, 5, 9] },
  { name: 'vertical', file: 'vertical.config.json', times: [0.5, 2, 5, 9] },
  // popup: กำลังเด้งเข้า / ค้าง / ป้าย 2 ค้าง / ป้าย 2 กำลังออก
  { name: 'popup', file: 'popup.config.json', times: [1.2, 4, 8.5, 13.4] },
  { name: 'neon', file: 'neon.config.json', times: [0.5, 2, 5, 7.5] },
];

export async function fixture(file) {
  return JSON.parse(await readFile(new URL(`../fixtures/v1/${file}`, import.meta.url), 'utf8'));
}
