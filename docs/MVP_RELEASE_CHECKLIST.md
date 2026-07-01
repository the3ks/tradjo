# MVP Release Checklist

Last updated: 2026-07-01

Use this checklist before treating the Trading Journal MVP as ready for personal or friend usage.

## 1. Environment

- `.env` exists on the target host and is not committed.
- `DATABASE_URL` points to the intended MariaDB database.
- `SHADOW_DATABASE_URL` is configured for migration development when needed.
- `AUTH_SECRET` is set to a strong random value.
- `AUTH_URL` matches the deployed app URL.
- `ENCRYPTION_KEY` is set and backed up securely.
- `SCREENSHOT_STORAGE_DIR` points to a writable app-server directory outside public web roots.
- Node.js, npm, Prisma, and PM2 versions match the installation guide expectations.

## 2. Database

- `npm run prisma:migrate` has been run against the target database.
- `npm run prisma:generate` has been run after pulling schema changes.
- The application database user has only the privileges needed for runtime.
- A database backup/restore process exists before real user data is added.

## 3. Security

- Registration, login, logout, and Remember me work.
- Logged-out users are redirected away from protected routes.
- Direct URLs for another user's trades, collections, screenshots, exchanges, sync logs, suggestions, and AI credentials are rejected.
- Exchange API secrets are encrypted and never shown after save.
- AI extraction API keys are encrypted and never shown after save.
- Exchange connection test errors do not expose secrets.
- Screenshot URLs require authentication and return only the owning user's files.
- Missing screenshot files return 404 instead of a server error.
- Server logs do not print API keys, exchange secrets, AI keys, or raw credentials.

## 4. Core Manual Flow

1. Register a new account.
2. Log in with Remember me checked.
3. Log out and log in with Remember me unchecked.
4. Set timezone and base currency in Settings.
5. Add a BingX exchange connection.
6. Test the BingX connection.
7. Create a folder collection.
8. Create a trading collection under the folder.
9. Configure a sync source for the trading collection.
10. Pin and unpin the trading collection.
11. Open the collection from desktop sidebar pinned shortcuts.
12. Open the collection from the mobile drawer.
13. Run normal Sync trades.
14. Run Force resync for a narrow date range.
15. Confirm sync logs show `INITIAL`, `INCREMENTAL`, or `FORCE_RESYNC` as appropriate.
16. Open the dedicated collection page and confirm only that collection's trades are shown.
17. Open `/trades` and confirm advanced filters still work.
18. Open a trade detail page.
19. Save strategy, setup, entry trigger, exit reason, notes, emotion, review, grade, and mistake tags.
20. Upload a screenshot and edit its caption.
21. Confirm suggestions appear for repeated journal values.
22. Confirm dashboard metrics update from normalized trades.

## 5. Import Flow

- Add Gemini or OpenAI key in Settings.
- Open `/trades/import-screenshot`.
- Upload a BingX Standard Futures screenshot.
- Review extracted JSON before saving.
- Paste BingX table text and parse it.
- Save imported trades into a trading collection.
- Open a collection detail page and use its scoped screenshot/table/JSON importer.
- Confirm existing open trade matches are shown before saving a closed import.

## 6. Mobile QA

- Test on a real Android phone browser.
- Test app installed as a PWA if installability is enabled.
- Confirm bottom navigation is usable.
- Confirm the mobile collection drawer opens below the header.
- Confirm pinned collections and the collection tree are tappable.
- Confirm date inputs open reliably.
- Confirm journal forms do not overflow horizontally.
- Confirm screenshot upload works from phone gallery.
- Confirm trade rows, sync forms, and dashboard cards remain readable.

## 7. Deployment

- Follow `docs/INSTALLATION_UBUNTU_CLOUDPANEL.md` for Ubuntu 24.04 + CloudPanel + MariaDB + Nginx.
- Clone to a temporary directory, then move files into the CloudPanel site directory.
- Preserve CloudPanel-managed `.well-known`.
- Run `npm ci`.
- Run `npm run build`.
- Start with PM2.
- Run `pm2 startup`.
- Run `pm2 save`.
- Confirm Nginx proxy points to the app port.
- Confirm HTTPS works.
- Confirm `/manifest.webmanifest` loads.

## 8. Verification Commands

```bash
npm run lint
npm run test
npm run build
```

Known acceptable warning:

- Turbopack may report an NFT tracing warning for `src/lib/screenshot-storage.ts` because screenshot storage uses server filesystem operations.

## 9. Release Decision

Do not mark MVP ready until:

- Core manual flow passes on desktop and real mobile.
- Security checklist has no known high-risk gaps.
- Database backup/restore is documented.
- Deployment survives a reboot through PM2 startup restore.
