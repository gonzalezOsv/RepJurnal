# ============================================================================
# CLEAN DATABASE SETUP SCRIPT
# Purpose: Reset database and apply all migrations in correct order
# Date: 2025-01-04
# ============================================================================

Write-Host "🔄 Starting Clean Database Setup..." -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray

# Load environment variables
if (Test-Path ".env") {
    Write-Host "📁 Loading .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "⚠️  No .env file found, using defaults" -ForegroundColor Yellow
}

# Database configuration
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "flaskuser" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "flaskpassword" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "fitness_tracker" }

Write-Host ""
Write-Host "📊 Database Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host "   Port: $DB_PORT" -ForegroundColor Gray
Write-Host "   User: $DB_USER" -ForegroundColor Gray
Write-Host "   Database: $DB_NAME" -ForegroundColor Gray
Write-Host ""

# Confirm with user
$confirmation = Read-Host "⚠️  This will DROP ALL TABLES and reset the database. Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Setup cancelled by user" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🗑️  Step 1: Dropping existing database..." -ForegroundColor Yellow

# Drop and recreate database
$dropCmd = @"
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE $DB_NAME;
"@

$dropCmd | mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Database dropped and recreated" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to drop database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🏗️  Step 2: Creating base schema..." -ForegroundColor Yellow

# Run init_db.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < scripts/init_db.sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Base schema created" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to create base schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Step 3: Running migrations..." -ForegroundColor Yellow

# Migration order (important!)
$migrations = @(
    "scripts/migration_routines.sql",
    "scripts/migration_social.sql",
    "scripts/migration_add_tracked_exercises.sql",
    "scripts/migration_routines_import.sql",
    "migrations/add_routine_stats.sql"
)

foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        $filename = Split-Path $migration -Leaf
        Write-Host "   📄 Running: $filename" -ForegroundColor Cyan
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < $migration 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "      ✅ Success" -ForegroundColor Green
        } else {
            Write-Host "      ❌ Failed" -ForegroundColor Red
            Write-Host "      Continuing anyway..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Skipping: $filename (not found)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🌱 Step 4: Loading test data..." -ForegroundColor Yellow

# Run test_data.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < scripts/test_data.sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Test data loaded" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to load test data" -ForegroundColor Red
}

Write-Host ""
Write-Host "📜 Step 5: Loading quotes..." -ForegroundColor Yellow

# Run init_quotes.sql
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < scripts/init_quotes.sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Quotes loaded" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to load quotes (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Step 6: Verifying setup..." -ForegroundColor Yellow

# Verify tables exist
$verifyCmd = @"
SELECT 
    (SELECT COUNT(*) FROM Users) as users_count,
    (SELECT COUNT(*) FROM WorkoutRoutines) as routines_count,
    (SELECT COUNT(*) FROM RoutineStats) as routine_stats_count,
    (SELECT COUNT(*) FROM UserRoutineStats) as user_stats_count,
    (SELECT COUNT(*) FROM Friends) as friends_count;
"@

Write-Host "   Running verification query..." -ForegroundColor Gray
$verifyCmd | mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME 2>&1

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Gray
Write-Host "✅ CLEAN DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Test Users Available:" -ForegroundColor Cyan
Write-Host "   Username: tom101    | Password: vL5MYe7HdD4bhmY##" -ForegroundColor White
Write-Host "   Username: jess101   | Password: vL5MYe7HdD4bhmY##" -ForegroundColor White
Write-Host "   Username: danny101  | Password: vL5MYe7HdD4bhmY##" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start your Flask app: python app.py" -ForegroundColor White
Write-Host "   2. Visit: http://localhost:5000" -ForegroundColor White
Write-Host "   3. Login with a test user" -ForegroundColor White
Write-Host "   4. Create routines and test stats!" -ForegroundColor White
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Gray



