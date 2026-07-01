# Deployment Guide: Vercel + TiDB Cloud

This guide deploys Trading Journal on Vercel with TiDB Cloud as the MySQL-compatible production database.

The app is a root-level Next.js project using Prisma. The current Prisma datasource is already MySQL-compatible, so TiDB Cloud can be used without migrating the schema to Postgres.

## Assumptions

- Hosting: Vercel Hobby or higher.
- Database: TiDB Cloud Starter or TiDB Cloud Essential.
- Repository root is the Next.js app root.
- Package manager: npm.
- Framework preset: Next.js.
- Production branch example: `main`.
- Production domain example: `journal.example.com`.
- Node.js version: use a Vercel runtime compatible with Next.js 16.2.9. Node 22 LTS is a conservative choice when available.

Replace examples with your real repository, domain, database, and secrets.

## Reference Sources

- Vercel Next.js deployments: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- TiDB Cloud Vercel integration: https://docs.pingcap.com/tidbcloud/integrate-tidbcloud-with-vercel/
- TiDB Cloud Starter or Essential connection methods: https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/
- TiDB developer connection guide: https://docs.pingcap.com/developer/dev-guide-connect-to-tidb/
- Prisma production migrations: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate

## 1. Confirm What Works on Vercel

Works on Vercel:

- Next.js pages, route handlers, and server actions.
- Prisma access to TiDB Cloud through `DATABASE_URL`.
- BingX sync and trade persistence.
- Screenshot-based trade extraction, because the uploaded image is read in memory, sent to Gemini or OpenAI, and discarded after extracted trade data is saved.

Requires a later storage change:

- Persistent screenshot attachments on trade detail pages. The current implementation writes attached screenshots to local disk through `SCREENSHOT_STORAGE_DIR`. Vercel's filesystem is not durable app storage.

Recommended first deployment:

- Deploy app + TiDB Cloud.
- Keep screenshot extraction enabled.
- Do not rely on persistent screenshot attachments until they are moved to Vercel Blob, S3, Cloudflare R2, or another object store.

## 2. Create the TiDB Cloud Database

In TiDB Cloud:

1. Create or sign in to a TiDB Cloud account.
2. Create a TiDB Cloud Starter or TiDB Cloud Essential instance.
3. Create a database, for example `trading_journal`.
4. Save the generated connection details.

TiDB Cloud Starter and Essential support direct MySQL-compatible connections for SQL/ORM clients. They require TLS connections, so the Prisma connection URL should include TiDB's SSL setting.

Manual Prisma URL shape:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE?sslaccept=strict"
```

Important:

- Keep `provider = "mysql"` in `prisma/schema.prisma`.
- Do not use a local `localhost` database on Vercel.
- URL-encode the database password if it contains special characters.
- Use a separate TiDB database or branch for previews if you do not want preview deployments touching production data.

## 3. Import the Project into Vercel

In Vercel:

1. Go to `Add New` -> `Project`.
2. Import the Git repository.
3. Select the Next.js framework preset.
4. Keep `Root Directory` as the repository root.
5. Set the production branch, for example `main`.

Recommended build settings:

```text
Install Command: npm ci
Build Command: npx prisma generate && next build
Output Directory: .next
Development Command: next dev
```

The explicit `prisma generate` step ensures Prisma Client is generated before Next.js compiles server code.

## 4. Connect TiDB Cloud to Vercel

Use one of these approaches.

### Option A: TiDB Cloud Vercel Integration

This is the preferred path for TiDB Cloud Starter or Essential.

1. Open the TiDB Cloud integration in Vercel Marketplace.
2. Add the integration to the target Vercel project.
3. In the TiDB Cloud integration flow, select:
   - Connection type: `Cluster`
   - Framework: `Prisma` if available, otherwise `General`
   - Target TiDB Cloud instance
   - Target database, for example `trading_journal`
4. Return to Vercel and verify that `DATABASE_URL` was added under project environment variables.

For Prisma projects, the TiDB integration can add `DATABASE_URL` automatically.

### Option B: Manual Environment Variable

If you do not use the integration, add the URL manually in Vercel:

`Project` -> `Settings` -> `Environment Variables`

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/trading_journal?sslaccept=strict"
```

Set it for `Production`. Use separate values for `Preview` and `Development` if needed.

## 5. Configure App Environment Variables

Add these variables in Vercel:

`Project` -> `Settings` -> `Environment Variables`

Production values:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/trading_journal?sslaccept=strict"
AUTH_SECRET="REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
AUTH_URL="https://journal.example.com"
ENCRYPTION_KEY="REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
BINGX_BASE_URL="https://open-api.bingx.com"
SCREENSHOT_STORAGE_DIR="/tmp/trading-journal-screenshots"
```

Generate strong secrets locally:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use one generated value for `AUTH_SECRET` and a different generated value for `ENCRYPTION_KEY`.

Important:

- `AUTH_URL` must be the public HTTPS URL of the deployment.
- For the first Vercel-generated URL, you can set `AUTH_URL` to that generated HTTPS URL, then replace it after adding a custom domain.
- `SCREENSHOT_STORAGE_DIR` may point to `/tmp`, but that only supports temporary files. It does not make screenshot attachments persistent.
- AI extraction keys for Gemini/OpenAI are stored by users inside the app settings, not as Vercel environment variables.
- Do not copy `.env` into Git.
- Do not reuse development secrets in production.

## 6. Apply Database Migrations

Do not rely on Vercel's app build to run production migrations. Run migrations as an explicit deployment step from a trusted machine or CI job:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

Run this with `DATABASE_URL` pointing to the TiDB Cloud production database.

For macOS/Linux:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/trading_journal?sslaccept=strict" npx prisma migrate deploy
```

