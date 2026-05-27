# MX Forex Trader Admin Panel v11 – Full Online Setup

## 🚀 Features
- ✅ **Cloud Backend** (Node.js/Express on Vercel)
- ✅ **PostgreSQL Database** (Hosted on Neon – FREE)
- ✅ **Real-time Data Sync** across all devices
- ✅ **JWT Authentication** (Secure login)
- ✅ **MT5 EA Integration** (CSV export for license sync)
- ✅ **Completely FREE** (Vercel + Neon free tiers)

---

## 📋 Setup Instructions

### Step 1: Create Free Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project (default settings)
3. Copy your connection string: `postgresql://user:password@host/dbname`
4. Save it – you'll need it in Step 3

### Step 2: Deploy Backend to Vercel

1. Fork this repository (or push to your GitHub)
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"Import Project"** → select this repo
4. Add Environment Variables:
   - `DATABASE_URL` = Your Neon connection string from Step 1
   - `JWT_SECRET` = Generate any random string (e.g., `your-secret-key-12345`)
5. Click **"Deploy"** – takes ~2 minutes
6. Copy your Vercel URL (e.g., `https://mx-admin.vercel.app`)

### Step 3: Update Frontend URL

1. Edit `frontend/index.html`
2. Find line: `const API_URL='https://YOUR_VERCEL_URL.vercel.app/api';`
3. Replace `YOUR_VERCEL_URL` with your actual Vercel URL
4. Commit and push
5. Vercel auto-redeploys

### Step 4: Access Your Panel

- Open: `https://YOUR_VERCEL_URL.vercel.app/frontend/`
- Email: `donmalik.pro1@gmail.com`
- Password: `admin@51`

---

## 🔄 How It Works

### For Admin:
1. Sign in from any device
2. Add/edit clients → saves to PostgreSQL instantly
3. All changes sync across devices in real-time
4. Export CSV for MT5 EA

### For MT5 EA:
1. Download `MX_Clients.csv` from "Sync & Export" page
2. Copy to: `[MT5 Data Folder]/MQL5/Files/MX_Clients.csv`
3. EA checks license on startup
4. When you add new clients, just re-download and copy again

---

## 🔑 API Endpoints

```
POST   /api/auth/login              - Login
POST   /api/auth/signup             - Create new admin
GET    /api/clients                 - Get all clients
POST   /api/clients                 - Add client
PUT    /api/clients/:id             - Edit client
DELETE /api/clients/:id             - Delete client
GET    /api/sync/clients            - Download CSV for MT5
GET    /api/sync/check/:login       - Check license (for EA)
GET    /api/stats                   - Dashboard stats
GET    /api/logs                    - Activity log
```

---

## 📱 Mobile Access

Your panel works on mobile too! Just visit the same URL from your phone.

---

## 🆓 Free Limits

- **Vercel**: 100GB bandwidth/month (more than enough)
- **Neon**: 3 GB storage, 20 concurrent connections
- **Both**: No credit card required for first 3 months

---

## 🔐 Security Notes

1. Change the hardcoded admin password after first login
2. Use a strong JWT_SECRET (not `admin@51`)
3. Enable HTTPS on Vercel (automatic)
4. Neon uses encrypted connections by default

---

## 📞 Support

If API returns 500 errors:
1. Check Vercel logs: `vercel logs` in terminal
2. Verify DATABASE_URL is correct
3. Restart Vercel deployment

---

**Built by:** MX Forex Trader  
**Version:** 11.00  
**Hosted on:** Vercel + Neon (FREE)
