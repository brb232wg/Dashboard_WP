import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramPublicChannelHtml } from '../../lib/global-monitor/ingestors/telegram/parser.js';
import { pollTelegramChannel, resetTelegramIngestorStateForTests } from '../../lib/global-monitor/ingestors/telegram/telegramPublicChannelIngestor.js';

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

const FIXTURE_PATH = path.resolve(process.cwd(), 'tests/fixtures/telegram/warmonitors.sample.html');

test('parseTelegramPublicChannelHtml extracts Telegram posts', () => {
  const posts = parseTelegramPublicChannelHtml(SAMPLE_HTML, { name: 'War Monitor', handle: 'warmonitors' });
  assert.equal(posts.length, 2);
  assert.equal(posts[0].canonical_url, 'https://t.me/warmonitors/1234');
  assert.equal(posts[0].source_type, 'telegram');
  assert.equal(posts[1].media_type, 'image');
  assert.equal(posts[1].media_thumbnail_url, 'https://cdn.tg/thumb.jpg');
});

test('fixture HTML can be parsed for warmonitors shape', () => {
  const fixtureHtml = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const posts = parseTelegramPublicChannelHtml(fixtureHtml, { name: 'War Monitor', handle: 'warmonitors' });
  assert.ok(posts.length >= 2);
  assert.equal(posts[0].source_handle, 'warmonitors');
});

test('pollTelegramChannel supports TELEGRAM_FIXTURE_MODE transport', async () => {
  resetTelegramIngestorStateForTests();
  process.env.TELEGRAM_FIXTURE_MODE = 'true';
  process.env.TELEGRAM_FIXTURE_FILE = FIXTURE_PATH;

  const posts = await pollTelegramChannel({
    name: 'Fixture Monitor',
    handle: 'fixture-monitor',
    url: 'https://t.me/s/fixture',
    fixture_path: FIXTURE_PATH,
    transports: [{ type: 'direct', name: 'telegram_public_page', url: 'https://t.me/s/fixture' }],
  });

  delete process.env.TELEGRAM_FIXTURE_MODE;
  delete process.env.TELEGRAM_FIXTURE_FILE;

  assert.ok(posts.length >= 2);
  assert.equal(posts[0].source_type, 'telegram');
});
