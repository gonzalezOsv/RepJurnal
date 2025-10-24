#!/bin/bash

# ===================================
# LOCAL DEVELOPMENT SETUP SCRIPT
# ===================================
# This script sets up your local development environment

echo "🚀 Setting up RepJurney Fitness Diary - Local Development"
echo "============================================================"

# Check if Docker is running
echo ""
echo "📦 Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"

# Create .env file if it doesn't exist
echo ""
echo "📝 Creating .env file..."
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Skipping..."
else
    cat > .env << 'EOF'
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
EOF
    echo "✅ .env file created"
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for database to initialize (30 seconds)..."
sleep 30

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Your app is running at:"
echo "   🌐 http://localhost:5000"
echo ""
echo "👥 Test user credentials:"
echo "   Username: tom101"
echo "   Password: vL5MYe7HdD4bhmY##"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f web"
echo "   Stop app:      docker-compose down"
echo "   Restart app:   docker-compose restart web"
echo "   Reset DB:      docker-compose down -v && ./setup-local.sh"
echo ""

