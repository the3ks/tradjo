# Deployment Guide: Vercel

This guide deploys Trading Journal as a production Next.js app on Vercel.

The app is a root-level Next.js project with Prisma and MySQL. Vercel will host the Next.js app, but the production database must be hosted separately.

## Assumptions

- Repository root is the Next.js app root.
- Package manager: npm.
- Framework preset: Next.js.
- Database engine: MySQL-compatible.
- Production branch example: `main`.
- Production domain example: `journal.example.com`.
- Node.js version: use Vercel's current LTS runtime that is compatible with Next.js 16.2.9. Node 22 LTS is a conservative choice when available.

Replace examples with your real repository, domain, database, and secrets.

## Reference Sources

- Vercel Next.js deployments: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/projects/environment-variables
- Vercel build settings: https://vercel.com/docs/projects/project-configuration
- Prisma production migrations: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate

## 1. Prepare a Production Database

Provision a MySQL-compatible database before importing the project into Vercel.

Common options:

- PlanetScale.
- Aiven for MySQL.
- Railway MySQL.
- DigitalOcean Managed MySQL.
- AWS RDS MySQL or Aurora MySQL.
- Any reachable MySQL server with TLS support.

Create a production database and a database user with permission to read, write, and alter the schema.

Save the connection string:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Important:

- Do not use a local `localhost` database on Vercel.
- Prefer a pooled or serverless-safe connection string if your database provider offers one.
- Keep the direct migration connection string available locally or in your CI system if your provider separates pooled and direct URLs.

## 2. Import the Project into Vercel

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

## 3. Configure Environment Variables

Add these variables in Vercel under:

`Project` -> `Settings` -> `Environment Variables`

Set them for `Production`. Add separate values for `Preview` and `Development` only if you want those deployments connected to separate databases.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
AUTH_SECRET="REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
AUTH_URL="https://journal.example.com"
ENCRYPTION_KEY="REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
BINGX_BASE_URL="https://open-api.bingx.com"
SCREENSHOT_STORAGE_DIR="/tmp/trading-journal-screenshots"
```

Generate strong values locally:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Use one generated value for `AUTH_SECRET` and a different generated value for `ENCRYPTION_KEY`.

Important:

- `AUTH_URL` must be the public HTTPS URL of the deployment.
- For a Vercel preview deployment, either omit `AUTH_URL` if auth works with Vercel's generated URL, or set a preview-specific URL.
- Do not copy `.env` into Git.
- Do not reuse development secrets in production.

## 4. Apply Database Migrations

Do not rely on Vercel's app build to run production migrations. Run migrations as an explicit deployment step from a trusted machine or CI job:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

Run this with `DATABASE_URL` pointing to the production database.

For a local machine:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE" npx prisma migrate deploy
```

On Windows PowerShell:

```powershell
$env:DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
npx prisma migrate deploy
```

Notes:

- Use `prisma migrate deploy` for production.
- Do not use `prisma migrate dev` for routine production deployment.
- `SHADOW_DATABASE_URL` is useful for development migrations, but production `migrate deploy` does not require a shadow database.

## 5. Deploy

After environment variables are configured and migrations are applied:

1. Trigger the Vercel deployment from the dashboard, or push to the production branch.
2. Wait for the build to complete.
3. Open the generated Vercel URL.

Check:

```text
/login
/register
/dashboard
```

Expected behavior:

- `/login` renders the login page.
- `/register` renders the registration page.
- `/dashboard` redirects to `/login` when logged out.

## 6. Configure a Custom Domain

In Vercel:

1. Open the project.
2. Go to `Settings` -> `Domains`.
3. Add `journal.example.com`.
4. Follow Vercel's DNS instructions.
5. Wait for SSL issuance.

After the domain is active:

1. Set `AUTH_URL` to `https://journal.example.com`.
2. Redeploy the project so the runtime picks up the new value.

## 7. Screenshot Storage Limitation

The current app stores uploaded trade screenshots on local disk through `SCREENSHOT_STORAGE_DIR`.

Vercel serverless storage is ephemeral. Files written to `/tmp` may disappear and are not shared reliably across deployments or function instances.

Production options:

- Use Vercel Blob.
- Use S3 or an S3-compatible object store.
- Use another persistent file storage service.
- Disable screenshot uploads until persistent object storage is implemented.

Treat local screenshot storage on Vercel as temporary only.

## 8. Deployment Update Procedure

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

## 9. Health Checks

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

## 10. Troubleshooting

### Build Fails Because Prisma Client Is Missing

Confirm the Vercel build command is:

```text
npx prisma generate && next build
```

Then redeploy.

### App Cannot Connect to the Database

Check:

- `DATABASE_URL` is present in Vercel production environment variables.
- The database host accepts connections from Vercel.
- The database password is URL-encoded if it contains special characters.
- The database provider's TLS or pooled connection requirements are reflected in the URL.

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

### Uploaded Screenshots Disappear

This is expected with local filesystem storage on Vercel. Move screenshot storage to Vercel Blob, S3, or another persistent object store.

## 11. Production Checklist

- Production MySQL-compatible database is created.
- `DATABASE_URL` points to the production database, not localhost.
- Vercel project imports the repository root.
- Framework preset is Next.js.
- Install command is `npm ci`.
- Build command is `npx prisma generate && next build`.
- `AUTH_SECRET` is set.
- `AUTH_URL` uses the production HTTPS domain.
- `ENCRYPTION_KEY` is set and different from `AUTH_SECRET`.
- `BINGX_BASE_URL` is set to `https://open-api.bingx.com`.
- Production migrations have run with `npx prisma migrate deploy`.
- Custom domain is configured in Vercel.
- `/login` returns HTTP 200.
- `/dashboard` redirects to `/login` when logged out.
- Screenshot storage limitation is accepted or persistent object storage has been implemented.
