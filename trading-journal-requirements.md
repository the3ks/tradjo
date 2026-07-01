# Trading Journal Web App Requirements

Last updated: 2026-07-01

## 1. Product Overview

Trading Journal is a multi-user, mobile-friendly web app for reviewing exchange-synced trades and, in a separate future domain, tracking long-term portfolio exposure. The app is personal-use first, but it must support multiple users so the owner can share it with friends.

The core workflow is:

```text
Create account -> connect exchange -> create trading collection -> sync/import trades -> review and enrich trades
```

The first supported exchange is BingX. MVP journal trade records are created from exchange data or assisted screenshot/table import. Manual free-form tactical trade creation is not the main workflow.

The product has two bounded contexts:

- Trading Journal: tactical trade evaluation.
- Portfolio: strategic exposure and net-worth tracking.

## 2. Core Concepts

```text
Exchange Connection = where exchange data comes from
Collection = how a user organizes trades
Collection Sync Source = how a trading collection fetches exchange data
Trade = the app-level journal record the trader reviews
Trade Journal = manual context added by the user
Raw Exchange Data = preserved source data used to build/rebuild trades
Portfolio Position = current strategic holding or exposure
Portfolio Ledger = immutable transaction log behind a portfolio position
```

Important naming rule:

- The app calls both BingX perpetual positions and BingX Standard Futures trades simply `Trade`.
- Traders care about the final reviewed trade: money used, reason, result, fees/funding, screenshots, and review.
- Detailed orders/fills are supporting diagnostics, not the main journal object.
- Account balances are not required for the MVP trade journal.

## 2.5 Bounded Contexts

The app must strictly separate the Trading Journal from Portfolio Management. They share authentication, user settings, encryption helpers, and visual shell, but they should not share trade/position ledgers.

### Domain A: Trading Journal

Purpose:

- Evaluate decision-making, edge, execution quality, and psychology.

Focus:

- Complete round-trip events: entry plus exit.
- Day trades, swing trades, scalps, and tactical futures trades.

Current data models:

- `Trade`
- `TradeJournal`
- `TradeMistakeTag`
- `TradeScreenshot`
- Raw sync tables used to build journal trades.

Primary metrics:

- Win rate
- Profit factor
- Net P&L
- Mistake frequency
- Setup/strategy performance
- Trade grade

### Domain B: Portfolio

Purpose:

- Track net worth, asset allocation, and long-term exposure.

Focus:

- Running balances.
- Average cost basis.
- Current market valuation.
- Unrealized P&L.
- Long-term holdings and hedges.

Target instruments:

- Spot crypto holdings.
- Cold-storage crypto.
- Stocks, including penny stocks and blue chips.
- Forex balances or exposure.
- Commodities.
- Long-held futures or perpetual hedges.
- Cash balances.

Target metrics:

- Total equity.
- Asset-class allocation.
- Unrealized P&L.
- Realized P&L.
- Average cost.
- Margin utilization where relevant.
- Cash allocation.

Portfolio must not reuse `Trade` or `TradeJournal` for holdings. It needs ledger-based portfolio tables.

Cash decision:

- Portfolio should track raw cash as a first-class portfolio asset.
- Cash is required for accurate net worth, idle-capital visibility, and allocation percentages.
- Cash deposits, withdrawals, and currency balances belong to Portfolio, not Trading Journal.
- Trading Journal still does not need exchange account balances for tactical trade review.
- USDT, USDC, and fiat balances should be represented as Portfolio cash/equivalent positions.
- Cash positions can be general or exchange-specific, e.g. `USDT (General)`, `USDT (Binance)`, `USDT (BingX)`.
- The default behavior should prevent cash balances from going negative for simple balance positions.
- Negative cash can be added later only through an explicit margin/borrowed-funds mode.

## 3. Current Tech Stack

- Next.js 16.2.9 App Router
- React and TypeScript
- Tailwind CSS v4
- Server Actions for mutations
- Auth.js / NextAuth with credentials auth
- Prisma ORM
- MariaDB / MySQL provider
- Vitest unit tests
- ESLint
- Local filesystem screenshot storage for MVP
- PWA manifest/icons/service worker for installability

Current local development conventions:

- Dev server default port: `3300`
- Prisma reads `.env`
- Next.js also uses `.env`
- Local `.env` is ignored by git
- `npm run stop-dev` stops port `3300`
- `npm run stop-port -- <port>` stops a chosen local port

## 4. Security and Data Isolation

