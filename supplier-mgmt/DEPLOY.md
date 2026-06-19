# Deploy SHREE SAI EARTH MOVERS

This app needs **Node.js + MySQL**. A frontend-only host (static `dist` upload) is **not enough** — the API, auth cookies, file uploads, and PDF generation all run on the backend.

---

## Option A — Render (recommended, ~10 minutes)

No Docker on your PC required. Render builds from GitHub.

1. Push this repo to GitHub (branch with `render.yaml` at repo root).
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect `Vedant-1328/real-estate-management-project` and apply the blueprint.
4. When prompted, set **`FRONTEND_URL`** to your web service URL, e.g.  
   `https://shree-sai-earth-movers.onrender.com` (no trailing slash).
5. After the first deploy succeeds, open the **Shell** for the web service and run:
   ```bash
   npm run db:sync
   ```
6. Open the site URL and log in with `admin@supplier.com` / `Admin@123`, then **change the password**.

**Custom domain:** Render → your web service → Settings → Custom Domains → add domain → update DNS → set `FRONTEND_URL` to `https://yourdomain.com`.

**Important:** Save `ENCRYPTION_KEY` from Render env vars before any database restore. Without it, encrypted fields cannot be read.

---

## Option B — VPS / Hostinger VPS (Docker)

Requires Docker on the server.

```bash
git clone https://github.com/Vedant-1328/real-estate-management-project.git
cd real-estate-management-project/supplier-mgmt
cp backend/.env.production.example backend/.env
# Edit backend/.env — set FRONTEND_URL, JWT secrets, ENCRYPTION_KEY (64-char hex)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run db:sync
```

Put Nginx/Caddy in front for HTTPS and proxy port 3000.

---

## Option C — Manual (Node on Linux VPS)

```bash
cd supplier-mgmt
npm run install:all
cd frontend && echo "VITE_API_BASE_URL=/api" > .env.production && npm run build
cd ../backend
cp .env.production.example .env   # fill in values
npm run db:sync
NODE_ENV=production npm start
```

Use **PM2** to keep the process running: `pm2 start server.js --name supplier-api`.

---

## Production environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | Usually `3000` |
| `FRONTEND_URL` | yes | Public site URL (CORS), no trailing slash |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | yes | MySQL 8+ |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | 64+ random chars each |
| `ENCRYPTION_KEY` | yes | 64-char hex; **back up with DB dumps** |
| `FIELD_ENCRYPTION_ENABLED` | yes | `true` |
| `SUPPLIER_COMPANY_NAME` | optional | PDF header |

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## What does NOT work

| Approach | Why |
|----------|-----|
| Hostinger **static** / “Upload dist only” | No Node API or MySQL |
| Vercel / Netlify frontend only | Same — backend must run elsewhere |
| Split frontend + API on different domains without config | Refresh cookies need same-site or careful CORS/cookie setup |

---

## Health check

After deploy: `GET https://your-url/api/health` should return `"dbConnected": true`.
