# 🗃️ Production Database Migration Guide

## ⚠️ IMPORTANT: Safe Migration for Railway Production

This guide will help you add the new **My Routines** and **Cardio Support** features to your Railway production database **WITHOUT losing any existing data**.

---

## 📊 What's Being Added

### New Tables:
1. **WorkoutRoutines** - Store user workout routines
2. **RoutineExercises** - Store exercises within each routine

### Modified Tables:
1. **Exercises** - Added cardio-specific fields:
   - `duration_minutes`
   - `distance_miles`
   - `distance_km`
   - `intensity`
   - `calories_burned`
   - `exercise_type` (strength/cardio)

---

## 🚀 Method 1: Using Railway CLI (Recommended)

### Prerequisites:
```bash
# Install Railway CLI if not already installed
npm i -g @railway/cli

# Login to Railway
railway login
```

### Steps:

1. **Link to your Railway project:**
```bash
cd workout-diary
railway link
```

2. **Connect to the database:**
```bash
railway run mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD -P $MYSQLPORT -D $MYSQLDATABASE
```

3. **Run the migration script:**
Once connected to MySQL prompt:
```sql
source scripts/migration_routines_simple.sql
```

Or in one command:
```bash
railway run mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD -P $MYSQLPORT -D $MYSQLDATABASE < scripts/migration_routines_simple.sql
```

---

## 🌐 Method 2: Using Railway Dashboard + MySQL Client

### Step 1: Get Database Credentials

1. Go to Railway Dashboard: https://railway.app
2. Select your project
3. Click on your MySQL service
4. Go to "Variables" tab
5. Copy these values:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLPORT`
   - `MYSQLDATABASE`

### Step 2: Connect Using MySQL Client

#### Option A: MySQL Workbench (GUI)
1. Open MySQL Workbench
2. Create new connection:
   - Hostname: `MYSQLHOST`
   - Port: `MYSQLPORT`
   - Username: `MYSQLUSER`
   - Password: `MYSQLPASSWORD`
   - Default Schema: `MYSQLDATABASE`
3. Connect
4. Open `workout-diary/scripts/migration_routines_simple.sql`
5. Execute the script

#### Option B: Command Line
```bash
mysql -h MYSQLHOST -u MYSQLUSER -pMYSQLPASSWORD -P MYSQLPORT -D MYSQLDATABASE < workout-diary/scripts/migration_routines_simple.sql
```

*(Replace the placeholder values with your actual credentials)*

---

## 🔒 Method 3: Using Railway's Database Query Panel

### Steps:

1. Go to Railway Dashboard
2. Select your MySQL service
3. Click on "Query" tab (if available)
4. Copy and paste the contents of `migration_routines_simple.sql`
5. Run the query in sections:
   - First run the ALTER TABLE statements
   - Then run the CREATE TABLE statements

---

## 🧪 Method 4: Run Migration from Your Deployed App

### Create a migration endpoint (TEMPORARY - REMOVE AFTER USE):

Add this to `workout-diary/app/routes.py`:

```python
@app.route('/admin/migrate-database', methods=['POST'])
@login_required
def migrate_database():
    """TEMPORARY: Run database migration - REMOVE AFTER USE"""
    # Add admin check here
    if current_user.username != 'your_admin_username':  # Change this
        abort(403)
    
    try:
        db = get_db()
        cursor = db.cursor()
        
        # Read migration file
        migration_path = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'migration_routines_simple.sql')
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Split by ; and execute each statement
        statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
        results = []
        
        for statement in statements:
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                    db.commit()
                    results.append(f"✓ Success: {statement[:50]}...")
                except Exception as e:
                    results.append(f"✗ Error (may be OK): {str(e)[:100]}")
        
        cursor.close()
        return jsonify({'status': 'success', 'results': results}), 200
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
```

Then:
1. Deploy the app with this endpoint
2. Use Postman or curl to POST to `/admin/migrate-database`
3. **IMMEDIATELY REMOVE THIS ENDPOINT** after migration
4. Redeploy without the endpoint

---

## ✅ Verify Migration Success

After running the migration, verify it worked:

### Check Tables Exist:
```sql
SHOW TABLES LIKE 'WorkoutRoutines';
SHOW TABLES LIKE 'RoutineExercises';
```

### Check New Columns:
```sql
DESCRIBE Exercises;
```

You should see the new columns:
- `duration_minutes`
- `distance_miles`
- `distance_km`
- `intensity`
- `calories_burned`
- `exercise_type`

### Check Existing Data:
```sql
SELECT COUNT(*) FROM Users;
SELECT COUNT(*) FROM Exercises;
SELECT COUNT(*) FROM Workouts;
```

All counts should match your pre-migration data.

---

## 🛡️ Safety Features

### Why This Migration is Safe:

1. **No DROP statements** - Won't delete existing tables
2. **CREATE TABLE IF NOT EXISTS** - Won't error if tables exist
3. **ALTER TABLE ADD COLUMN** - Only adds new columns, doesn't modify existing data
4. **MODIFY COLUMN to NULL** - Makes columns nullable without data loss
5. **UPDATE with WHERE clause** - Only updates NULL values

### What Might Show Errors (This is OK):

```
Error 1060: Duplicate column name 'duration_minutes'
```
This means the column already exists - **your data is safe!**

---

## 🔄 Rollback Plan (If Needed)

If you need to undo the migration:

```sql
-- Remove new columns from Exercises
ALTER TABLE Exercises DROP COLUMN duration_minutes;
ALTER TABLE Exercises DROP COLUMN distance_miles;
ALTER TABLE Exercises DROP COLUMN distance_km;
ALTER TABLE Exercises DROP COLUMN intensity;
ALTER TABLE Exercises DROP COLUMN calories_burned;
ALTER TABLE Exercises DROP COLUMN exercise_type;

