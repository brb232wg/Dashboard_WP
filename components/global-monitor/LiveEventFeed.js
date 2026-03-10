import { CATEGORY_TO_COLOR } from '../../lib/global-monitor/eventStore.js';

const labelize = (category) => category.replace('_', ' ');

export function renderLiveFeed(container, events) {
  container.innerHTML = events.map((event) => `
    <article class="gmFeedItem">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="gmDot" style="background:${CATEGORY_TO_COLOR[event.category] || '#d1a24a'}"></span>
        <strong>${event.title}</strong>
      </div>
      <small>${new Date(event.published_at).toLocaleTimeString()}</small>
      <small style="color:${CATEGORY_TO_COLOR[event.category] || '#d1a24a'}">${labelize(event.category)}</small>
      <small>${event.location_name}</small>
      <small>Source: ${event.source_name}</small>
    </article>
  `).join('');
}
