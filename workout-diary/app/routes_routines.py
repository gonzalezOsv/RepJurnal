from flask import Blueprint, jsonify, render_template, request, session
from flask_login import login_required, current_user
from .models import db, WorkoutRoutine, RoutineExercise, BodyPart, RoutineSession, RoutineStats, UserRoutineStats
from .validators import sanitize_input
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from datetime import datetime, timedelta

routines_bp = Blueprint('routines', __name__)


@routines_bp.route('/routines')
@login_required
def routines():
    """Display the workout routines page with user privacy settings"""
    # Pass user privacy settings to enforce on frontend
    user_settings = {
        'show_routines_to_public': current_user.show_routines_to_public if hasattr(current_user, 'show_routines_to_public') else False,
        'profile_visibility': current_user.profile_visibility if hasattr(current_user, 'profile_visibility') else 'private',
        'show_stats_to_friends': current_user.show_stats_to_friends if hasattr(current_user, 'show_stats_to_friends') else False,
        'show_workouts_to_friends': current_user.show_workouts_to_friends if hasattr(current_user, 'show_workouts_to_friends') else False
    }
    return render_template('my_routines.html', user_settings=user_settings)


@routines_bp.route('/api/routines', methods=['GET'])
@login_required
def get_routines():
    """Get all routines for the current user with stats (excludes soft-deleted)"""
    # Use joinedload to eager load relationships for better performance
    routines = WorkoutRoutine.query.options(
        joinedload(WorkoutRoutine.imported_from_user)
    ).filter_by(user_id=current_user.user_id, is_deleted=False)\
        .order_by(WorkoutRoutine.created_at.desc()).all()
    
    routines_data = []
    for routine in routines:
        exercises_data = []
        for exercise in routine.exercises:
            exercises_data.append({
                'routine_exercise_id': exercise.routine_exercise_id,
                'body_part': exercise.body_part.body_part_name if exercise.body_part else None,
                'exercise_name': exercise.exercise_name,
                'sets': exercise.sets,
                'reps': exercise.reps,
                'weight': exercise.weight,
                'unit': exercise.unit,
                'exercise_order': exercise.exercise_order,
                'exercise_type': exercise.exercise_type,
                'duration_minutes': exercise.duration_minutes,
                'distance_miles': exercise.distance_miles,
                'distance_km': exercise.distance_km,
                'intensity': exercise.intensity
            })
        
        # Get or create stats for this routine
        routine_stats = RoutineStats.query.filter_by(routine_id=routine.routine_id).first()
        user_stats = UserRoutineStats.query.filter_by(
            user_id=current_user.user_id,
            routine_id=routine.routine_id
        ).first()
        
        # Build stats objects
        public_stats = {
            'times_copied': routine_stats.times_copied if routine_stats else 0,
            'total_completions': routine_stats.total_completions_all_users if routine_stats else 0,
            'active_users': routine_stats.active_users_count if routine_stats else 0,
            'popularity_score': routine_stats.popularity_score if routine_stats else 0,
            'last_used_by_anyone': routine_stats.last_used_by_anyone.isoformat() if routine_stats and routine_stats.last_used_by_anyone else None
        }
        
        personal_stats = {
            'times_completed': user_stats.times_completed if user_stats else 0,
            'last_used': user_stats.last_used.isoformat() if user_stats and user_stats.last_used else None,
            'total_volume': user_stats.total_volume_lifted if user_stats else 0,
            'current_streak': user_stats.current_streak if user_stats else 0,
            'longest_streak': user_stats.longest_streak if user_stats else 0,
            'average_duration': user_stats.average_duration if user_stats else None,
            'best_time': user_stats.best_completion_time if user_stats else None
        }
        
        routines_data.append({
            'routine_id': routine.routine_id,
            'routine_name': routine.routine_name,
            'description': routine.description,
            'visibility': routine.visibility if routine.visibility else 'private',
            'is_imported': routine.is_imported if routine.is_imported else False,
            'imported_from_username': routine.imported_from_user.username if routine.imported_from_user else None,
            'created_at': routine.created_at.isoformat() if routine.created_at else None,
            'updated_at': routine.updated_at.isoformat() if routine.updated_at else None,
            'exercises': exercises_data,
            'public_stats': public_stats,
            'personal_stats': personal_stats
        })
    
    return jsonify({'routines': routines_data})


