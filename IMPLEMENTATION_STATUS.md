# Trading Journal Implementation Status

Last updated: 2026-06-27

This document is the handoff checkpoint for humans and AI assistants. Update it whenever implementation changes, verification status changes, or a known gap is resolved or introduced.

## Current Phase

Phase 7: Journal enrichment and suggestions.

The app now runs manual BingX raw sync, creates normalized journal trades for configured trading collections, provides filterable trade review, and lets users enrich trades with manual journal context. Perpetual sync captures orders, fills, position history, and income/P&L rows; Standard Futures sync captures exchange-side order/trade summaries. Dashboard analytics and force resync are not implemented yet.

## Implemented

### Project Foundation

- Next.js 16.2.9 App Router with React and TypeScript.
- Tailwind CSS v4 styling with project tokens.
- ESLint, Vitest, and Next production build configured.
- MariaDB configured through Prisma using `provider = "mysql"`.
- Prisma shadow database support via `SHADOW_DATABASE_URL`.
- Auth.js dependency is on `next-auth` 5.0.0-beta.31 for Next.js 16 peer compatibility.
- Local development server defaults to port 3300, and local `AUTH_URL` examples use `http://localhost:3300`.
- Local port cleanup scripts:
  - `npm run stop-dev` stops the default 3300 dev port.
  - `npm run stop-port -- <port>` stops whichever local process owns a specific port.
- Current installed Prisma packages resolve to 6.19.3 after the Next.js 16 dependency refresh.
- Root project docs:
  - `README.md`
  - `ROADMAP.md`
  - `UI_DESIGN_GUIDELINES.md`
  - `ENGINEERING_GUIDELINES.md`
  - `IMPLEMENTATION_STATUS.md`
  - `docs/INSTALLATION_UBUNTU_CLOUDPANEL.md`

### Authentication and User Settings

- Auth.js wired with Prisma adapter.
- Email/password registration and login.
- Protected app routes redirect logged-out users to `/login`.
- User profile settings for timezone and base currency.
- App shell with desktop sidebar and mobile bottom navigation.
- App shell navigation passes serializable icon names into the client `NavLink` component for Next.js 16 Server Component compatibility.

### Exchange Connections

- Exchange connection management at `/settings/exchanges`.
- BingX connection creation.
- API key and secret encryption using AES-256-GCM before database storage.
- API secret is never shown again after save.
- Enable/disable connection actions.
- Live BingX connection test action using the perpetual balance endpoint.
- Delete behavior:
  - Hard delete when no sync sources depend on the connection.
  - Soft delete when sync sources depend on it.

### Collections and Sync Sources

- Collections page at `/collections`.
- Folder and trading collection creation.
- Folder/trading validation helpers and tests.
- Folder collections can contain children.
- Trading collections are leaf nodes.
- Trading collections can have one active MVP sync source.
- Sync source setup supports:
  - Exchange connection
  - Market type
  - Symbol filter mode
  - Symbol list
  - Initial sync mode

### Raw Sync Foundation

- Raw exchange storage models:
  - `RawOrder`
  - `RawFill`
  - `RawPosition`
  - `RawIncome`
- Normalized journal trade model:
  - `Trade`
- Exchange sync logs via `ExchangeSyncLog`.
- Sync log UI at `/sync`.
- Manual collection sync action.
- Sync fetch-window helper with:
  - Last 7 days
  - Yesterday in user's timezone
  - Custom range validation
  - Open-only placeholder
  - 6-hour overlap after cursor initialization
- BingX signed request client for perpetual and Standard Futures endpoints.
- BingX response normalization for raw orders, fills, positions, and income/P&L rows.
- Raw order/fill/position/income upsert services.
- Manual sync currently supports:
  - BingX perpetual raw orders, fills, position history, and income/P&L rows.
  - BingX Standard Futures raw orders via the `FUTURES` market type.
- Manual sync creates and updates journal trades after raw upserts.
- Perpetual journal trades are built from raw positions plus matching income rows for realized P&L, trading fees, and funding fees.
- Standard Futures journal trades are built from filled exchange-side order/trade summaries.
- Trades page lists normalized journal trades with gross and net result.
- Trades page supports URL-backed filters for date range, collection, exchange connection, symbol, market type, side, status, strategy, mistake tag, and grade.
- Trades page date filters use a client-side native date input wrapper with an explicit calendar trigger for reliable picker opening.
- Trade rows link to a trade detail page.
- Trade detail page shows summary, result breakdown, timeline, journal editor, screenshot management, and sync metadata.
- Journal enrichment models:
  - `TradeJournal`
  - `TradeMistakeTag`
  - `TradeJournalMistakeTag`
  - `TradeScreenshot`
  - `UserSuggestionValue`
