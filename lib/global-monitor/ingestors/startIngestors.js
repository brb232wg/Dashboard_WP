import { ingestStories } from '../eventStore.js';
import { startTelegramPolling } from './telegram/telegramPublicChannelIngestor.js';

let started = false;

export function ensureIngestorsStarted() {
  if (started) return;
  started = true;

  startTelegramPolling((events) => {
    if (events.length) ingestStories(events);
  });
}