The app must enforce per-user data isolation for every query and mutation.

Rules:

- Users must not access another user's exchange connections, collections, trades, journals, screenshots, sync logs, suggestions, or AI credentials.
- Exchange API secrets must be encrypted at rest.
- AI extraction API keys must be encrypted at rest.
- API secrets and AI secrets must not be shown again after saving.
- Users should use read-only exchange API keys.
- Withdrawal-enabled exchange credentials must not be required.
- Screenshot files are served only through authenticated routes.

## 5. Authentication and User Settings

Required user features:

- Register
- Login
- Logout
- Remember me checkbox on login
- Protected app routes redirect logged-out users to `/login`
- Profile settings:
  - Timezone
  - Base currency

Session behavior:

- Remembered sessions use a longer JWT lifetime.
- Unchecked sessions use a shorter browser-session-style JWT lifetime.

## 6. Exchange Connections

Users can add and manage exchange API credentials.

MVP exchange:

```text
BingX
```

Exchange connection requirements:

- Account name can be any user-friendly label, e.g. `BingX Main`.
- Store encrypted API key and API secret.
- Enable/disable connection.
- Test connection.
- Delete connection when unused.
- Soft-delete when sync sources or synced data depend on it.

Current route:

```text
/settings/exchanges
```

## 7. Collections

Collections organize trades.

There are two collection types:

### 7.1 Folder Collection

- Can contain child collections.
- Cannot contain trades directly.
- Cannot have a sync source.
- Used only for organization.

### 7.2 Trading Collection

- Leaf node.
- Can contain trades.
- Cannot contain child collections.
- Can have one active MVP sync source.
- Can be pinned for quick access.
- Has a dedicated collection detail page.

Example:

```text
Crypto Scalping                  Folder
├── Liquidity Sweep              Trading Collection
├── Breakout Retest              Trading Collection
└── Failed Setups                Trading Collection
```

Current collection features:

- Create folder collections.
- Create trading collections.
- Attach trading collections to folders.
- Pin/unpin trading collections.
- Configure one active sync source per trading collection.
- Open a dedicated collection page at `/collections/[collectionId]`.

## 8. Collection Sync Source

A collection sync source defines how a trading collection fetches exchange data.

MVP rule:

```text
One active sync source per trading collection.
```

Sync source settings:

- Exchange connection
- Market type:
  - `PERPETUAL`
  - `FUTURES`
  - `SPOT` reserved for future support
- Symbol filter mode:
  - All
  - Include list
  - Exclude list
- Initial sync mode:
  - Yesterday
  - Last 7 days
  - Custom range
  - Open only
- Cursor fields:
  - Last event time
  - Last order cursor
  - Last trade cursor
  - Cursor initialization source

Design rule:

```text
Cursor belongs to Collection Sync Source, not directly to Collection or Symbol.
```

## 9. Initial Sync Modes

When a sync source has no cursor, the user chooses how far back to fetch.

Supported modes:

- Yesterday
- Last 7 days
- Custom date range
- Open only

Definitions:

- Yesterday means the previous calendar day in the user's timezone.
- Last 7 days fetches from current time minus 7 days.
- Custom range uses user-selected start/end dates.
- Open only starts from currently open exchange items when available.

Open-only behavior:

```text
1. Fetch open orders/positions where the exchange supports them.
2. If open items exist, import them and initialize cursor from latest fetched event.
3. If no open item exists, fetch latest closed item only to initialize cursor.
4. Do not import that closed item by default.
```

## 10. Sync Behavior

MVP sync is manual, not scheduled.

Main sync entry points:

- `/sync`: run manual collection syncs and review logs.
- `/collections/[collectionId]`: sync trades for that specific trading collection.

Collection sync flow:

```text
1. Find active Collection Sync Source.
2. Load exchange connection and user profile.
3. Determine fetch range from initial mode or cursor.
4. Fetch BingX data.
5. Apply symbol filter.
6. Upsert raw source records.
7. Normalize raw records into app-level trades.
8. Assign trades to the current collection.
9. Update cursor after successful sync.
10. Write exchange sync log.
```

Incremental sync:

```text
fetch_from = last_event_time - 6 hours
```

The overlap protects against late updates and API timing issues.

Currently supported sync/import paths:

- BingX perpetual sync from raw orders, fills, position history, and income/P&L rows.
- BingX Standard Futures sync from filled exchange-side order/trade summaries.
- BingX Standard Futures screenshot/table/JSON import.

Not required for MVP:

- Account balance sync.
- Default detailed order/fill review UI.
- Background scheduled sync.

## 11. Raw Exchange Data

Raw exchange data must be stored separately from normalized trades.

Current raw source models:

- `RawOrder`
- `RawFill`
- `RawPosition`
- `RawIncome`

Purpose:

- Preserve source payloads.
- Debug sync issues.
- Rebuild normalized trades later.
- Preserve fees, funding, realized P&L, and source metadata.

Raw balance storage is not part of the current MVP requirement.

## 11.5 Portfolio Data Model

Portfolio uses a ledger model. The ledger is immutable transaction history; current positions are recalculated/rolled up from ledger rows.

Target Prisma enums:

```prisma
enum AssetClass {
  CASH
  CRYPTO
  STOCK
  FOREX
  COMMODITY
}

enum PositionType {
  BALANCE
  SPOT
  FUTURES
}

enum LedgerAction {
  DEPOSIT
  WITHDRAWAL
  BUY
  SELL
  FEE
  FUNDING
  DIVIDEND
  TRANSFER_IN
  TRANSFER_OUT
}
```

Target current-state model:

```prisma
model PortfolioPosition {
  id              String       @id @default(cuid())
  userId          String
  symbol          String
  assetClass      AssetClass
  positionType    PositionType
  exchange        String?

  currentQuantity Decimal      @db.Decimal(36, 18)
  averageCost     Decimal      @db.Decimal(36, 18)
  realizedPnl     Decimal      @default(0) @db.Decimal(36, 18)
  currency        String

  updatedAt       DateTime     @updatedAt

  ledgers         PortfolioLedger[]

  @@unique([userId, symbol, assetClass, positionType, exchange])
  @@index([userId])
  @@index([assetClass])
  @@index([positionType])
  @@index([exchange])
}
```

Target immutable ledger model:

```prisma
model PortfolioLedger {
  id              String       @id @default(cuid())
  userId          String
  positionId      String
  action          LedgerAction

  quantityChange  Decimal      @db.Decimal(36, 18)
  price           Decimal      @db.Decimal(36, 18)
  feeAmount       Decimal      @default(0) @db.Decimal(36, 18)
  currency        String
  linkedLedgerId  String?      @unique

  transactionDate DateTime
  source          String
  rawPayload      Json?
  createdAt       DateTime     @default(now())

  position        PortfolioPosition @relation(fields: [positionId], references: [id], onDelete: Cascade)
  linkedLedger    PortfolioLedger?  @relation("PortfolioLedgerLink", fields: [linkedLedgerId], references: [id])
  linkedByLedger  PortfolioLedger?  @relation("PortfolioLedgerLink")

  @@index([userId])
  @@index([positionId])
  @@index([transactionDate])
}
```

Cost-basis rule:

- Use weighted average cost for MVP.
- FIFO/LIFO tax-lot accounting can be added later if tax reporting becomes a requirement.

Valuation rule:

- Store transactions and cost basis first.
- Live market pricing and current valuation can be added after the ledger is stable.

USDT and cash-equivalent rules:

- `AssetClass.CASH` is used for fiat and stablecoin balances such as USDT and USDC.
- `PositionType.BALANCE` is used for simple cash/equivalent holdings.
- `exchange = null` means a general/global portfolio balance.
- `exchange = "Binance"`, `"BingX"`, or another exchange name means the balance is held at that venue.
- USDT average cost defaults to `1.0` in the selected valuation currency unless the user/import provides another cost.
- A user can have one `USDT + CASH + BALANCE + null` general position and one per exchange.

Linked settlement rules:

- Asset buys/sells may optionally create a linked cash settlement ledger.
- The two ledger rows point to each other with `linkedLedgerId`.
- Deleting or reversing one side should surface the linked side and require a paired reversal/refund.
- Balance checks are strict by default for `BALANCE` positions: a settlement cannot make the selected cash position negative.
- Future margin/borrowed-fund support should be explicit, not silently represented by negative cash.

Example buy settlement:

```text
Buy 0.5 BTC at 60,000 and settle with Binance USDT:
1. Create BTC BUY ledger for +0.5 BTC.
2. Create USDT settlement ledger for -30,000 USDT against USDT (Binance).
3. Link both ledger rows.
4. Recalculate BTC position and USDT (Binance) balance.
```

Example sell settlement:

```text
Sell 100 TSLA at 200 and settle to General USDT:
1. Create TSLA SELL ledger for -100 TSLA.
2. Create USDT settlement ledger for +20,000 USDT against USDT (General).
3. Link both ledger rows.
4. Recalculate TSLA position and USDT (General) balance.
```

## 12. Trade Normalization

The normalized `Trade` model is the app's journal object.

Required trade result fields:

- Symbol
- Market type
- Side
- Status
- Quantity
- Entry price
- Exit price
- Gross P&L
- Trading fee
- Funding fee
- Net P&L
- Opened time
- Closed time
- Settled time
- Source record type/id
- Raw summary

Perpetual normalization:

- Perpetual raw positions help build the journal trade.
- Matching income rows provide realized P&L, trading fees, and funding fees.

Standard Futures normalization:

- Standard Futures is not modeled as raw positions.
- Exchange-side trade/order summaries build the journal trade.
- Screenshot/table/JSON import can also create/update Standard Futures trades.

Status values:

- Open
- Closed
- Settled
- Archived

## 13. Journal Enrichment

Users manually enrich synced/imported trades.

Journal fields:

- Strategy
- Setup
- Entry trigger
- Exit reason
- Notes
- Emotion
- Review
- Grade
- Mistake tags
- Screenshots
- Screenshot captions

Journal requirements:

- Users can save/update journal fields.
- Mistake tags support multi-select and user-scoped creation.
- Suggestions are user-scoped.
- Long-text suggestions append snippets instead of replacing current content.
- Screenshot files are stored on the app server filesystem for MVP.
- Screenshot captions are editable.

## 14. Smart Suggestions

The app keeps a user-scoped suggestion index.

Suggestion categories include:

- Strategy
- Setup
- Entry trigger
- Exit reason
- Notes snippets
- Emotion
- Review snippets
- Grade
- Mistake tags
- Screenshot captions

Suggestion ranking:

```text
1. Exact match
2. Starts-with match
3. Contains match
4. Usage frequency
5. Recency
```

Suggestion endpoint:

```text
GET /api/suggestions
```

## 15. Screenshot and Table Import

The app supports assisted import for BingX Standard Futures journal trades. Future CSV/PDF/OCR imports must include an explicit target domain before processing.

Import target choices:

- Trading Journal (Tactical Trades)
- Portfolio Ledger (Long-Term Holdings)

Routing rules:

- If target is Trading Journal, extracted rows become closed/open journal trade drafts and are saved as `Trade` records.
- If target is Portfolio Ledger, extracted rows become individual `PortfolioLedger` entries and trigger recalculation of `PortfolioPosition`.
- Import UI must make the target visible before upload/parse/save.
- Server actions must validate the selected target and must not infer Portfolio vs Journal silently from file contents alone.

Import methods:

- Upload one or more screenshots.
- Paste BingX copied table text.
- Paste/edit raw JSON.
- Future CSV import.
- Future PDF/OCR statement import.

Portfolio import settlement mapping:

- During CSV/OCR column mapping, show an optional batch setting:
  - `Settle all imported buys/sells against: [USDT source]`
- USDT source choices should include general and exchange-specific balances, e.g.:
  - `USDT (General)`
  - `USDT (Binance)`
  - `USDT (BingX)`
- When selected, imported asset buys deduct from that USDT source.
- Imported asset sells add to that USDT source.
- Users must be able to override or disable settlement before saving.

AI extraction:

- Gemini can be configured in Settings.
- OpenAI can be configured as fallback or alternative.
- AI API keys are stored encrypted.
- Import is disabled until at least one supported AI key is configured, except table/JSON flows that do not require screenshot extraction.

Import behavior:

- A screenshot can contain more than one trade.
- Parsed draft JSON is shown before save.
- User can edit JSON before saving.
- Existing trade matches are surfaced before save.
- Collection page import saves directly into that collection.

Routes:

- `/trades/import-screenshot`
- `/collections/[collectionId]#upload-screenshot`
- Future portfolio import route under `/portfolio` or `/portfolio/ledger`

## 16. Dashboard

The dashboard summarizes real normalized journal trades today. After Portfolio is implemented, it should become the high-level home for both domains without merging their ledgers.

Current dashboard metrics:

- Net P&L
- Win rate
- Trade count
- Profit factor
- Closed trades
- Open trades
- Average net
- Total fees

Dashboard lists:

- Trading collection performance rows.
- Recent trades.

Dashboard links:

- Collection rows open `/collections/[collectionId]`.
- Recent trade rows open `/trades/[tradeId]` with a dashboard return link.