- Journal editor supports strategy, setup, notes, emotion, review, grade, mistake tags, screenshot upload, and screenshot captions.
- Mistake tags support multi-select and creating new user-scoped tags from the journal editor.
- User-scoped suggestions are indexed on journal save and served through `/api/suggestions`.
- Suggestion fields rank suggestions by exact match, starts-with, contains, frequency, and recency.
- Long journal text suggestions append snippets instead of replacing existing text.
- Trade screenshots are stored on the app server filesystem through `SCREENSHOT_STORAGE_DIR` and served through authenticated `/api/trade-screenshots/[screenshotId]`.
- Open-only initial sync has first-pass behavior:
  - Imports open orders and positions when present.
  - If no open items exist, sets cursor from latest closed order without importing it.
- Standard Futures is not modeled as raw positions in the MVP. Its future journal trades should be built from exchange-side trades/orders.
- Standard Futures open-only sync uses the latest Standard Futures order only to initialize the cursor.

## Not Implemented Yet

- Spot sync.
- Optional detailed order/fill diagnostic sync.
- Force resync UI and behavior.
- Dashboard metrics from real trades.
- Integration tests against MariaDB.
- Browser/E2E tests.

## Current Verification

Most recent successful checks:

```bash
npm run test
npm run lint
npm run prisma:generate
npm run build
```

Current unit tests: 23 passing.

No recurring Next.js native SWC warning was observed in the latest Next.js 16 production build.

Known current build warning:

- Turbopack reports an NFT tracing warning for `src/lib/screenshot-storage.ts` because screenshot upload uses server filesystem operations and a configurable storage path. The production build still exits successfully.

Latest local runtime check:

- `npm run dev` starts Next.js 16.2.9 on `http://localhost:3300`.
- `http://127.0.0.1:3300/login` returns HTTP 200.
- `http://127.0.0.1:3300/dashboard` returns the expected logged-out redirect instead of a Next.js client-component serialization error.
- The stale manual `3000` dev server was stopped after returning HTTP 500.
- `npm run stop-port -- 3300` and `npm run stop-dev` run successfully when the port is already free.
- Ubuntu 24.04 + CloudPanel 2.5.3 + MariaDB + Nginx production deployment guide has been added; it assumes CloudPanel is already installed.

## Database and Migration Notes

- Prisma uses `.env`, not `.env.local`.
- Next.js can also use `.env`, so this project can keep a single local env file.
- `.env` is ignored by git.
- Assistant-created Prisma migrations must use explicit meaningful names:

```bash
npx prisma migrate dev --name meaningful-change-name
```

Recent schema changes require migrations if not already applied. Apply all pending migrations with:

```bash
npm run prisma:migrate
```

The latest migration added in the repo is `20260627193000_journal_enrichment`.

Run `npm run prisma:generate` after schema changes or after pulling schema-changing work.

## Manual Testing Status

Manual browser testing is pending.

Expected current manual flow after MariaDB migrations are applied:

1. Register an account.
2. Log in.
3. Update timezone/base currency in Settings.
4. Add a BingX exchange connection.
5. Create a trading collection.
6. Attach a sync source to the trading collection.
7. Test the BingX connection from Exchange connections.
8. Open Sync and run Sync trades.
9. Review sync log success/failure and raw table records.
10. Open a trade detail page.
11. Save journal strategy, setup, notes, emotion, review, grade, and mistake tags.
12. Upload a screenshot and edit its caption.
13. Confirm strategy, grade, and mistake tag filters work on `/trades`.

## Important Assumptions

- MVP uses MariaDB, not PostgreSQL.
- Screenshot storage is app-server filesystem storage for MVP.
- First real sync targets are BingX perpetual contracts and BingX Standard Futures.
- Trader-facing review centers on one app concept: journal trade.
  - Perpetual raw positions can help build a journal trade.
  - Standard Futures exchange-side trades/orders can help build a journal trade.
  - Detailed orders and fills are supporting evidence only, not the main review object.
- Target sync direction is trader-level summaries first:
  - Perpetual: open positions, position history, and account income/P&L.
  - Standard Futures: exchange-side trade/order summaries.
  - Required net result inputs are realized P&L, trading fees, and funding fees where applicable so each journal trade can show final net win/loss.
  - Detailed order/fill sync should be optional diagnostic coverage, not default MVP behavior, once summary-level sync is implemented.
- Manual sync comes before scheduled/background sync.
- Raw exchange payloads are preserved separately from normalized trades.
- Trade normalization runs after raw sync and should be refined as real BingX payloads are validated.

## Next Recommended Phase

Build Phase 8 dashboard and analytics:

1. Create dashboard metric queries from normalized trades and journal fields.
2. Add dashboard filters for date range, collection, symbol, exchange, market type, side, strategy, and tags.
3. Show MVP metrics: total P&L, net P&L, win rate, trade count, average win/loss, profit factor, and best/worst trades.
4. Add simple charts for equity/P&L over time and breakdowns by strategy, symbol, and mistake tags.
5. Keep validating real BingX payload shapes through manual sync logs and raw rows.
