import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
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
};

/**
 * เซิร์ฟเวอร์ไฟล์ในโฟลเดอร์โปรเจกต์ (ใช้ทั้งตอน preview และ render)
 * getConfig() ถูกเรียกทุกครั้งที่ขอ /__config.json จึงแก้ config แล้วรีเฟรชดูได้ทันที
 */
const MAX_BODY = 1024 * 1024;

function readJson(req) {
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

/**
 * onSave (ถ้ามี) เปิดใช้ POST /__save สำหรับหน้าแก้ไข: รับ config ใหม่แล้วให้ผู้เรียกเขียนลงไฟล์
 */
export function startServer(getConfig, port = 0, { onSave } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/__config.json') {
        const cfg = await getConfig();
        res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
        res.end(JSON.stringify(cfg));
        return;
      }
      if (url.pathname === '/__save') {
        if (!onSave || req.method !== 'POST') {
          res.writeHead(405).end();
          return;
        }
        const send = (code, body) => {
          res.writeHead(code, { 'content-type': TYPES['.json'] });
          res.end(JSON.stringify(body));
        };
        try {
          await onSave(await readJson(req));
          send(200, { ok: true });
        } catch (err) {
          send(400, { error: err.message });
        }
        return;
      }
      if (url.pathname === '/') {
        const cfg = await getConfig();
        res.writeHead(302, { location: `/templates/${cfg.template}/index.html${url.search}` });
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
