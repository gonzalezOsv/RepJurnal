from flask import Blueprint, jsonify, request, render_template, current_app
from flask_login import login_required, current_user
from .models import User, db, Workout, Exercise, BodyPart, StandardExercise, CustomExercise, TrackedExercise
from .rate_limiter import rate_limit_lenient, rate_limit_strict
from datetime import date, timedelta, datetime

from sqlalchemy import func, extract, distinct, or_

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
def metrics():
    current_app.logger.debug("Loading volume data")
    user = User.query.get(current_user.user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get the volume per body part per week (only strength exercises)
    volume_per_body_part = Exercise.get_volume_per_body_part_per_week(current_user.user_id)
    volume_data = {body_part: volume for body_part, volume in volume_per_body_part}

    # Get the recommended volume based on the user's fitness goal
    recommended_volume = get_recommended_volume(user.fitness_goal.lower())

    # Prepare data for Chart.js
    labels = list(volume_data.keys())
    actual_volumes = list(volume_data.values())
    recommended_volumes = [recommended_volume.get(body_part, 0) for body_part in labels]


    current_app.logger.debug("Volume data loaded")

    return render_template('metrics.html', labels=labels, actual_volumes=actual_volumes, recommended_volumes=recommended_volumes)

# Exercise Consistency Endpoint
# Tracks how often the user has worked out in a given period.
@metrics_bp.route('/api/consistency/', methods=['GET'])
@login_required
def consistency():
    current_app.logger.debug("Loading consistency data")
    

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

    current_app.logger.debug("Consistency data loaded")

    return jsonify({
        "workout_count": len(workout_dates),
        "streak": streak,
    })

# Strength Progression Endpoint (deprecated - use /api/exercise-progression instead)
# Shows progression for key exercises.
# NOTE: This endpoint is deprecated but kept for backward compatibility.
# Use /api/exercise-progression/<exercise_name> for more detailed data.
@metrics_bp.route('/api/progression/<exercise_name>', methods=['GET'])
@login_required
def progression(exercise_name):
    current_app.logger.debug("Loading progression data")

    # Fetch progress for the given exercise (only strength exercises)
    progress = db.session.query(
        Exercise.date,
        func.max(Exercise.weight).label('max_weight')
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.exercise_name == exercise_name,
        Exercise.exercise_type == 'strength',
        Exercise.weight.isnot(None)
    ).group_by(Exercise.date).order_by(Exercise.date).all()

    current_app.logger.debug("Progression data loaded")

    return jsonify({
        "dates": [p.date.strftime('%Y-%m-%d') for p in progress],
        "weights": [p.max_weight for p in progress]
    })

# Total Volume Trend Endpoint
# Tracks the total volume lifted per week.
@metrics_bp.route('/api/volume-trend/', methods=['GET'])
@login_required
def volume_trend():
    current_app.logger.debug("Loading volume trend data")
    
    # Calculate weekly volume for the past 8 weeks
    past_8_weeks = date.today() - timedelta(weeks=8)
    
    # Using extract() for more database-agnostic week calculation (only strength exercises)
    volume_data = db.session.query(
        extract('year', Workout.date).label('year'),
        extract('week', Workout.date).label('week'),
        func.sum(Exercise.weight * Exercise.reps * Exercise.sets).label('total_volume')
    ).join(
        Exercise,
        Workout.workout_id == Exercise.workout_id
    ).filter(
        Workout.user_id == current_user.user_id,
        Workout.date >= past_8_weeks,
        Exercise.exercise_type == 'strength',  # Only count strength exercises
        Exercise.weight.isnot(None),
        Exercise.reps.isnot(None),
        Exercise.sets.isnot(None)
    ).group_by(
        'year',
        'week'
    ).order_by(
        'year',
        'week'
    ).all()
    
    current_app.logger.debug("Volume trend data loaded")
    
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
        current_app.logger.debug("Loading body part imbalance data")
        
        # Get data for the last 30 days by default
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Aggregate volume per body part using proper joins through Workout table (only strength exercises)
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
            Workout.date.between(start_date, end_date),
            Exercise.exercise_type == 'strength',  # Only count strength exercises
            Exercise.weight.isnot(None),
            Exercise.reps.isnot(None),
            Exercise.sets.isnot(None)
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

        current_app.logger.debug("Body part imbalance data loaded")

        return jsonify({
            'data': complete_percentages,
            'total_volume': total_volume,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })

    except Exception as e:
        current_app.logger.error(f"Error in body_part_imbalance: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'An error occurred while calculating body part imbalance',
            'message': str(e)
        }), 500

