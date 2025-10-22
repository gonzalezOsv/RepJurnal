from flask import Blueprint, jsonify, request, render_template, current_app
from flask_login import login_required, current_user
from .models import User, db, Workout, Exercise, BodyPart, StandardExercise, CustomExercise
from datetime import date, timedelta, datetime

from sqlalchemy import func, extract

metrics_bp = Blueprint('metrics', __name__)

RECOMMENDED_VOLUME = {
    'strength': {
        'Chest': 10000,  # Example values in kg
        'Back': 12000,
        'Legs': 15000,
        # Add more body parts as needed
    },
    'muscle_growth': {
        'Chest': 15000,
        'Back': 18000,
        'Legs': 20000,
        # Add more body parts as needed
    }
}

def get_recommended_volume(fitness_goal):
    return RECOMMENDED_VOLUME.get(fitness_goal, {})


@metrics_bp.route('/api/volume/')
@login_required
def metrics(user_id):
    print("loading... volume")
    user = User.query.get(current_user.user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get the volume per body part per week
    volume_per_body_part = Exercise.get_volume_per_body_part_per_week(user_id)
    volume_data = {body_part: volume for body_part, volume in volume_per_body_part}

    # Get the recommended volume based on the user's fitness goal
    recommended_volume = get_recommended_volume(user.fitness_goal.lower())

    # Prepare data for Chart.js
    labels = list(volume_data.keys())
    actual_volumes = list(volume_data.values())
    recommended_volumes = [recommended_volume.get(body_part, 0) for body_part in labels]


    print("done... volume")

    return render_template('metrics.html', labels=labels, actual_volumes=actual_volumes, recommended_volumes=recommended_volumes)

# Exercise Consistency Endpoint
# Tracks how often the user has worked out in a given period.
@metrics_bp.route('/api/consistency/', methods=['GET'])
@login_required
def consistency():
    print("loading... consistency")
    

    # Get workout dates for the last 30 days
    today = date.today()
    start_date = today - timedelta(days=30)
    workouts = Workout.query.filter(
        Workout.user_id == current_user.user_id,
        Workout.date >= start_date
    ).all()

    # Calculate workout frequency
    workout_dates = {workout.date for workout in workouts}
    streak = 0
    for i in range(30):
        if (today - timedelta(days=i)) in workout_dates:
            streak += 1
        else:
            break

    print("done... consistency")

    return jsonify({
        "workout_count": len(workout_dates),
        "streak": streak,
    })

# Strength Progression Endpoint
# Shows progression for key exercises.
@metrics_bp.route('/api/progression/<exercise_name>', methods=['GET'])
@login_required
def progression(exercise_name):
    print("loading... progression")

    # Fetch progress for the given exercise
    progress = db.session.query(
        Exercise.date,
        func.max(Exercise.weight).label('max_weight')
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.exercise_name == exercise_name
    ).group_by(Exercise.date).order_by(Exercise.date).all()

    print("done... progression")

    return jsonify({
        "dates": [p.date.strftime('%Y-%m-%d') for p in progress],
        "weights": [p.max_weight for p in progress]
    })

# Total Volume Trend Endpoint
# Tracks the total volume lifted per week.
@metrics_bp.route('/api/volume-trend/', methods=['GET'])
@login_required
def volume_trend():
    print("loading... volume trend")
    
    # Calculate weekly volume for the past 8 weeks
    past_8_weeks = date.today() - timedelta(weeks=8)
    
    # Using extract() for more database-agnostic week calculation
    volume_data = db.session.query(
        extract('year', Workout.date).label('year'),
        extract('week', Workout.date).label('week'),
        func.sum(Exercise.weight * Exercise.reps * Exercise.sets).label('total_volume')
    ).join(
        Exercise,
        Workout.workout_id == Exercise.workout_id
    ).filter(
        Workout.user_id == current_user.user_id,
        Workout.date >= past_8_weeks
    ).group_by(
        'year',
        'week'
    ).order_by(
        'year',
        'week'
    ).all()
    
    print("done... volume trend")
    
    # Format the response data
    formatted_data = [{
        'week': f"{row.year}-{row.week:02d}",
        'volume': float(row.total_volume) if row.total_volume else 0
    } for row in volume_data]
    
    return jsonify({
        "weeks": [data['week'] for data in formatted_data],
        "volumes": [data['volume'] for data in formatted_data]
    })


# Body Part Imbalance Endpoint
# Displays percentage distribution of training volume by body part.
@metrics_bp.route('/api/body-part-imbalance/', methods=['GET'])
@login_required
def body_part_imbalance():
    try:
        print("loading... body part imbalance")
        
        # Get data for the last 30 days by default
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Aggregate volume per body part using proper joins through Workout table
        volume_data = db.session.query(
            BodyPart.body_part_name,
            func.coalesce(
                func.sum(Exercise.weight * Exercise.reps * Exercise.sets),
                0
            ).label('total_volume')
        ).join(
            Exercise,
            Exercise.body_part_id == BodyPart.body_part_id
        ).join(
            Workout,
            Exercise.workout_id == Workout.workout_id
        ).filter(
            Workout.user_id == current_user.user_id,
            Workout.date.between(start_date, end_date)
        ).group_by(
            BodyPart.body_part_name
        ).all()

        # Calculate percentages with error handling for zero total volume
        total_volume = sum(float(v.total_volume) for v in volume_data)
        
        if total_volume == 0:
            return jsonify({
                'error': 'No workout data found for the specified period',
                'data': {},
                'total_volume': 0
            })

        # Calculate percentages and round to 2 decimal places
        percentages = {
            v.body_part_name: round((float(v.total_volume) / total_volume) * 100, 2)
            for v in volume_data
        }

        # Get all body parts to ensure we include ones with no volume
        all_body_parts = db.session.query(BodyPart.body_part_name).all()
        
        # Create complete response with 0% for unused body parts
        complete_percentages = {
            body_part[0]: percentages.get(body_part[0], 0)
            for body_part in all_body_parts
        }

        print("done... body part imbalance")

        return jsonify({
            'data': complete_percentages,
            'total_volume': total_volume,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })

    except Exception as e:
        print(f"Error in body_part_imbalance: {str(e)}")
        return jsonify({
            'error': 'An error occurred while calculating body part imbalance',
            'message': str(e)
        }), 500

# Goal Achievement Rate Endpoint
# Shows the percentage of the weekly goal achieved.
@metrics_bp.route('/api/goal-achievement/', methods=['GET'])
@login_required
def goal_achievement():
    print("loading... goal achivement")
    user = User.query.get(current_user.user_id)
    fitness_goal = user.fitness_goal.lower()
    recommended_volume = get_recommended_volume(fitness_goal)

    # Get weekly volume per body part
    weekly_volume = Exercise.get_volume_per_body_part_per_week(current_user.user_id)
    achievement = {body_part: (weekly_volume.get(body_part, 0) / recommended_volume.get(body_part, 1)) * 100
                   for body_part in recommended_volume.keys()}
    print("done... goal achivement")
    return jsonify(achievement)


# Rest Efficiency Endpoint
# Tracks average rest time between sets.
@metrics_bp.route('/api/rest-efficiency/', methods=['GET'])
@login_required
def rest_efficiency():
    # Fetch rest time for the past week
    print("loading... rest efficinecy")
    rest_times = db.session.query(
        Exercise.date,
        func.avg(Exercise.rest_time).label('avg_rest')
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= date.today() - timedelta(days=7)
    ).group_by(Exercise.date).all()

    print("done... rest efficinecy")

    return jsonify({
        "dates": [r.date.strftime('%Y-%m-%d') for r in rest_times],
        "average_rest_times": [r.avg_rest for r in rest_times]
    })


# Workout Diversity Endpoint
# Tracks the number of unique exercises performed.
@metrics_bp.route('/api/workout-diversity/', methods=['GET'])
@login_required
def workout_diversity():
    # Fetch unique exercises performed in the last month
    print("loading... workout diversity")
    start_date = date.today() - timedelta(days=30)
    unique_exercises = db.session.query(
        Exercise.exercise_name
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= start_date
    ).distinct().count()
    print("done... workout diversity")
    return jsonify({"unique_exercises": unique_exercises})


# Exercise Progression Tracking Endpoints
@metrics_bp.route('/api/exercise-progression/<exercise_name>', methods=['GET'])
@login_required
def get_exercise_progression(exercise_name):
    """
    Get progression data for a specific exercise (max weight over time).
    Returns dates and max weights for charting.
    """
    print(f"loading... progression for {exercise_name}")
    
    try:
        # Get progression data for the exercise
        # Query for max weight per date
        progression_data = db.session.query(
            Exercise.date,
            func.max(Exercise.weight).label('max_weight'),
            func.sum(Exercise.weight * Exercise.reps * Exercise.sets).label('total_volume')
        ).join(
            StandardExercise,
            Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
        ).filter(
            Exercise.user_id == current_user.user_id,
            StandardExercise.exercise_name == exercise_name
        ).group_by(
            Exercise.date
        ).order_by(
            Exercise.date
        ).all()
        
        # Format the response
        dates = [p.date.strftime('%Y-%m-%d') for p in progression_data]
        max_weights = [float(p.max_weight) if p.max_weight else 0 for p in progression_data]
        volumes = [float(p.total_volume) if p.total_volume else 0 for p in progression_data]
        
        # Calculate personal record
        pr_weight = max(max_weights) if max_weights else 0
        pr_date = dates[max_weights.index(pr_weight)] if max_weights else None
        
        print(f"done... progression for {exercise_name}")
        
        return jsonify({
            'exercise_name': exercise_name,
            'dates': dates,
            'max_weights': max_weights,
            'volumes': volumes,
            'personal_record': {
                'weight': pr_weight,
                'date': pr_date
            },
            'total_sessions': len(dates)
        })
        
    except Exception as e:
        print(f"Error getting progression for {exercise_name}: {str(e)}")
        return jsonify({
            'error': f'Failed to load progression data: {str(e)}',
            'exercise_name': exercise_name,
            'dates': [],
            'max_weights': [],
            'volumes': [],
            'personal_record': {'weight': 0, 'date': None},
            'total_sessions': 0
        }), 500


@metrics_bp.route('/api/tracked-exercises', methods=['GET'])
@login_required
def get_tracked_exercises():
    """
    Get list of exercises the user wants to track.
    Returns default exercises (Bench, Squat, Deadlift) plus user-selected custom ones.
    """
    # Default exercises to always track
    default_exercises = ['Bench Press', 'Squats', 'Deadlift']
    
    # TODO: In the future, fetch from a UserTrackedExercises table
    # For now, return defaults plus check which exercises user has actually performed
    user_exercises = db.session.query(
        StandardExercise.exercise_name,
        func.count(Exercise.exercise_id).label('session_count'),
        func.max(Exercise.date).label('last_performed')
    ).join(
        Exercise,
        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
    ).filter(
        Exercise.user_id == current_user.user_id
    ).group_by(
        StandardExercise.exercise_name
    ).having(
        func.count(Exercise.exercise_id) >= 2  # At least 2 sessions to show progression
    ).order_by(
        func.count(Exercise.exercise_id).desc()
    ).all()
    
    tracked = []
    for exercise in user_exercises:
        tracked.append({
            'exercise_name': exercise.exercise_name,
            'session_count': exercise.session_count,
            'last_performed': exercise.last_performed.strftime('%Y-%m-%d') if exercise.last_performed else None,
            'is_default': exercise.exercise_name in default_exercises
        })
    
    return jsonify({
        'tracked_exercises': tracked,
        'default_exercises': default_exercises
    })


@metrics_bp.route('/api/available-exercises', methods=['GET'])
@login_required
def get_available_exercises():
    """
    Get list of all available exercises that can be tracked.
    """
    # Get all exercises the user has performed at least once
    exercises = db.session.query(
        StandardExercise.exercise_name,
        BodyPart.body_part_name,
        func.count(Exercise.exercise_id).label('times_performed')
    ).join(
        Exercise,
        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
    ).join(
        BodyPart,
        StandardExercise.body_part_id == BodyPart.body_part_id
    ).filter(
        Exercise.user_id == current_user.user_id
    ).group_by(
        StandardExercise.exercise_name,
        BodyPart.body_part_name
    ).order_by(
        BodyPart.body_part_name,
        StandardExercise.exercise_name
    ).all()
    
    # Group by body part
    by_body_part = {}
    for ex in exercises:
        if ex.body_part_name not in by_body_part:
            by_body_part[ex.body_part_name] = []
        by_body_part[ex.body_part_name].append({
            'exercise_name': ex.exercise_name,
            'times_performed': ex.times_performed
        })
    
    return jsonify({
        'exercises_by_body_part': by_body_part
    })


@metrics_bp.route('/api/body-part-balance')
@login_required
def body_part_balance():
    """
    Analyze workout balance across body parts over the last 7 days.
    Returns frequency data and recommendations.
    """
    # Get last 7 days of workouts
    seven_days_ago = datetime.now() - timedelta(days=7)
    
    # Query to get workout frequency per body part
    body_part_frequency = db.session.query(
        BodyPart.body_part_name,
        func.count(func.distinct(func.date(Exercise.date))).label('days_worked')
    ).join(
        Exercise, Exercise.body_part_id == BodyPart.body_part_id
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= seven_days_ago.date()
    ).group_by(
        BodyPart.body_part_name
    ).all()
    
    # Get all body parts for reference
    all_body_parts = db.session.query(BodyPart.body_part_name).all()
    all_body_part_names = {bp.body_part_name for bp in all_body_parts}
    
    # Build frequency map
    frequency_map = {bp.body_part_name: bp.days_worked for bp in body_part_frequency}
    
    # Analyze and categorize body parts
    overworked = []  # 4+ days in last 7 days
    balanced = []    # 2-3 days in last 7 days
    underworked = [] # 1 day in last 7 days
    neglected = []   # 0 days in last 7 days
    
    # Major muscle groups to focus on
    major_groups = {
        'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 
        'Abs', 'Glutes', 'Quads', 'Hamstrings', 'Calves'
    }
    
    for body_part in all_body_part_names:
        if body_part not in major_groups:
            continue  # Skip minor/compound categories
            
        days = frequency_map.get(body_part, 0)
        
        if days >= 4:
            status = 'overworked'
            overworked.append({
                'name': body_part,
                'days_worked': days,
                'status': status,
                'color': 'red'
            })
        elif days >= 2:
            status = 'balanced'
            balanced.append({
                'name': body_part,
                'days_worked': days,
                'status': status,
                'color': 'green'
            })
        elif days == 1:
            status = 'underworked'
            underworked.append({
                'name': body_part,
                'days_worked': days,
                'status': status,
                'color': 'yellow'
            })
        else:
            status = 'neglected'
            neglected.append({
                'name': body_part,
                'days_worked': days,
                'status': status,
                'color': 'gray'
            })
    
    # Generate recommendations
    recommendations = []
    
    if overworked:
        recommendations.append({
            'type': 'warning',
            'message': f"⚠️ You're overworking: {', '.join([bp['name'] for bp in overworked])}. Consider giving these muscle groups more rest to prevent injury and allow recovery."
        })
    
    if neglected:
        recommendations.append({
            'type': 'alert',
            'message': f"🎯 You haven't trained: {', '.join([bp['name'] for bp in neglected])}. Add these to your routine for balanced development."
        })
    
    if underworked:
        recommendations.append({
            'type': 'info',
            'message': f"💪 Consider increasing frequency for: {', '.join([bp['name'] for bp in underworked])}. These muscle groups could benefit from more attention."
        })
    
    if balanced and not overworked and not neglected:
        recommendations.append({
            'type': 'success',
            'message': f"✅ Great balance! You're training {', '.join([bp['name'] for bp in balanced])} with optimal frequency."
        })
    
    return jsonify({
        'overworked': overworked,
        'balanced': balanced,
        'underworked': underworked,
        'neglected': neglected,
        'recommendations': recommendations,
        'summary': {
            'total_body_parts_tracked': len(frequency_map),
            'overworked_count': len(overworked),
            'balanced_count': len(balanced),
            'underworked_count': len(underworked),
            'neglected_count': len(neglected)
        }
    })


