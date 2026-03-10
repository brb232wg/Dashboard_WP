const warmonitorsAlternateUpstream = process.env.WARMONITORS_ALT_UPSTREAM_URL || null;

export const TELEGRAM_PUBLIC_CHANNELS = [
  {
    name: 'War Monitor',
    handle: 'warmonitors',
    url: 'https://t.me/s/warmonitors',
    source_type: 'telegram',
    poll_interval_ms: 45000,
    fixture_path: './tests/fixtures/telegram/warmonitors.sample.html',
    transports: [
      { type: 'direct', name: 'telegram_public_page', url: 'https://t.me/s/warmonitors' },
      ...(warmonitorsAlternateUpstream ? [{ type: 'alternate', name: 'alternate_upstream', url: warmonitorsAlternateUpstream }] : []),
    ],
  },
];