# Goal Achievement Rate Endpoint
# Shows the percentage of the weekly goal achieved.
@metrics_bp.route('/api/goal-achievement/', methods=['GET'])
@login_required
def goal_achievement():
    current_app.logger.debug("Loading goal achievement data")
    user = User.query.get(current_user.user_id)
    fitness_goal = user.fitness_goal.lower()
    recommended_volume = get_recommended_volume(fitness_goal)

    # Get weekly volume per body part (returns list of tuples)
    weekly_volume_list = Exercise.get_volume_per_body_part_per_week(current_user.user_id)
    weekly_volume = {body_part: volume for body_part, volume in weekly_volume_list}
    achievement = {body_part: (weekly_volume.get(body_part, 0) / recommended_volume.get(body_part, 1)) * 100
                   for body_part in recommended_volume.keys()}
    current_app.logger.debug("Goal achievement data loaded")
    return jsonify(achievement)


# Rest Efficiency Endpoint
# Tracks average rest time between sets.
@metrics_bp.route('/api/rest-efficiency/', methods=['GET'])
@login_required
def rest_efficiency():
    # Fetch rest time for the past week
    current_app.logger.debug("Loading rest efficiency data")
    rest_times = db.session.query(
        Exercise.date,
        func.avg(Exercise.rest_time).label('avg_rest')
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= date.today() - timedelta(days=7)
    ).group_by(Exercise.date).all()

    current_app.logger.debug("Rest efficiency data loaded")

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
    current_app.logger.debug("Loading workout diversity data")
    start_date = date.today() - timedelta(days=30)
    unique_exercises = db.session.query(
        Exercise.exercise_name
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= start_date
    ).distinct().count()
    current_app.logger.debug("Workout diversity data loaded")
    return jsonify({"unique_exercises": unique_exercises})


