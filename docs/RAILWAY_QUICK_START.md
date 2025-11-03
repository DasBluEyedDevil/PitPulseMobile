# 🚂 Railway Quick Start - TL;DR

## Your JWT Secret (SAVE THIS!)
```
0cf442c181644884c77cb939e1111ab5c5c2d9c877c4109c47a2defb67d94dc7fff5b11f6948c28ad7bfd2a3b7dfdab5a957ab4cfc7dbcea413064a018bdb4bb
```
**⚠️ IMPORTANT:** Copy this now! You'll need it in Step 5.

---

## 5-Minute Setup

### 1️⃣ Sign Up
- Go to **railway.app**
- Login with GitHub

### 2️⃣ Create Project
- Click "New Project"
- "Deploy from GitHub repo"
- Select **PitPulseMobile**
- Set root directory to: **`backend`**

### 3️⃣ Add Database
- Click "New" → "Database" → "Add PostgreSQL"

### 4️⃣ Set Variables
Click backend service → Variables → Add these:

```
NODE_ENV = production
JWT_SECRET = 0cf442c181644884c77cb939e1111ab5c5c2d9c877c4109c47a2defb67d94dc7fff5b11f6948c28ad7bfd2a3b7dfdab5a957ab4cfc7dbcea413064a018bdb4bb
JWT_EXPIRES_IN = 7d
CORS_ORIGIN = *
PORT = 3000
```

### 5️⃣ Deploy
- Railway auto-deploys
- Wait 2-3 minutes
- Settings → Domains → "Generate Domain"
- **Copy your URL!**

### 6️⃣ Initialize Database
- Click PostgreSQL → Data → Query
- Paste contents of `backend/database-schema.sql`
- Run query

### 7️⃣ Test
```bash
curl https://your-url.up.railway.app/health
```

Should return: `"database": "connected"` ✅

---

## Update Android App

Edit: `app/src/main/java/com/example/pitpulseandroid/data/network/ApiConfig.kt`

Change line 7:
```kotlin
private const val PROD_BASE_URL = "https://your-railway-url.up.railway.app/api/"
```

---

## Need Help?

See [RAILWAY_DEPLOYMENT_STEPS.md](RAILWAY_DEPLOYMENT_STEPS.md) for detailed instructions.

---

## Your Credentials
- **Railway URL:** [You'll get this in Step 5]
- **JWT Secret:** See above (already generated)
- **Database:** Automatically connected via Railway

---

**Total Time:** 10-15 minutes  
**Cost:** FREE ($5 credit for ~2 months)
