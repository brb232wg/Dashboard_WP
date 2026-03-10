import { TELEGRAM_PUBLIC_CHANNELS } from '../../../../config/globalMonitorSources.js';
import { parseTelegramPublicChannelHtml } from './parser.js';
import { enrichTelegramPost } from './enrich.js';

const stateByChannel = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, { attempts = 3, timeoutMs = 10000 } = {}) {
  let lastError;

  for (let index = 0; index < attempts; index += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'MacroWarRoomBot/1.0 (+public telegram ingestor)' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const backoff = Math.min(2000 * 2 ** index, 8000);
      await sleep(backoff);
    }
  }

  throw lastError;
}

function getChannelState(channelHandle) {
  if (!stateByChannel.has(channelHandle)) {
    stateByChannel.set(channelHandle, {
      seenKeys: new Set(),
      lastHtmlHash: null,
      lastHtml: null,
      lastFetchedAt: null,
    });
  }
  return stateByChannel.get(channelHandle);
}

function hashHtml(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export async function pollTelegramChannel(channelConfig) {
  const state = getChannelState(channelConfig.handle);
  const html = await fetchWithRetry(channelConfig.url, { attempts: 3, timeoutMs: 9000 });
  const currentHash = hashHtml(html);

  // nice-to-have: skip reparse if page unchanged and cache recent payload
  if (state.lastHtmlHash && state.lastHtmlHash === currentHash) {
    return [];
  }

  state.lastHtmlHash = currentHash;
  state.lastHtml = html;
  state.lastFetchedAt = Date.now();

  const parsed = parseTelegramPublicChannelHtml(html, channelConfig);
  const fresh = parsed.filter((post) => {
    if (state.seenKeys.has(post.dedupe_key)) return false;
    state.seenKeys.add(post.dedupe_key);
    return true;
  });

  return fresh.map(enrichTelegramPost);
}

export async function pollAllTelegramChannels() {
  const output = [];
  for (const channel of TELEGRAM_PUBLIC_CHANNELS) {
    try {
      const items = await pollTelegramChannel(channel);
      output.push(...items);
    } catch (error) {
      console.error(`[telegram ingestor] failed channel ${channel.handle}`, error);
    }
  }
  return output;
}

export function startTelegramPolling(onEvents) {
  TELEGRAM_PUBLIC_CHANNELS.forEach((channel) => {
    const run = async () => {
      const items = await pollTelegramChannel(channel);
      if (items.length) onEvents(items);
    };

    run().catch((error) => console.error('[telegram ingestor] initial poll failed', error));
    setInterval(() => {
      run().catch((error) => console.error('[telegram ingestor] scheduled poll failed', error));
    }, channel.poll_interval_ms || 45000);
  });
}