Future dashboard enhancements:

- Combined high-level net worth summary:
  - Portfolio equity
  - Trading account balance when/if explicitly modeled
  - Cash allocation
- Date and collection filters.
- Charts.
- Best/worst trade.
- Strategy, symbol, tag, and market breakdowns.
- Portfolio allocation snapshot linking to `/portfolio`.

## 17. Web Page Navigation

### 17.1 Public/Auth Routes

| Route | Purpose |
| --- | --- |
| `/` | Entry route; redirects according to auth/app behavior. |
| `/login` | Login form with Remember me. |
| `/register` | Account registration. |

### 17.2 Primary App Navigation

Desktop primary navigation appears in the left sidebar.
Mobile primary navigation appears in the bottom navigation bar.

| Route | Label | Purpose |
| --- | --- | --- |
| `/dashboard` | Dashboard | Performance overview and recent trades. |
| `/collections` | Collections | Manage folders, trading collections, sync sources, pinning. |
| `/trades` | Trades | Advanced trade list and filters. |
| `/portfolio` | Portfolio | Strategic holdings, allocation, and exposure. |
| `/sync` | Sync | Manual sync actions and sync logs. |
| `/settings` | Settings | Profile, AI extraction keys, exchange link. |

### 17.3 Collection Shortcuts

Desktop:

- Pinned trading collections appear at the top of the sidebar.
- The folder/trading collection tree appears below primary nav.
- Trading collection shortcuts open `/collections/[collectionId]`.

Mobile:

- The header has a folder icon.
- Tapping it opens a top-sheet collection drawer below the header.
- Pinned collections appear first.
- A separator appears between pinned collections and the full collection tree.
- The drawer includes a Manage collections link to `/collections`.

### 17.4 Secondary Routes

| Route | Purpose |
| --- | --- |
| `/collections/[collectionId]` | Dedicated trading collection view with stats, only that collection's trades, sync action, and import tools. |
| `/trades/[tradeId]` | Trade detail, journal editor, screenshots, result/timeline/sync metadata. |
| `/trades/import-screenshot` | Global screenshot/table/JSON import entry point. |
| `/portfolio` | Dedicated portfolio workspace showing current positions and allocation. |
| `/portfolio/ledger` | Raw portfolio transaction ledger history. |
| `/settings/exchanges` | BingX exchange connection management. |
| `/api/suggestions` | User-scoped suggestion API. |
| `/api/trade-screenshots/[screenshotId]` | Authenticated screenshot serving. |
| `/manifest.webmanifest` | PWA manifest. |

### 17.5 Navigation Rules

- `/trades` remains the advanced query page with many filters.
- `/portfolio` must not show tactical journal trades as portfolio holdings unless they are explicitly imported into the portfolio ledger.
- `/collections/[collectionId]` is the focused collection workspace.
- `/collections` remains tactical-trading organization only, not portfolio organization.
- Collection tree and pinned shortcuts should open the focused collection page, not the advanced trades page.
- The focused collection page may link to `/trades?collectionId=...` for advanced filters.
- Trade detail pages can receive a safe internal return link via query params.

## 18. Trade List Page

Route:

```text
/trades
```

Purpose:

- Advanced query and review across all trades.

Filters:

- Date range
- Collection
- Exchange connection
- Symbol
- Market type
- Side
- Status
- Strategy
- Mistake tag
- Grade

Trade rows show:

- Symbol
- Collection
- Exchange
- Market type
- Side
- Status
- Gross P&L
- Net P&L
- Closed/opened time
- Journal strategy/grade/tags when available

## 19. Dedicated Collection Page

Route:

```text
/collections/[collectionId]
```

Purpose:

- Focused view of one trading collection.
- Show only trades in that collection.
- Provide a direct sync/fetch button for that collection.
- Provide import tools scoped to that collection.

Required sections:

- Collection summary and parent/pinned metadata.
- Collection stats.
- Trade list scoped to the collection.
- Sync source details.
- Sync trades button when an active sync source exists.
- Configure sync link when no active sync source exists.
- Screenshot/table/JSON importer.
- Link to advanced `/trades?collectionId=...` filters.

## 19.5 Portfolio Page

Routes:

```text
/portfolio
/portfolio/ledger
```

Purpose:

- Track strategic holdings and exposure separately from tactical journal trades.

`/portfolio` required future sections:

- Current portfolio positions table.
- Dedicated Cash & Equivalents section with rows such as `USDT (General)`, `USDT (Binance)`, and `USDT (BingX)`.
- Quick Deposit and Withdraw actions for cash/equivalent rows.
- Asset-class allocation chart.
- Total equity estimate.
- Cash allocation.
- Unrealized P&L.
- Realized P&L.
- Average cost per position.
- Margin utilization for futures where applicable.
- Import action for CSV/PDF/OCR/manual ledger entry.
- Manual Add Asset form with a Settlement section:
  - Toggle: Settle with Portfolio Cash.
  - Dropdown: available USDT/cash positions and current balances.
  - Amount input defaulting to `quantity * price`, editable for partial settlement.
  - Strict balance validation by default.

`/portfolio/ledger` required future sections:

- Immutable transaction history.
- Filters by date, asset class, symbol, action, and source.
- Link from each ledger row to its `PortfolioPosition`.
- Import source/raw payload review where available.

Portfolio navigation rule:

- Portfolio pages must use portfolio terminology: positions, holdings, ledger, allocation, equity.
- Journal pages must use journal terminology: trades, setup, strategy, mistakes, grade, review.
- UI should avoid showing Portfolio positions inside Collections or tactical trade shortcuts.

## 20. Trade Detail Page

Route:

```text
/trades/[tradeId]
```

Required sections:

- Journal editor near the top.
- Summary metrics.
- Result breakdown:
  - Gross result
  - Trading fees
  - Funding fees
  - Entry price
  - Exit price
  - Final net
- Timeline:
  - Opened
  - Closed
  - Settled
- Screenshots and captions through the journal editor.
- Sync metadata and raw summary.
- Back link, optionally customized by safe internal query params.

## 21. Sync Logs

Route:

```text
/sync
```

Every sync should write a log.

Sync log fields:

- Sync type
- Status
- Started at
- Finished at
- Fetched count
- Created count
- Updated count
- Skipped count
- Error message
- Exchange connection
- Collection sync source

## 22. Mobile Requirements

The app must be usable on mobile browsers and installable as a PWA.

Mobile requirements:

- Bottom primary navigation.
- Header collection drawer for quick collection access.
- Large tap targets.
- Forms usable on phone screens.
- Native date input trigger for date filters.
- Trade lists collapse into card-like stacked rows.
- Journal editor works on narrow screens.
- Screenshot upload from phone gallery.
- Tappable suggestions/chips where applicable.
- Avoid wide fixed tables on small screens.

## 23. Deployment Requirements

Target self-hosting environment:

- Ubuntu 24.04
- CloudPanel 2.5.3
- MariaDB
- Nginx
- PM2

Deployment docs:

- `docs/INSTALLATION_UBUNTU_CLOUDPANEL.md`

CloudPanel deployment notes:

- Do not clone directly into a non-empty CloudPanel site directory.
- Clone to a temporary directory, then move project files into the site directory.
- Preserve CloudPanel-managed `.well-known`.
- Use `pm2 startup` and `pm2 save` for reboot restore.

## 24. MVP Scope

Current MVP includes or targets:

- Email/password authentication.
- User profile.
- BingX exchange connections.
- Collections and sync sources.
- Manual BingX sync.
- BingX perpetual journal trade normalization.
- BingX Standard Futures journal trade normalization/import.
- Raw source data preservation.
- Trade list.
- Dedicated collection page.
- Trade detail and journal editor.
- Screenshot upload.
- Screenshot/table/JSON trade import.
- Smart suggestions.
- Sync logs.
- Dashboard metrics.
- Mobile-friendly navigation.
- PWA install metadata.

Portfolio is a post-current-MVP domain extension unless explicitly prioritized next.

## 25. Known Gaps and Future Enhancements

Known gaps:

- Portfolio domain is not implemented.
- `/portfolio` and `/portfolio/ledger` are not implemented.
- Portfolio CSV/PDF/OCR import routing is not implemented.
- Spot sync is not implemented.
- Force resync UI and behavior are not implemented.
- Scheduled/background sync is not implemented.
- Browser/E2E tests are not implemented.
- MariaDB integration tests are not implemented.
- Dashboard charts and advanced dashboard filters are not implemented.

Future enhancements:

- Additional exchanges: Binance, Bybit, OKX, Hyperliquid.
- Auto scheduled sync.
- Force resync by date range.
- AI weekly review.
- AI trade review.
- Strategy library.
- Playbook templates.
- Import/export CSV.
- Advanced analytics.
- Risk management rules.
- Trading calendar.
- S3-compatible screenshot storage.
