# 🚀 RUN FITNESS TRACKER LOCALLY

Quick guide to get your app running on your local machine.

---

## ⚡ QUICK START (Recommended - With Docker)

### Prerequisites:
- Docker Desktop installed
- Git (to clone the repo)

### Steps:

```bash
# 1. Navigate to the project
cd workout-diary

# 2. Create .env file (REQUIRED!)
cp env.example .env

# 3. Generate secrets
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"

# 4. Edit .env and paste the secrets from step 3
# Also change DB_PASSWORD and DB_ROOT_PASSWORD

# 5. Start the application
docker-compose up --build
```

**That's it!** Open http://localhost:5000

---

## 📋 DETAILED STEPS

### Step 1: Create .env File

```bash
cd workout-diary
cp env.example .env
```

### Step 2: Generate Strong Secrets

**On Windows (PowerShell):**
```powershell
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

**On Mac/Linux:**
```bash
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

Copy the output - you'll need it in the next step.

### Step 3: Edit .env File

Open `.env` in your text editor and update:

```bash
# Paste the secrets you generated
SECRET_KEY=<paste-the-first-secret-here>
JWT_SECRET_KEY=<paste-the-second-secret-here>

# Change database passwords (make them strong!)
DB_PASSWORD=myStrongPassword123!@#
DB_ROOT_PASSWORD=myVeryStrongRootPassword456!@#
```

**Save the file!**

### Step 4: Start with Docker Compose

```bash
docker-compose up --build
```

**What you'll see:**
```
Creating network "workout-diary_default" with the default driver
Creating volume "workout-diary_mariadb_data" with default driver
Building web
...
Creating workout-diary_db_1 ... done
Creating workout-diary_web_1 ... done
Attaching to workout-diary_db_1, workout-diary_web_1
web_1  | ✅ Flask app initialized in development mode
web_1  | ⚠️  Development mode - security warnings enabled
web_1  |  * Running on http://0.0.0.0:5000/
```

### Step 5: Access the Application

Open your browser and go to:
- **http://localhost:5000** - Main application
- **http://localhost:5000/login** - Login page
- **http://localhost:5000/register** - Register page

### Step 6: Create Test Account (Optional)

If you want test data:

```bash
# In a NEW terminal (keep the app running in the first one)
docker exec -i mariadb-container-dev mysql -uroot -p fitness_tracker < scripts/test_data.sql
# Enter password when prompted: (use DB_ROOT_PASSWORD from .env)
```

**Test Account Credentials:**
- Username: `tom101`, `jess101`, or `danny101`
- Password: `vL5MYe7HdD4bhmY##`

---

## 🛑 STOPPING THE APP

### To Stop:
```bash
# Press Ctrl+C in the terminal where docker-compose is running
# OR in a new terminal:
docker-compose down
```

### To Stop and Remove All Data:
```bash
docker-compose down -v
# Warning: This deletes the database! You'll start fresh next time.
```

---

## 🔄 RESTARTING THE APP

### After Making Code Changes:

```bash
# Stop the app (Ctrl+C)
# Then restart:
docker-compose up
```

### After Changing Dependencies (requirements.txt):

```bash
docker-compose down
docker-compose up --build
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Port 5000 is already in use"

**Solution:**
```bash
# Stop whatever is using port 5000
# On Windows:
netstat -ano | findstr :5000
# Kill the process shown

# Or change the port in docker-compose.yml:
ports:
  - "5001:5000"  # Use port 5001 instead
```

### Issue: "Port 3306 is already in use"

**Solution:**
```bash
# Stop local MySQL/MariaDB
# On Windows: Stop MySQL service
# On Mac: brew services stop mysql

# Or change the port in docker-compose.yml:
ports:
  - "3307:3306"  # Use port 3307 instead
```

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Wait 30-60 seconds for database to initialize
# Check database logs:
docker-compose logs db

# If still not working, reset database:
docker-compose down -v
docker-compose up --build
```

### Issue: "SECRET_KEY must be set"

**Solution:**
```bash
# Make sure .env file exists and has values
cat .env  # Check contents

# If missing, create it:
cp env.example .env
# Then edit .env and add your secrets
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Rebuild the container:
docker-compose down
docker-compose up --build
```

