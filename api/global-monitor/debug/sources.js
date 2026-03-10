import { ensureIngestorsStarted } from '../../../lib/global-monitor/ingestors/startIngestors.js';
import { getTelegramSourceStatuses } from '../../../lib/global-monitor/ingestors/telegram/telegramPublicChannelIngestor.js';

export default function handler(_req, res) {
  ensureIngestorsStarted();
  res.status(200).json({
    generated_at: new Date().toISOString(),
    sources: getTelegramSourceStatuses(),
  });
}
