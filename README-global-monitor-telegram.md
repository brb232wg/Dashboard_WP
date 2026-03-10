# Global Monitor Telegram Public Channel Ingestion

This dashboard supports server-side ingestion for public Telegram channels via their `/s/` pages.

## Config
Channel definitions live in `config/globalMonitorSources.js`.

Current channel wired:
- `War Monitor` (`warmonitors`)
- `https://t.me/s/warmonitors`

## Flow
1. `telegramPublicChannelIngestor` polls each configured channel (default 45s).
2. HTML is fetched with timeout + retry/backoff.
3. Parser extracts post cards and normalized Telegram fields:
   - `source_type`, `source_name`, `source_handle`
   - `title`, `body_text`, `published_at`, `canonical_url`
   - `media_type`, `media_thumbnail_url`, `raw_html`, `ingested_at`
4. Enrichment tags entities/keywords and resolves location coordinates/confidence.
5. Events are ingested into the shared `eventStore` and automatically expire after 60 minutes.
6. Same shared store powers map markers, live feed, and summary widgets.

## Endpoints
- `GET /api/global-monitor/events?window=60m&category=all` (includes `sources` health)
- `GET /api/global-monitor/debug/sources`
- `GET /api/global-monitor/summary`
- `GET /api/global-monitor/markets`
- `GET|POST /api/global-monitor/ingest/telegram` (manual trigger)

## Notes
- This uses public channel scraping and **does not require bot admin rights**.
- Parsing logic is isolated under `lib/global-monitor/ingestors/telegram/` for future channels.
- If using serverless, trigger `/api/global-monitor/ingest/telegram` via scheduler.


## Local run
- Start unified static + API server: `npm start`
- Open `http://localhost:4173/conflict-monitor.html`
- The page triggers `POST /api/global-monitor/ingest/telegram` and then reads `GET /api/global-monitor/events` for live flow.

## Diagnostics and transport
- Set `TELEGRAM_FIXTURE_MODE=true` to ingest from local fixture HTML instead of network.
- Optional `TELEGRAM_FIXTURE_FILE=/absolute/or/relative/path.html` overrides per-channel fixture path.
- Optional `TELEGRAM_PROXY_BASE_URL` enables proxy transport; use `{url}` placeholder or a prefix that accepts encoded target URL.
- Optional channel alternate upstream via `WARMONITORS_ALT_UPSTREAM_URL`.
- Source status fields: `ok`, `lastAttemptAt`, `lastSuccessAt`, `error`, `lastHttpStatus`, `lastContentType`, `responseLength`, `parsedCount`, `insertCount`, `transport`, `finalUrl`.
