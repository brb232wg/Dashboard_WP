import { ingestStories } from '../eventStore.js';
import { checkTelegramConnectivity, startTelegramPolling } from './telegram/telegramPublicChannelIngestor.js';

let started = false;

export function ensureIngestorsStarted() {
  if (started) return;
  started = true;

  checkTelegramConnectivity().catch((error) => {
    console.warn('[global monitor] connectivity check failed', error);
  });

  startTelegramPolling((events) => {
    if (events.length) ingestStories(events);
  });
}
