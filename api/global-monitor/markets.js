import { getSnapshot } from '../../lib/global-monitor/eventStore.js';

export default function handler(_req, res) {
  const snapshot = getSnapshot();
  res.status(200).json(snapshot.markets || {});
}