---

## 📊 VIEW LOGS

### Application Logs:

```bash
# Follow logs in real-time:
docker-compose logs -f web

# View last 100 lines:
docker-compose logs --tail=100 web

# View logs directory (after app starts):
ls -la logs/
tail -f logs/fitness_tracker.log
tail -f logs/security_audit.log
```

### Database Logs:

```bash
docker-compose logs -f db
```

---

## 🔧 ALTERNATIVE: Run Without Docker

If you don't want to use Docker, you can run natively:

### Prerequisites:
- Python 3.11+
- MySQL or MariaDB installed locally

### Steps:

```bash
# 1. Create virtual environment
cd workout-diary
python -m venv venv

# 2. Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file
cp env.example .env

# 5. Edit .env - change database URI to:
SQLALCHEMY_DATABASE_URI=mysql+pymysql://root:yourpassword@localhost/fitness_tracker

# 6. Create database
mysql -u root -p -e "CREATE DATABASE fitness_tracker;"

# 7. Initialize database
mysql -u root -p fitness_tracker < scripts/init_db.sql

# 8. Run the application
python -m app
```

**Access at:** http://localhost:5000

---

## 🧪 TESTING

### Run Tests:

```bash
# With Docker:
docker-compose exec web pytest tests/

# Without Docker (in venv):
pytest tests/
```

### Security Check:

```bash
python scripts/security_check.py
```

### Find Print Statements:

```bash
python scripts/replace_print_statements.py
```

---

## 📦 COMMON COMMANDS

```bash
# Start in background (detached mode):
docker-compose up -d

# View running containers:
docker ps

# Access database console:
docker exec -it mariadb-container-dev mysql -uroot -p fitness_tracker

# Access Python shell in container:
docker-compose exec web python

# Run database migrations (if you add them later):
docker-compose exec web flask db upgrade

# Rebuild everything from scratch:
docker-compose down -v
docker-compose up --build
```

---

## ✅ SUCCESS CHECKLIST

You know it's working when you see:

- ✅ No error messages in console
- ✅ Can access http://localhost:5000
- ✅ See the home page with login/register buttons
- ✅ Can register a new account
- ✅ Can log in
- ✅ See the dashboard after login

---

## 🎯 WHAT TO DO AFTER STARTING

1. **Register an account** at http://localhost:5000/register
2. **Log in** with your new account
3. **Log a workout** - click "Log Workout"
4. **View progress** - click "View Progress"
5. **Check logs** - `tail -f logs/fitness_tracker.log`

---

## 🔐 SECURITY REMINDER

**Development .env file** is for local development ONLY!

- ✅ Use weak passwords for local testing
- ❌ Never commit .env to git (it's in .gitignore)
- ❌ Never use development secrets in production
- ✅ Generate new secrets for production

---

## 💡 TIPS

### Make development easier:

```bash
# Create an alias (add to ~/.bashrc or ~/.zshrc):
alias fit-start='cd ~/path/to/workout-diary && docker-compose up'
alias fit-stop='cd ~/path/to/workout-diary && docker-compose down'
alias fit-logs='cd ~/path/to/workout-diary && tail -f logs/fitness_tracker.log'

# Then just run:
fit-start  # Start the app
fit-logs   # View logs
fit-stop   # Stop the app
```

### Auto-reload on changes:

The app already auto-reloads when you change Python files (development mode).

---

## 📚 NEXT STEPS

Once the app is running:

1. **Read the docs:**
   - `START_HERE.md` - Security overview
   - `SECURITY_SUMMARY.md` - What needs fixing
   - `LOGGING_COMPLETE_SUMMARY.md` - Logging system

2. **Complete security fixes:**
   - See `SECURITY_ACTION_PLAN.md` for day-by-day tasks

3. **Add more features:**
   - See `README.md` for planned features

---

## 🆘 NEED HELP?

Check these files:
- `README.md` - Project overview
- `TROUBLESHOOTING.md` - Common issues (if exists)
- `scripts/README.md` - Database scripts guide

Or run:
```bash
docker-compose logs web  # Check application logs
docker-compose logs db   # Check database logs
```

---

**Happy developing! 🎉**

