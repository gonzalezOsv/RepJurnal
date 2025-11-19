# Railway Deployment from Private Branch

## ✅ Yes, Railway Can Deploy from Private Branches!

Railway can auto-deploy from **any branch** (public or private) as long as:
1. Railway has access to your GitHub repository
2. The branch exists in your remote repository
3. Railway is configured to watch that branch

---

## 🚀 Setup Steps

### 1. Create and Push Private Branch

```bash
# Create private branch from current main
git checkout -b private
git push -u origin private
```

### 2. Configure Railway to Deploy from Private Branch

**Option A: Via Railway Dashboard (Recommended)**

1. Go to your Railway project dashboard
2. Click on your service
3. Go to **Settings** → **Source**
4. Under **Branch**, change from `main` to `private`
5. Click **Save**

**Option B: Via Railway CLI**

```bash
railway service update --branch private
```

**Option C: Via railway.json (if supported)**

Note: Railway typically uses dashboard settings, but you can document the branch preference.

---

## 🔒 Privacy Considerations

### Repository Visibility
- **Private Repository**: Only you and collaborators can see it
- **Public Repository**: Anyone can see it

### Branch Visibility
- **Private Branch in Private Repo**: Only visible to repo collaborators
- **Private Branch in Public Repo**: Still visible to anyone who can access the repo
- **Note**: Branch names don't hide code - repository visibility does

### Recommendation
If you want to keep work truly private:
1. ✅ Use a private branch (good for organization)
2. ✅ **Better**: Make the entire repository private (if not already)
3. ✅ Railway can deploy from private repos - just ensure Railway GitHub App has access

---

## 📋 Railway Configuration Checklist

### Current Setup
- ✅ Repository: `https://github.com/gonzalezOsv/RepJurnal`
- ✅ Branch to deploy: `private` (change from `main`)
- ✅ Dockerfile: `workout-diary/Dockerfile`
- ✅ Build context: `workout-diary`

### Environment Variables (Same as Before)
- `FLASK_ENV=production`
- `AUTO_INIT_DB=true` (first deploy) → `false` (after)
- `SECRET_KEY=<your-secret>`
- `JWT_SECRET_KEY=<your-secret>`

---

## 🔄 Workflow with Private Branch

### Development Flow
```bash
# Work on private branch
git checkout private
# Make changes
git add .
git commit -m "Your changes"
git push origin private

# Railway auto-deploys from private branch
```

### If You Need to Merge to Main Later
```bash
# Switch to main
git checkout main
git pull origin main

# Merge private branch
git merge private

# Push to main (if you want)
git push origin main
```

---

## ⚠️ Important Notes

1. **Repository Access**: Railway needs GitHub App permissions for your private repo
   - Go to Railway → Settings → GitHub
   - Ensure Railway App has access to your repository

2. **Branch Protection**: Consider protecting your `private` branch if you want extra safety
   - GitHub → Repository → Settings → Branches
   - Add branch protection rule for `private`

3. **Migration Still Runs**: The `main_to_dev_migration.sql` will still run automatically when `AUTO_INIT_DB=true`

4. **Health Checks**: `/health` and `/ping` endpoints still work the same

---

## 🧪 Testing Private Branch Deployment

1. **Push private branch:**
   ```bash
   git push origin private
   ```

2. **Update Railway branch setting:**
   - Dashboard → Service → Settings → Source → Branch: `private`

3. **Trigger deployment:**
   - Railway will auto-deploy on push, or
   - Manually trigger via Railway dashboard

4. **Verify deployment:**
   - Check Railway logs
   - Test health endpoint: `https://your-app.up.railway.app/health`

---

## 📝 Quick Reference

**Current Branch:** `private`  
**Railway Branch Setting:** Change from `main` to `private` in dashboard  
**Auto-Deploy:** ✅ Yes, on every push to `private` branch  
**Migration:** ✅ Runs automatically when `AUTO_INIT_DB=true`

---

## 🔗 Related Documentation

- Railway Branch Configuration: https://docs.railway.app/guides/github
- Private Repository Setup: https://docs.railway.app/guides/private-repos
- Railway Merge Notes: `RAILWAY_MERGE_NOTES.md`

