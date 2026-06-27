# Deployment Guide: Ubuntu 24.04, CloudPanel 2.5.3, MariaDB, Nginx

This guide deploys Trading Journal as a production Next.js app on an existing Ubuntu 24.04 server with CloudPanel 2.5.3, MariaDB/MySQL, Nginx, and PM2.

CloudPanel manages Nginx, SSL, site users, and the local database. The app runs as a Node.js process behind the CloudPanel-created Nginx site.

## Assumptions

- Server OS: Ubuntu 24.04 LTS.
- Control panel: CloudPanel 2.5.3.
- Database engine: MariaDB, installed by CloudPanel.
- Web server: Nginx, managed by CloudPanel.
- CloudPanel is already installed and reachable.
- Domain example: `journal.example.com`.
- Site user example: `tradingjournal`.
- App directory example: `/home/tradingjournal/htdocs/journal.example.com`.
- App port example: `3300`.
- Node.js: use a CloudPanel-supported Node.js version compatible with Next.js 16.2.9. Node 22 LTS is a conservative production choice.

Replace the examples with your real domain, site user, database name, database user, and passwords.

## Reference Sources

- CloudPanel Node.js site creation: https://www.cloudpanel.io/docs/v2/frontend-area/add-site/
- CloudPanel Vhost editor and Nginx reverse proxy support: https://www.cloudpanel.io/docs/v2/frontend-area/vhost/
- CloudPanel database management and backups: https://www.cloudpanel.io/docs/v2/frontend-area/databases/
- CloudPanel Node.js deployment with PM2: https://www.cloudpanel.io/docs/v2/nodejs/deployment/pm2/

## 1. Create the CloudPanel Site

In CloudPanel:

1. Go to `Sites`.
2. Click `Add Site`.
3. Choose `Create a Node.js Site`.
4. Enter the domain, for example `journal.example.com`.
5. Select the Node.js version.
6. Set the app port to `3300`.
7. Create or note the site user, for example `tradingjournal`.

CloudPanel will create the site home under:

```text
/home/tradingjournal
```

The project files should live in:

```text
/home/tradingjournal/htdocs/journal.example.com
```

CloudPanel will route HTTPS traffic through Nginx to the app port.

## 2. Create the Database

In CloudPanel:

1. Open the site.
2. Go to `Databases`.
3. Add a database, for example:
   - Database name: `trading_journal`
   - Database user: `trading_journal_user`
   - Password: generate a strong password
4. Save the database credentials.

Recommended: create a separate shadow database for Prisma migrations:

- Database name: `trading_journal_shadow`
- User: same database user, with permission for the shadow database

Prisma uses the shadow database during `prisma migrate dev`. Production deployments usually run `prisma migrate deploy`, which does not need the shadow database, but keeping `SHADOW_DATABASE_URL` available is useful for controlled maintenance.

## 3. Upload or Clone the App

SSH into the server as the site user:

```bash
ssh tradingjournal@YOUR_SERVER_IP
cd ~
```

Do not run `git clone YOUR_REPOSITORY_URL .` directly inside the CloudPanel site directory. CloudPanel may already place files there, especially `.well-known` for Let's Encrypt/ACME validation, and Git will refuse to clone into a non-empty directory.

Recommended: clone into a temporary directory, move the app files into the CloudPanel web root, preserve `.well-known`, then remove the temporary directory.

```bash
git clone YOUR_REPOSITORY_URL ~/trading-journal-temp
cd ~/trading-journal-temp
find . -mindepth 1 -maxdepth 1 ! -name '.well-known' -exec mv -t ~/htdocs/journal.example.com/ {} +
cd ~
rmdir ~/trading-journal-temp
```

Then enter the app directory:

```bash
cd ~/htdocs/journal.example.com
```

This moves the cloned Git working copy into `htdocs`, so later deployments can use normal `git pull` from the site directory.

## 4. Configure Environment Variables

Create `.env` in the project root:

```bash
nano .env
```

Use this template:

```env
DATABASE_URL="mysql://trading_journal_user:REPLACE_PASSWORD@127.0.0.1:3306/trading_journal"
SHADOW_DATABASE_URL="mysql://trading_journal_user:REPLACE_PASSWORD@127.0.0.1:3306/trading_journal_shadow"
AUTH_SECRET="REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS"
AUTH_URL="https://journal.example.com"
ENCRYPTION_KEY="REPLACE_WITH_32_BYTE_HEX_KEY"
SCREENSHOT_STORAGE_DIR="./uploads/screenshots"
```

Generate secrets on the server:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the Base64 output for `AUTH_SECRET`. Use the hex output for `ENCRYPTION_KEY`.

