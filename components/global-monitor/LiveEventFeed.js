import { CATEGORY_TO_COLOR } from '../../lib/global-monitor/eventStore.js';

const labelize = (category) => category.replace('_', ' ');
const relTime = (iso) => {
  const deltaMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return deltaMin < 1 ? 'just now' : `${deltaMin}m ago`;
};

export function renderLiveFeed(container, events) {
  container.innerHTML = events.map((event) => {
    const title = event.title || (event.body_text || '').slice(0, 120) || 'Untitled event';
    const ts = new Date(event.published_at).toLocaleString();
    const sourceBadge = event.source_type === 'telegram' ? '<span class="pill" style="padding:2px 6px;">Telegram</span>' : '';
    const link = event.canonical_url || event.source_url;

    return `
      <article class="gmFeedItem" data-event-id="${event.id}">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="gmDot" style="background:${CATEGORY_TO_COLOR[event.category] || '#d1a24a'}"></span>
          <strong>${title}</strong>
          ${sourceBadge}
        </div>
        <small title="${ts}">${relTime(event.published_at)}</small>
        <small style="color:${CATEGORY_TO_COLOR[event.category] || '#d1a24a'}">${labelize(event.category)}</small>
        <small>${event.location_name || 'Unknown location'}</small>
        <small>Source: ${event.source_name}</small>
        ${link ? `<a href="${link}" target="_blank" rel="noreferrer">Open source</a>` : ''}
      </article>
    `;
  }).join('');
}