@routines_bp.route('/api/routines', methods=['POST'])
@login_required
def create_routine():
    """Create a new workout routine"""
    data = request.get_json()
    
    routine_name = sanitize_input(data.get('routine_name', '').strip())
    description = sanitize_input(data.get('description', '').strip()) if data.get('description') else None
    visibility = data.get('visibility', 'private')  # Get visibility setting, default to private
    exercises = data.get('exercises', [])
    
    if not routine_name:
        return jsonify({'error': 'Routine name is required'}), 400
    
    # Validate visibility value
    if visibility not in ['public', 'private', 'friends_only']:
        visibility = 'private'
    
    # ENFORCE PRIVACY SETTINGS - Check if user allows public routines
    if visibility == 'public':
        show_routines_to_public = getattr(current_user, 'show_routines_to_public', False)
        if not show_routines_to_public:
            return jsonify({
                'error': 'You cannot create public routines. Please enable "Public Routines" in your Account Settings first.',
                'privacy_restriction': True
            }), 403
    
    # Create the routine
    routine = WorkoutRoutine(
        user_id=current_user.user_id,
        routine_name=routine_name,
        description=description,
        visibility=visibility
    )
    db.session.add(routine)
    db.session.flush()  # Get the routine_id
    
    # Add exercises
    for idx, exercise_data in enumerate(exercises):
        body_part_name = exercise_data.get('body_part')
        body_part = BodyPart.query.filter_by(body_part_name=body_part_name).first()
        
        if not body_part:
            db.session.rollback()
            return jsonify({'error': f'Body part "{body_part_name}" not found'}), 400
        
        exercise_type = exercise_data.get('exercise_type', 'strength')
        
        routine_exercise = RoutineExercise(
            routine_id=routine.routine_id,
            body_part_id=body_part.body_part_id,
            exercise_name=sanitize_input(exercise_data.get('exercise_name', '').strip()),
            exercise_order=idx,
            exercise_type=exercise_type
        )
        
        if exercise_type == 'strength':
            routine_exercise.sets = exercise_data.get('sets')
            routine_exercise.reps = exercise_data.get('reps')
            routine_exercise.weight = exercise_data.get('weight')
            routine_exercise.unit = exercise_data.get('unit', 'lb')
        else:  # cardio
            routine_exercise.duration_minutes = exercise_data.get('duration_minutes')
            routine_exercise.distance_miles = exercise_data.get('distance_miles')
            routine_exercise.distance_km = exercise_data.get('distance_km')
            routine_exercise.intensity = exercise_data.get('intensity')
        
        db.session.add(routine_exercise)
    
    # Create initial stats records
    routine_stats = RoutineStats(routine_id=routine.routine_id)
    user_stats = UserRoutineStats(
        user_id=current_user.user_id,
        routine_id=routine.routine_id
    )
    db.session.add(routine_stats)
    db.session.add(user_stats)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Routine created successfully', 'routine_id': routine.routine_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@routines_bp.route('/api/routines/<int:routine_id>', methods=['PUT'])