Important:

- Do not commit `.env`.
- Use the public HTTPS URL for `AUTH_URL`, not localhost.
- Keep `DATABASE_URL` on `127.0.0.1:3306` unless your CloudPanel database runs elsewhere.

## 5. Install Dependencies and Build

Install dependencies:

```bash
npm ci
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Apply existing migrations to the production database:

```bash
npx prisma migrate deploy
```

Build the Next.js app:

```bash
npm run build
```

Do not run `npm run dev` in production.

## 6. Start the App with PM2

Install PM2 for the site user:

```bash
npm install pm2@latest -g
```

Start the app on the CloudPanel app port:

```bash
PORT=3300 pm2 start npm --name trading-journal -- start
pm2 save
```

Check status:

```bash
pm2 status
pm2 logs trading-journal
```

To restart after changes:

```bash
pm2 restart trading-journal
```

To stop:

```bash
pm2 stop trading-journal
```

## 7. Restore PM2 After Reboot

Run PM2's startup helper as the CloudPanel site user:

```bash
pm2 startup
```

PM2 will print a command that starts with `sudo env PATH=... pm2 startup ...`. Copy and run that exact command.

It will look similar to this:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tradingjournal --hp /home/tradingjournal
```

Then save the current process list:

```bash
pm2 save
```

Reboot and verify:

```bash
pm2 status
```

## 8. Nginx and CloudPanel Vhost

For a CloudPanel Node.js site, CloudPanel should already create the Nginx reverse proxy to the configured app port.

Check in CloudPanel:

1. Open the site.
2. Go to `Vhost`.
3. Confirm the app proxies to `127.0.0.1:3300` or the configured app port.
4. Save only after CloudPanel validates the Vhost syntax.

If you need a manual reverse proxy block, use the CloudPanel Vhost editor and adapt this shape:

```nginx
location / {
  proxy_pass http://127.0.0.1:3300;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Prefer CloudPanel's generated Node.js Vhost when possible.

## 9. SSL and DNS

Before issuing SSL:

1. Point DNS `A` record for `journal.example.com` to the server IP.
2. Confirm the site answers on HTTP.
3. In CloudPanel, issue a Let's Encrypt certificate for the domain.

CloudPanel redirects HTTP to HTTPS by default for newly created sites.

## 10. Deployment Update Procedure

For later deployments:

```bash
ssh tradingjournal@YOUR_SERVER_IP
cd ~/htdocs/journal.example.com
git pull
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 restart trading-journal
pm2 status
```

If package dependencies did not change, `npm ci` is still safe and reproducible. It may take longer but avoids dependency drift.

## 11. Health Checks

Check app response:

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

Check PM2 logs:

```bash
pm2 logs trading-journal --lines 100
```

Check Nginx/site logs in CloudPanel's site log UI if the app is not reached.

## 12. Troubleshooting

### 502 Bad Gateway

Usually means Nginx cannot reach the Node.js process.

Check:

```bash
pm2 status
pm2 logs trading-journal
ss -ltnp | grep 3300
```

Restart:

```bash
PORT=3300 pm2 restart trading-journal --update-env
```

### Auth redirects to localhost

Check `.env`:

```env
AUTH_URL="https://journal.example.com"
```

Then restart:

```bash
pm2 restart trading-journal --update-env
```

### Prisma cannot connect

Verify:

```bash
npx prisma migrate status
```

Check database credentials in CloudPanel and confirm `DATABASE_URL` uses the correct database name, user, password, host, and port.

### Migration fails in production

Use:

```bash
npx prisma migrate deploy
```

Do not use `npm run prisma:migrate` or `prisma migrate dev` for routine production deployment. `migrate dev` is for development and may require a shadow database.

### Screenshots do not save

Create and permission the upload directory:

```bash
mkdir -p uploads/screenshots
chmod 750 uploads uploads/screenshots
```

Ensure the app runs as the CloudPanel site user that owns the project files.

## 13. Production Checklist

- CloudPanel 2.5.3 is already installed on Ubuntu 24.04 with MariaDB and Nginx.
- Node.js site created with app port `3300`.
- Domain DNS points to server.
- SSL certificate issued in CloudPanel.
- Database and optional shadow database created.
- `.env` created with production `AUTH_URL`.
- `npm ci` completed.
- `npm run prisma:generate` completed.
- `npx prisma migrate deploy` completed.
- `npm run build` completed.
- PM2 process `trading-journal` is online.
- `pm2 save` completed.
- `pm2 startup` configured for reboot restore.
- `/login` returns HTTP 200.
- `/dashboard` redirects to `/login` when logged out.
