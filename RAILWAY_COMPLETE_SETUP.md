# Railway Complete Setup Guide

## 🚀 How Railway Works (Simple Explanation)

After you push to GitHub, Railway:
1. **Automatically builds** your app from the Dockerfile
2. **Automatically starts** the app (no manual start needed!)
3. **Automatically connects** to the database using environment variables
4. **Gives you a URL** to access your app

---

## 📋 Step-by-Step Setup

### Step 1: Push Code to GitHub ✅

You'll do this first (use the Git commands I provided earlier).

---

### Step 2: Create Railway Project (5 minutes)

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login with GitHub"** (free, no credit card needed)
3. Click **"Start a New Project"**
4. Choose **"Deploy from GitHub repo"**
5. **Select your repository:** `fitnesDiary`
6. Railway will **automatically start building!**

**What happens automatically:**
- ✅ Railway finds your root `Dockerfile`
- ✅ Builds the Docker image
- ✅ Starts the container
- ✅ Your app runs!

---

### Step 3: Add MySQL Database (2 minutes)

**In your Railway project:**

1. Click **"+ New"** button
2. Select **"Database"**
3. Choose **"MySQL"**
4. Railway creates the database **instantly!**

**Railway automatically generates:**
- Database host
- Database port
- Database name
- Database user
- Database password

---

### Step 4: Connect App to Database (3 minutes)

**Railway uses environment variable references** - super easy!

1. Click on your **web service** (the main app, not the database)
2. Go to **"Variables"** tab
3. Click **"Raw Editor"** (easier to paste)
4. Paste this (Railway will auto-fill the database values):

```env
FLASK_ENV=production
SECRET_KEY=paste-your-generated-secret-key-here
JWT_SECRET_KEY=paste-your-generated-jwt-secret-key-here
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_ROOT_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
```

**Generate your secret keys first:**
```bash
# Open Python and run this TWICE to get two different keys
python -c "import secrets; print(secrets.token_hex(32))"
```

**Important:** The `${{MySQL.MYSQL_HOST}}` syntax tells Railway to automatically use the MySQL service's values!

---

### Step 5: Get Your App URL (1 minute)

**In your Railway project:**

1. Click on your **web service**
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**

**Railway gives you a FREE URL like:**
```
https://fitness-tracker-production-xxxx.up.railway.app
```

**Or something like:**
```
https://your-app-name.railway.app
```

**This is your app's public URL!** Share it with your beta testers.

---

## 🔗 How Database Connection Works

### Automatic Connection

Your app's code already reads environment variables:

```python
# In your app, this code already exists:
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT')
db_name = os.getenv('DB_NAME')
db_user = os.getenv('DB_USER')
db_password = os.getenv('DB_PASSWORD')
```

**Railway injects these values automatically** when you use `${{MySQL.MYSQL_HOST}}` syntax!

### Connection String Example

Railway builds a connection like this:
```
mysql://user:password@host:port/database_name
```

**You don't have to do anything!** Railway handles it all.

---

## 🌐 Using Your Own Domain

### If You Already Own a Domain

Railway makes this **super easy**!

#### Step 1: Add Custom Domain in Railway

1. In your Railway project, click your **web service**
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Add Custom Domain"**
5. Enter your domain: `fitness.yourdomain.com` or `app.yourdomain.com`

#### Step 2: Update DNS Records

Railway will show you DNS records to add. You'll need to add a **CNAME record**:

**Example for `fitness.yourdomain.com`:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | fitness | your-app-production-xxxx.up.railway.app | 3600 |

**Or for root domain `yourdomain.com`:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | your-app-production-xxxx.up.railway.app | 3600 |

**Where to add this:**
- Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- Find DNS settings
- Add the CNAME record Railway shows you
- Wait 5-60 minutes for DNS to propagate

#### Step 3: SSL Certificate (Automatic!)

Railway automatically provisions a **free SSL certificate** for your custom domain!

**Your domain will be:**
```
https://fitness.yourdomain.com  ← Secure with SSL!
```

