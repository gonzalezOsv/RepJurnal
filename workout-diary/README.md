# 💪 Fitness Tracker (RepJourney)

A comprehensive fitness tracking web application built with Flask and React, allowing users to log workouts, track progress, and monitor their fitness journey.

---

## ⚠️ SECURITY NOTICE

**🔴 CRITICAL: This application is NOT production-ready!**

A comprehensive security audit on October 22, 2025 identified **35+ security vulnerabilities** including:
- Hardcoded secrets in source code
- No CSRF protection
- Missing rate limiting
- Insufficient input validation
- No security headers

**DO NOT deploy to production until all security fixes are implemented!**

📚 **See Security Documentation:**
- [`SECURITY_SUMMARY.md`](./SECURITY_SUMMARY.md) - Overview and action plan
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) - Complete audit report
- [`SECURITY_FIXES.md`](./SECURITY_FIXES.md) - Implementation guide
- [`SECURITY_QUICK_REFERENCE.md`](./SECURITY_QUICK_REFERENCE.md) - Developer guide

**Quick Security Check:**
```bash
python scripts/security_check.py
```

---

## 🚀 Features

### ✅ Currently Implemented

- **User Authentication**
  - Registration with first name, last name, email
  - Secure login with password hashing (bcrypt/scrypt)
  - Session management with Flask-Login

- **Workout Logging**
  - Log exercises with sets, reps, and weight
  - Date selector for backtracking workouts
  - Custom exercise creation
  - Exercise deletion
  - Modern, mobile-friendly interface

- **Progress Tracking**
  - Track "The Big 3" (Bench Press, Squat, Deadlift)
  - Custom exercise tracking
  - Personal record (PR) tracking
  - Progression charts with Chart.js
  - Volume and max weight graphs

- **Dashboard**
  - Daily motivational quotes
  - Workout streak calculation
  - Weekly workout summary
  - Recent personal records
  - Quick access navigation
  - Professional, modern design

- **Account Management**
  - Update profile information
  - Fitness goals and preferences
  - Body metrics tracking

### 🔮 Planned Features

- [ ] Workout templates
- [ ] Exercise library with instructions
- [ ] Body weight tracking charts
- [ ] Social features (workout sharing)
- [ ] Mobile app (iOS/Android)
- [ ] Nutrition tracking
- [ ] Workout reminders
- [ ] Progress photos
- [ ] Multi-factor authentication (MFA)

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Flask 3.1.0
- **Database:** MariaDB 10.11
- **ORM:** SQLAlchemy 2.0.36
- **Authentication:** Flask-Login 0.6.3
- **Password Hashing:** Werkzeug + bcrypt
- **Migrations:** Flask-Migrate 4.0.7

### Frontend
- **Templating:** Jinja2
- **Styling:** Tailwind CSS (CDN)
- **Charts:** Chart.js
- **Icons:** SVG
- **JavaScript:** Vanilla JS + Fetch API

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Web Server:** Flask Development Server (dev), Gunicorn/Nginx (prod)
- **Database:** MariaDB in Docker container

---

## 📋 Prerequisites

- **Docker** and **Docker Compose** installed
- **Python 3.11+** (for local development)
- **Git** for version control

---

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fitnesDiary/workout-diary
```

### 2. Create Environment File

```bash
cp env.example .env
```

**Edit `.env` and set strong secrets:**

```bash
# Generate strong secrets:
python3 -c "import secrets; print(secrets.token_hex(32))"

# Use the output for SECRET_KEY and JWT_SECRET_KEY in .env
```

### 3. Start with Docker Compose

```bash
docker-compose up --build
```

The application will be available at `http://localhost:5000`

### 4. Initialize Database (First Time Only)

The database will be automatically initialized with:
- Production schema (tables, indexes, constraints)
- Body parts (34 body parts)
- Standard exercises (70+ exercises)
- Legal documents (privacy policy, terms)

**For development, you can add test data:**

