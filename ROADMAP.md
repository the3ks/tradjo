# Trading Journal Roadmap

This roadmap turns `trading-journal-requirements.md` into an implementation plan for a multi-user, mobile-friendly trading journal. The MVP prioritizes secure BingX sync, raw exchange data preservation, normalized trade journaling, and practical analytics.

Companion project guidance:

- `UI_DESIGN_GUIDELINES.md` applies the installed `taste-skill` to product UI decisions.
- `ENGINEERING_GUIDELINES.md` applies the installed `karpathy-guidelines` skill to implementation discipline.

## Guiding Principles

- Build personal-use workflows first, while enforcing multi-user isolation from day one.
- Keep exchange sync, collection organization, and journal records as separate concepts.
- Preserve raw exchange payloads so trades can be debugged and rebuilt later.
- Make all MVP sync manual; avoid background jobs until the core data model is proven.
- Design every page for mobile browsers, not as a desktop layout squeezed onto phones.
- Treat exchange API secrets as high-risk data: encrypt at rest and never reveal after save.

## Recommended Stack Decision

Use a monolithic Next.js application for MVP:

- Next.js App Router, React, TypeScript
- Tailwind CSS and customized shadcn/ui
- MariaDB with Prisma
- Auth.js for authentication
- TanStack Query for client API state
- TanStack Table for trade lists, supporting order/fill drill-down, sync logs, and other dense data views
- React Hook Form and Zod for forms and validation
- Recharts for dashboard charts
- Local filesystem storage for screenshots in MVP

Revisit a separate backend only if sync logic, background processing, or integrations become large enough to justify the operational cost.

### UI Direction After Applying `taste-skill`

The installed `taste-skill` is valuable as an anti-slop UI quality filter, but it explicitly is not aimed at dense dashboards, data tables, or multi-step product UI. For this trading journal, keep the stack above and apply the skill selectively:

- Build a calm, data-dense SaaS/product interface rather than a marketing-page experience.
- Keep shadcn/ui because it gives owned, customizable components on top of Radix primitives.
- Do not ship default shadcn styling; define project tokens for surfaces, borders, typography, radii, profit/loss colors, and chart colors.
- Keep motion restrained and functional: disclosure transitions, loading skeletons, optimistic feedback, and route/state orientation.
- Use a single icon family across the app.
- Treat tables, filters, mobile cards, empty states, and form states as first-class UI work.
- Follow the local UI guide in `UI_DESIGN_GUIDELINES.md`.

## Phase 0: Project Foundation

Goal: establish the application skeleton, conventions, and local development workflow.

### Scope

- Create the Next.js app structure.
- Add TypeScript, Tailwind CSS, shadcn/ui, linting, and formatting.
- Configure Prisma and MariaDB connection management.
- Create base layout, responsive navigation, and route groups.
- Add environment variable validation for database, auth, encryption, and storage settings.
- Add a basic test setup for unit and integration tests.

### Deliverables

- Running app shell with desktop and mobile navigation.
- Database connection verified through Prisma.
- Initial schema migration infrastructure.
- Developer setup documented in `README.md`.

### Acceptance Criteria

- App starts locally without manual code changes.
- Database migrations can be created and applied.
- A mobile viewport shows usable primary navigation: Dashboard, Collections, Trades, Sync, Settings.

## Phase 1: Authentication and User Settings

Goal: support multiple users with strict ownership boundaries.

### Scope

- Implement registration, login, logout, and protected routes.
- Add user profile page.
- Store user timezone and base currency.
- Create user-scoped query helpers or service patterns.
- Add authorization checks to all server-side data access.

### Data Model

- `users`
- `accounts` / `sessions` if required by Auth.js
- `user_profiles`

### Deliverables

- Authenticated app experience.
- Profile/settings screen.
- User isolation pattern documented for future features.

### Acceptance Criteria

- A logged-out user cannot access protected pages.
- User A cannot read, edit, or delete User B data through direct URLs or API calls.
- Timezone and base currency persist per user.

## Phase 2: Exchange Connections

