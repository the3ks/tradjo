# Trading Journal Web App — Requirements Specification

## 1. Product Overview

This application is a multi-user, mobile-friendly trading journal web app. It is intended for personal usage first, but should support multiple users so the owner can share it with friends. Users can create accounts, connect their own exchange API credentials, fetch orders/trades from exchanges, organize trades into collections, and review trading performance.

The first supported exchange is **BingX**.

Manual trade/order creation is **not required for MVP**. Trades are created from exchange-synced data. Users can manually add journal/review information to synced trades.

---

## 2. Core Principles

```text
Exchange Connection = where data comes from
Collection = how user organizes trades
Collection Sync Source = how a collection fetches data
Trade = final journal record created from exchange data
```

Design goals:

- Personal-use first, but multi-user ready.
- Mobile-friendly UI.
- Manual fetch/sync, not background auto-sync for MVP.
- Preserve raw exchange data separately from normalized journal trades.
- Avoid syncing already settled trades repeatedly.
- Allow users to organize trades by flexible collections.
- Allow future support for more exchanges.

---

## 3. Suggested Tech Stack

### Frontend

Recommended:

- **Next.js** with App Router
- **React + TypeScript**
- **Tailwind CSS**
- **shadcn/ui** for UI components
- **React Hook Form** for forms
- **Zod** for validation
- **TanStack Query** for API state management
- **Recharts** for dashboard charts

Reason:

- Good for fast development with AI coding assistants.
- Strong TypeScript support.
- Mobile-friendly responsive UI is easy with Tailwind.
- shadcn/ui gives clean admin/SaaS-style components.

### Backend

Recommended:

- **Next.js API Routes / Server Actions** for MVP
- Or separate **.NET 8 Web API** if backend is expected to grow significantly

For MVP, prefer a monolithic Next.js app unless there is a strong reason to split backend and frontend.

### Database

Recommended:

- **MariaDB**
- **Prisma ORM**

### Authentication

Recommended options:

- **Auth.js / NextAuth** for email/password or OAuth
- Or **Clerk** if using a managed auth provider is acceptable

For a self-hosted personal/friends app, Auth.js is preferred.

### File Storage

For screenshots:

- Local filesystem for MVP self-hosting
- S3-compatible storage later, e.g. Cloudflare R2, AWS S3, MinIO

### Security

- Encrypt exchange API secrets at rest.
- Never store withdrawal-enabled API credentials.
- Encourage read-only API keys.
- Per-user data isolation must be enforced in every query.
- Do not expose raw API secret after creation.

---

## 4. User System

The app should support multiple users.

Features:

- Register
- Login
- Logout
- User profile
- Timezone setting
- Base currency setting
- Each user owns their own exchange connections, collections, trades, sync logs, and screenshots

Required rule:

```text
A user must not access another user's data.
```

---

## 5. Exchange Connections

Users can declare exchange API credentials.

MVP exchange:

```text
BingX
```

Features:

- Add exchange connection
- Name the connection, e.g. `BingX Main`, `BingX Test`
- Store API key
- Store encrypted API secret
- Test connection
- Enable / disable connection
- Delete connection if no synced data depends on it, or soft-delete otherwise

Suggested fields:

```text
exchange_connections
--------------------
id
user_id
exchange_name          -- BingX
account_name           -- BingX Main
api_key_encrypted
api_secret_encrypted
is_active
created_at
updated_at
```

Important:

- API key should be read-only if possible.
- Withdrawal permission must not be required.
- API secret should not be visible again after saving.

---

## 6. Collections

Collections organize journal trades.

There are two collection types.

### 6.1 Folder Collection

Rules:

- Can contain sub-collections
- Cannot contain trades
- Cannot sync orders
- Used only for organization

### 6.2 Trading Collection

Rules:

- Leaf node
- Can contain trades
- Cannot contain sub-collections
- Can have a sync source
- Can have journal settings

Example:

```text
Crypto Scalping                  Folder
├── Liquidity Sweep              Trading Collection
├── Breakout Retest              Trading Collection
└── Failed Setups                Trading Collection
```

Suggested fields:

```text
collections
-----------
id
user_id
parent_id
name
type                  -- folder / trading
description
sort_order
created_at
updated_at
```

Validation rules:

```text
If collection.type = folder:
    allow children
    disallow trades
    disallow sync source

If collection.type = trading:
    disallow children
    allow trades
    allow sync source
```

---

## 7. Collection Sync Source

A trading collection may have one or more sync sources in the future. For MVP, one active sync source per trading collection is enough.

A sync source defines:

- Which exchange connection to use
- Which market type to fetch
- Which symbols to include/exclude
- How first sync should be initialized
- The sync cursor

Suggested fields:

```text
collection_sync_sources
-----------------------
id
user_id
collection_id
exchange_connection_id
market_type                  -- perpetual / spot / futures
symbol_filter_mode           -- all / include / exclude
initial_sync_mode            -- yesterday / last_7_days / custom_range / open_only
initial_sync_start_time
initial_sync_end_time
initial_sync_completed
last_event_time
last_order_cursor
last_trade_cursor
cursor_initialized_from      -- import_range / open_orders / latest_closed_order / now
is_active
is_default
created_at
updated_at
```

Symbols are stored separately:

```text
collection_sync_source_symbols
------------------------------
id
collection_sync_source_id
symbol                       -- BTC-USDT, ETH-USDT, SOL-USDT
mode                         -- include / exclude
created_at
```

Important design decision:

```text
Cursor belongs to the Collection Sync Source, not directly to Collection and not necessarily to Symbol.
```

Symbol is a filter. A trading collection may include multiple symbols such as BTC, ETH, and SOL.

---

## 8. Initial Sync Modes

When a sync source has no cursor, the user must choose how far back to fetch.

Options:

```text
- Yesterday
- Last 7 days  -- default
- Custom date range
- Open / not-closed orders only
```

### 8.1 Yesterday

Definition:

```text
Yesterday = start of previous calendar day in the user's timezone
```

Example:

```text
If user timezone is Asia/Ho_Chi_Minh and today is 2026-06-26,
Yesterday means from 2026-06-25 00:00:00 +07:00.
```

### 8.2 Last 7 Days

Default initial sync mode.

```text
Fetch from now - 7 days to now.
```

### 8.3 Custom Date Range

User chooses:

```text
start_date
end_date
```

### 8.4 Open / Not-Closed Orders Only

This mode is used when the user wants to start journaling only from currently running/open trades.

Logic:

```text
1. Fetch open orders / open positions.

2. If open items exist:
      import them
      set cursor from latest fetched event time
      cursor_initialized_from = open_orders

3. If no open item exists:
      fetch latest closed order/trade
      save it as cursor
      do not import that closed order/trade by default
      cursor_initialized_from = latest_closed_order
```

This prevents importing old closed trades when the user only wants to start from current active trades.

---

## 9. Sync Behavior

MVP uses manual sync buttons.

Sync entry points:

```text
Exchange Connection page:
[Sync Account]

Trading Collection page:
[Fetch Orders for this Collection]
```

### 9.1 Collection Sync Flow

When user clicks `Fetch Orders` inside a trading collection:

```text
1. Find the active Collection Sync Source.
2. Load its Exchange Connection.
3. Determine fetch range:
      - If no cursor: use initial sync mode.
      - If cursor exists: fetch from last_event_time - overlap_window.
4. Fetch data from BingX.
5. Apply symbol filter.
6. Upsert raw orders/fills/positions.
7. Convert raw data into normalized trades.
8. Assign resulting trades to the current collection.
9. Skip settled trades unless force_resync is requested.
10. Update cursor only after successful sync.
11. Write sync log.
```

### 9.2 Incremental Sync

After initial sync, the main cursor is:

```text
last_event_time
```

Normal sync should fetch:

```text
fetch_from = last_event_time - overlap_window
```

Suggested overlap:

```text
6 hours
```

Reason:

```text
Avoid missing late updates to older orders or API timing issues.
```

Secondary cursors may also be stored:

```text
last_order_cursor
last_trade_cursor
```

But timestamp cursor should be the main logic for MVP.

---

## 10. Force Resync

Provide force resync for recovery.

Features:

- Force resync by date range
- Ignore cursor
- Re-fetch raw exchange data
- Upsert records by exchange IDs
- Rebuild normalized trades if required

Use cases:

- API error happened
- Cursor was wrong
- User changed collection mapping
- Trade grouping logic improved
- Historical data needs correction

---

## 11. Raw Exchange Data

Raw exchange data must be stored separately from normalized journal trades.

Suggested tables:

```text
raw_orders
raw_fills
raw_positions
raw_balances
```

Purpose:

- Preserve original exchange API response
- Debug sync problems
- Rebuild trades later
- Avoid data loss

Suggested `raw_orders` fields:

```text
raw_orders
----------
id
user_id
exchange_connection_id
exchange_order_id
symbol
market_type
side
order_type
price
quantity
filled_quantity
status
created_time
updated_time
raw_payload
is_terminal
last_seen_at
created_at
updated_at
```

Use exchange-provided IDs as unique keys.

---

## 12. Order and Trade Lifecycle

### 12.1 Raw Order Status

Possible statuses:

```text
NEW
PARTIALLY_FILLED
FILLED
CANCELED
REJECTED
EXPIRED
```

Terminal statuses:

```text
FILLED
CANCELED
REJECTED
EXPIRED
```

For terminal orders:

```text
raw_orders.is_terminal = true
```

### 12.2 Journal Trade Status

Possible statuses:

```text
open
closed
settled
archived
```

A trade becomes settled when:

```text
- Position is fully closed
- Related orders are terminal
- Realized P&L is final
- Fees are captured
- Funding fees are captured, if applicable
- Grace period has passed
```

MVP settlement rule:

```text
Closed trade older than 48 hours = settled
```

Normal sync skips settled trades.

Force resync can update settled trades.

---

## 13. Trade Journal

Trades are created from synced exchange data.

Users should not need to manually create orders/trades from scratch in MVP.

Users can manually enrich trades with journal fields.

Manual journal fields:

```text
- Strategy
- Setup
- Notes
- Mistake tags
- Emotion
- Screenshot
- Review
- Trade grade
```

Suggested trade fields:

```text
trades
------
id
user_id
collection_id
exchange_connection_id
symbol
market_type
side
status
entry_time
exit_time
avg_entry_price
avg_exit_price
quantity
leverage
gross_pnl
fees
funding_fee
net_pnl
is_settled
settled_at
created_at
updated_at
```

Suggested journal fields:

```text
trade_journals
--------------
id
user_id
trade_id
strategy
setup
notes
review
emotion
trade_grade             -- A / B / C / D or numeric score
created_at
updated_at
```

Mistake tags can be stored separately:

```text
trade_mistake_tags
------------------
id
user_id
trade_id
tag
created_at
```

Screenshots can be stored separately:

```text
trade_screenshots
-----------------
id
user_id
trade_id
file_path
file_name
caption
created_at
```

---

## 14. Smart Historical Suggestions for Journal Inputs

When users input journal fields, the app should suggest historical values based on that user's previous entries.

Fields requiring smart suggestions:

```text
- Strategy
- Setup
- Notes
- Mistake tags
- Emotion
- Screenshot captions
- Review
- Trade grade
```

### 14.1 Suggestion Behavior

For text/tag-like fields, suggestions should appear while typing.

Examples:

```text
Strategy input:
User types "liq"
Suggestions:
- Liquidity Sweep
- Liquidity Grab Reversal
- Liquidity + FVG
```

```text
Mistake tags input:
User types "rev"
Suggestions:
- Revenge trading
- Reversal entry too early
```

### 14.2 Suggestion Sources

Suggestions should come from:

```text
1. Exact historical values used by the same user
2. Recently used values
3. Frequently used values
4. Optional predefined defaults
```

Suggestions must be user-scoped.

```text
User A should not see User B's journal suggestions.
```

### 14.3 Ranking Logic

Recommended ranking:

```text
score = frequency_weight + recency_weight + text_match_weight
```

Simple MVP ranking:

```text
1. Starts-with match
2. Contains match
3. Most recently used
4. Most frequently used
```

### 14.4 Field-Specific Requirements

#### Strategy

- Suggest previous strategies used by the same user.
- Allow creating a new value directly from input.
- Optional future improvement: convert Strategy into a managed master list.

#### Setup

- Suggest previous setups.
- Optionally filter by selected Strategy.

Example:

```text
If Strategy = ICT,
suggest ICT-related setups first.
```

#### Notes

- Notes are long text, so suggestions should not aggressively autocomplete the full note.
- Provide reusable snippets or recent note templates.

Example suggestions:

```text
- Entered after confirmation candle
- Entry was too early
- Did not wait for retest
```

#### Mistake Tags

- Multi-select tag input.
- Suggest existing mistake tags.
- Allow adding new tags.

Examples:

```text
FOMO
Revenge trading
Oversized position
Moved stop loss
Entered without confirmation
```

#### Emotion

- Suggest previous emotions and common predefined values.

Examples:

```text
Calm
Fearful
Greedy
Impatient
Confident
Frustrated
```

#### Screenshot Captions

- Screenshot file itself is uploaded manually.
- Caption input should suggest previous screenshot captions.

Examples:

```text
Before entry
After exit
Entry confirmation
Mistake review
```

#### Review

- Long text field.
- Suggest previous review snippets/templates.

Examples:

```text
Good entry, poor exit management.
Followed the plan completely.
Valid setup but poor execution.
```

#### Trade Grade

- Suggest common grades.
- Default options:

```text
A
B
C
D
```

Optional future numeric grade:

```text
1 to 5
```

### 14.5 Suggested Data Model

Option A: derive suggestions from journal data on the fly.

This is simpler for MVP but may become slower later.

Option B: maintain a suggestion index table.

Recommended for cleaner implementation:

```text
user_suggestion_values
----------------------
id
user_id
field_name              -- strategy / setup / mistake_tag / emotion / screenshot_caption / review_snippet / note_snippet / trade_grade
value
usage_count
last_used_at
created_at
updated_at
```

When a user saves a trade journal, update the suggestion index:

```text
- Increment usage_count for used values
- Update last_used_at
- Insert new values if they do not exist
```

### 14.6 Suggestion API

Suggested endpoint:

```text
GET /api/suggestions?field=strategy&q=liq&limit=10
```

Response:

```json
[
  {
    "value": "Liquidity Sweep",
    "usageCount": 12,
    "lastUsedAt": "2026-06-26T10:30:00Z"
  }
]
```

### 14.7 Mobile UX for Suggestions

On mobile:

- Suggestions should appear as tappable chips.
- Inputs should not be too small.
- Tag fields should support easy add/remove.
- Long text fields should show snippets below or above the keyboard area when possible.
- Avoid complicated dropdowns that are hard to use on mobile.

---

## 15. Trade Detail Page

The trade detail page should show:

```text
- Summary
- Entry / exit prices
- Quantity
- Leverage
- Fees
- Funding fee
- Gross P&L
- Net P&L
- Order history
- Fill history
- Position history
- Notes
- Tags
- Screenshots
- Review
- Trade grade
```

Mobile layout:

- Summary card at top
- Tabs or accordion sections
- Large buttons
- Sticky save button for journal edits
- Screenshot upload optimized for mobile

Suggested tabs:

```text
Overview
Orders
Journal
Screenshots
Sync Info
```

---

## 16. Trade List Page

Columns/data:

```text
- Date
- Collection
- Symbol
- Long / Short
- Entry price
- Exit price
- Quantity
- Leverage
- Net P&L
- Status
- Strategy
- Grade
```

Mobile layout:

- Use cards instead of a wide table.
- Each card should show:

```text
Symbol / Side / P&L
Entry time
Strategy
Status
Grade
```

Filters:

```text
- Date range
- Collection
- Symbol
- Exchange
- Market type
- Long / short
- Status
- Strategy
- Tags
- Grade
```

---

## 17. Dashboard

MVP dashboard:

```text
- Total P&L
- Net P&L
- Win rate
- Number of trades
- Average win
- Average loss
- Profit factor
- Best trade
- Worst trade
- Equity curve
```

Filters:

```text
- Date range
- Collection
- Symbol
- Exchange
- Market type
- Long / short
- Strategy
- Tags
```

Mobile layout:

- Metric cards in 1-column or 2-column layout.
- Charts should be responsive.
- Filters should be collapsible.

---

## 18. Sync Logs

Every sync should be recorded.

Suggested fields:

```text
exchange_sync_logs
------------------
id
user_id
collection_sync_source_id
exchange_connection_id
sync_type              -- initial / incremental / recent_refresh / force_resync
status                 -- running / success / failed
started_at
finished_at
fetched_count
created_count
updated_count
skipped_count
error_message
created_at
```

Sync log page:

- Show latest sync status
- Show number of fetched/created/updated/skipped records
- Show error if failed
- Allow retry

---

## 19. Mobile-Friendly Requirements

The app must be usable from mobile browsers.

Requirements:

- Responsive layout for desktop, tablet, and mobile
- Bottom navigation or compact sidebar on mobile
- Large tap targets
- Mobile-friendly forms
- Mobile-friendly date range picker
- Card layout for trade list on mobile
- Sticky save/action button on trade journal forms
- Tappable suggestion chips for smart suggestions
- Screenshot upload from phone gallery
- Avoid wide tables on small screens

Recommended main navigation:

```text
Dashboard
Collections
Trades
Sync
Settings
```

---

## 20. MVP Scope

Build first:

```text
1. User registration/login
2. User profile with timezone/base currency
3. BingX exchange connection
4. Test exchange connection
5. Collection tree
6. Folder collection vs trading collection
7. Collection sync source
8. Initial sync modes:
   - Yesterday
   - Last 7 days default
   - Custom date range
   - Open/not-closed only
9. Manual fetch button
10. Raw orders/fills/positions storage
11. Trade grouping from synced data
12. Trade list
13. Trade detail
14. Manual journal fields
15. Smart historical suggestions for journal inputs
16. Screenshot upload
17. Basic dashboard
18. Sync logs
19. Force resync
20. Mobile-friendly responsive UI
```

---

## 21. Future Enhancements

Possible future features:

- Additional exchanges: Binance, Bybit, OKX, Hyperliquid
- Auto scheduled sync
- AI weekly review
- AI trade review
- Strategy library
- Playbook templates
- Public/shared strategies
- Team/community features
- Import/export CSV
- Advanced analytics
- Risk management rules
- Trading calendar
- PWA install support
