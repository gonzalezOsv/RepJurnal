# RepJournal - Fitness Tracking Application

RepJournal helps you track, analyze, and improve your lifting journey.

## Features

- 📊 Track workouts, exercises, sets, reps, and weight
- 📈 View progress analytics and metrics
- 💪 Manage standard and custom exercises by body part
- 👤 User account management with secure authentication
- 📱 Responsive web interface

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fitnesDiary/workout-diary
   ```

2. **Create environment file**
   ```bash
   cp env.example .env
   # Edit .env and set your secret keys for production
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Open your browser to `http://localhost:5000`
   - Test users are created automatically (username: tom101, jess101, danny101 | password: vL5MYe7HdD4bhmY##)

## Project Structure

```
workout-diary/
├── app/                    # Main application package
│   ├── __init__.py
│   ├── __main__.py        # Application entry point
│   ├── app.py             # Flask app factory
│   ├── models.py          # SQLAlchemy models
│   ├── routes.py          # Main routes
│   ├── rep_logger.py      # Workout logging routes
│   ├── routes_account.py  # Account management
│   ├── routes_metrics.py  # Analytics endpoints
│   ├── auth_service.py    # Authentication logic
│   └── initialize_data_base.py
├── templates/             # HTML templates
├── static/               # CSS, JS, images
├── scripts/              # Database initialization
├── tests/                # Test files
├── docker-compose.yml    # Docker setup
├── Dockerfile
└── requirements.txt      # Python dependencies
```

## Environment Variables

Create a `.env` file in the `workout-diary/` directory:

```env
FLASK_ENV=development
SECRET_KEY=your_very_secret_key_change_this
JWT_SECRET_KEY=your_jwt_secret_key_change_this
SQLALCHEMY_DATABASE_URI=mysql+pymysql://flaskuser:flaskpassword@db/fitness_tracker
```

**⚠️ IMPORTANT:** Change the secret keys in production!

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /logout` - User logout

### Workouts
- `GET /dashboard` - View daily workout dashboard
- `GET /repLog` - Workout logger interface
- `POST /workout/api/exercise_log` - Log an exercise
- `GET /workout/api/logged-sets` - Get logged exercises
- `DELETE /workout/api/logged-sets/<id>` - Delete a logged set

### Metrics
- `GET /metrics/api/consistency/` - Workout consistency data
- `GET /metrics/api/volume-trend/` - Volume over time
- `GET /metrics/api/body-part-imbalance/` - Training balance

## Development Setup

### Without Docker

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up database**
   - Install MariaDB/MySQL
   - Create database and run `scripts/init_db.sql`

4. **Run the application**
   ```bash
   python -m app
   ```

## Testing

```bash
pytest tests/
```

## Recent Fixes Applied

✅ Fixed Flask-Login user_loader function  
✅ Added user_id foreign key to Exercise model  
✅ Fixed JWT and secret key configuration to persist across restarts  
✅ Fixed SQL script path resolution  
✅ Fixed ENUM type mismatches between SQL and Python models  
✅ Fixed broken test imports  
✅ Removed dangerous database drop command  
✅ Pinned dependency versions in requirements.txt  
✅ Added .gitignore for sensitive files  
✅ Created env.example template  

## Contributing

This is a work in progress. Contributions welcome!

## License

See LICENSE file for details.
