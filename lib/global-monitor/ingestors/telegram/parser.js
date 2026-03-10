const sanitize = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getMatch = (text, regex) => {
  const match = regex.exec(text);
  return match ? match[1] : null;
};

const parseMediaType = (fragment) => {
  if (/tgme_widget_message_video_player|tgme_widget_message_video/.test(fragment)) return 'video';
  if (/tgme_widget_message_photo_wrap|tgme_widget_message_photo/.test(fragment)) return 'image';
  if (/href="https?:\/\//.test(fragment)) return 'link';
  return 'none';
};

export function parseTelegramPublicChannelHtml(html, channel) {
  const posts = [];
  const re = /(<div class="tgme_widget_message_wrap[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/g;
  const cards = html.match(re) || [];

  cards.forEach((fragment) => {
    try {
      const canonicalUrl = getMatch(fragment, /<a[^>]*class="tgme_widget_message_date"[^>]*href="([^"]+)"/);
      if (!canonicalUrl) return;

      const postId = canonicalUrl.split('/').pop();
      const bodyHtml = getMatch(fragment, /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/) || '';
      const bodyText = sanitize(bodyHtml);
      const title = bodyText.includes('\n') ? bodyText.split('\n')[0].slice(0, 160) : null;
      const datetime = getMatch(fragment, /<time[^>]*datetime="([^"]+)"/);
      const thumbStyle = getMatch(fragment, /tgme_widget_message_photo_wrap[^>]*style="[^"]*url\('([^']+)'\)/);

      posts.push({
        dedupe_key: `${channel.handle}:${postId || canonicalUrl}`,
        source_type: 'telegram',
        source_name: channel.name,
        source_handle: channel.handle,
        title,
        body_text: bodyText,
        published_at: datetime || new Date().toISOString(),
        canonical_url: canonicalUrl,
        media_type: parseMediaType(fragment),
        media_thumbnail_url: thumbStyle || null,
        raw_html: fragment,
        ingested_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[telegram parser] failed to parse post', error);
    }
  });

  return posts;
}
