import { getSummary } from '../../lib/global-monitor/eventStore.js';
import { ensureIngestorsStarted } from '../../lib/global-monitor/ingestors/startIngestors.js';

export default function handler(req, res) {
  ensureIngestorsStarted();
  const { category = 'all' } = req.query || {};
  res.status(200).json(getSummary({ category }));
}