-- Remove new tables (WARNING: Deletes routine data)
DROP TABLE IF EXISTS RoutineExercises;
DROP TABLE IF EXISTS WorkoutRoutines;
```

---

## 📝 Migration Checklist

- [ ] Backup current database (Railway auto-backups, but verify)
- [ ] Download migration script: `migration_routines_simple.sql`
- [ ] Choose migration method (CLI recommended)
- [ ] Connect to Railway MySQL database
- [ ] Run migration script
- [ ] Verify tables created: `WorkoutRoutines`, `RoutineExercises`
- [ ] Verify columns added to `Exercises` table
- [ ] Test app functionality
- [ ] Check existing data intact (user count, workout count)
- [ ] Monitor app logs for any errors

---

## 🆘 Troubleshooting

### "Access Denied" Error
- Check your database credentials
- Ensure you're using the correct Railway MySQL service

### "Table already exists" Error
- **This is safe!** The migration uses `CREATE TABLE IF NOT EXISTS`
- Your data is protected

### "Duplicate column name" Error
- **This is safe!** Means the column already exists
- Skip that ALTER TABLE statement

### Connection Timeout
- Try using Railway CLI instead of direct connection
- Check Railway service status

### Foreign Key Errors
- Ensure the `Users` table exists before running migration
- Run migration in the order provided

---

## 💡 Best Practices

1. **Run during low traffic** - Fewer users affected if issues occur
2. **Monitor logs** - Watch Railway logs during and after migration
3. **Test locally first** - Run migration on local database copy
4. **Have Railway dashboard open** - Monitor database CPU/memory
5. **Notify users** - Brief maintenance window if needed

---

## 📞 Support

If you encounter issues:
1. Check Railway logs for detailed errors
2. Verify database credentials
3. Ensure sufficient database resources
4. Check Railway community/docs for similar issues

---

## 🎉 After Successful Migration

Once migration is complete:
1. ✅ New "My Routines" feature will work
2. ✅ Cardio exercises can be tracked
3. ✅ All existing data preserved
4. ✅ App fully functional with new features

**Your production database is now updated!** 🚀

