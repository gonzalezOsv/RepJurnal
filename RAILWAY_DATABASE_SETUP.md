# Railway Database Setup - Complete Guide

## 🗄️ What Gets Created Automatically

### Railway Creates:
✅ **MySQL Database Service**
- Empty MySQL 8.0 database
- Auto-generated credentials
- Automatic connection setup

### Your App Creates:
✅ **All Database Tables**
- Users table
- Workouts table
- Exercises table
- BodyParts table
- PhysicalStats table
- Quotes table
- All relationships and indexes

---

## 🔧 How Table Creation Works

### Step-by-Step Process:

1. **Railway creates MySQL database** (empty)
2. **Your app connects** to the database
3. **Your app runs** `initialize_database()` function
4. **Function executes** `init_db.sql` script
5. **All tables are created!**

---

## 🚀 Two Ways to Initialize Tables

### Method 1: Automatic (Recommended) ✅

**I just updated your code to support this!**

**In Railway, set this environment variable:**
```env
AUTO_INIT_DB=true
```

**What happens:**
1. Railway deploys your app
2. App starts and sees `AUTO_INIT_DB=true`
3. App automatically runs `initialize_database()`
4. All tables are created!
5. App starts normally

**After first successful deploy:**
1. Go to Railway dashboard
2. Change `AUTO_INIT_DB` to `false`
3. Railway redeploys
4. Tables won't be recreated (already exist)

---

### Method 2: Manual (Alternative)

**Don't set AUTO_INIT_DB variable.**

**After first deploy:**
1. Go to Railway dashboard
2. Click your **web service**
3. Click **"Shell"** tab
4. Run this once:
```bash
python -c "from app.initialize_data_base import initialize_database; initialize_database()"
```

**Tables are created!**

---

## 📋 Complete Setup Instructions

### Step 1: Add MySQL Database in Railway

1. Click **"+ New"** in Railway project
2. Select **"Database"**
3. Choose **"MySQL"**
4. Wait 30 seconds for provisioning
5. ✅ Empty database is ready!

### Step 2: Set Environment Variables

In your web service, add these variables:

```env
# Flask Settings
FLASK_ENV=production
SECRET_KEY=your-generated-secret-key
JWT_SECRET_KEY=your-generated-jwt-secret-key

# Database Auto-Init (for first deploy only)
AUTO_INIT_DB=true

# Database Connection (Railway auto-fills these)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_ROOT_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
```

### Step 3: Deploy and Watch Logs

1. Railway automatically deploys
2. Click **"Deployments"** → Latest deployment
3. Click **"Deploy Logs"**
4. Look for:
   ```
   AUTO_INIT_DB is enabled. Initializing database for production...
   Database initialization starting...
   Loading SQL script from /app/scripts/init_db.sql
   Database initialized successfully. Executed 25 statements
   ```

5. ✅ Tables are created!

### Step 4: Disable Auto-Init (Important!)

**After successful first deploy:**

1. Go to **"Variables"** tab
2. Change `AUTO_INIT_DB` from `true` to `false`
3. Railway redeploys automatically
4. ✅ Tables won't be recreated on future deploys

**Why disable it?**
- Prevents recreating tables on every deploy
- Protects your data
- Only need to run once

---

## 🔍 How to Verify Tables Were Created

### Method 1: Railway Dashboard

1. Click **MySQL service** in Railway
2. Go to **"Data"** tab
3. You should see tables:
   - Users
   - Workouts
   - Exercises
   - BodyParts
   - PhysicalStats
   - Quotes

### Method 2: Test the App

1. Visit your Railway URL
2. Click **"Register"**
3. Create a test account
4. If registration works → Tables exist! ✅

### Method 3: Railway Shell

1. Click **MySQL service**
2. Click **"Shell"** tab
3. Run:
```sql
SHOW TABLES;
```

Should show:
```
+----------------------------+
| Tables_in_railway          |
+----------------------------+
| BodyParts                  |
| CustomExercises            |
| Exercises                  |
| PhysicalStats              |
| Quotes                     |
| StandardExercises          |
| Users                      |
| Workouts                   |
+----------------------------+
```

---

## 🗄️ What Tables Are Created

Your `init_db.sql` creates:

### 1. **Users Table**
```sql
- user_id (primary key)
- username, email, password_hash
- Profile info (first_name, last_name, etc.)
- Settings and preferences
```

### 2. **Workouts Table**
```sql
- workout_id (primary key)
- user_id (foreign key)
- date, workout_name, notes
```

