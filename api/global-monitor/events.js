import { getFilteredEvents } from '../../lib/global-monitor/eventStore.js';
import { ensureIngestorsStarted } from '../../lib/global-monitor/ingestors/startIngestors.js';

export default function handler(req, res) {
  ensureIngestorsStarted();
  const { window = '60m', category = 'all' } = req.query || {};
  const events = getFilteredEvents({ category });
  res.status(200).json({ window, category, events });
}
