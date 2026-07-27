# Deploying to Railway

The repo is already prepared for Railway:

- `npm run build` runs `prisma generate` then `next build`.
- On deploy, `railway.json` runs `prisma migrate deploy` before `next start`, so the
  database schema is applied automatically.
- `next start` binds to Railway's injected `$PORT`.
- Auth.js is configured with `trustHost: true` for the Railway proxy.

You need a Railway account (https://railway.com). The steps below can't be run for
you — they require your login. Recommended path is the **Railway CLI** (no GitHub
needed).

---

## 1. Install & log in

```bash
npm i -g @railway/cli
railway login
```

## 2. Create the project + Postgres

From the project directory (`hoichoi-finance-app`):

```bash
railway init            # give the project a name, e.g. hoichoi-finance
railway add --database postgres
```

This provisions a managed PostgreSQL service named **Postgres**.

## 3. Set the app service's environment variables

Do this in the Railway dashboard (Project → your app service → **Variables**), or via
CLI. Set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Reference the DB: `${{Postgres.DATABASE_URL}}` |
| `NEXTAUTH_SECRET` | A strong random string — generate with `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` | e.g. `admin@hoichoi.tv` |
| `SEED_ADMIN_PASSWORD` | a strong password (change from the local default) |
| `NEXTAUTH_URL` | your app's public URL (set after step 5), e.g. `https://<app>.up.railway.app` |

> `DATABASE_URL` **must** be set before the first deploy, or `prisma migrate deploy`
> in the start command will fail. Using the `${{Postgres.DATABASE_URL}}` reference in
> the dashboard is the most reliable way.

CLI equivalent (run after `railway init`):

```bash
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway variables --set "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
railway variables --set "SEED_ADMIN_EMAIL=admin@hoichoi.tv"
railway variables --set "SEED_ADMIN_PASSWORD=<choose-a-strong-password>"
```

## 4. Deploy

```bash
railway up
```

Railway builds with Nixpacks (`npm ci` → `npm run build`) and starts with
`prisma migrate deploy && npm run start`. Watch the build/deploy logs in the CLI or
dashboard.

## 5. Give it a public domain

```bash
railway domain
```

(or dashboard → service → **Settings → Networking → Generate Domain**). Copy the URL,
set `NEXTAUTH_URL` to it (step 3), and redeploy if you changed it:

```bash
railway up
```

## 6. Seed the first admin user (one-time)

`prisma migrate deploy` created the tables but not the admin login. Seed it against the
database's **public** URL (from Railway → Postgres service → **Variables** →
`DATABASE_PUBLIC_URL`):

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" npm run db:seed
```

This runs locally (uses the project's `tsx`) and connects to the Railway DB over its
public proxy. It's idempotent (upserts), so it's safe to re-run.

You can now log in at your Railway URL with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## Alternative: deploy from GitHub

1. Create a new GitHub repo and push:
   ```bash
   git remote add origin git@github.com:<you>/hoichoi-finance-app.git
   git push -u origin main
   ```
2. In Railway: **New Project → Deploy from GitHub repo**, pick the repo.
3. **New → Database → PostgreSQL** in the same project.
4. Set the same variables as step 3 above on the app service.
5. Railway auto-deploys on every push. Seed as in step 6.

---

## Troubleshooting

- **Deploy crashes on `prisma migrate deploy`** — `DATABASE_URL` isn't set/reachable.
  Confirm the reference variable resolves (dashboard shows the expanded value).
- **Auth errors / redirect loops** — ensure `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL`
  matches the actual domain.
- **Seed can't connect** — you must use `DATABASE_PUBLIC_URL` (not the internal
  `postgres.railway.internal` URL) when seeding from your machine. If you hit a TLS
  error, append `?sslmode=require` to the URL.
- **Change the local dev port** back is unaffected — `npm run dev` still uses 3001.
