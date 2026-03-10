import { ingestStories } from '../../../lib/global-monitor/eventStore.js';
import { getTelegramSourceStatuses, pollAllTelegramChannels } from '../../../lib/global-monitor/ingestors/telegram/telegramPublicChannelIngestor.js';

export default async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const items = await pollAllTelegramChannels();
  if (items.length) ingestStories(items);

  return res.status(200).json({ ingested: items.length, sources: getTelegramSourceStatuses() });
}
