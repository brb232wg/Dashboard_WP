import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramPublicChannelHtml } from '../../lib/global-monitor/ingestors/telegram/parser.js';

const SAMPLE_HTML = `
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message">
    <div class="tgme_widget_message_bubble">
      <div class="tgme_widget_message_text">Missile alert near Tehran refinery</div>
      <a class="tgme_widget_message_date" href="https://t.me/warmonitors/1234"><time datetime="2026-03-10T10:30:00+00:00"></time></a>
    </div>
  </div>
</div>
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message">
    <div class="tgme_widget_message_bubble">
      <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.tg/thumb.jpg')"></a>
      <div class="tgme_widget_message_text">Drone interception over Isfahan</div>
      <a class="tgme_widget_message_date" href="https://t.me/warmonitors/1235"><time datetime="2026-03-10T10:35:00+00:00"></time></a>
    </div>
  </div>
</div>`;

test('parseTelegramPublicChannelHtml extracts Telegram posts', () => {
  const posts = parseTelegramPublicChannelHtml(SAMPLE_HTML, { name: 'War Monitor', handle: 'warmonitors' });
  assert.equal(posts.length, 2);
  assert.equal(posts[0].canonical_url, 'https://t.me/warmonitors/1234');
  assert.equal(posts[0].source_type, 'telegram');
  assert.equal(posts[1].media_type, 'image');
  assert.equal(posts[1].media_thumbnail_url, 'https://cdn.tg/thumb.jpg');
});
