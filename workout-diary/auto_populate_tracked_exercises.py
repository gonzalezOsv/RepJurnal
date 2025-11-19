#!/usr/bin/env python3
"""
Auto-Populate Tracked Exercises for Existing Users

This script automatically adds the top 6 most-performed exercises 
to the TrackedExercises table for users who already have workout history.

Usage:
    python auto_populate_tracked_exercises.py
    
This helps migrate existing users to the new customizable Main Lifts tab.
"""

import os
import sys
from sqlalchemy import func, distinct, or_

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db, User, Exercise, StandardExercise, CustomExercise, TrackedExercise


def get_top_exercises_for_user(user_id, limit=6):
    """
    Get the top most-performed exercises for a user
    Returns list of (exercise_name, session_count) tuples
    """
    # Query to find most-performed exercises
    exercises = db.session.query(
        StandardExercise.exercise_name,
        func.count(distinct(Exercise.date)).label('session_count')
    ).join(
        Exercise,
        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
    ).filter(
        Exercise.user_id == user_id,
        Exercise.exercise_type == 'strength',
        Exercise.weight.isnot(None)
    ).group_by(
        StandardExercise.exercise_name
    ).having(
        func.count(distinct(Exercise.date)) >= 2  # At least 2 sessions
    ).order_by(
        func.count(distinct(Exercise.date)).desc()
    ).limit(limit).all()
    
    return exercises


def populate_tracked_exercises_for_user(user, dry_run=False):
    """
    Populate tracked exercises for a single user
    """
    print(f"\n{'─'*60}")
    print(f"User: {user.username} (ID: {user.user_id})")
    print(f"{'─'*60}")
    
    # Check if user already has tracked exercises
    existing = TrackedExercise.query.filter_by(user_id=user.user_id).count()
    
    if existing > 0:
        print(f"⏭️  User already has {existing} tracked exercises - skipping")
        return 0
    
    # Get top exercises
    top_exercises = get_top_exercises_for_user(user.user_id, limit=6)
    
    if not top_exercises:
        print("ℹ️  No exercises found (user may not have logged workouts yet)")
        return 0
    
    print(f"📊 Found {len(top_exercises)} exercises to track:")
    
    added = 0
    for index, (exercise_name, session_count) in enumerate(top_exercises, 1):
        print(f"   {index}. {exercise_name} ({session_count} sessions)")
        
        if not dry_run:
            # Add to tracked exercises
            tracked = TrackedExercise(
                user_id=user.user_id,
                exercise_name=exercise_name,
                display_order=index
            )
            db.session.add(tracked)
            added += 1
    
    if not dry_run:
        db.session.commit()
        print(f"✅ Added {added} tracked exercises for {user.username}")
    else:
        print(f"🔍 DRY RUN: Would add {added} tracked exercises")
    
    return added


def main():
    """Main execution"""
    print("\n" + "="*60)
    print("Auto-Populate Tracked Exercises for Existing Users")
    print("="*60)
    
    # Check for dry-run mode
    dry_run = '--dry-run' in sys.argv or '-d' in sys.argv
    
    if dry_run:
        print("\n🔍 DRY RUN MODE: No changes will be made to the database")
        print("   (Run without --dry-run to actually add exercises)\n")
    else:
        print("\n⚠️  LIVE MODE: Changes will be saved to the database")
        print("   (Add --dry-run flag to preview without changes)\n")
        
        response = input("Continue? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Aborted.")
            return
    
    app = create_app()
    
    with app.app_context():
        # Get all users
        users = User.query.all()
        
        print(f"\nFound {len(users)} users in the database")
        
        if len(users) == 0:
            print("⚠️  No users found in database!")
            return
        
        total_added = 0
        
        for user in users:
            added = populate_tracked_exercises_for_user(user, dry_run)
            total_added += added
        
        print("\n" + "="*60)
        if dry_run:
            print(f"🔍 DRY RUN COMPLETE")
            print(f"   Would add {total_added} total tracked exercises")
            print("\n   Run without --dry-run to apply changes:")
            print("   python auto_populate_tracked_exercises.py")
        else:
            print(f"✅ COMPLETE")
            print(f"   Added {total_added} total tracked exercises")
            print("\n   Users can now see their top exercises on the Main Lifts tab!")
        print("="*60)
        print()


if __name__ == '__main__':
    main()




