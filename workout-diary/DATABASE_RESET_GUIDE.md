# Database Reset Guide - No Duplicates Guaranteed

## Overview

This guide explains how to properly reset your database to ensure **no data duplication** when restarting the app in a testing environment.

## What's Fixed

### ✅ Proper Table Drop Order
All tables are now dropped in the correct dependency order:
1. `RoutineSessions` (depends on WorkoutRoutines and Users)
2. `RoutineExercises` (depends on WorkoutRoutines)
3. `WorkoutRoutines` (depends on Users)
4. `FriendRequests` (depends on Users)
5. `Friends` (depends on Users)
6. `Exercises` (depends on Workouts, BodyParts)
7. `CustomExercises` (depends on BodyParts)
8. `Workouts` (depends on Users)
9. `StandardExercises` (depends on BodyParts)
10. `BodyParts` (reference data)
11. `user_legal_acceptance` (depends on Users, legal_documents)
12. `legal_documents`
13. `PhysicalStats` (depends on Users)
14. `MotivationalQuote`
15. `Users` (base table)

### ✅ All Columns in CREATE TABLE
No more ALTER TABLE statements for routine fields - everything is defined in CREATE TABLE:
- **WorkoutRoutines:** Includes `share_token`, `is_imported`, `imported_from_user_id`, `visibility`
- **Users:** Includes `profile_visibility`, `show_stats_to_friends`, `show_workouts_to_friends`, `show_routines_to_public`, `bio`, `profile_picture_url`
- **RoutineSessions:** New table for tracking routine usage analytics

## How to Reset Database (Testing Environment)

### Method 1: Using Docker (Recommended for Local Development)

```bash
# Stop containers
docker-compose down

# Remove database volume (complete wipe)
docker volume rm workout-diary_mariadb_data

# Start fresh
docker-compose up -d

# Database will be initialized automatically from init_db.sql and test_data.sql
```

### Method 2: Using SQL Scripts Directly

```bash
# Run init_db.sql (drops and recreates all tables)
docker exec mariadb-container-dev mysql -uroot -prootpassword fitness_tracker < scripts/init_db.sql

# Run test_data.sql (adds test users and sample data)
docker exec mariadb-container-dev mysql -uroot -prootpassword fitness_tracker < scripts/test_data.sql
```

### Method 3: From MySQL CLI

```bash
# Connect to database
docker exec -it mariadb-container-dev mysql -uroot -prootpassword fitness_tracker

# Then run:
SOURCE /docker-entrypoint-initdb.d/init_db.sql;
SOURCE /docker-entrypoint-initdb.d/test_data.sql;
```

## Verification - Check for Duplicates

After resetting, verify no duplicates exist:

```sql
-- Check for duplicate users
SELECT username, COUNT(*) as count 
FROM Users 
GROUP BY username 
HAVING count > 1;

-- Check for duplicate routines
SELECT user_id, routine_name, COUNT(*) as count 
FROM WorkoutRoutines 
GROUP BY user_id, routine_name 
HAVING count > 1;

-- Check for duplicate exercises
SELECT workout_id, body_part_id, exercise_name, COUNT(*) as count 
FROM Exercises 
GROUP BY workout_id, body_part_id, exercise_name 
HAVING count > 1;

-- Should all return 0 rows
```

## Database Initialization Order

### 1. `init_db.sql` (Schema Only)
- ✅ Drops all existing tables
- ✅ Creates all tables with complete schemas
- ✅ Inserts reference data (BodyParts, MotivationalQuotes)
- ✅ Creates views (UserWorkoutStats, WorkoutActivityFeed)
- ❌ Does NOT insert user or workout data

### 2. `test_data.sql` (Test Data Only)
- ✅ Inserts test users (tom101, jess101, danny101)
- ✅ Inserts sample workouts and exercises
- ✅ Creates friendships between test users
- ✅ Creates sample routines
- ❌ Does NOT create tables

## Docker Compose Integration

Your `docker-compose.yml` should mount scripts:

```yaml
volumes:
  - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01_init_db.sql
  - ./scripts/test_data.sql:/docker-entrypoint-initdb.d/02_test_data.sql
```

**Files are numbered** (`01_`, `02_`) to ensure correct execution order.

## Common Issues and Solutions

### Issue 1: "Table already exists" errors
**Cause:** CREATE TABLE IF NOT EXISTS ran before DROP TABLE  
**Solution:** Ensure DROP statements are at the top of init_db.sql ✅ (Fixed)

### Issue 2: Duplicate data on app restart
**Cause:** test_data.sql runs on every container restart  
**Solution:** Use Method 1 (volume removal) or ensure init_db.sql drops tables first ✅ (Fixed)

### Issue 3: "Foreign key constraint fails"
**Cause:** Tables dropped in wrong order  
**Solution:** Drop dependent tables before parent tables ✅ (Fixed)

### Issue 4: Missing columns
**Cause:** ALTER TABLE statements failing after DROP  
**Solution:** Include all columns in CREATE TABLE ✅ (Fixed)

## Testing the Reset

1. **Start fresh:**
   ```bash
   docker-compose down
   docker volume rm workout-diary_mariadb_data
   docker-compose up -d
   ```

2. **Login with test user:**
   - Username: `tom101`
   - Password: `vL5MYe7HdD4bhmY##`

3. **Verify data:**
   - Check dashboard - should see workouts
   - Check routines - should see sample routines
   - Check friends - tom101 and jess101 should be friends
   - No duplicates anywhere!

4. **Restart app (should NOT duplicate):**
   ```bash
   docker-compose restart
   ```
   - Data should remain the same
   - No new duplicate entries

## New Table: RoutineSessions

Tracks routine usage for future analytics:
- When user starts a routine
- When they finish it
- Completion percentage
- Duration
- Which exercises completed

**Location in init_db.sql:** Line 515  
**Automatically created on fresh setup:** ✅  
**Properly dropped on reset:** ✅

## Summary

✅ **All tables dropped in correct order**  
✅ **All columns defined in CREATE TABLE statements**  
✅ **No redundant ALTER TABLE statements**  
✅ **Test data only runs on fresh setup**  
✅ **Restart does NOT duplicate data**  
✅ **New RoutineSessions table included**  

Your database reset process is now clean and reliable! 🎉






