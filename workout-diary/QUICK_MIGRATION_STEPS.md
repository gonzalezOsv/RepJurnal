# ⚡ Quick Migration Steps for Railway Production

## 🎯 Goal
Update your Railway database to support the new **My Routines** and **Cardio** features WITHOUT losing existing data.

---

## 🚀 Fastest Method (Recommended)

### Using Railway CLI:

```bash
# 1. Install Railway CLI (if needed)
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link to your project
cd workout-diary
railway link

# 4. Run the migration
railway run mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD -P $MYSQLPORT -D $MYSQLDATABASE < scripts/migration_routines_simple.sql
```

**That's it!** ✅

---

## 📋 Alternative: Manual Method

### If Railway CLI doesn't work:

1. **Get DB credentials from Railway Dashboard:**
   - Go to https://railway.app
   - Open your project
   - Click MySQL service → Variables tab
   - Copy: `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLPORT`, `MYSQLDATABASE`

2. **Connect with MySQL client:**
   ```bash
   mysql -h YOUR_HOST -u YOUR_USER -pYOUR_PASSWORD -P YOUR_PORT -D YOUR_DATABASE
   ```

3. **Run migration:**
   ```sql
   source workout-diary/scripts/migration_routines_simple.sql
   ```

---

## ✅ Verify Success

```sql
-- Check new tables exist
SHOW TABLES LIKE 'WorkoutRoutines';
SHOW TABLES LIKE 'RoutineExercises';

-- Check new columns added
DESCRIBE Exercises;

-- Verify existing data is intact
SELECT COUNT(*) FROM Users;
SELECT COUNT(*) FROM Exercises;
```

---

## 🛡️ Safety Notes

- ✅ **No data will be deleted** - Migration only ADDS new tables/columns
- ✅ **Safe to run multiple times** - Won't duplicate or break anything
- ✅ **Errors like "column already exists" are OK** - Means already migrated
- ✅ **Existing workouts/users preserved** - Only schema changes

---

## 📁 Files Created

1. **`migration_routines_simple.sql`** - Simple migration script (use this one)
2. **`migration_routines.sql`** - Advanced version with conditional checks
3. **`DATABASE_MIGRATION_GUIDE.md`** - Full detailed guide with 4 methods

---

## 🆘 If Something Goes Wrong

### The migration is designed to be safe, but if you need help:

1. **Check Railway logs** for specific errors
2. **Verify credentials** are correct
3. **Review** `DATABASE_MIGRATION_GUIDE.md` for troubleshooting
4. **Rollback commands** are in the full guide if needed

---

## ⏰ When to Run

- **Best time:** During low traffic (night/early morning)
- **Duration:** ~30 seconds
- **Downtime:** None (app stays online)

---

## 🎉 After Migration

Your app will now support:
- ✨ **My Routines** - Create and manage workout routines
- 🏃 **Cardio Tracking** - Log cardio exercises with duration/distance
- 📊 **Enhanced Analytics** - Better workout insights

---

**Need more details?** See `DATABASE_MIGRATION_GUIDE.md` for comprehensive instructions.

