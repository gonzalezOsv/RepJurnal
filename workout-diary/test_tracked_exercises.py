#!/usr/bin/env python3
"""
Diagnostic Script for TrackedExercises Table
Checks database state and helps debug loading issues
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db, TrackedExercise, User, Exercise, StandardExercise
from sqlalchemy import text

def check_table_exists():
    """Check if TrackedExercises table exists"""
    print("\n" + "="*60)
    print("CHECKING: TrackedExercises Table")
    print("="*60)
    
    try:
        result = db.session.execute(text(
            "SHOW TABLES LIKE 'TrackedExercises'"
        )).fetchone()
        
        if result:
            print("✅ TrackedExercises table EXISTS")
            return True
        else:
            print("❌ TrackedExercises table DOES NOT EXIST")
            print("\n💡 Solution: Run the migration:")
            print("   mysql -u root -p fitness_tracker < scripts/migration_add_tracked_exercises.sql")
            return False
    except Exception as e:
        print(f"❌ Error checking table: {e}")
        return False


def check_table_data():
    """Check if there's any data in TrackedExercises"""
    print("\n" + "="*60)
    print("CHECKING: TrackedExercises Data")
    print("="*60)
    
    try:
        count = TrackedExercise.query.count()
        print(f"📊 Total tracked exercises in database: {count}")
        
        if count == 0:
            print("\n⚠️  No tracked exercises found!")
            print("\n💡 This is normal for:")
            print("   - New users")
            print("   - Users who haven't added tracked exercises yet")
            print("\n📝 To add tracked exercises:")
            print("   1. Go to Progress page")
            print("   2. Click 'Manage Tracked Lifts' button")
            print("   3. Select exercises from dropdown")
            return False
        
        # Show some examples
        examples = TrackedExercise.query.limit(5).all()
        print("\n📋 Sample tracked exercises:")
        for ex in examples:
            print(f"   - User {ex.user_id}: {ex.exercise_name} (order: {ex.display_order})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error querying data: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_user_tracked_exercises(user_id=1):
    """Check tracked exercises for a specific user"""
    print("\n" + "="*60)
    print(f"CHECKING: User {user_id} Tracked Exercises")
    print("="*60)
    
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            print(f"❌ User {user_id} does not exist")
            print("\n💡 Available users:")
            users = User.query.limit(5).all()
            for u in users:
                print(f"   - ID: {u.user_id}, Username: {u.username}")
            return False
        
        print(f"✅ User found: {user.username}")
        
        # Get tracked exercises
        tracked = TrackedExercise.query.filter_by(user_id=user_id).all()
        
        if not tracked:
            print(f"\n⚠️  User {user.username} has NO tracked exercises")
            print("\n💡 To add tracked exercises:")
            print(f"   1. Log in as {user.username}")
            print("   2. Go to Progress page")
            print("   3. Click 'Manage Tracked Lifts'")
            print("   4. Select exercises from dropdown")
            return False
        
        print(f"\n📊 User {user.username} is tracking {len(tracked)} exercises:")
        for ex in tracked:
            # Get session count
            from sqlalchemy import func, distinct
            session_count = db.session.query(
                func.count(distinct(Exercise.date))
            ).join(
                StandardExercise,
                Exercise.standard_exercise_id == StandardExercise.standard_exercise_id,
                isouter=True
            ).filter(
                Exercise.user_id == user_id,
                StandardExercise.exercise_name == ex.exercise_name
            ).scalar() or 0
            
            print(f"   {ex.display_order}. {ex.exercise_name} ({session_count} sessions)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoint():
    """Test the API endpoint directly"""
    print("\n" + "="*60)
    print("TESTING: API Endpoint")
    print("="*60)
    
    print("\n💡 To test the API endpoint:")
    print("   1. Make sure the app is running")
    print("   2. Open browser console on Progress page")
    print("   3. Run: fetch('/metrics/api/tracked-exercises').then(r => r.json()).then(console.log)")
    print("\n   Or use curl:")
    print("   curl http://localhost:5000/metrics/api/tracked-exercises -H 'Cookie: your-session-cookie'")


def main():
    """Run all diagnostic checks"""
    print("\n" + "🔍 TrackedExercises Diagnostic Tool")
    print("="*60)
    
    app = create_app()
    
    with app.app_context():
        # Check 1: Table exists
        table_exists = check_table_exists()
        
        if not table_exists:
            print("\n" + "="*60)
            print("⚠️  MIGRATION REQUIRED")
            print("="*60)
            print("\nRun this command:")
            print("   mysql -u root -p fitness_tracker < scripts/migration_add_tracked_exercises.sql")
            print("\nOr using Docker:")
            print("   docker exec -i fitness_tracker_db mysql -u root -pPASSWORD fitness_tracker < scripts/migration_add_tracked_exercises.sql")
            return
        
        # Check 2: Any data exists
        check_table_data()
        
        # Check 3: Specific user data
        print("\n💡 To check a specific user, edit this script and change user_id")
        check_user_tracked_exercises(user_id=1)
        
        # Check 4: API test instructions
        test_api_endpoint()
    
    print("\n" + "="*60)
    print("✅ DIAGNOSTIC COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Review the output above")
    print("2. If table doesn't exist: Run migration")
    print("3. If no data: Add exercises via UI")
    print("4. Check Flask logs for backend errors")
    print("5. Check browser console for frontend errors")
    print()


if __name__ == '__main__':
    main()




