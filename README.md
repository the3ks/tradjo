# Trading Journal

A multi-user, mobile-friendly trading journal for synced exchange trades. The MVP starts with BingX, manual sync, raw exchange data preservation, normalized journal trades, and performance review.

## Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Auth.js with Prisma-backed users
- MariaDB and Prisma
- TanStack Query and TanStack Table
- React Hook Form and Zod
- Recharts
- Vitest

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Update `.env`:

   ```text
   DATABASE_URL="mysql://root:password@localhost:3306/trading_journal"
   AUTH_SECRET="replace-with-at-least-32-random-characters"
   AUTH_URL="http://localhost:3300"
   ENCRYPTION_KEY="replace-with-32-byte-base64-key"
   BINGX_BASE_URL="https://open-api.bingx.com"
   SCREENSHOT_STORAGE_DIR="./uploads/screenshots"
   ```

4. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

5. Apply database migrations once migrations exist:

   ```bash
   npm run prisma:migrate
   ```

   For schema changes made during a phase, use a meaningful migration name:

   ```bash
   npx prisma migrate dev --name raw-sync-foundation
   ```

   Assistant-created migrations should always use an explicit kebab-case name instead of relying on Prisma's interactive prompt.

6. Start the development server:

   ```bash
   npm run dev
   ```

   To stop the default local dev port manually:

   ```bash
   npm run stop-dev
   ```

   To stop any local process by port:

   ```bash
   npm run stop-port -- 3300
   ```

## Phase 1 Scope

Phase 1 establishes the app foundation:

- Next.js project shell
- Tailwind design tokens
- Mobile and desktop app navigation
- Auth.js and Prisma user/profile models
- Email/password registration and login
- Protected app routes
- Profile settings for timezone and base currency
- Starter pages for Dashboard, Collections, Trades, Sync, and Settings
- Vitest foundation checks

## Current Phase Scope

The current implementation has moved into the raw sync foundation:

- Raw exchange storage models
- Exchange sync log model
- Manual collection sync entry point
- Sync log UI
- Cursor fetch-window helper with timezone-aware initial sync behavior

## Project Guidance

- Product and implementation roadmap: `ROADMAP.md`
- UI rules: `UI_DESIGN_GUIDELINES.md`
- Engineering rules: `ENGINEERING_GUIDELINES.md`
- Original requirements: `trading-journal-requirements.md`

## Verification

Run:

```bash
npm run test
npm run build
```

The build requires valid environment variables and a generated Prisma client.
