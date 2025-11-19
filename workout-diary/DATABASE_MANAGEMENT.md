# Database Management Guide

## Quick Database Reset

If you encounter duplicate data or need a fresh start, you can reset the database:

### Option 1: Using Docker (Recommended)
```bash
# Reset database with fresh data
docker-compose exec web python -c "from app.initialize_data_base import initialize_database; initialize_database()"
```

### Option 2: Using the Reset Script
```bash
# Run the reset script
docker-compose exec web python reset-database.py
```

### Option 3: Complete Docker Reset
```bash
# Stop containers and remove volumes (WARNING: This removes ALL data)
docker-compose down -v
docker-compose up -d
```

## What Gets Reset

When you reset the database, the following happens:

1. **All tables are dropped** (Users, Workouts, Exercises, Routines, Friends, etc.)
2. **Fresh schema is created** with all latest features
3. **Test data is loaded** including:
   - 3 test users (tom101, jess101, danny101)
   - Sample workout routines
   - Friend relationships
   - Privacy settings

## Test Users

After reset, you can login with:

| Username | Password | Role |
|----------|----------|------|
| tom101 | vL5MYe7HdD4bhmY## | Test User 1 |
| jess101 | vL5MYe7HdD4bhmY## | Test User 2 |
| danny101 | vL5MYe7HdD4bhmY## | Test User 3 |

## Database Schema

The database includes these main tables:

- **Users** - User accounts and profiles
- **Workouts** - Workout sessions
- **Exercises** - Individual exercises within workouts
- **WorkoutRoutines** - Saved workout routines
- **RoutineExercises** - Exercises within routines
- **Friends** - Friend relationships
- **FriendRequests** - Pending friend requests
- **BodyParts** - Exercise categorization
- **MotivationalQuote** - Daily motivation quotes

## Troubleshooting

### Duplicate Data Issue
If you see duplicate routines or data:
1. Run the database reset command above
2. This will clear all data and reload fresh test data

### Database Connection Issues
```bash
# Check if database is running
docker-compose ps

# Restart database
docker-compose restart db

# View database logs
docker-compose logs db
```

### Schema Updates
If you need to add new columns or tables:
1. Update `scripts/init_db.sql`
2. Run the database reset to apply changes
3. The DROP statements ensure clean recreation

## Production Considerations

⚠️ **WARNING**: The reset commands above are for development only!

For production:
- Use migration scripts instead of DROP statements
- Backup data before making changes
- Test migrations on staging environment first