---

## 🎯 Complete Domain Setup Examples

### Example 1: Subdomain (Recommended)

**Your domain:** `example.com`  
**Use for app:** `fitness.example.com`

**Railway setup:**
1. Add custom domain: `fitness.example.com`
2. Railway shows: "Add CNAME record: `fitness` → `your-app.up.railway.app`"
3. Add to your DNS provider
4. Wait 10-30 minutes
5. ✅ Works at `https://fitness.example.com`

### Example 2: Root Domain

**Your domain:** `fitnessapp.com`  
**Use for app:** `fitnessapp.com` (no subdomain)

**Railway setup:**
1. Add custom domain: `fitnessapp.com`
2. Railway shows: "Add CNAME/ALIAS record"
3. Some DNS providers require ALIAS instead of CNAME for root
4. Add to your DNS provider
5. ✅ Works at `https://fitnessapp.com`

### Example 3: Multiple Domains

You can add **both** Railway's domain AND your custom domain:

- `https://your-app.up.railway.app` (Railway's free domain)
- `https://fitness.yourdomain.com` (Your custom domain)

Both work! Great for testing before switching over.

---

## 🔍 How to Access Your App

### After Deployment

1. **Railway URL:** Click "Open App" in Railway dashboard
2. **Custom Domain:** Visit your domain after DNS propagates
3. **Both work!** Use whichever you prefer

### Initial Setup

First time visiting, you'll see your homepage. You can:
- **Register** a new account
- **Use test users** (if you loaded test data):
  - Username: `tom101`
  - Password: `vL5MYe7HdD4bhmY##`

---

## 🗄️ Database Management

### How to Access Your Database

**Option 1: Railway Dashboard (GUI)**
1. Click on **MySQL service** in Railway
2. Go to **"Data"** tab
3. Browse tables, run queries directly!

**Option 2: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connect to database
railway connect MySQL
```

**Option 3: MySQL Workbench (Desktop App)**
1. In Railway, click MySQL service
2. Go to **"Connect"** tab
3. Copy connection details
4. Use in MySQL Workbench:
   - Host: (from Railway)
   - Port: (from Railway)
   - Username: (from Railway)
   - Password: (from Railway)

### Initialize Database Tables

**Automatic (Recommended):**
Your app automatically initializes the database on first run in development mode.

**Manual (if needed):**
1. In Railway, click your **web service**
2. Click **"Shell"** tab (opens terminal)
3. Run:
```bash
python -m app.initialize_data_base
```

---

## 📊 Database Connection Details

### Where to Find Connection Info

In Railway dashboard:
1. Click **MySQL service**
2. Click **"Connect"** tab
3. You'll see:
   - **Public URL:** For external connections
   - **Private URL:** For internal connections (app ↔ database)
   - **Host, Port, Username, Password**

### Connection URLs

Railway provides multiple formats:

**MySQL URL format:**
```
mysql://user:password@host:port/database
```

**Private network (faster, used by your app):**
```
mysql://root:password@mysql.railway.internal:3306/railway
```

**Public (for external tools):**
```
mysql://root:password@containers-us-west-xx.railway.app:3306/railway
```

---

## 🚀 App Startup Process

### What Happens When Railway Starts Your App

1. **Docker Build:**
   - Railway finds your `Dockerfile`
   - Installs Python packages from `requirements.txt`
   - Copies your app code

2. **Container Start:**
   - Runs: `python -m app`
   - Your `__main__.py` executes
   - Flask starts on PORT that Railway provides

3. **Database Connection:**
   - App reads environment variables
   - Connects to MySQL using Railway's injected values
   - Initializes tables if needed

4. **App Ready:**
   - Railway shows "Deployed"
   - Your URL is live!

**You don't manually start anything - it's automatic!**

---

## 🔄 How to Restart Your App

### Automatic Restarts

Railway automatically restarts when:
- ✅ You push new code to GitHub
- ✅ You change environment variables
- ✅ Your app crashes (auto-recovery)

### Manual Restart

If needed:
1. Click your **web service** in Railway
2. Click **"⋮"** (three dots menu)
3. Click **"Restart"**

---

## 📱 Share With Beta Testers

### Send Your Testers This:

```
🎉 Fitness Tracker Beta is Live!

URL: https://your-app-name.railway.app
(Or: https://fitness.yourdomain.com)

How to Get Started:
1. Click the link
2. Click "Register" 
3. Create your account
4. Start logging workouts!

Please test:
✓ Registration
✓ Login
✓ Log a workout
✓ View dashboard
✓ Check progress page
✓ Try the balance feature

Report any bugs or issues!
```

---

## ⚙️ Complete Configuration Checklist

### Railway Project Setup

- [ ] Repository connected to Railway
- [ ] Web service created and building
- [ ] MySQL database added
- [ ] Environment variables set:
  - [ ] `FLASK_ENV=production`
  - [ ] `SECRET_KEY` (generated)
  - [ ] `JWT_SECRET_KEY` (generated)
  - [ ] Database variables (`DB_HOST`, `DB_PORT`, etc.)
- [ ] Domain generated (Railway URL)
- [ ] App accessible at URL
- [ ] Database initialized
- [ ] Test user can register
- [ ] Test user can login

### Custom Domain Setup (Optional)

- [ ] Custom domain added in Railway
- [ ] CNAME record added to DNS
- [ ] DNS propagated (10-60 minutes)
- [ ] SSL certificate auto-provisioned
- [ ] App accessible at custom domain

---

## 💰 Cost & Monitoring

### Free Tier Usage

Railway dashboard shows:
- **Credit usage:** How much of your $5 monthly credit is used
- **Resource usage:** CPU, Memory, Network
- **Estimated monthly cost**

**For 10 beta testers:**
- Expected: $3-4/month
- Well within $5 free credit! ✅

### Set Up Alerts

1. Click your profile (top right)
2. Go to **"Usage"**
3. Set alerts for 80% credit usage

---

## 🐛 Troubleshooting

### App Won't Start

**Check Railway logs:**
1. Click web service
2. Click **"Deployments"**
3. Click latest deployment
4. View **"Build Logs"** and **"Deploy Logs"**

**Common issues:**
- Missing environment variables
- Database connection failed
- Port configuration wrong (should auto-work now)

### Can't Connect to Database

**Verify:**
1. MySQL service is running (green dot)
2. Environment variables use `${{MySQL.MYSQL_HOST}}` syntax
3. Variables are set in web service (not MySQL service)

### Custom Domain Not Working

**Check:**
1. DNS records added correctly
2. Wait 10-60 minutes for propagation
3. Check DNS with: `nslookup fitness.yourdomain.com`
4. CNAME points to Railway's domain

---

## 📖 Quick Reference

### Railway URLs

**Dashboard:** https://railway.app/dashboard  
**Docs:** https://docs.railway.app  
**Status:** https://status.railway.app  

### Your URLs After Setup

**Railway Domain:** `https://your-app.up.railway.app`  
**Custom Domain:** `https://fitness.yourdomain.com` (if added)

### Database Access

**Railway Dashboard:** Click MySQL → Data tab  
**MySQL Workbench:** Use connection details from Railway  
**Command Line:** Use Railway CLI

---

## ✅ Summary

### How Your App Starts on Railway:

1. ✅ **You push to GitHub** → Railway detects changes
2. ✅ **Railway builds** → Uses your Dockerfile
3. ✅ **Railway starts** → Runs `python -m app`
4. ✅ **Auto-connects to DB** → Using environment variables
5. ✅ **You get a URL** → `https://your-app.railway.app`
6. ✅ **Add custom domain** → Optional, but easy!

### Everything is Automatic!

You don't need to:
- ❌ Manually start the app
- ❌ Manually configure database connection
- ❌ Set up SSL certificates
- ❌ Configure web servers

Railway handles it all! 🎉

---

**Next Step:** Push your code to GitHub and follow this guide! 🚀

