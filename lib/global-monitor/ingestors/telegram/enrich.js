import { resolveLocation } from '../../locationResolver.js';

const TAG_KEYWORDS = [
  'iran', 'israel', 'irgc', 'tehran', 'hormuz', 'oil', 'tanker', 'bahrain', 'qatar', 'uae', 'saudi', 'missile', 'drone', 'strike',
];

const categoryFromText = (text) => {
  if (/intercept|air defense|downed/i.test(text)) return 'interception';
  if (/missile|launch|rocket|drone/i.test(text)) return 'missile_launch';
  if (/oil|refinery|terminal|pipeline|tanker/i.test(text)) return 'oil';
  if (/statement|minister|official|spokesperson|diplomatic/i.test(text)) return 'statement';
  if (/infrastructure|power plant|grid|port/i.test(text)) return 'infrastructure';
  return 'telegram_alert';
};

export function enrichTelegramPost(post) {
  const text = `${post.title || ''} ${post.body_text || ''}`;
  const tags = TAG_KEYWORDS.filter((keyword) => text.toLowerCase().includes(keyword));
  const loc = resolveLocation({ title: post.title, summary: post.body_text, location_name: null, tags });

  return {
    ...post,
    tags,
    location_name: loc.location_name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    confidence: loc.confidence,
    category: categoryFromText(text),
    severity: /strike|explosion|hit|impact/i.test(text) ? 4 : 2,
    source_url: post.canonical_url,
    source_name: post.source_name,
    summary: post.body_text,
  };
}