For Windows PowerShell:

```powershell
$env:DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/trading_journal?sslaccept=strict"
npx prisma migrate deploy
```

Notes:

- Use `prisma migrate deploy` for production.
- Do not use `npm run prisma:migrate` in production because it runs `prisma migrate dev`.
- `SHADOW_DATABASE_URL` is for development migrations. Production `migrate deploy` does not need a shadow database.
- If local Windows migration commands fail with a Prisma DLL rename `EPERM`, stop the local Next.js dev server first, then retry.

## 7. Deploy

After environment variables are configured and migrations are applied:

1. Trigger the Vercel deployment from the dashboard, or push to the production branch.
2. Wait for the build to complete.
3. Open the generated Vercel URL.

Check:

```text
/login
/register
/dashboard
/trades/import-screenshot
```

Expected behavior:

- `/login` renders the login page.
- `/register` renders the registration page.
- `/dashboard` redirects to `/login` when logged out.
- `/trades/import-screenshot` loads after login and can extract screenshots when a Gemini or OpenAI key is configured in Settings.

## 8. Configure a Custom Domain

In Vercel:

1. Open the project.
2. Go to `Settings` -> `Domains`.
3. Add `journal.example.com`.
4. Follow Vercel's DNS instructions.
5. Wait for SSL issuance.

After the domain is active:

1. Set `AUTH_URL` to `https://journal.example.com`.
2. Redeploy the project so the runtime picks up the new value.

## 9. Screenshot Behavior on Vercel

There are two screenshot flows in this app.

### Screenshot Import for Trade Extraction

This flow is compatible with Vercel:

1. User uploads a screenshot.
2. The server action reads it in memory.
3. The image is sent to Gemini or OpenAI for extraction.
4. The app saves extracted trade data into TiDB.
5. The original screenshot is discarded.

No persistent file storage is required for this flow.

### Screenshot Attachment on Trade Detail Pages

This flow is not durable on Vercel yet:

1. User attaches a screenshot to a trade.
2. The app writes the file to `SCREENSHOT_STORAGE_DIR`.
3. The database stores a local file path.

On Vercel, local files can disappear and are not shared reliably across deployments or function instances.

Production options:

- Move attachments to Vercel Blob.
- Move attachments to S3 or an S3-compatible object store.
- Move attachments to Cloudflare R2.
- Hide or disable persistent screenshot attachment UI until object storage is implemented.

## 10. Deployment Update Procedure

For normal app updates:

```bash
git push origin main
```

For updates that include Prisma migrations:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
git push origin main
```

If you prefer migrations to run after the code is merged, run `npx prisma migrate deploy` from CI before triggering or promoting the Vercel production deployment.

## 11. Health Checks

Check the public app:

```bash
curl -I https://journal.example.com/login
```

Expected:

```text
HTTP/2 200
```

Check protected route redirect:

```bash
curl -I https://journal.example.com/dashboard
```

Expected when logged out:

```text
HTTP/2 307
location: /login
```

Check database migration status:

```bash
npx prisma migrate status
```

Run that command with production `DATABASE_URL` set.

## 12. Troubleshooting

### Build Fails Because Prisma Client Is Missing

Confirm the Vercel build command is:

```text
npx prisma generate && next build
```

Then redeploy.

### App Cannot Connect to TiDB

Check:

- `DATABASE_URL` is present in Vercel production environment variables.
- The URL uses `mysql://`, not `postgres://`.
- The URL includes `?sslaccept=strict`.
- The database password is URL-encoded if it contains special characters.
- The selected TiDB database exists.
- The Vercel deployment was redeployed after changing environment variables.

### Auth Redirects to the Wrong URL

Check:

```env
AUTH_URL="https://journal.example.com"
```

Then redeploy.

### Migrations Fail

Use:

```bash
npx prisma migrate deploy
```

Do not use `npm run prisma:migrate` in production because it runs `prisma migrate dev`.

### Screenshot Extraction Fails

Check:

- The user has added a Gemini or OpenAI API key in Settings.
- The screenshot is JPG, PNG, or WebP.
- The screenshot is 5MB or smaller.
- The Vercel function has outbound access to the AI provider.

### Uploaded Screenshot Attachments Disappear

This is expected with local filesystem storage on Vercel. Move persistent attachments to Vercel Blob, S3, Cloudflare R2, or another object store.

## 13. Production Checklist

- TiDB Cloud Starter or Essential instance is created.
- TiDB database, for example `trading_journal`, is created.
- Vercel project imports the repository root.
- Framework preset is Next.js.
- Install command is `npm ci`.
- Build command is `npx prisma generate && next build`.
- `DATABASE_URL` points to TiDB Cloud and includes `?sslaccept=strict`.
- `AUTH_SECRET` is set.
- `AUTH_URL` uses the production HTTPS domain.
- `ENCRYPTION_KEY` is set and different from `AUTH_SECRET`.
- `BINGX_BASE_URL` is set to `https://open-api.bingx.com`.
- Production migrations have run with `npx prisma migrate deploy`.
- Custom domain is configured in Vercel.
- `/login` returns HTTP 200.
- `/dashboard` redirects to `/login` when logged out.
- Screenshot extraction has been tested with a user-provided Gemini or OpenAI key.
- Persistent screenshot attachment storage is disabled, accepted as temporary, or moved to object storage.
