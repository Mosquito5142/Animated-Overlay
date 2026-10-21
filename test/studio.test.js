import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listPresets, createConfig } from '../src/studio.js';

const tmp = () => mkdtemp(path.join(os.tmpdir(), 'overlay-studio-'));
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));

test('listPresets: หน้าเปล่ามาก่อน ตามด้วยเทมเพลต 3 แบบ', async () => {
  const presets = await listPresets();
  assert.deepEqual(presets.map((p) => p.name), ['blank', 'neon-frame', 'sponsor-gaming', 'sponsor-popup']);
  assert.equal(presets[0].layers, 0);
  assert.ok(presets.every((p) => p.description));
});

test('createConfig: หน้าเปล่า = layers ว่าง ไม่มี description', async () => {
  const dir = await tmp();
  const { file } = await createConfig({ preset: 'blank', name: 'empty1' }, dir);
  const cfg = await read(file);
  assert.equal(cfg.version, 2);
  assert.deepEqual(cfg.layers, []);
  assert.equal('description' in cfg, false);
});

test('createConfig: จาก preset แนวตั้ง และทำสำเนาจากงานที่มี', async () => {
  const dir = await tmp();
  const { file } = await createConfig({ preset: 'sponsor-gaming', name: 'game', vertical: true }, dir);
  const cfg = await read(file);
  assert.deepEqual(cfg.resolution, [1080, 1920]);
  assert.equal(cfg.layers.length, 7);
  const copy = await createConfig({ from: 'game', name: 'game2' }, dir);
  assert.equal((await read(copy.file)).layers.length, 7);
  await assert.rejects(createConfig({ preset: 'blank', name: 'game' }, dir), /มีงานชื่อ "game" อยู่แล้ว/);
  await assert.rejects(createConfig({ preset: 'nope', name: 'x' }, dir), /ไม่พบเทมเพลต "nope"/);
});
