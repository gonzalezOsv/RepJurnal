# Railway.app Deployment Guide

## 🚂 Deploy Fitness Tracker to Railway (Free)

Railway.app is perfect for beta testing with 10 users. It supports Docker, includes a free database, and your app won't sleep!

---

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Railway account (free) - [railway.app](https://railway.app)
- ✅ Your project pushed to GitHub (use the Git guide!)

---

## 🚀 Step 1: Prepare Your Project

### 1.1 Update Environment Variables

Make sure your `.env` file is NOT in GitHub (already protected by `.gitignore`).

Create a `railway.json` file (optional, for configuration):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "workout-diary/Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.2 Update docker-compose for Production

Create `workout-diary/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## 🎯 Step 2: Deploy to Railway

### 2.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select your `fitnesDiary` repository

### 2.2 Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"MySQL"**
4. Railway will automatically provision a MySQL database

### 2.3 Configure Environment Variables

In Railway dashboard:

1. Click on your **web service**
2. Go to **"Variables"** tab
3. Add these environment variables:

```env
# Flask Settings
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET_KEY=your-jwt-secret-key-change-this

# Database (Railway auto-generates these when you add MySQL)
# Copy from MySQL service's "Connect" tab:
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_ROOT_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
```

**Important:** Generate new SECRET_KEY values using:
```python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2.4 Deploy!

1. Railway will automatically build and deploy
2. Click **"Generate Domain"** to get a public URL
3. Your app will be live at: `https://your-app.up.railway.app`

---

## 🔧 Step 3: Initialize Database

### 3.1 Access Railway Shell

1. In Railway dashboard, click your **web service**
2. Click **"Settings"** → **"Shell"**
3. Run database initialization:

```bash
python -m app.initialize_data_base
```

---

## ✅ Step 4: Test Your Deployment

1. Visit your Railway URL
2. Try to register a new user
3. Log in and test features
4. Check logs in Railway dashboard if issues occur

---

## 📊 Monitoring & Limits

### Free Tier Limits:
- **$5 credit/month** (~500 hours of usage)
- **8GB RAM** max
- **8GB disk** per service
- **100GB bandwidth**

**Perfect for:** 10 beta testers!

### Monitor Usage:
- Check Railway dashboard for credit usage
- Set up usage alerts
- Monitor response times

---

## 🐛 Troubleshooting

### App Won't Start
```bash
# Check logs in Railway dashboard
# Common issues:
# 1. Missing environment variables
# 2. Database connection failed
# 3. Port configuration (Railway auto-assigns PORT)
```

### Database Connection Failed
```bash
# Verify these variables match MySQL service:
# - DB_HOST
# - DB_PORT
# - DB_USER
# - DB_PASSWORD
```

### Static Files Not Loading
```bash
# Make sure Dockerfile includes:
# COPY workout-diary/static ./static
# COPY workout-diary/templates ./templates
```

---

## 🔄 Updating Your App

Railway auto-deploys when you push to GitHub:

```bash
# 1. Make changes locally
git add .
git commit -m "fix: Update feature X"
git push origin main

# 2. Railway automatically deploys!
# 3. Check deployment status in Railway dashboard
```

---

## 💰 Cost Estimate

**For 10 Beta Testers:**
- Expected usage: $0-5/month
- Free tier: $5 credit/month
- **Total cost: $0** ✅

**If you exceed free tier:**
- $0.000463/GB for bandwidth
- $10/month for hobby plan (if needed)

---

## 🔐 Security Checklist

Before going live:

- [ ] Generated new SECRET_KEY (not from env.example)
- [ ] Generated new JWT_SECRET_KEY
- [ ] Set FLASK_ENV=production
- [ ] Database password is strong
- [ ] .env file NOT in GitHub
- [ ] Railway environment variables set
- [ ] Test authentication works
- [ ] SSL/HTTPS enabled (Railway provides this free)

---

## 📧 Share With Beta Testers

Send your testers:
```
🎉 Fitness Tracker Beta!

URL: https://your-app.up.railway.app
Test Login: (create accounts or use test users)

Please test:
- Registration
- Logging workouts
- Viewing progress
- Dashboard features

Report bugs to: [your email]
```

---

## 🚀 Alternative: Deploy Button (Even Easier!)

Create a button for one-click deployment:

Add to your README.md:
```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/YOUR_REPO)
```

---

## 📖 Additional Resources

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Templates: https://railway.app/templates

---

**Ready to deploy? Follow steps 1-4 above!** 🚀

Estimated setup time: **15-20 minutes**