```bash
docker exec -i workout-diary-db-1 mysql -uroot -p fitness_tracker < scripts/test_data.sql
# Password: (from DB_ROOT_PASSWORD in .env)
```

**Test User Credentials:**
- Username: `tom101` / `jess101` / `danny101`
- Password: `vL5MYe7HdD4bhmY##`

---

## 📁 Project Structure

```
workout-diary/
├── app/                      # Flask application
│   ├── __init__.py
│   ├── __main__.py          # Entry point
│   ├── app.py               # App factory
│   ├── models.py            # Database models
│   ├── routes.py            # Main routes
│   ├── auth_service.py      # Authentication logic
│   ├── rep_logger.py        # Workout logging routes
│   ├── routes_account.py    # Account management
│   ├── routes_metrics.py    # Progress tracking API
│   ├── routes_legal.py      # Legal documents
│   └── initialize_data_base.py
│
├── templates/               # Jinja2 templates
│   ├── layout.html         # Base layout
│   ├── layout_user.html    # Authenticated user layout
│   ├── home.html           # Landing page
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── repLogger.html      # Workout logging
│   ├── viewProgress.html   # Progress tracking
│   └── account.html
│
├── static/                  # Static assets
│   ├── styles.css
│   ├── login.js
│   ├── register.js
│   ├── repLogger.js
│   ├── viewProgress.js
│   └── account.js
│
├── scripts/                 # Database and utility scripts
│   ├── init_db.sql         # Production schema
│   ├── test_data.sql       # Test data (dev only)
│   ├── init_quotes.sql     # Motivational quotes
│   ├── security_check.py   # Security scanner
│   └── README.md
│
├── tests/                   # Test suite
│   └── tests_routes.py
│
├── requirements.txt         # Python dependencies
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── env.example
├── SECURITY_SUMMARY.md      # Security overview
├── SECURITY_AUDIT.md        # Full security audit
├── SECURITY_FIXES.md        # Fix implementation guide
└── README.md                # This file
```

---

## 🔧 Development

### Local Development (Without Docker)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=development
export FLASK_APP=app
export SECRET_KEY=your-dev-secret
export JWT_SECRET_KEY=your-dev-jwt-secret
export SQLALCHEMY_DATABASE_URI=mysql+pymysql://user:pass@localhost/fitness_tracker

# Run the app
python -m app
```

### Running Tests

```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/tests_routes.py

# Run with coverage
pytest --cov=app tests/
```

### Database Management

```bash
# Access database console
docker exec -it mariadb-container-dev mysql -uroot -p fitness_tracker

# Run SQL script
docker exec -i mariadb-container-dev mysql -uroot -p fitness_tracker < scripts/your_script.sql

# Backup database
docker exec mariadb-container-dev mysqldump -uroot -p fitness_tracker > backup.sql

# Restore database
docker exec -i mariadb-container-dev mysql -uroot -p fitness_tracker < backup.sql
```

---

## 🔒 Security

### Before Production Deployment:

1. **Run Security Check:**
   ```bash
   python scripts/security_check.py
   ```

2. **Implement All Critical Fixes:**
   - See [`SECURITY_FIXES.md`](./SECURITY_FIXES.md)

3. **Generate Strong Secrets:**
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

4. **Change All Default Passwords:**
   - Database root password
   - Database user password
   - Secret keys

5. **Enable HTTPS:**
   - Use Nginx with Let's Encrypt
   - Configure SSL/TLS

6. **Add Security Headers:**
   - Implement CSP, HSTS, X-Frame-Options
   - See security fixes guide

7. **Professional Security Audit:**
   - Hire a penetration tester
   - Review compliance requirements

**DO NOT skip these steps!**

---

## 📚 API Documentation

### Authentication Endpoints

```
POST /auth/login          - User login
POST /auth/register       - User registration
POST /logout              - User logout
```

### Workout Endpoints

```
GET  /workout/api/bodyparts                    - Get all body parts
GET  /workout/api/exercises/<body_part>        - Get exercises for body part
POST /workout/api/custom-exercise              - Create custom exercise
POST /workout/api/exercise_log                 - Log exercise
GET  /workout/api/logged-sets?date=YYYY-MM-DD  - Get logged exercises for date
DELETE /workout/api/logged-sets/<id>           - Delete logged exercise
```

### Progress Tracking Endpoints

```
GET /metrics/api/exercise-progression/<name>   - Get exercise progression
GET /metrics/api/tracked-exercises             - Get user's tracked exercises
GET /metrics/api/available-exercises           - Get all exercises user has done
GET /metrics/api/body-part-imbalance           - Get training balance by body part
GET /metrics/api/volume-trend                  - Get weekly volume trend
GET /metrics/api/consistency                   - Get workout consistency
```

### Account Endpoints

```
POST /account/update      - Update user profile
```

---

## 🐛 Troubleshooting

### Docker Issues

**Problem:** Container fails to start
```bash
# Check logs
docker-compose logs web
docker-compose logs db

