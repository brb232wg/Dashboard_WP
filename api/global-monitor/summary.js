import { getSummary } from '../../lib/global-monitor/eventStore.js';

export default function handler(req, res) {
  const { category = 'all' } = req.query || {};
  res.status(200).json(getSummary({ category }));
}