Goal: let users securely add, test, disable, and delete BingX API credentials.

### Scope

- Create exchange connection CRUD.
- Support the first exchange: BingX.
- Encrypt API key and API secret at rest.
- Hide API secret after creation.
- Add connection test action.
- Support enable, disable, and soft-delete behavior.
- Prevent unsafe deletion when synced data depends on a connection.

### Data Model

- `exchange_connections`

### Deliverables

- Exchange settings page.
- Add/edit connection form.
- BingX connection test integration.
- Secret encryption utility and key rotation notes.

### Acceptance Criteria

- API secret is never returned to the client after save.
- Connection test gives clear success/failure feedback.
- Disabled connections cannot be used for normal sync.
- Deleting a connection with dependent data soft-deletes it instead.

## Phase 3: Collections and Sync Sources

Goal: let users organize trades and configure how a trading collection fetches exchange data.

### Scope

- Build collection tree CRUD.
- Support folder collections and trading collections.
- Enforce collection type rules.
- Add sync source setup for trading collections.
- Support market type, symbol filter mode, symbol list, initial sync mode, and active/default flags.
- Store sync cursors on the collection sync source.

### Data Model

- `collections`
- `collection_sync_sources`
- `collection_sync_source_symbols`

### Deliverables

- Collections page with tree navigation.
- Trading collection detail page.
- Sync source configuration form.

### Acceptance Criteria

- Folder collections can contain children but cannot contain trades or sync sources.
- Trading collections can contain trades and one active MVP sync source, but cannot contain children.
- Symbol filters support all, include, and exclude modes.
- Initial sync options include Yesterday, Last 7 days, Custom range, and Open/not-closed only.

## Phase 4: Raw Exchange Sync

Goal: fetch BingX perpetual and Standard Futures data manually and store raw exchange records safely.

### Scope

- Prefer trader-level BingX sync sources over detailed order/fill history:
  - Perpetual: open positions, position history, and account income/P&L.
  - Standard Futures: exchange-side trade/order summaries.
- Required net result inputs are realized P&L, trading fees, and funding fees where applicable; the journal must depict final net win/loss per trade, not only gross movement.
- Keep detailed orders/fills out of the default MVP sync unless they are needed to fill a specific missing field.
- Treat Standard Futures exchange-side trades/orders as the source for future journal trades; do not model Standard Futures as raw positions in the MVP.
- Keep detailed order/fill sync as optional diagnostic evidence, not the primary source for journal trades.
- Add manual sync entry points:
  - Exchange connection: Sync Account
  - Trading collection: Fetch Orders for this Collection
- Implement initial sync range resolution.
- Implement incremental sync using `last_event_time - 6 hours`.
- Apply symbol filters.
- Upsert raw data by exchange-provided IDs.
- Track terminal order statuses.
- Update cursors only after successful sync.
- Record every sync attempt.

### Data Model

- `raw_orders`
- `raw_fills`
- `raw_positions`
- `raw_incomes`
- `exchange_sync_logs`

### Deliverables

- Manual sync service.
- BingX perpetual and Standard Futures raw data persistence.
- Sync logs and retry UI.

### Acceptance Criteria

- A failed sync does not advance cursors.
- Duplicate exchange records update existing raw rows instead of creating duplicates.
- Sync logs show status, counts, timing, and error messages.
- Open/not-closed initial sync avoids importing old closed trades when no open item exists.

## Phase 5: Trade Normalization and Settlement

Goal: convert raw exchange data into normalized journal trades.

### Scope

- Define grouping logic that creates unified journal trades from raw exchange data:
  - Perpetual: positions, fills, and orders.
  - Standard Futures: exchange-side trades/orders.
- Keep the app-facing unit simple: both perpetual futures and Standard Futures are reviewed as journal trades.
- Preserve exchange-specific raw terms underneath only where they help reconstruction:
  - Perpetual raw positions help build the journal trade.
  - Standard Futures exchange-side trades/orders help build the journal trade.
  - Detailed orders and fills are supporting evidence only when a summary-level source is insufficient.
