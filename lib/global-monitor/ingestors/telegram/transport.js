import fs from 'node:fs/promises';
import path from 'node:path';

const NETWORK_ERROR_CODES = new Set(['ENETUNREACH', 'ECONNREFUSED', 'EHOSTUNREACH', 'ECONNRESET']);

function normalizeProxyUrl(proxyBase, targetUrl) {
  if (!proxyBase) return null;
  if (proxyBase.includes('{url}')) return proxyBase.replace('{url}', encodeURIComponent(targetUrl));
  return `${proxyBase}${encodeURIComponent(targetUrl)}`;
}

function resolveFixturePath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

export function classifyTransportError(error) {
  if (!error) return 'unknown_error';
  if (error.name === 'AbortError') return 'timeout';
  if (NETWORK_ERROR_CODES.has(error.code)) return 'network_unreachable';

  const causeCode = error?.cause?.code;
  if (NETWORK_ERROR_CODES.has(causeCode)) return 'network_unreachable';

  if (/HTTP\s\d+/.test(error.message || '')) return 'non_200_response';
  return 'unknown_error';
}

export function buildTransportCandidates(channelConfig = {}) {
  const configured = Array.isArray(channelConfig.transports) && channelConfig.transports.length
    ? channelConfig.transports
    : [{ type: 'direct', name: 'telegram_public_page', url: channelConfig.url }];

  const candidates = [...configured];
  const proxyBase = process.env.TELEGRAM_PROXY_BASE_URL || null;
  if (proxyBase && channelConfig.url) {
    candidates.push({
      type: 'proxy',
      name: 'proxy',
      url: normalizeProxyUrl(proxyBase, channelConfig.url),
      upstream_url: channelConfig.url,
    });
  }

  if (String(process.env.TELEGRAM_FIXTURE_MODE || '').toLowerCase() === 'true') {
    const fixturePath = resolveFixturePath(process.env.TELEGRAM_FIXTURE_FILE || channelConfig.fixture_path);
    candidates.unshift({
      type: 'fixture',
      name: 'local_fixture',
      fixture_path: fixturePath,
      url: fixturePath,
    });
  }

  return candidates.filter((item) => item?.url || item?.fixture_path);
}

export async function fetchViaTransport(transport, { timeoutMs = 10000, headers = {} } = {}) {
  if (transport.type === 'fixture') {
    const text = await fs.readFile(transport.fixture_path, 'utf8');
    return {
      ok: true,
      status: 200,
      finalUrl: transport.fixture_path,
      contentType: 'text/html; fixture',
      bodyText: text,
      transport: transport.type,
      transportName: transport.name,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(transport.url, { signal: controller.signal, headers });
    const bodyText = await response.text();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.code = 'HTTP_ERROR';
      error.httpStatus = response.status;
      throw error;
    }

    return {
      ok: true,
      status: response.status,
      finalUrl: response.url || transport.url,
      contentType: response.headers.get('content-type') || null,
      bodyText,
      transport: transport.type,
      transportName: transport.name,
    };
  } finally {
    clearTimeout(timer);
  }
}
