import { TELEGRAM_PUBLIC_CHANNELS } from '../../../../config/globalMonitorSources.js';
import { parseTelegramPublicChannelHtml } from './parser.js';
import { enrichTelegramPost } from './enrich.js';
import { buildTransportCandidates, classifyTransportError, fetchViaTransport } from './transport.js';

const stateByChannel = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultSourceStatus(channel) {
  return {
    source: `telegram:${channel.handle}`,
    ok: false,
    lastAttemptAt: null,
    lastSuccessAt: null,
    error: 'not_started',
    lastHttpStatus: null,
    lastContentType: null,
    responseLength: 0,
    parsedCount: 0,
    insertCount: 0,
    transport: null,
    finalUrl: null,
  };
}

function getChannelState(channelConfig) {
  const channelHandle = channelConfig.handle;
  if (!stateByChannel.has(channelHandle)) {
    stateByChannel.set(channelHandle, {
      seenKeys: new Set(),
      lastHtmlHash: null,
      lastHtml: null,
      lastFetchedAt: null,
      status: defaultSourceStatus(channelConfig),
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

function updateStatus(channelConfig, patch) {
  const state = getChannelState(channelConfig);
  state.status = { ...state.status, ...patch };
}

async function fetchWithRetry(channelConfig, { attempts = 3, timeoutMs = 10000 } = {}) {
  const transports = buildTransportCandidates(channelConfig);
  let lastError;

  for (const transport of transports) {
    for (let index = 0; index < attempts; index += 1) {
      const attemptTime = new Date().toISOString();
      updateStatus(channelConfig, {
        lastAttemptAt: attemptTime,
        transport: transport.type,
        finalUrl: transport.url || null,
      });

      console.info('[telegram ingestor] fetch start', {
        source: `telegram:${channelConfig.handle}`,
        attempt: index + 1,
        transport: transport.type,
        url: transport.url,
      });

      try {
        const result = await fetchViaTransport(transport, {
          timeoutMs,
          headers: { 'user-agent': 'MacroWarRoomBot/1.0 (+public telegram ingestor)' },
        });

        console.info('[telegram ingestor] fetch success', {
          source: `telegram:${channelConfig.handle}`,
          transport: result.transport,
          finalUrl: result.finalUrl,
          status: result.status,
          contentType: result.contentType,
          responseLength: result.bodyText.length,
        });

        updateStatus(channelConfig, {
          ok: true,
          error: null,
          lastSuccessAt: new Date().toISOString(),
          lastHttpStatus: result.status,
          lastContentType: result.contentType,
          responseLength: result.bodyText.length,
          transport: result.transport,
          finalUrl: result.finalUrl,
        });

        return result.bodyText;
      } catch (error) {
        const classified = classifyTransportError(error);
        const statusCode = error.httpStatus || null;

        console.error('[telegram ingestor] fetch failed', {
          source: `telegram:${channelConfig.handle}`,
          transport: transport.type,
          finalUrl: transport.url,
          status: statusCode,
          error: classified,
          message: error.message,
        });

        updateStatus(channelConfig, {
          ok: false,
          error: classified,
          lastHttpStatus: statusCode,
          lastContentType: null,
          responseLength: 0,
          transport: transport.type,
          finalUrl: transport.url || null,
        });

        lastError = error;
        const backoff = Math.min(2000 * 2 ** index, 8000);
        await sleep(backoff);
      }
    }
  }

  throw lastError;
}

export async function pollTelegramChannel(channelConfig) {
  const state = getChannelState(channelConfig);
  const html = await fetchWithRetry(channelConfig, { attempts: 2, timeoutMs: 9000 });
  const currentHash = hashHtml(html);

  state.lastHtmlHash = currentHash;
  state.lastHtml = html;
  state.lastFetchedAt = Date.now();

  const parsed = parseTelegramPublicChannelHtml(html, channelConfig);
  if (!parsed.length) {
    updateStatus(channelConfig, { ok: false, error: 'html_shape_change', parsedCount: 0, insertCount: 0 });
    console.warn('[telegram ingestor] parse warning', {
      source: `telegram:${channelConfig.handle}`,
      reason: 'html_shape_change',
      parsedCount: 0,
    });
    return [];
  }

  const fresh = parsed.filter((post) => {
    if (state.seenKeys.has(post.dedupe_key)) return false;
    state.seenKeys.add(post.dedupe_key);
    return true;
  });

  updateStatus(channelConfig, {
    ok: true,
    error: fresh.length ? null : 'zero_new_posts_after_dedupe',
    parsedCount: parsed.length,
    insertCount: fresh.length,
  });

  console.info('[telegram ingestor] parse result', {
    source: `telegram:${channelConfig.handle}`,
    parseCount: parsed.length,
    insertCount: fresh.length,
    outcome: fresh.length ? 'inserted' : 'zero_new_posts_after_dedupe',
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

export async function checkTelegramConnectivity() {
  for (const channel of TELEGRAM_PUBLIC_CHANNELS) {
    try {
      await fetchWithRetry(channel, { attempts: 1, timeoutMs: 5000 });
      console.info('[telegram ingestor] startup connectivity ok', { source: `telegram:${channel.handle}` });
    } catch (error) {
      const classified = classifyTransportError(error);
      updateStatus(channel, { ok: false, error: classified });
      console.warn('[telegram ingestor] startup connectivity degraded', {
        source: `telegram:${channel.handle}`,
        error: classified,
      });
    }
  }
}

export function getTelegramSourceStatuses() {
  TELEGRAM_PUBLIC_CHANNELS.forEach((channel) => getChannelState(channel));
  return TELEGRAM_PUBLIC_CHANNELS.map((channel) => ({ ...getChannelState(channel).status }));
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

export function resetTelegramIngestorStateForTests() {
  stateByChannel.clear();
}