- Create normalized trade records.
- Assign trades to the current trading collection.
- Calculate entry, exit, quantity, leverage, gross P&L, fees, funding fees, and net P&L.
- Implement statuses: open, closed, settled, archived.
- Implement MVP settlement rule: closed trade older than 48 hours becomes settled.
- Skip settled trades during normal sync.
- Allow force resync to update settled trades.

### Data Model

- `trades`
- Join/link tables as needed between trades and raw records.

### Deliverables

- Trade grouping service.
- Settlement job or sync-time settlement routine.
- Raw-to-normalized audit links.

### Acceptance Criteria

- Re-running sync is idempotent.
- Normal sync does not mutate settled trades.
- Force resync can rebuild or update trades in a selected date range.
- Each trade can be traced back to raw exchange records.

## Phase 6: Trade List and Trade Detail

Goal: make synced trades reviewable and filterable.

### Scope

- Build trade list page.
- Add filters for date range, collection, symbol, exchange, market type, side, status, strategy, tags, and grade.
- Use a table on desktop and cards on mobile.
- Build trade detail page with tabs or accordions:
  - Overview
  - Orders
  - Journal
  - Screenshots
  - Sync Info

### Deliverables

- Trade list UI.
- Trade detail UI.
- Mobile card layout.

### Acceptance Criteria

- Mobile trade cards show symbol, side, P&L, entry time, strategy, status, and grade.
- Detail page prioritizes the journal trade summary: capital used, reason, entry/exit context, gross result, fees/funding, final net win/loss, and journal notes.
- Order, fill, position, and sync metadata remain available as supporting drill-down, not the main review surface.
- Filters persist in the URL or a predictable local state.

## Phase 7: Journal Enrichment and Suggestions

Goal: let users add manual journal context to synced trades efficiently.

### Scope

- Add journal fields:
  - Strategy
  - Setup
  - Notes
  - Mistake tags
  - Emotion
  - Review
  - Trade grade
- Add screenshot upload and caption management.
- Build user-scoped historical suggestions.
- Maintain a suggestion index on journal save.
- Add suggestion API with ranking by starts-with, contains, recency, and frequency.
- Optimize mobile input UX with tappable chips and large controls.

### Data Model

- `trade_journals`
- `trade_mistake_tags`
- `trade_screenshots`
- `user_suggestion_values`

### Deliverables

- Journal editor on trade detail page.
- Screenshot upload flow.
- Suggestion API and reusable suggestion input components.

### Acceptance Criteria

- Suggestions are scoped to the current user only.
- Saving journal data updates the suggestion index.
- Mistake tags support multi-select and creating new tags.
- Long text fields offer snippets without aggressively replacing user text.
- Journal save is comfortable on mobile, with a sticky save action.

## Phase 8: Dashboard and Analytics

Goal: provide useful performance review metrics for MVP.

### Scope

- Create dashboard metric queries.
- Add filters for date range, collection, symbol, exchange, market type, side, strategy, and tags.
- Show MVP metrics:
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
- Make charts responsive.

### Deliverables

- Dashboard page.
- Reusable analytics query layer.
- Responsive metric cards and charts.

### Acceptance Criteria

- Metrics match the filtered trade set.
- Empty states are clear when no trades exist.
- Charts are readable on mobile.
- Dashboard excludes archived trades unless explicitly requested.

## Phase 9: Force Resync and Recovery Tools

Goal: give users a safe path to correct sync issues.

### Scope

- Add force resync by date range.
- Ignore cursor for force resync.
- Re-fetch raw data and upsert records.
- Rebuild normalized trades where required.
- Log force resync separately.
- Add guardrails and confirmation UI.

### Deliverables

- Force resync form.
- Recovery sync service.
- Sync log details for force resync.

### Acceptance Criteria

- Force resync can target a collection and date range.
- Force resync does not delete user journal fields unless explicitly designed and confirmed.
- Rebuilt trades preserve journal data where matching is possible.
- Failures are logged with actionable errors.

## Phase 10: MVP Hardening and Release

