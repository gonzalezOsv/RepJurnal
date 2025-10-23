# Railway Deployment - Quick Start Guide

## 🚀 Deploy in 5 Steps

### Step 1: Push Code to GitHub ✅

You're about to do this! See commands below.

---

### Step 2: Create Railway Project (5 min)

1. Go to [railway.app](https://railway.app)
2. Click **"Login with GitHub"** (free signup)
3. Click **"Start a New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select **`fitnesDiary`** repository
6. Railway will start building automatically

---

### Step 3: Add MySQL Database (2 min)

1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"MySQL"**
4. Railway provisions the database automatically
5. Note: Database variables are auto-generated!

---

### Step 4: Configure Environment Variables (5 min)

1. Click on your **web service** (the main app)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these variables:

```env
FLASK_ENV=production
SECRET_KEY=your-generated-secret-key-here
JWT_SECRET_KEY=your-generated-jwt-secret-key-here
```

**Generate secret keys:**
```bash
# Run this TWICE to get two different keys
python -c "import secrets; print(secrets.token_hex(32))"
```

**Database variables (auto-configured by Railway):**
Railway automatically injects these from your MySQL service:
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

**Add database connection variables:**
```env
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_ROOT_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
```

---

### Step 5: Generate Domain & Test (1 min)

1. In your web service, go to **"Settings"**
2. Click **"Generate Domain"**
3. Copy your URL: `https://your-app.up.railway.app`
4. Open in browser and test!

**First time setup:**
- Railway will auto-initialize the database (development mode)
- If you need to manually initialize:
  - Click web service → **"Shell"** tab
  - Run: `python -m app.initialize_data_base`

---

## ✅ Deployment Checklist

Before sharing with testers:

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] MySQL database added
- [ ] Environment variables set (SECRET_KEY, JWT_SECRET_KEY)
- [ ] Domain generated
- [ ] App loads successfully
- [ ] Can create new user account
- [ ] Can log in
- [ ] Can log workouts
- [ ] Dashboard shows data
- [ ] Progress page works

---

## 🔍 Verify It's Working

Test these features:

1. **Homepage:** Should load without errors
2. **Register:** Create a test account
3. **Login:** Log in with test account
4. **Dashboard:** Should show empty state
5. **Log Workout:** Add a workout
6. **Dashboard:** Workout should appear
7. **Progress:** Charts should load

---

## 📊 Monitor Your App

### Railway Dashboard

- **Deployments:** See build and deploy logs
- **Metrics:** CPU, Memory, Network usage
- **Logs:** View application logs in real-time
- **Settings → Usage:** Check your $5 monthly credit usage

### Expected Usage (10 users)

- ~$3-4/month (well within $5 free credit)
- If you exceed, Railway will notify you

---

## 🐛 Troubleshooting

### App won't build
```bash
# Check Railway build logs
# Common issue: Wrong Dockerfile path
# Solution: Verify railway.json points to correct path
```

### Database connection failed
```bash
# In Railway dashboard:
# 1. Check MySQL service is running
# 2. Verify environment variables are set
# 3. Make sure DB_HOST uses ${{MySQL.MYSQL_HOST}}
```

### App crashes on startup
```bash
# View logs in Railway dashboard
# Common issues:
# - Missing SECRET_KEY
# - Database connection string wrong
# - PORT not configured (should auto-work now)
```

### Static files not loading
```bash
# Check Dockerfile copies static folder:
# COPY . .
# This should copy static/ and templates/
```

---

## 🔄 Making Updates

After your initial deployment:

```bash
# 1. Make changes locally
# 2. Test with Docker
docker-compose up

# 3. Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin main

# 4. Railway auto-deploys!
# Watch deployment in Railway dashboard
```

---

## 💡 Pro Tips

1. **Logs:** Keep Railway logs open while testing
2. **Variables:** Use Railway's built-in reference variables `${{Service.VARIABLE}}`
3. **Scaling:** Free tier is perfect for beta testing
4. **Domains:** Can add custom domain later (free SSL)
5. **Backups:** Railway doesn't auto-backup MySQL on free tier (export data regularly)

---

## 📧 Share With Beta Testers

Once deployed, share:

```
🎉 Fitness Tracker Beta is Live!

URL: https://your-app.up.railway.app

Test Account:
- Register your own account, or
- Use test users (if you loaded test_data.sql):
  Username: tom101
  Password: vL5MYe7HdD4bhmY##

Please test and report bugs!
```

---

## 📖 Additional Help

- **Full Deployment Guide:** `workout-diary/RAILWAY_DEPLOYMENT_GUIDE.md`
- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app

---

## 🎯 Current Status

- [x] Files prepared for Railway
- [x] Dockerfile updated for PORT variable
- [x] railway.json created
- [ ] Code pushed to GitHub ← **YOU ARE HERE**
- [ ] Railway project created
- [ ] Database added
- [ ] Variables configured
- [ ] App deployed and tested

---

**Ready to push to GitHub?** See the Git commands below! 🚀

