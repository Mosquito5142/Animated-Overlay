import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { fixture } from './helpers/cases.js';

async function tmp() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'overlay-test-'));
  return { dir, backupDir: path.join(dir, 'backup') };
}

test('ไฟล์ v1: แปลงเป็น v2 เขียนทับ และเก็บสำเนาเดิมใน backup/', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'demo.config.json');
  const original = JSON.stringify(await fixture('overlay.config.json'), null, 2);
  await writeFile(file, original);

  const cfg = await loadConfig(file, {}, { backupDir });
  assert.equal(cfg.version, 2);
  assert.equal(cfg.layers.length, 7);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).version, 2);
  assert.equal(await readFile(path.join(backupDir, 'demo.v1.json'), 'utf8'), original);

  // โหลดซ้ำ: เป็น v2 แล้ว ไม่สร้างสำรองเพิ่ม
  await loadConfig(file, {}, { backupDir });
  assert.deepEqual(await readdir(backupDir), ['demo.v1.json']);
});

test('มีไฟล์สำรองชื่อเดิมอยู่แล้ว: ใช้ .v1-2.json', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'demo.config.json');
  const v1 = JSON.stringify(await fixture('neon.config.json'));
  await writeFile(file, v1);
  await loadConfig(file, {}, { backupDir });
  await writeFile(file, v1);
  await loadConfig(file, {}, { backupDir });
  assert.deepEqual((await readdir(backupDir)).sort(), ['demo.v1-2.json', 'demo.v1.json']);
});

test('แปลงไม่ได้: ไม่แตะไฟล์และไม่สร้างสำรอง', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'bad.config.json');
  const raw = JSON.stringify({ template: 'my-own', elements: {} });
  await writeFile(file, raw);
  await assert.rejects(loadConfig(file, {}, { backupDir }), /ไม่รู้จักเทมเพลต "my-own"/);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readdir(backupDir));
});

test('v2 ที่ค่าผิด: throw พร้อมรายการข้อผิดพลาด', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'x.config.json');
  await writeFile(file, JSON.stringify({ version: 2, duration: 5, layers: [{ id: 'a', type: 'text', start: 9 }] }));
  await assert.rejects(loadConfig(file, {}, { backupDir }), /start ต้องอยู่ระหว่าง 0 ถึงความยาวคลิป/);
});

test('ไฟล์เวอร์ชันใหม่กว่า (3): throw และไม่แตะไฟล์', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'future.config.json');
  const raw = JSON.stringify({ version: 3, resolution: [1920, 1080], things: [] });
  await writeFile(file, raw);
  await assert.rejects(loadConfig(file, {}, { backupDir }), /เวอร์ชัน 3 ใหม่กว่าโปรแกรมนี้/);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readdir(backupDir));
});

test('ไฟล์ v2 ที่ไม่มี version (มี layers): โหลดได้และไม่เขียนทับ', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'nov.config.json');
  const raw = JSON.stringify({ duration: 5, layers: [{ id: 'text-1', type: 'text', start: 0, end: null, props: { text: 'A' } }] });
  await writeFile(file, raw);
  const cfg = await loadConfig(file, {}, { backupDir });
  assert.equal(cfg.version, 2);
  assert.equal(cfg.layers.length, 1);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readdir(backupDir));
});

test('ไฟล์ JSON เป็น null: ข้อความภาษาไทย ไม่ใช่ TypeError', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'null.config.json');
  await writeFile(file, 'null');
  await assert.rejects(loadConfig(file, {}, { backupDir }), (err) => !(err instanceof TypeError) && /ออบเจกต์/.test(err.message));
  assert.equal(await readFile(file, 'utf8'), 'null');
});

test('แปลงแล้วค่าไม่ถูกต้อง: ไม่แตะไฟล์และไม่สร้างสำรอง', async () => {
  const { dir, backupDir } = await tmp();
  const file = path.join(dir, 'badfps.config.json');
  const raw = JSON.stringify({ template: 'sponsor-gaming', fps: 500, elements: { highlight: { text: 'H' } } });
  await writeFile(file, raw);
  await assert.rejects(loadConfig(file, {}, { backupDir }), /fps ต้องอยู่ระหว่าง 1–120/);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(readdir(backupDir));
  assert.deepEqual((await readdir(dir)).sort(), ['badfps.config.json']);
});