### 3. **Exercises Table**
```sql
- exercise_id (primary key)
- workout_id (foreign key)
- user_id (foreign key)
- Exercise details (sets, reps, weight)
```

### 4. **BodyParts Table**
```sql
- body_part_id (primary key)
- body_part_name (Chest, Back, Legs, etc.)
```

### 5. **StandardExercises Table**
```sql
- standard_exercise_id (primary key)
- body_part_id (foreign key)
- exercise_name, description
```

### 6. **PhysicalStats Table**
```sql
- stat_id (primary key)
- user_id (foreign key)
- height, weight, body_fat_percentage
```

### 7. **Quotes Table**
```sql
- quote_id (primary key)
- quote_text, author
- Motivational quotes for dashboard
```

**Plus:** All relationships, indexes, and constraints!

---

## 🔄 Database Connection Flow

```
Railway MySQL Service
       ↓
   (Auto-generates credentials)
       ↓
   Railway injects as environment variables
       ↓
   Your Flask app reads variables
       ↓
   SQLAlchemy creates connection pool
       ↓
   App queries database
       ↓
   ✅ Works!
```

---

## 🧪 Test Data (Optional)

### Load Sample Data

If you want test users with workout history:

**Option 1: Development Mode**
Set `FLASK_ENV=development` temporarily, then:
- App loads `test_data.sql` automatically
- 3 test users created with workout history
- Change back to `production` after

**Option 2: Manual Load**
In Railway MySQL shell:
```bash
# Copy test data to container
cat workout-diary/scripts/test_data.sql | railway run mysql

# Or in MySQL service shell:
source /app/scripts/test_data.sql
```

**Test Users:**
- Username: `tom101` | Password: `vL5MYe7HdD4bhmY##`
- Username: `jess101` | Password: `vL5MYe7HdD4bhmY##`
- Username: `danny101` | Password: `vL5MYe7HdD4bhmY##`

---

## 🐛 Troubleshooting

### Tables Not Created

**Check logs:**
1. Railway dashboard → Web service → Deployments
2. Click latest deployment → "Deploy Logs"
3. Look for "Database initialization" messages

**Common issues:**
- `AUTO_INIT_DB` not set to `true`
- Database connection failed (check variables)
- SQL script has errors (check logs for details)

### Connection Errors

**Error:** `Can't connect to MySQL server`

**Solution:**
1. Verify MySQL service is running (green dot)
2. Check environment variables use `${{MySQL.MYSQL_HOST}}`
3. Make sure variables are in **web service**, not MySQL service
4. Wait 30 seconds after adding MySQL (provisioning time)

### Tables Exist But Empty

**This is normal!**
- Tables are created empty
- Users register to add data
- Or load test_data.sql for sample data

---

## 📊 Database Monitoring

### Check Database Health

**In Railway MySQL service:**

1. **Metrics tab:** CPU, Memory, Disk usage
2. **Data tab:** Browse tables and data
3. **Logs tab:** MySQL query logs

### Expected Usage (10 users):

- **Disk space:** <50 MB
- **Memory:** <100 MB
- **Queries/sec:** <10

All well within free tier limits! ✅

---

## ✅ Complete Checklist

### Initial Setup:
- [ ] MySQL database added in Railway
- [ ] Environment variables set (including `AUTO_INIT_DB=true`)
- [ ] Database connection variables configured
- [ ] App deployed successfully
- [ ] Check logs for "Database initialized successfully"
- [ ] Verify tables exist (Railway Data tab or test registration)

### After First Deploy:
- [ ] Change `AUTO_INIT_DB` to `false`
- [ ] App redeploys automatically
- [ ] Test registration still works
- [ ] ✅ Database is ready for production!

---

## 🔒 Security Notes

**Railway MySQL is secure:**
- ✅ Private network connection (app ↔ database)
- ✅ Auto-generated strong passwords
- ✅ Not exposed to public internet by default
- ✅ Encrypted connections

**Public access (optional):**
- Railway provides public URL for external tools
- Only use for development/debugging
- Use private connection for production

---

## 📖 Summary

### What You Need to Know:

1. **Railway creates:** Empty MySQL database ✅
2. **Your app creates:** All tables and structure ✅
3. **Connection:** Automatic via environment variables ✅
4. **Initialization:** Set `AUTO_INIT_DB=true` for first deploy ✅
5. **After first deploy:** Set `AUTO_INIT_DB=false` ✅

### It's That Simple!

Railway handles the database, your app handles the tables. Perfect separation of concerns! 🎉

---

**Next Step:** Push your updated code and deploy to Railway!