Goal: make the MVP reliable enough for personal and friend usage.

### Scope

- Security review for secrets, authorization, and user-scoped data.
- Mobile QA across primary flows.
- Error handling and loading states.
- Empty states for new accounts.
- Database indexes for common filters and sync upserts.
- Backup and restore notes for self-hosting.
- Basic deployment documentation.

### Deliverables

- MVP release checklist.
- Deployment guide.
- Security checklist.
- Seed/demo data for local review.

### Acceptance Criteria

- All MVP flows work on a phone-sized viewport.
- All data-access paths enforce user ownership.
- Exchange secrets are encrypted and excluded from logs.
- A new user can connect BingX, configure a trading collection, sync trades, add journal notes, upload screenshots, and review dashboard metrics.

## Cross-Cutting Workstreams

### Engineering Discipline

- Define verification criteria before substantial implementation work.
- Keep changes surgical and tied to the current requirement.
- Prefer simple, direct code until duplication or complexity proves an abstraction is needed.
- Surface assumptions when product behavior is ambiguous.
- Follow `ENGINEERING_GUIDELINES.md` during implementation.

### Security

- Encrypt exchange credentials at rest.
- Keep secrets out of client responses, logs, sync errors, and analytics.
- Validate read-only API key expectations in UI copy and connection docs.
- Add per-user authorization tests for high-risk endpoints.

### Data Integrity

- Use database constraints for ownership, uniqueness, and sync idempotency.
- Store raw payloads for all exchange records used to build trades.
- Keep cursor updates transactional with successful sync completion.
- Preserve journal fields across trade rebuilds when records can be matched.

### Mobile UX

- Use bottom navigation or compact sidebar on small screens.
- Prefer cards over wide tables.
- Keep tap targets large.
- Make date ranges, filters, suggestions, and uploads touch-friendly.
- Add sticky actions where users edit long journal forms.

### Testing

- Unit test initial sync range resolution, symbol filters, suggestion ranking, and settlement logic.
- Integration test user isolation, exchange connection CRUD, collection validation, sync logs, and force resync.
- Add focused E2E tests for registration, connection setup, collection sync setup, trade review, and dashboard filtering.

## Suggested MVP Milestones

1. Foundation and auth complete.
2. BingX connection can be saved and tested securely.
3. Collections and sync sources can be configured.
4. Manual BingX sync stores raw records and logs results.
5. Raw data creates normalized trades idempotently.
6. Trades can be filtered, reviewed, journaled, and annotated with screenshots.
7. Suggestions improve repeated journal entry.
8. Dashboard summarizes filtered performance.
9. Force resync supports recovery.
10. Mobile, security, and deployment hardening complete.

## Out of Scope for MVP

- Manual trade/order creation from scratch.
- Scheduled background sync.
- Exchanges beyond BingX.
- AI weekly review or AI trade review.
- Strategy library and playbook templates.
- Public strategy sharing or community features.
- CSV import/export.
- PWA install support.

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| BingX API response shape differs by market type | Trade grouping may be inaccurate | Preserve raw payloads, start with one market type if needed, add fixture-based tests |
| Trade grouping rules are ambiguous | P&L and status may be wrong | Keep raw-to-trade links and make rebuilds possible |
| Cursor bugs skip records | Missing trades | Use 6-hour overlap, upserts, sync logs, and force resync |
| User isolation bug | Serious privacy/security issue | Centralize ownership checks and test direct access attempts |
| Secret leakage | Severe security issue | Encrypt at rest, never return secrets, redact logs |
| Mobile forms become cumbersome | Journal usage drops | Use chips, sticky save, compact tabs/accordions, and large touch targets |

## Immediate Next Steps

1. Initialize the Next.js, Prisma, Tailwind, and Auth.js project foundation.
2. Draft the first Prisma schema around users, profiles, exchange connections, collections, and sync sources.
3. Build the responsive shell and protected route structure.
4. Implement authentication and user settings before any exchange data work.
5. Add BingX exchange connection storage, encryption, and connection testing.
