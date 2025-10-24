# ===================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# ===================================
# This script sets up your local development environment

Write-Host "🚀 Setting up RepJurney Fitness Diary - Local Development" -ForegroundColor Cyan
Write-Host "=" * 60

# Check if Docker is running
Write-Host "`n📦 Checking Docker..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
Write-Host "`n📝 Creating .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists. Skipping..." -ForegroundColor Yellow
} else {
    @"
# ===================================
# LOCAL DEVELOPMENT ENVIRONMENT
# ===================================
# Flask Environment
FLASK_ENV=development
FLASK_APP=app
FLASK_DEBUG=1

# Secret Keys (for local dev only - NOT FOR PRODUCTION!)
SECRET_KEY=dev_secret_key_change_in_production_12345678901234567890
JWT_SECRET_KEY=dev_jwt_secret_key_change_in_production_12345678901234567890

# Database Configuration (Docker Compose)
DB_HOST=db
DB_PORT=3306
DB_NAME=fitness_tracker
DB_USER=flaskuser
DB_PASSWORD=flaskpassword
DB_ROOT_PASSWORD=rootpassword

# Auto-initialize database with sample data
AUTO_INIT_DB=true

# Port Configuration
PORT=5000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
}

Write-Host "`n🐳 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`n⏳ Waiting for database to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`n📊 Your app is running at:" -ForegroundColor Cyan
Write-Host "   🌐 http://localhost:5000" -ForegroundColor White
Write-Host "`n👥 Test user credentials:" -ForegroundColor Cyan
Write-Host "   Username: tom101" -ForegroundColor White
Write-Host "   Password: vL5MYe7HdD4bhmY##" -ForegroundColor White
Write-Host "`n📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:     docker-compose logs -f web" -ForegroundColor White
Write-Host "   Stop app:      docker-compose down" -ForegroundColor White
Write-Host "   Restart app:   docker-compose restart web" -ForegroundColor White
Write-Host "   Reset DB:      docker-compose down -v && .\setup-local.ps1" -ForegroundColor White
Write-Host "`n" -ForegroundColor White

