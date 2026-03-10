import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);

const API_ROUTES = {
  '/api/global-monitor/events': './api/global-monitor/events.js',
  '/api/global-monitor/summary': './api/global-monitor/summary.js',
  '/api/global-monitor/markets': './api/global-monitor/markets.js',
  '/api/global-monitor/ingest/x': './api/global-monitor/ingest/x.js',
  '/api/global-monitor/ingest/telegram': './api/global-monitor/ingest/telegram.js',
  '/api/global-monitor/debug/sources': './api/global-monitor/debug/sources.js',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': MIME['.json'] });
  res.end(JSON.stringify(payload));
}

function createApiRes(res) {
  return {
    status(code) {
      return {
        json(payload) {
          sendJson(res, code, payload);
        },
      };
    },
  };
}

function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
  });
}

async function handleApi(req, res, url) {
  const file = API_ROUTES[url.pathname];
  if (!file) return false;

  try {
    const mod = await import(path.resolve(ROOT, file));
    const body = await collectBody(req);
    const query = Object.fromEntries(url.searchParams.entries());
    const apiReq = { method: req.method, query, body, headers: req.headers };
    const apiRes = createApiRes(res);
    await mod.default(apiReq, apiRes);
  } catch (error) {
    console.error('[server] API error', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }

  return true;
}

function serveStatic(urlPath, res) {
  const normalized = urlPath === '/' ? '/index.html' : urlPath;
  const fsPath = path.resolve(ROOT, `.${normalized}`);
  if (!fsPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fsPath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(fsPath).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const handledApi = await handleApi(req, res, url);
  if (handledApi) return;
  serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`[server] running on http://0.0.0.0:${PORT}`);
});
