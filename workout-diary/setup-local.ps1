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

# Create .env file from .env.dev template
Write-Host "`n📝 Creating .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists. Skipping..." -ForegroundColor Yellow
} elseif (Test-Path ".env.dev") {
    Copy-Item ".env.dev" ".env"
    Write-Host "✅ .env file created from .env.dev template" -ForegroundColor Green
} else {
    Write-Host "❌ .env.dev template not found. Make sure you're on the dev branch!" -ForegroundColor Red
    Write-Host "   Run: git checkout dev" -ForegroundColor Yellow
    exit 1
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

