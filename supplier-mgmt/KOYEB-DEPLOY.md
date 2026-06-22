# Deploy on Koyeb + TiDB (always online, no credit card)

Follow these steps in order. Total time: ~20–30 minutes.

---

## Part 1 — TiDB Cloud (free database)

### 1.1 Create account

1. Open [https://tidbcloud.com](https://tidbcloud.com)
2. Sign up (Google/GitHub is fine) — **no credit card**

### 1.2 Create cluster

1. Click **Create Cluster** (or **Get Started with TiDB Cloud**)
2. Choose **TiDB Cloud Serverless** (free tier)
3. Name: `supplier-mgmt` (any name is fine)
4. Region: pick closest to you (e.g. AWS Mumbai if available)
5. Create cluster — wait until status is **Active**

### 1.3 Create database and user

1. Open your cluster → **Chat2Query** or **SQL Editor**
2. Run:

```sql
CREATE DATABASE IF NOT EXISTS supplier_mgmt;
```

3. Go to **Security** → **Users** (or **Create user**)
4. Create a user with a strong password and note:
   - **Username** (often looks like `2abc123.root` or similar)
   - **Password**

### 1.4 Get connection details

1. Cluster → **Connect**
2. Choose **General connection** / **Public endpoint**
3. Copy and save:

| Field | Example | Your value |
|-------|---------|------------|
| Host | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | __________ |
| Port | `4000` | __________ |
| User | `2xxxx.root` | __________ |
| Password | (you set this) | __________ |
| Database | `supplier_mgmt` | __________ |

Keep this tab open — you need it for Koyeb.

---

## Part 2 — Generate secrets (on your PC)

Open PowerShell and run **three times** (save each output):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the outputs for:

- `ENCRYPTION_KEY` (first run)
- `JWT_ACCESS_SECRET` (second — or use a long random sentence 64+ chars)
- `JWT_REFRESH_SECRET` (third — must be different from access)

---

## Part 3 — Koyeb (free app hosting)

### 3.1 Create account

1. Open [https://www.koyeb.com](https://www.koyeb.com)
2. Sign up with **GitHub**
3. Choose **Hobby** plan when asked (free, no credit card)

### 3.2 Create Web Service

1. Click **Create Web Service**
2. **GitHub** → authorize → select repo:  
   `Vedant-1328/real-estate-management-project`
3. Branch: `2026-06-03-7dyr` (or `main` if you merged deploy changes)
4. **App builder:** Dockerfile
5. **Dockerfile path:** `Dockerfile` (default if root is correct)
6. **Root directory / Work directory:** `supplier-mgmt`  
   *(Important — without this, build fails)*

### 3.3 Instance settings

| Setting | Value |
|---------|--------|
| Instance type | **Free** (512 MB RAM, 0.1 vCPU) |
| Region | Frankfurt or Washington, D.C. (free tier regions) |
| Port | `3000` |
| Health check path | `/api/health` |

### 3.4 Environment variables

Click **Environment variables** and add **every** row below:

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `FRONTEND_URL` | Leave empty for now — fill after first deploy (step 3.6) |
| `DB_HOST` | From TiDB Connect tab |
| `DB_PORT` | `4000` |
| `DB_NAME` | `supplier_mgmt` |
| `DB_USER` | From TiDB |
| `DB_PASS` | From TiDB |
| `DB_SSL` | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true` |
| `JWT_ACCESS_SECRET` | Your generated secret |
| `JWT_REFRESH_SECRET` | Your other generated secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `ENCRYPTION_KEY` | 64-char hex from Part 2 |
| `FIELD_ENCRYPTION_ENABLED` | `true` |
| `SUPPLIER_COMPANY_NAME` | `SHREE SAI EARTH MOVERS` |

### 3.5 Deploy

1. Click **Deploy**
2. Wait 5–15 minutes for Docker build
3. When status is **Healthy**, copy your public URL, e.g.  
   `https://shree-sai-earth-movers-yourname.koyeb.app`

### 3.6 Set FRONTEND_URL

1. Service → **Settings** → **Environment variables**
2. Set `FRONTEND_URL` to your Koyeb URL **with no trailing slash**, e.g.  
   `https://shree-sai-earth-movers-yourname.koyeb.app`
3. Save — Koyeb redeploys automatically

---

## Part 4 — Seed the database

After the app is running:

1. Koyeb → your service → **Console** (or **Execute command**)
2. Run:

```bash
npm run db:sync
```

You should see messages about tables and demo users being created.

If Console is not available, install Koyeb CLI locally:

```powershell
# optional
scoop install koyeb
koyeb login
koyeb service exec YOUR_SERVICE_NAME -- npm run db:sync
```

---

## Part 5 — Test

1. Open your Koyeb URL in a browser
2. Login:
   - Email: `admin@supplier.com`
   - Password: `Admin@123`
3. Change password immediately (Settings → Users)
4. Check health: `https://YOUR-URL.koyeb.app/api/health`  
   Expected: `"dbConnected": true`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails “Dockerfile not found” | Set **Root directory** to `supplier-mgmt` |
| `dbConnected: false` | Check TiDB host/port/user/pass; ensure `DB_SSL=true` |
| Login fails | Run `npm run db:sync` again in Console |
| App crashes / OOM | Free tier is 512 MB; PDF generation may need paid instance later |
| TiDB connection timeout | In TiDB → Security → ensure **Public endpoint** is enabled |

---

## Save these forever

- `ENCRYPTION_KEY` — required to read encrypted data after backup
- TiDB password
- JWT secrets

Without `ENCRYPTION_KEY`, database restores will corrupt encrypted fields.
