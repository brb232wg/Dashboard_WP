import { getFilteredEvents } from '../../lib/global-monitor/eventStore.js';
import { ensureIngestorsStarted } from '../../lib/global-monitor/ingestors/startIngestors.js';
import { getTelegramSourceStatuses } from '../../lib/global-monitor/ingestors/telegram/telegramPublicChannelIngestor.js';

export default function handler(req, res) {
  ensureIngestorsStarted();
  const { window = '60m', category = 'all' } = req.query || {};
  const events = getFilteredEvents({ category });
  const sources = getTelegramSourceStatuses();
  res.status(200).json({ window, category, events, sources });
}