@login_required
def update_routine(routine_id):
    """Update an existing workout routine"""
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    data = request.get_json()
    
    routine.routine_name = sanitize_input(data.get('routine_name', routine.routine_name).strip())
    routine.description = sanitize_input(data.get('description', '').strip()) if data.get('description') else None
    
    # Update visibility if provided
    if 'visibility' in data:
        visibility = data.get('visibility', 'private')
        if visibility in ['public', 'private', 'friends_only']:
            # ENFORCE PRIVACY SETTINGS - Check if user allows public routines
            if visibility == 'public':
                show_routines_to_public = getattr(current_user, 'show_routines_to_public', False)
                if not show_routines_to_public:
                    return jsonify({
                        'error': 'You cannot make routines public. Please enable "Public Routines" in your Account Settings first.',
                        'privacy_restriction': True
                    }), 403
            routine.visibility = visibility
    
    # Delete existing exercises
    RoutineExercise.query.filter_by(routine_id=routine_id).delete()
    
    # Add updated exercises
    exercises = data.get('exercises', [])
    for idx, exercise_data in enumerate(exercises):
        body_part_name = exercise_data.get('body_part')
        body_part = BodyPart.query.filter_by(body_part_name=body_part_name).first()
        
        if not body_part:
            db.session.rollback()
            return jsonify({'error': f'Body part "{body_part_name}" not found'}), 400
        
        exercise_type = exercise_data.get('exercise_type', 'strength')
        
        routine_exercise = RoutineExercise(
            routine_id=routine.routine_id,
            body_part_id=body_part.body_part_id,
            exercise_name=sanitize_input(exercise_data.get('exercise_name', '').strip()),
            exercise_order=idx,
            exercise_type=exercise_type
        )
        
        if exercise_type == 'strength':
            routine_exercise.sets = exercise_data.get('sets')
            routine_exercise.reps = exercise_data.get('reps')
            routine_exercise.weight = exercise_data.get('weight')
            routine_exercise.unit = exercise_data.get('unit', 'lb')
        else:  # cardio
            routine_exercise.duration_minutes = exercise_data.get('duration_minutes')
            routine_exercise.distance_miles = exercise_data.get('distance_miles')
            routine_exercise.distance_km = exercise_data.get('distance_km')
            routine_exercise.intensity = exercise_data.get('intensity')
        
        db.session.add(routine_exercise)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Routine updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@routines_bp.route('/api/routines/<int:routine_id>', methods=['DELETE'])
