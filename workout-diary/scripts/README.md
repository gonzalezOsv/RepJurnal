# Database Scripts

This directory contains SQL scripts for initializing and managing the Fitness Tracker database.

---

## 📁 Files Overview

### `init_db.sql` - Production Schema
**What it contains:**
- Database schema (all tables)
- Essential reference data (body parts, standard exercises, legal documents)
- **NO test users or workout data**

**Use for:**
- Production deployments
- Clean database setup
- Fresh development environments

### `test_data.sql` - Test Data Only
**What it contains:**
- 3 test users with sample workout history
- Realistic exercise data for testing
- Physical stats and workout progression

**Use for:**
- Development and testing
- Demo purposes
- Feature testing with realistic data

### `init_quotes.sql` - Motivational Quotes
**What it contains:**
- 20 motivational quotes for dashboard
- Creates `motivational_quotes` table

**Use for:**
- Adding the motivational quotes feature
- Both development and production

### `flushprivillages.sql` - Database Privileges
**What it contains:**
- MySQL privilege flush command

---

## 🚀 Quick Start

### Development Setup (With Test Data)

```bash
# Step 1: Initialize schema and reference data
mysql -u root -p fitness_tracker < init_db.sql

# Step 2: Add test users and workouts
mysql -u root -p fitness_tracker < test_data.sql

# Step 3 (Optional): Add motivational quotes
mysql -u root -p fitness_tracker < init_quotes.sql
```

**Test User Credentials:**
- Username: `tom101` / `jess101` / `danny101`
- Password: `vL5MYe7HdD4bhmY##`

### Production Deployment (No Test Data)

```bash
# Step 1: Initialize schema and reference data ONLY
mysql -u root -p fitness_tracker < init_db.sql

# Step 2: Add motivational quotes (optional but recommended)
mysql -u root -p fitness_tracker < init_quotes.sql

# DO NOT run test_data.sql in production!
```

---

## 🐳 Docker Setup

### Development with Docker Compose

**Option 1: Manual initialization**
```bash
# Start containers
docker-compose up -d

# Initialize database with schema
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/init_db.sql

# Add test data
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/test_data.sql

# Add quotes
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/init_quotes.sql
```

**Option 2: Auto-initialization (Recommended)**

Mount the scripts as an initialization volume in `docker-compose.yml`:

```yaml
services:
  db:
    volumes:
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01-init_db.sql:ro
      - ./scripts/test_data.sql:/docker-entrypoint-initdb.d/02-test_data.sql:ro
      - ./scripts/init_quotes.sql:/docker-entrypoint-initdb.d/03-init_quotes.sql:ro
```

> **Note:** Files in `/docker-entrypoint-initdb.d/` are executed in alphabetical order when the container is first created.

### Production with Docker

Only mount the production scripts:

```yaml
services:
  db:
    volumes:
      - ./scripts/init_db.sql:/docker-entrypoint-initdb.d/01-init_db.sql:ro
      - ./scripts/init_quotes.sql:/docker-entrypoint-initdb.d/02-init_quotes.sql:ro
      # DO NOT mount test_data.sql in production!
```

---

## 📋 What Each Script Does

### `init_db.sql` - Detailed Breakdown

**Tables Created:**
1. `Users` - User accounts and profiles
2. `PhysicalStats` - Height, weight, body fat tracking
3. `Workouts` - Workout sessions
4. `BodyParts` - Reference table (34 body parts)
5. `StandardExercises` - Pre-defined exercises (~70 exercises)
6. `CustomExercises` - User-created exercises
7. `Exercises` - Individual exercise logs
8. `legal_documents` - Terms and privacy policy
9. `user_legal_acceptance` - User consent tracking

**Reference Data Inserted:**
- 34 body parts (Chest, Back, Legs, etc.)
- 70+ standard exercises with descriptions
- Privacy policy and terms documents

**Does NOT include:**
- User accounts
- Workout data
- Test data

### `test_data.sql` - Detailed Breakdown

**Test Users Created:**
1. **tom101** - Male, Muscle Gain goal, Moderately Active
2. **jess101** - Female, Weight Loss goal, Lightly Active
3. **danny101** - Other, Endurance goal, Very Active

**Test Data:**
- 7 workouts across 3 users
- 30+ exercise logs with realistic progression
- Physical stats for each user
- Recent PRs for testing progress tracking

**Useful For:**
- Testing the workout logger
- Testing progress charts
- Demonstrating the dashboard
- Feature development

---

## 🔄 Resetting the Database

### Complete Reset (Development Only!)

```bash
# MySQL
mysql -u root -p << EOF
DROP DATABASE IF EXISTS fitness_tracker;
CREATE DATABASE fitness_tracker;
EOF

mysql -u root -p fitness_tracker < scripts/init_db.sql
mysql -u root -p fitness_tracker < scripts/test_data.sql
mysql -u root -p fitness_tracker < scripts/init_quotes.sql
```

