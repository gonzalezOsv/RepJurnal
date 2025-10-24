# 🌳 Git Branching Workflow

## 📋 Branch Strategy

| Branch | Purpose | Push To |
|--------|---------|---------|
| `main` | **Production** - Deployed to Railway | Railway auto-deploys |
| `dev` | **Local Development** - Work here | Manual push only |

---

## 🚀 Quick Commands

### **Switch to Dev (Local Work):**
```powershell
git checkout dev
```

### **Switch to Main (Deploy):**
```powershell
git checkout main
```

### **See Current Branch:**
```powershell
git branch
```

---

## 💡 Workflow

### **1. Daily Development**

```powershell
# Make sure you're on dev
git checkout dev

# Make your changes to code
# Edit files, test locally...

# Commit your work
git add .
git commit -m "feat: add new feature"
```

### **2. Ready to Deploy?**

```powershell
# Switch to main
git checkout main

# Merge dev into main
git merge dev

# Push to production (Railway auto-deploys)
git push origin main
```

### **3. Continue Development**

```powershell
# Switch back to dev
git checkout dev

# Keep working...
```

---

## 🎯 Typical Day

```powershell
# Morning: Start work
git checkout dev

# Work on features all day
# Edit, test, commit multiple times
git add .
git commit -m "feat: xyz"

# End of day: Push dev changes (backup)
git push origin dev

# Ready to deploy? Merge to main
git checkout main
git merge dev
git push origin main

# Back to dev for tomorrow
git checkout dev
```

---

## 📊 Branch Differences

### **`dev` Branch Has:**
- ✅ `.env` file with local config
- ✅ Local development scripts
- ✅ Test data and sample users
- ✅ Development documentation
- ✅ Experimental features

### **`main` Branch Has:**
- ✅ Production-ready code only
- ✅ Railway deployment config
- ✅ Production documentation
- ✅ Stable, tested features

---

## 🔧 Setup Instructions

### **First Time Setup:**

```powershell
# Create dev branch (already done!)
git checkout -b dev

# Create .env for local development
cd workout-diary
.\setup-local.ps1

# Start developing!
```

### **On New Computer:**

```powershell
# Clone repo
git clone <your-repo-url>
cd fitnesDiary

# Checkout dev branch
git checkout dev

# Setup local environment
cd workout-diary
.\setup-local.ps1
```

---

## 🆘 Common Scenarios

### **Accidentally Made Changes on Main?**

```powershell
# Save your changes to a new branch
git checkout -b my-feature

# Go back to main (clean)
git checkout main

# Go to dev
git checkout dev

# Merge your feature
git merge my-feature

# Delete temp branch
git branch -d my-feature
```

### **Need to Hotfix Production?**

```powershell
# Go to main
git checkout main

# Make quick fix
# Edit files...
git add .
git commit -m "fix: critical bug"
git push origin main

# Merge back to dev
git checkout dev
git merge main
```

### **Merge Conflicts?**

```powershell
# During merge, if conflicts:
git status  # Shows conflicted files

# Edit conflicted files, resolve conflicts
# Look for <<<<<<< HEAD markers

# After resolving:
git add .
git commit -m "merge: resolve conflicts"
```

---

## 📝 Commit Message Best Practices

Use these prefixes:

| Prefix | When to Use | Example |
|--------|-------------|---------|
| `feat:` | New feature | `feat: add workout logging` |
| `fix:` | Bug fix | `fix: resolve login error` |
| `docs:` | Documentation only | `docs: update README` |
| `style:` | UI/formatting | `style: improve dashboard layout` |
| `refactor:` | Code improvement | `refactor: optimize queries` |
| `test:` | Tests only | `test: add user model tests` |
| `chore:` | Maintenance | `chore: update dependencies` |

---

## 🎨 Example Full Workflow

### **Monday - Start New Feature:**
```powershell
git checkout dev
git pull origin dev  # Get latest

# Create feature branch (optional)
git checkout -b feature/body-part-charts

# Work, commit, test
git add .
git commit -m "feat: add body part progress charts"
```

### **Tuesday - Continue Work:**
```powershell
# Already on feature branch
# Make more changes
git add .
git commit -m "feat: add chart tooltips"
git commit -m "style: improve chart colors"
```

### **Wednesday - Merge to Dev:**
```powershell
# Merge feature to dev
git checkout dev
git merge feature/body-part-charts

# Test everything locally
# If good, push dev
git push origin dev
```

### **Thursday - Deploy to Production:**
```powershell
# Merge dev to main
git checkout main
git merge dev

# Push to Railway (auto-deploys)
git push origin main

# Back to dev for next work
git checkout dev
```

---

## ⚙️ Configuration

### **Dev Branch Configuration:**

**File: `workout-diary/.env`** (on dev branch only)
```env
FLASK_ENV=development
DB_HOST=db
DB_NAME=fitness_tracker
# ... local config
```

### **Main Branch Configuration:**

**Railway Environment Variables:** (set in Railway dashboard)
```env
FLASK_ENV=production
DB_HOST=${{MySQL.MYSQLHOST}}
# ... production config
```

---

## 📦 What Gets Deployed

When you push to `main`:

✅ **Deployed to Railway:**
- Python code from `app/`
- Templates from `templates/`
- Static files from `static/`
- Dependencies from `requirements.txt`
- Database scripts from `scripts/`

❌ **NOT Deployed:**
- `.env` file (Railway uses its own variables)
- `logs/` directory
- `__pycache__/` directories
- Development documentation `*_FIX.md`, etc.

---

## 🔐 Security Reminders

**Never commit to any branch:**
- ❌ `.env` files with real secrets
- ❌ Production passwords
- ❌ API keys
- ❌ Personal data
- ❌ Database dumps

**Always:**
- ✅ Use `.env.example` as template
- ✅ Keep `.env` in `.gitignore`
- ✅ Use Railway variables for production secrets

---

## 🎯 Quick Reference Card

```
┌─────────────────────────────────────────┐
│  Current Branch                         │
│  git branch                             │
├─────────────────────────────────────────┤
│  Switch to Dev                          │
│  git checkout dev                       │
├─────────────────────────────────────────┤
│  Switch to Main                         │
│  git checkout main                      │
├─────────────────────────────────────────┤
│  Deploy (from main)                     │
│  git push origin main                   │
├─────────────────────────────────────────┤
│  Merge Dev → Main                       │
│  git checkout main                      │
│  git merge dev                          │
│  git push origin main                   │
└─────────────────────────────────────────┘
```

---

## ✅ Benefits of This Workflow

✅ **Separate local and production configs**  
✅ **Test features before deploying**  
✅ **Easy rollback** (just revert main)  
✅ **Multiple developers can work on dev**  
✅ **Production stays stable**  
✅ **Clear deployment process**  

---

## 📚 More Resources

- **Local Setup:** `workout-diary/LOCAL_SETUP.md`
- **Deploy Guide:** `RAILWAY_COMPLETE_SETUP.md`
- **Quick Start:** `workout-diary/QUICK_START.md`

---

**Current Branch:** Run `git branch` to see which branch you're on!

**Ready to work?** `git checkout dev` and start coding! 🚀