# Rebuild containers
docker-compose down
docker-compose up --build
```

**Problem:** Database connection refused
```bash
# Check if database container is running
docker ps

# Wait for database to initialize (first startup takes 30-60s)
docker-compose logs -f db
```

### Database Issues

**Problem:** "Table doesn't exist"
```bash
# Re-initialize database
docker exec -i mariadb-container-dev mysql -uroot -p fitness_tracker < scripts/init_db.sql
```

**Problem:** "motivational_quotes table doesn't exist"
```bash
# Add quotes table
docker exec -i mariadb-container-dev mysql -uroot -p fitness_tracker < scripts/init_quotes.sql
```

### Python Issues

**Problem:** "ModuleNotFoundError"
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or rebuild Docker image
docker-compose build --no-cache
```

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. **Run security check:**
   ```bash
   python scripts/security_check.py
   ```

4. Run tests:
   ```bash
   pytest tests/
   ```

5. Commit with descriptive messages:
   ```bash
   git commit -m "Add: feature description"
   ```

6. Push and create pull request

### Code Review Checklist

Before submitting a PR, ensure:

- [ ] Security check passes (`scripts/security_check.py`)
- [ ] All tests pass
- [ ] No hardcoded secrets
- [ ] Input validation added
- [ ] Authorization checks in place
- [ ] Error handling implemented
- [ ] Code follows project style
- [ ] Comments added for complex logic

---

## 📜 License

[Add your license here]

---

## 👥 Authors

- **Your Name** - Initial work

---

## 🙏 Acknowledgments

- Flask community
- SQLAlchemy team
- Tailwind CSS
- Chart.js
- MariaDB/MySQL

---

## 📞 Support

For issues, questions, or suggestions:

1. **Check Documentation:**
   - [`scripts/README.md`](./scripts/README.md) - Database scripts
   - [`SECURITY_SUMMARY.md`](./SECURITY_SUMMARY.md) - Security overview

2. **Run Automated Checks:**
   ```bash
   python scripts/security_check.py
   ```

3. **Create an Issue:**
   - Include error messages
   - Include steps to reproduce
   - Include environment details

---

## 🗺️ Roadmap

### v1.0 (Current) - MVP
- [x] User authentication
- [x] Workout logging
- [x] Basic progress tracking
- [x] Dashboard with stats
- [ ] Security hardening (IN PROGRESS)

### v1.1 - Security & Polish
- [ ] All security fixes implemented
- [ ] Professional security audit
- [ ] Performance optimization
- [ ] Mobile responsiveness improvements

### v1.2 - Enhanced Features
- [ ] Workout templates
- [ ] Exercise library with videos
- [ ] Body weight tracking charts
- [ ] Export/import data

### v2.0 - Advanced Features
- [ ] Mobile app (iOS/Android)
- [ ] Social features
- [ ] Nutrition tracking
- [ ] AI workout recommendations
- [ ] Multi-language support

---

**Happy Tracking! 💪🏋️‍♂️**

