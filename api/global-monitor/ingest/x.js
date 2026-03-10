import { ingestStories } from '../../../lib/global-monitor/eventStore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Wire X API credentials + authenticated ingestion worker.
  const stories = Array.isArray(req.body?.stories) ? req.body.stories : [];
  ingestStories(stories);
  return res.status(202).json({ accepted: stories.length });
}
