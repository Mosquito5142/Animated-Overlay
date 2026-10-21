import http from 'node:http';
import { readFile, stat, rename, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

const MAX_BODY = 1024 * 1024;

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('ข้อมูลใหญ่เกินไป'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('JSON ไม่ถูกต้อง'));
      }
    });
    req.on('error', reject);
  });
}

/** เขียน body ของ request ลงไฟล์แบบ stream (ไฟล์ .part ก่อน ครบแล้วค่อย rename) */
export function saveUpload(req, dest, limit) {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.part`;
    const out = createWriteStream(tmp);
    let size = 0;
    let failed = false;
    const fail = (err) => {
      if (failed) return;
      failed = true;
      req.unpipe(out);
      req.resume();
      out.destroy();
      unlink(tmp).catch(() => {}).finally(() => reject(err));
    };
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) fail(new Error(`ไฟล์ใหญ่เกิน ${Math.round(limit / 1024 / 1024)}MB`));
    });
    req.on('error', fail);
    out.on('error', fail);
    out.on('finish', async () => {
      if (failed) return;
      if (size === 0) return fail(new Error('ไฟล์ว่างเปล่า'));
      try {
        await rename(tmp, dest);
        resolve(size);
      } catch (err) {
        fail(err);
      }
    });
    req.pipe(out);
  });
}

export function sendJson(res, code, body) {
  res.writeHead(code, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

/**
 * เซิร์ฟเวอร์ไฟล์ในโฟลเดอร์โปรเจกต์ (ใช้ทั้งตอน studio และ render)
 * - getConfig(url) ถูกเรียกทุกครั้งที่ขอ /__config.json จึงแก้ config แล้วรีเฟรชดูได้ทันที
 * - onSave(data, url) (ถ้ามี) เปิดใช้ POST /__save สำหรับหน้าปรับแต่ง
 * - handle(req, res, url) (ถ้ามี) ให้ studio เพิ่ม API ของตัวเอง คืน true ถ้าตอบไปแล้ว
 * - home (ถ้ามี) หน้าที่จะเปิดเมื่อเข้า /
 */
export function startServer(getConfig, port = 0, { onSave, handle, home } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/__config.json') {
        try {
          sendJson(res, 200, await getConfig(url));
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return;
      }
      if (url.pathname === '/__save') {
        if (!onSave || req.method !== 'POST') {
          res.writeHead(405).end();
          return;
        }
        try {
          await onSave(await readJson(req), url);
          sendJson(res, 200, { ok: true });
        } catch (err) {
          sendJson(res, 400, { error: err.message });
        }
        return;
      }
      if (handle && (await handle(req, res, url))) return;
      if (url.pathname === '/' && home) {
        res.writeHead(302, { location: home });
        res.end();
        return;
      }
      if (url.pathname === '/') {
        const cfg = await getConfig(url);
        res.writeHead(302, { location: `/templates/_runtime/stage.html${url.search}` });
        res.end();
        return;
      }
      const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(ROOT + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const info = await stat(file).catch(() => null);
      if (!info || !info.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`ไม่พบไฟล์: ${url.pathname}`);
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(String(err.message || err));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const { port: actual } = server.address();
      resolve({ server, url: `http://127.0.0.1:${actual}` });
    });
  });
}