# Exercise Progression Tracking Endpoints
@metrics_bp.route('/api/exercise-progression/<exercise_name>', methods=['GET'])
@login_required
def get_exercise_progression(exercise_name):
    """
    Get progression data for a specific exercise (max weight over time).
    Returns dates and max weights for charting.
    """
    current_app.logger.debug(f"Loading progression for {exercise_name}")
    
    try:
        # Get progression data for the exercise from all sources:
        # 1. StandardExercises
        # 2. CustomExercises
        # 3. Legacy exercises with just exercise_name field
        
        # Query exercises that match the name from any source
        progression_data = db.session.query(
            Exercise.date,
            func.max(Exercise.weight).label('max_weight'),
            func.sum(Exercise.weight * Exercise.reps * Exercise.sets).label('total_volume')
        ).outerjoin(
            StandardExercise,
            Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
        ).outerjoin(
            CustomExercise,
            Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.exercise_type == 'strength',
            Exercise.weight.isnot(None),
            Exercise.reps.isnot(None),
            Exercise.sets.isnot(None),
            or_(
                StandardExercise.exercise_name == exercise_name,
                CustomExercise.exercise_name == exercise_name,
                Exercise.exercise_name == exercise_name
            )
        ).group_by(
            Exercise.date
        ).order_by(
            Exercise.date
        ).all()
        
        current_app.logger.info(f"Found {len(progression_data)} data points for {exercise_name}")
        
        # Format the response
        dates = [p.date.strftime('%Y-%m-%d') for p in progression_data]
        max_weights = [float(p.max_weight) if p.max_weight else 0 for p in progression_data]
        volumes = [float(p.total_volume) if p.total_volume else 0 for p in progression_data]
        
        # Calculate personal record
        pr_weight = max(max_weights) if max_weights else 0
        pr_date = dates[max_weights.index(pr_weight)] if max_weights else None
        
        current_app.logger.debug(f"Progression for {exercise_name} loaded: {len(dates)} sessions, PR: {pr_weight}")
        
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
        current_app.logger.error(f"Error getting progression for {exercise_name}: {str(e)}", exc_info=True)
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
    Get list of exercises the user has selected to track on the Main Lifts tab.
    Uses the TrackedExercises table for user preferences.
    """
    try:
        current_app.logger.info(f"Fetching tracked exercises for user: {current_user.user_id}")
        
        # Get user's tracked exercises from the database
        tracked_exercises = db.session.query(
            TrackedExercise.exercise_name,
            TrackedExercise.display_order,
            TrackedExercise.tracked_exercise_id
        ).filter(
            TrackedExercise.user_id == current_user.user_id,
            TrackedExercise.exercise_name.isnot(None),  # Filter out null names
            TrackedExercise.exercise_name != ''  # Filter out empty names
        ).order_by(
            TrackedExercise.display_order
        ).all()
        
        current_app.logger.info(f"Found {len(tracked_exercises)} tracked exercises in database")
        
        tracked = []
        for tracked_ex in tracked_exercises:
            # Get session count for this exercise
            session_count = db.session.query(
                func.count(distinct(Exercise.date))
            ).join(
                StandardExercise,
                Exercise.standard_exercise_id == StandardExercise.standard_exercise_id,
                isouter=True
            ).join(
                CustomExercise,
                Exercise.custom_exercise_id == CustomExercise.custom_exercise_id,
                isouter=True
            ).filter(
                Exercise.user_id == current_user.user_id,
                (
                    (StandardExercise.exercise_name == tracked_ex.exercise_name) |
                    (CustomExercise.exercise_name == tracked_ex.exercise_name)
                )
            ).scalar() or 0
            
            tracked.append({
                'exercise_name': tracked_ex.exercise_name,
                'session_count': session_count,
                'display_order': tracked_ex.display_order,
                'tracked_exercise_id': tracked_ex.tracked_exercise_id
            })
            
            current_app.logger.info(f"  - {tracked_ex.exercise_name}: {session_count} sessions")
        
        return jsonify({
            'tracked_exercises': tracked
        })
        
    except Exception as e:
        current_app.logger.error(f"Error fetching tracked exercises: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'tracked_exercises': []
        }), 500


@metrics_bp.route('/api/tracked-exercises', methods=['POST'])
@login_required
@rate_limit_strict(max_requests=20, time_window_seconds=60)
def add_tracked_exercise():
    """
    Add a new exercise to user's tracked exercises.
    """
    try:
        data = request.get_json()
        exercise_name = data.get('exercise_name', '').strip()
        
        if not exercise_name:
            return jsonify({'error': 'Exercise name is required'}), 400
        
        # Validate exercise name for security (prevent XSS, SQL injection)
        from .validators import validate_exercise_name, sanitize_input
        is_valid, error = validate_exercise_name(exercise_name)
        if not is_valid:
            current_app.logger.warning(f"Invalid exercise name from user {current_user.user_id}: {error}")
            return jsonify({'error': error}), 400
        
        # Sanitize exercise name
        exercise_name = sanitize_input(exercise_name, 100, allow_special_chars=True)
        
        # Check if already tracking this exercise
        existing = TrackedExercise.query.filter_by(
            user_id=current_user.user_id,
            exercise_name=exercise_name
        ).first()
        
        if existing:
            return jsonify({'error': 'Already tracking this exercise'}), 400
        
        # Get the max display order and add 1
        max_order = db.session.query(
            func.max(TrackedExercise.display_order)
        ).filter(
            TrackedExercise.user_id == current_user.user_id
        ).scalar() or 0
        
        # Create new tracked exercise
        new_tracked = TrackedExercise(
            user_id=current_user.user_id,
            exercise_name=exercise_name,
            display_order=max_order + 1
        )
        
        db.session.add(new_tracked)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'tracked_exercise': new_tracked.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding tracked exercise: {str(e)}")
        return jsonify({'error': 'Failed to add tracked exercise'}), 500


@metrics_bp.route('/api/tracked-exercises/<int:tracked_exercise_id>', methods=['DELETE'])
@login_required
@rate_limit_strict(max_requests=20, time_window_seconds=60)
def remove_tracked_exercise(tracked_exercise_id):
    """
    Remove an exercise from user's tracked exercises.
    """
    try:
        tracked_ex = TrackedExercise.query.filter_by(
            tracked_exercise_id=tracked_exercise_id,
            user_id=current_user.user_id
        ).first()
        
        if not tracked_ex:
            return jsonify({'error': 'Tracked exercise not found'}), 404
        
        db.session.delete(tracked_ex)
        db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing tracked exercise: {str(e)}")
        return jsonify({'error': 'Failed to remove tracked exercise'}), 500


@metrics_bp.route('/api/tracked-exercises/reorder', methods=['POST'])
@login_required
@rate_limit_strict(max_requests=20, time_window_seconds=60)
def reorder_tracked_exercises():
    """
    Reorder user's tracked exercises.
    Expects: { "exercise_ids": [id1, id2, id3, ...] }
    """
    try:
        data = request.get_json()
        exercise_ids = data.get('exercise_ids', [])
        
        if not exercise_ids:
            return jsonify({'error': 'No exercise IDs provided'}), 400
        
        # Update display order for each exercise
        for index, exercise_id in enumerate(exercise_ids):
            TrackedExercise.query.filter_by(
                tracked_exercise_id=exercise_id,
                user_id=current_user.user_id
            ).update({'display_order': index + 1})
        
        db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error reordering tracked exercises: {str(e)}")
        return jsonify({'error': 'Failed to reorder exercises'}), 500


@metrics_bp.route('/api/available-exercises', methods=['GET'])
@login_required
def get_available_exercises():
    """
    Get list of all available exercises that can be tracked.
    """
    try:
        current_app.logger.info(f"Fetching available exercises for user: {current_user.user_id}")
        
        # First, let's check what exercises exist for this user
        total_exercises = db.session.query(func.count(Exercise.exercise_id)).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.exercise_type == 'strength'
        ).scalar()
        current_app.logger.info(f"User has {total_exercises} total strength exercises")
        
        # Check breakdown
        standard_count = db.session.query(func.count(Exercise.exercise_id)).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.exercise_type == 'strength',
            Exercise.standard_exercise_id.isnot(None)
        ).scalar()
        custom_count = db.session.query(func.count(Exercise.exercise_id)).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.exercise_type == 'strength',
            Exercise.custom_exercise_id.isnot(None)
        ).scalar()
        name_only_count = db.session.query(func.count(Exercise.exercise_id)).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.exercise_type == 'strength',
            Exercise.exercise_name.isnot(None),
            Exercise.standard_exercise_id.is_(None),
            Exercise.custom_exercise_id.is_(None)
        ).scalar()
        current_app.logger.info(f"Breakdown: {standard_count} standard, {custom_count} custom, {name_only_count} name-only")
        
        # Get exercises with standard_exercise_id
        standard_exercises = []
        try:
            standard_exercises = db.session.query(
                StandardExercise.exercise_name,
                BodyPart.body_part_name,
                func.count(Exercise.exercise_id).label('times_performed')
            ).join(
                Exercise,
                Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
            ).outerjoin(
                BodyPart,
                StandardExercise.body_part_id == BodyPart.body_part_id
            ).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.exercise_type == 'strength',
                Exercise.standard_exercise_id.isnot(None)
            ).group_by(
                StandardExercise.exercise_name,
                BodyPart.body_part_name
            ).all()
            current_app.logger.info(f"Standard exercises query: found {len(standard_exercises)}")
        except Exception as e:
            current_app.logger.error(f"Error querying standard exercises: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Get exercises with custom_exercise_id
        custom_exercises = []
        try:
            custom_exercises = db.session.query(
                CustomExercise.exercise_name,
                BodyPart.body_part_name,
                func.count(Exercise.exercise_id).label('times_performed')
            ).join(
                Exercise,
                Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
            ).outerjoin(
                BodyPart,
                CustomExercise.body_part_id == BodyPart.body_part_id
            ).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.exercise_type == 'strength',
                Exercise.custom_exercise_id.isnot(None)
            ).group_by(
                CustomExercise.exercise_name,
                BodyPart.body_part_name
            ).all()
            current_app.logger.info(f"Custom exercises query: found {len(custom_exercises)}")
        except Exception as e:
            current_app.logger.error(f"Error querying custom exercises: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Get exercises with just exercise_name (legacy)
        name_only_exercises = []
        try:
            name_only_exercises = db.session.query(
                Exercise.exercise_name,
                BodyPart.body_part_name,
                func.count(Exercise.exercise_id).label('times_performed')
            ).outerjoin(
                BodyPart,
                Exercise.body_part_id == BodyPart.body_part_id
            ).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.exercise_type == 'strength',
                Exercise.exercise_name.isnot(None),
                Exercise.standard_exercise_id.is_(None),
                Exercise.custom_exercise_id.is_(None)
            ).group_by(
                Exercise.exercise_name,
                BodyPart.body_part_name
            ).all()
            current_app.logger.info(f"Name-only exercises query: found {len(name_only_exercises)}")
        except Exception as e:
            current_app.logger.error(f"Error querying name-only exercises: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Combine all results
        all_exercises = list(standard_exercises) + list(custom_exercises) + list(name_only_exercises)
        current_app.logger.info(f"Found {len(all_exercises)} total exercises after grouping ({len(standard_exercises)} standard, {len(custom_exercises)} custom, {len(name_only_exercises)} name-only)")
        
        # Group by body part
        by_body_part = {}
        for ex in all_exercises:
            if not ex.exercise_name:
                current_app.logger.warning(f"Skipping exercise with missing name: {ex}")
                continue
                
            body_part = ex.body_part_name or 'Unknown'
            if body_part not in by_body_part:
                by_body_part[body_part] = []
            by_body_part[body_part].append({
                'exercise_name': ex.exercise_name,
                'times_performed': int(ex.times_performed) if ex.times_performed else 0
            })
        
        current_app.logger.info(f"Grouped into {len(by_body_part)} body parts")
        for body_part, exs in by_body_part.items():
            current_app.logger.info(f"  - {body_part}: {len(exs)} exercises")
        
        return jsonify({
            'exercises_by_body_part': by_body_part
        })
        
    except Exception as e:
        current_app.logger.error(f"Error fetching available exercises: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'exercises_by_body_part': {}
        }), 500


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


