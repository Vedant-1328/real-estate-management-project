# Deploy SHREE SAI EARTH MOVERS

This app needs **Node.js + MySQL**. A frontend-only host (static `dist` upload) is **not enough** — the API, auth cookies, file uploads, and PDF generation all run on the backend.

**Best setup:** one URL serves both the website and `/api` (same domain). The included `Dockerfile` does that automatically.

---

## Pick a platform

| Platform | Difficulty | Cost | MySQL included? | Best if… |
|----------|------------|------|-----------------|----------|
| [Railway](#option-a--railway) | Easy | ~$5/mo credit | Yes (add MySQL plugin) | You want GitHub deploy without Docker locally |
| [Render](#option-b--render) | Easy | Free tier available | Yes (Blueprint) | You want one-click Blueprint from repo |
| [Fly.io](#option-c--flyio) | Medium | Free allowance | No — use external DB | You want global edge + cheap app hosting |
| [Hostinger VPS](#option-d--hostinger-vps) | Medium | ~₹400+/mo | You install it | You already use Hostinger |
| [DigitalOcean](#option-e--digitalocean-droplet) | Medium | ~$6/mo | You install it | Simple Linux VPS |
| [Oracle Cloud Free](#option-f--oracle-cloud-free-tier) | Harder | Free | You install it | You want $0 hosting and can follow a long setup |

---

## Option A — Railway

1. Sign up at [railway.app](https://railway.app) (GitHub login).
2. **New Project → Deploy from GitHub repo** → select `real-estate-management-project`.
3. **Settings → Root Directory** → set to `supplier-mgmt`.
4. Railway detects `railway.toml` + `Dockerfile` and builds automatically.
5. **+ New → Database → MySQL** in the same project.
6. Click the **web service → Variables** and add:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `FRONTEND_URL` | Your Railway URL, e.g. `https://shree-sai-earth-movers-production.up.railway.app` |
   | `DB_HOST` | From MySQL service `${{MySQL.MYSQLHOST}}` or copy from MySQL variables |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
   | `DB_USER` | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASS` | `${{MySQL.MYSQLPASSWORD}}` |
   | `JWT_ACCESS_SECRET` | Long random string (64+ chars) |
   | `JWT_REFRESH_SECRET` | Different long random string |
   | `ENCRYPTION_KEY` | 64-char hex (see below) |
   | `FIELD_ENCRYPTION_ENABLED` | `true` |

7. **Settings → Networking → Generate Domain** for the web service.
8. Update `FRONTEND_URL` to match that domain (no trailing slash).
9. Open **web service → Shell** (or one-off command):
   ```bash
   npm run db:sync
   ```
10. Visit the URL → login `admin@supplier.com` / `Admin@123` → change password.

**CLI (optional):**
```bash
npm i -g @railway/cli
cd supplier-mgmt
railway login
railway init
railway add --database mysql
railway up
railway run npm run db:sync
```

---

## Option B — Render

1. [Render Dashboard](https://dashboard.render.com/) → **New → Blueprint**.
2. Connect repo `Vedant-1328/real-estate-management-project` (branch with `render.yaml`).
3. Set **`FRONTEND_URL`** and **`ENCRYPTION_KEY`** when prompted.
4. After deploy → **Shell** → `npm run db:sync`.

See `render.yaml` at repo root.

---

## Option C — Fly.io

Fly runs the app; you provide MySQL elsewhere (Railway MySQL, [Aiven free MySQL](https://aiven.io/free-mysql-database), or a VPS).

1. Install [flyctl](https://fly.io/docs/flyctl/install/).
2. From `supplier-mgmt`:
   ```bash
   fly auth login
   fly launch --no-deploy
   fly volumes create uploads_data --region bom --size 1
   ```
3. Set secrets:
   ```bash
   fly secrets set FRONTEND_URL=https://YOUR_APP.fly.dev
   fly secrets set DB_HOST=... DB_PORT=3306 DB_NAME=supplier_mgmt DB_USER=... DB_PASS=...
   fly secrets set JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=...
   fly secrets set ENCRYPTION_KEY=... FIELD_ENCRYPTION_ENABLED=true
   ```
4. Deploy and seed:
   ```bash
   fly deploy
   fly ssh console -C "npm run db:sync"
   ```

See `fly.toml` in this folder.

---

## Option D — Hostinger VPS

Hostinger **shared hosting** (file manager / upload `dist`) does **not** work. You need **VPS**.

1. Buy [Hostinger VPS](https://www.hostinger.in/vps-hosting) (Ubuntu 22.04).
2. SSH in, install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone and configure:
   ```bash
   git clone https://github.com/Vedant-1328/real-estate-management-project.git
   cd real-estate-management-project/supplier-mgmt
   cp backend/.env.production.example backend/.env
   nano backend/.env   # set FRONTEND_URL, secrets, ENCRYPTION_KEY
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml exec app npm run db:sync
   ```
4. Point your domain A-record to the VPS IP.
5. Install Caddy for free HTTPS:
   ```bash
   apt install -y caddy
   ```
   `/etc/caddy/Caddyfile`:
   ```
   yourdomain.com {
     reverse_proxy localhost:3000
   }
   ```
   Update `FRONTEND_URL=https://yourdomain.com` in `backend/.env` and restart the app container.

---

## Option E — DigitalOcean Droplet

Same as Hostinger VPS but on [DigitalOcean](https://www.digitalocean.com/pricing/droplets):

- Create Droplet (Ubuntu, 1 GB RAM minimum — Puppeteer/PDF needs memory).
- Follow **Option D** steps 2–5 using `docker-compose.prod.yml`.

DigitalOcean **App Platform** also works: create app from GitHub, set root `supplier-mgmt`, use Dockerfile, attach managed MySQL database, set env vars, run `db:sync` via console.

---

## Option F — Oracle Cloud Free Tier

Always-free ARM VM (4 OCPU / 24 GB RAM) — good for $0 production if you’re comfortable with Linux.

1. [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) → create VM (Ubuntu).
2. Open port 80/443 in security list + Ubuntu firewall.
3. Same Docker steps as Option D.

---

## Production environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | Usually `3000` (platform may override) |
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
| Vercel / Netlify frontend only | Backend must run elsewhere |
| GitHub Pages | Static only |

---

## Health check

After deploy: `GET https://your-url/api/health` should return `"dbConnected": true`.

---

## Need help?

Tell me which platform you picked (Railway, Hostinger VPS, Fly.io, etc.) and share:
- the public URL (if any), or
- where you’re stuck (build error, DB connection, login issue)

I can walk you through that platform step by step.
