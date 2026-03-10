import { getSnapshot } from '../../lib/global-monitor/eventStore.js';
import { ensureIngestorsStarted } from '../../lib/global-monitor/ingestors/startIngestors.js';

export default function handler(_req, res) {
  ensureIngestorsStarted();
  const snapshot = getSnapshot();
  res.status(200).json(snapshot.markets || {});
}