@login_required
def delete_routine(routine_id):
    """
    Delete a workout routine.
    - Imported routines: Soft delete (can be restored)
    - User-created routines: Hard delete (permanent)
    """
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    try:
        if routine.is_imported:
            # Soft delete for imported routines (can restore later)
            routine.is_deleted = True
            routine.deleted_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'message': 'Routine removed (can be restored)',
                'soft_delete': True
            }), 200
        else:
            # Remove dependent analytics records to avoid FK constraint issues
            RoutineSession.query.filter_by(routine_id=routine.routine_id).delete(synchronize_session=False)
            UserRoutineStats.query.filter_by(routine_id=routine.routine_id).delete(synchronize_session=False)
            RoutineStats.query.filter_by(routine_id=routine.routine_id).delete(synchronize_session=False)

            # Remove exercises explicitly (safety in case cascade not enforced)
            RoutineExercise.query.filter_by(routine_id=routine.routine_id).delete(synchronize_session=False)

            # Hard delete for user-created routines
            db.session.delete(routine)
            db.session.commit()
            return jsonify({
                'message': 'Routine deleted permanently',
                'soft_delete': False
            }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@routines_bp.route('/api/routines/<int:routine_id>/execute', methods=['POST'])
@login_required
def execute_routine(routine_id):
    """Convert a routine into an actual workout log entry for today"""
    from .models import Workout, Exercise
    from datetime import date
    
    routine = WorkoutRoutine.query.options(joinedload(WorkoutRoutine.exercises)).filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    # Create a workout for today
    today = date.today()
    workout = Workout(
        user_id=current_user.user_id,
        date=today,
        workout_name=routine.routine_name,
        notes=f'Executed from routine: {routine.description or ""}'
    )
    db.session.add(workout)
    db.session.flush()
    
    # Create exercise entries from routine
    for routine_exercise in routine.exercises:
        # For each set (if strength), create an exercise entry
        num_entries = routine_exercise.sets if routine_exercise.exercise_type == 'strength' and routine_exercise.sets else 1
        
        for set_num in range(num_entries):
            exercise = Exercise(
                workout_id=workout.workout_id,
                user_id=current_user.user_id,
                body_part_id=routine_exercise.body_part_id,
                exercise_name=routine_exercise.exercise_name,
                exercise_type=routine_exercise.exercise_type
            )
            
            if routine_exercise.exercise_type == 'strength':
                exercise.sets = 1  # Each entry is one set
                exercise.reps = routine_exercise.reps
                exercise.weight = routine_exercise.weight
                exercise.unit = routine_exercise.unit
            else:  # cardio
                exercise.duration_minutes = routine_exercise.duration_minutes
                exercise.distance_miles = routine_exercise.distance_miles
                exercise.distance_km = routine_exercise.distance_km
                exercise.intensity = routine_exercise.intensity
            
            db.session.add(exercise)
    
    try:
        db.session.commit()
        return jsonify({'message': 'Routine executed successfully', 'workout_id': workout.workout_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@routines_bp.route('/api/routines/<int:routine_id>/start-workout', methods=['POST'])
@login_required
def start_workout_session(routine_id):
    """
    Store routine_id in session for auto-loading in workout logger.
    This avoids exposing IDs in URL parameters.
    Security: Verify user owns the routine before storing in session.
    """
    # Verify the routine exists and belongs to the current user
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first()
    
    if not routine:
        return jsonify({'error': 'Routine not found or access denied'}), 404
    
    # Store routine_id in session (server-side, secure)
    session['start_routine_id'] = routine_id
    session.modified = True
    
    return jsonify({
        'message': 'Routine session set',
        'redirect_url': '/repLog'
    }), 200


@routines_bp.route('/api/routines/get-start-session', methods=['GET'])
@login_required
def get_start_session():
    """
    Get and clear the start_routine_id from session.
    This is called by repLogger on page load.
    Returns routine_id if set, then clears it (one-time use).
    """
    routine_id = session.pop('start_routine_id', None)
    
    if routine_id:
        # Verify the routine still exists and belongs to user
        routine = WorkoutRoutine.query.filter_by(
            routine_id=routine_id,
            user_id=current_user.user_id
        ).first()
        
        if routine:
            return jsonify({'routine_id': routine_id}), 200
    
    return jsonify({'routine_id': None}), 200


@routines_bp.route('/api/routines/session/start', methods=['POST'])
@login_required
def start_routine_session():
    """
    Create a new routine session record when user starts a routine.
    This tracks when they started, how many exercises, etc. for future analytics.
    """
    try:
        data = request.get_json()
        
        routine_id = data.get('routine_id')
        total_exercises = data.get('total_exercises', 0)
        workout_date_str = data.get('workout_date')
        
        if not routine_id or not workout_date_str:
            return jsonify({'error': 'routine_id and workout_date required'}), 400
        
        # Verify routine belongs to user
        routine = WorkoutRoutine.query.filter_by(
            routine_id=routine_id,
            user_id=current_user.user_id
        ).first()
        
        if not routine:
            return jsonify({'error': 'Routine not found'}), 404
        
        # Parse workout date
        try:
            workout_date = datetime.strptime(workout_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
        
        # Create session record
        routine_session = RoutineSession(
            user_id=current_user.user_id,
            routine_id=routine_id,
            total_exercises=total_exercises,
            workout_date=workout_date,
            started_at=datetime.utcnow()
        )
        
        db.session.add(routine_session)
        db.session.commit()
        
        return jsonify({
            'message': 'Routine session started',
            'session_id': routine_session.session_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@routines_bp.route('/api/routines/session/<int:session_id>/finish', methods=['POST'])
@login_required
def finish_routine_session(session_id):
    """
    Update routine session with completion data.
    This records when they finished, completion percentage, duration, etc.
    """
    try:
        data = request.get_json()
        
        # Find session and verify ownership
        routine_session = RoutineSession.query.filter_by(
            session_id=session_id,
            user_id=current_user.user_id
        ).first()
        
        if not routine_session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Update session with completion data
        routine_session.completed_at = datetime.utcnow()
        routine_session.completed_exercises = data.get('completed_exercises', 0)
        routine_session.is_fully_completed = data.get('is_fully_completed', False)
        routine_session.completion_percentage = data.get('completion_percentage', 0.0)
        routine_session.duration_minutes = data.get('duration_minutes')
        
        db.session.commit()
        
        return jsonify({'message': 'Routine session completed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