### Docker Reset

```bash
# Stop containers
docker-compose down

# Remove database volume (WARNING: Deletes all data!)
docker volume rm workout-diary_db_data

# Start fresh
docker-compose up -d

# Re-initialize
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/init_db.sql
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/test_data.sql
```

---

## 🧪 Testing Commands

### Verify Schema

```bash
# Check all tables exist
mysql -u root -p fitness_tracker -e "SHOW TABLES;"

# Check body parts loaded
mysql -u root -p fitness_tracker -e "SELECT COUNT(*) FROM BodyParts;"

# Check standard exercises loaded
mysql -u root -p fitness_tracker -e "SELECT COUNT(*) FROM StandardExercises;"
```

### Verify Test Data

```bash
# Check test users exist
mysql -u root -p fitness_tracker -e "SELECT username, first_name FROM Users;"

# Check test workouts exist
mysql -u root -p fitness_tracker -e "SELECT COUNT(*) FROM Workouts;"

# Check test exercises exist
mysql -u root -p fitness_tracker -e "SELECT COUNT(*) FROM Exercises;"
```

### Verify Quotes

```bash
# Check quotes table and count
mysql -u root -p fitness_tracker -e "SELECT COUNT(*) FROM motivational_quotes;"
```

---

## ⚠️ Important Notes

### Production Deployment Checklist

- [ ] Run `init_db.sql` only
- [ ] **DO NOT** run `test_data.sql`
- [ ] Update legal document dates in `init_db.sql`
- [ ] Update contact emails in legal documents
- [ ] Set strong database password
- [ ] Enable SSL for database connections
- [ ] Configure database backups
- [ ] Review and update environment variables

### Development Best Practices

- ✅ Always use test data for feature development
- ✅ Never use production credentials locally
- ✅ Reset test data regularly for clean testing
- ✅ Add more test scenarios to `test_data.sql` as needed
- ✅ Keep `init_db.sql` production-ready

### Modifying Scripts

**Adding New Body Parts:**
Edit `init_db.sql` → `BodyParts` INSERT section

**Adding New Standard Exercises:**
Edit `init_db.sql` → `StandardExercises` INSERT section

**Adding More Test Users:**
Edit `test_data.sql` → `TEST USERS` section

**Adding More Test Workouts:**
Edit `test_data.sql` → `TEST WORKOUTS` and `TEST EXERCISES` sections

---

## 📊 Database Size Estimates

### Production (Empty)
- Schema only: ~50 KB
- With reference data: ~200 KB

### With Test Data
- 3 users + workouts: ~300 KB

### With Active Users
- 100 users (3 months): ~5-10 MB
- 1,000 users (1 year): ~50-100 MB

---

## 🆘 Troubleshooting

### Error: "Table already exists"

**Solution:** The scripts use `DROP TABLE IF EXISTS` and `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`. Run them in order:
1. `init_db.sql` (drops and recreates everything)
2. `test_data.sql` (adds test data)

### Error: "Cannot add foreign key constraint"

**Solution:** Run `init_db.sql` first. It creates tables in the correct dependency order.

### Error: "Access denied"

**Solution:** Ensure your MySQL user has proper privileges:
```sql
GRANT ALL PRIVILEGES ON fitness_tracker.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Test users can't login

**Solution:** Ensure `test_data.sql` was run. Password for all test users: `vL5MYe7HdD4bhmY##`

---

## 📚 Additional Resources

- **Database Schema Diagram**: See `docs/database_schema.md` (if available)
- **API Documentation**: See `docs/API.md` (if available)
- **Deployment Guide**: See `README.md` in project root

---

## 🔐 Security Notes

1. **Never commit database passwords** to version control
2. **Always use environment variables** for credentials
3. **Test data passwords are public** - never use in production
4. **Legal documents** need customization with real contact info
5. **Update privacy policy** and terms before production launch

---

## 📝 Script Maintenance

When adding new features:

1. **New tables** → Add to `init_db.sql`
2. **New reference data** → Add to `init_db.sql`
3. **New test scenarios** → Add to `test_data.sql`
4. **Keep scripts in sync** with Python models in `app/models.py`

---

## ✅ Quick Validation

After running scripts, this should work:

```bash
# Connect to database
mysql -u root -p fitness_tracker

# Run these checks:
SELECT COUNT(*) FROM BodyParts; -- Should be 34
SELECT COUNT(*) FROM StandardExercises; -- Should be 70+
SELECT COUNT(*) FROM Users; -- Should be 0 (prod) or 3 (dev)
SELECT COUNT(*) FROM Workouts; -- Should be 0 (prod) or 7+ (dev)
```

---

**Happy Coding! 💪🏋️**


