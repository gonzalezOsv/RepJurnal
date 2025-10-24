# 🚀 Local Development Setup

Run your RepJurney Fitness Diary locally in just 3 steps!

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Start Docker Desktop before running the setup
  
- ✅ **Git** installed (you already have this!)

---

## ⚡ Quick Start (3 Steps)

### **Windows (PowerShell):**

```powershell
cd workout-diary
.\setup-local.ps1
```

### **Mac/Linux (Bash):**

```bash
cd workout-diary
chmod +x setup-local.sh
./setup-local.sh
```

**That's it!** 🎉

---

## 🌐 Access Your App

After setup completes (takes ~30 seconds):

**Open your browser:**
```
http://localhost:5000
```

---

## 👥 Test User Login

The app comes with pre-loaded test users:

| Username | Password | Description |
|----------|----------|-------------|
| `tom101` | `vL5MYe7HdD4bhmY##` | User with sample workouts |
| `jess101` | `vL5MYe7HdD4bhmY##` | User with sample workouts |
| `danny101` | `vL5MYe7HdD4bhmY##` | User with sample workouts |

**Or register your own account!**

---

## 📊 What's Included

The setup automatically:

✅ Creates local `.env` file with development settings  
✅ Starts MariaDB database in Docker  
✅ Starts Flask web application in Docker  
✅ Initializes database with schema  
✅ Loads sample data (3 test users with workouts)  
✅ Loads 50+ standard exercises  
✅ Loads 27+ body parts  

---

## 🛠️ Useful Commands

### **View Logs:**
```powershell
docker-compose logs -f web
```

### **Stop the App:**
```powershell
docker-compose down
```

### **Restart the App:**
```powershell
docker-compose restart web
```

### **Reset Everything (Fresh Start):**
```powershell
docker-compose down -v
.\setup-local.ps1
```

### **Access Database:**
```powershell
docker-compose exec db mysql -u flaskuser -pflaskpassword fitness_tracker
```

---

## 📁 Project Structure

```
workout-diary/
├── app/                    # Flask application
│   ├── __main__.py        # Entry point
│   ├── app.py             # App factory
│   ├── models.py          # Database models
│   ├── routes.py          # Main routes
│   └── ...
├── templates/             # HTML templates
├── static/                # CSS, JS, images
├── scripts/               # Database scripts
│   ├── init_db.sql       # Schema + reference data
│   └── test_data.sql     # Sample user data
├── docker-compose.yml     # Docker configuration
├── .env                   # Local environment vars
└── setup-local.ps1        # Setup script (Windows)
```

---

## 🔧 Configuration

### **Environment Variables (.env)**

The setup creates a `.env` file with these settings:

```env
FLASK_ENV=development
FLASK_DEBUG=1
DB_HOST=db
DB_PORT=3306
DB_NAME=fitness_tracker
DB_USER=flaskuser
DB_PASSWORD=flaskpassword
AUTO_INIT_DB=true
PORT=5000
```

**Note:** These are development-only settings! Never use in production.

---

## 🐛 Troubleshooting

### **Port 5000 already in use:**

**Option 1: Stop the other app**
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000
# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

**Option 2: Use a different port**
```powershell
# Edit .env file
PORT=5001
# Restart
docker-compose restart web
# Access at http://localhost:5001
```

### **Docker not starting:**

1. Make sure Docker Desktop is running
2. Check if virtualization is enabled in BIOS
3. Try restarting Docker Desktop

### **Database connection errors:**

```powershell
# Check if database is running
docker-compose ps

# View database logs
docker-compose logs db

# Restart everything
docker-compose down
docker-compose up -d
```

### **Changes not showing:**

```powershell
# Restart web service
docker-compose restart web

# Or rebuild if you changed requirements.txt
docker-compose up -d --build web
```

---

## 🎨 Making Changes

### **Frontend (HTML/CSS/JS):**

Files in `templates/` and `static/` update automatically!
- Edit files
- Save
- Refresh browser (Ctrl+F5)

### **Backend (Python):**

Files in `app/` need a restart:
```powershell
docker-compose restart web
```

### **Database Schema:**

```powershell
# Reset database
docker-compose down -v
docker-compose up -d
```

---

## 📦 Adding Python Packages

1. Edit `requirements.txt`
2. Rebuild container:
```powershell
docker-compose up -d --build web
```

---

## 🧹 Clean Up

### **Stop and remove everything:**
```powershell
docker-compose down -v
```

### **Remove .env file:**
```powershell
rm .env
```

---

## ✅ Common Tasks

### **Create a new user:**
1. Go to http://localhost:5000
2. Click "Register"
3. Fill in details
4. Start tracking!

### **Log a workout:**
1. Login
2. Click "Log a Workout"
3. Select date
4. Add exercises
5. Save

### **View progress:**
1. Login
2. Click "View Progress"
3. See charts, records, body part balance

---

## 🚀 Ready for Production?

Check out these guides:
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Deploy to Railway
- `SECURITY_QUICK_REFERENCE.md` - Security checklist
- `RAILWAY_COMPLETE_SETUP.md` - Full production setup

---

## 🆘 Need Help?

- Check logs: `docker-compose logs -f`
- Reset everything: `docker-compose down -v && .\setup-local.ps1`
- Check if ports are free: `netstat -ano | findstr :5000`

---

## 🎉 You're All Set!

Your local development environment is ready!

**Access your app:** http://localhost:5000

**Test login:** Username: `tom101` | Password: `vL5MYe7HdD4bhmY##`

Happy coding! 💪

