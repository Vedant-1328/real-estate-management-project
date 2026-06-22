# Deploy without a credit card

Render and Railway often ask for payment info. These options do **not**.

---

## Option 1 — Fastest: your PC + Cloudflare Tunnel (5 minutes)

Your computer runs the app; Cloudflare gives you a free **https://....trycloudflare.com** link.

**Good for:** demos, small team use, testing production mode  
**Catch:** your PC must stay on; URL changes each time (unless you set up a free Cloudflare account + domain)

### Steps

1. Make sure **MySQL** is running and `backend/.env` is configured (same as local dev).
2. One-time DB setup (if not done):
   ```powershell
   cd supplier-mgmt/backend
   npm run db:sync
   ```
3. Install Cloudflare tunnel CLI:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
4. Run:
   ```powershell
   cd supplier-mgmt
   .\scripts\run-public.ps1
   ```
5. Copy the **https://....trycloudflare.com** URL from the terminal and open it in a browser.
6. Login: `admin@supplier.com` / `Admin@123`

---

## Option 2 — Cloud hosting: Koyeb + TiDB (no card)

**Koyeb** hosts the app (free, no credit card on Hobby plan).  
**TiDB Cloud** hosts MySQL (free, no credit card).

**Catch:** free tier is 512 MB RAM — PDF invoices may be slow or fail; upgrade later if needed.

### Part A — Free MySQL on TiDB Cloud

1. Go to [tidbcloud.com](https://tidbcloud.com) → sign up (no card).
2. Create a **Serverless** cluster (free tier).
3. Create database `supplier_mgmt` and a user with password.
4. Copy connection details: host, port, user, password.

### Part B — Deploy app on Koyeb

1. Go to [koyeb.com](https://www.koyeb.com) → sign up with GitHub (Hobby plan, no card).
2. **Create Web Service** → GitHub → your repo.
3. **Root directory:** `supplier-mgmt`
4. **Builder:** Dockerfile
5. **Instance type:** Free (512 MB RAM)
6. **Environment variables:**

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |
   | `FRONTEND_URL` | Your Koyeb URL, e.g. `https://your-app-xxx.koyeb.app` |
   | `DB_HOST` | From TiDB |
   | `DB_PORT` | `4000` (TiDB default) |
   | `DB_NAME` | `supplier_mgmt` |
   | `DB_USER` | From TiDB |
   | `DB_PASS` | From TiDB |
   | `DB_SSL` | `true` |
   | `JWT_ACCESS_SECRET` | Long random string |
   | `JWT_REFRESH_SECRET` | Different long random string |
   | `ENCRYPTION_KEY` | 64-char hex (see below) |
   | `FIELD_ENCRYPTION_ENABLED` | `true` |

7. Deploy → wait for build → open **Console** → run:
   ```bash
   npm run db:sync
   ```
8. Set `FRONTEND_URL` to the Koyeb URL (no trailing slash) if you used a placeholder, then redeploy.

Generate encryption key:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Option 3 — Free MySQL on Aiven (alternative to TiDB)

1. [aiven.io](https://aiven.io/free-mysql-database) → free MySQL (no card).
2. Use those DB credentials on Koyeb with `DB_SSL=true`.

---

## Which should I pick?

| You want… | Use |
|-----------|-----|
| Online in 5 minutes, OK with PC running | **Option 1** (Cloudflare Tunnel) |
| Always online in the cloud, no card | **Option 2** (Koyeb + TiDB) |
| You already have a Hostinger VPS | Docker steps in `DEPLOY.md` Option D |

---

## Health check

`GET https://your-url/api/health` → `"dbConnected": true`
