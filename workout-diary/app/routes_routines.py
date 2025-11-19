from flask import Blueprint, jsonify, render_template, request, session, current_app
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
    try:
        # First, check if the table exists using SQLAlchemy inspector
        from sqlalchemy import inspect
        inspector = None
        try:
            inspector = inspect(db.engine)
        except Exception as inspect_err:
            # If we can't inspect, that's okay - we'll try the query anyway
            current_app.logger.debug(f"Could not inspect database: {inspect_err}")
        
        # Check if WorkoutRoutines table exists
        if inspector:
            try:
                table_names = inspector.get_table_names()
                if 'WorkoutRoutines' not in table_names:
                    current_app.logger.info("WorkoutRoutines table does not exist, returning empty list")
                    return jsonify({'routines': []})
            except Exception as check_err:
                # If check fails, continue anyway - table might exist
                current_app.logger.debug(f"Could not check table existence: {check_err}")
        
        # Try to query routines
        routines = []
        try:
            # Use joinedload to eager load relationships for better performance
            # Handle is_deleted column gracefully (might not exist in older databases)
            try:
                routines = WorkoutRoutine.query.options(
                    joinedload(WorkoutRoutine.imported_from_user)
                ).filter_by(user_id=current_user.user_id, is_deleted=False)\
                    .order_by(WorkoutRoutine.created_at.desc()).all()
            except Exception as filter_err:
                # If is_deleted column doesn't exist, query without it
                error_str = str(filter_err).lower()
                if 'is_deleted' in error_str or 'unknown column' in error_str:
                    current_app.logger.debug(f"is_deleted column not found, querying without filter: {filter_err}")
                    try:
                        routines = WorkoutRoutine.query.options(
                            joinedload(WorkoutRoutine.imported_from_user)
                        ).filter_by(user_id=current_user.user_id)\
                            .order_by(WorkoutRoutine.created_at.desc()).all()
                    except Exception as query_err:
                        # If table doesn't exist or query fails, return empty list
                        error_str = str(query_err).lower()
                        if 'doesn\'t exist' in error_str or 'table' in error_str:
                            current_app.logger.info(f"WorkoutRoutines table not available: {query_err}")
                            return jsonify({'routines': []})
                        # Re-raise if it's a different error
                        raise
                else:
                    # Re-raise if it's not an is_deleted error
                    raise
        except Exception as query_err:
            # If table doesn't exist or query fails, return empty list
            error_str = str(query_err).lower()
            if 'doesn\'t exist' in error_str or 'table' in error_str or 'no such table' in error_str:
                current_app.logger.info(f"WorkoutRoutines table not available: {query_err}")
                return jsonify({'routines': []})
            # For other errors, log and return empty list to be safe
            current_app.logger.warning(f"Unexpected error querying routines: {query_err}")
            return jsonify({'routines': []})
        
        routines_data = []
        for routine in routines:
            exercises_data = []
            # Handle exercises relationship gracefully
            try:
                exercises = routine.exercises if hasattr(routine, 'exercises') else []
            except Exception as exercises_err:
                current_app.logger.warning(f"Error accessing routine.exercises: {exercises_err}")
                exercises = []
            
            for exercise in exercises:
                try:
                    exercises_data.append({
                        'routine_exercise_id': exercise.routine_exercise_id,
                        'body_part': exercise.body_part.body_part_name if exercise.body_part else None,
                        'exercise_name': exercise.exercise_name,
                        'sets': exercise.sets,
                        'reps': exercise.reps,
                        'weight': exercise.weight,
                        'unit': getattr(exercise, 'unit', 'lb'),
                        'exercise_order': exercise.exercise_order,
                        'exercise_type': getattr(exercise, 'exercise_type', 'strength'),
                        'duration_minutes': getattr(exercise, 'duration_minutes', None),
                        'distance_miles': getattr(exercise, 'distance_miles', None),
                        'distance_km': getattr(exercise, 'distance_km', None),
                        'intensity': getattr(exercise, 'intensity', None)
                    })
                except Exception as ex_err:
                    current_app.logger.warning(f"Error processing exercise: {ex_err}")
                    continue
            
            # Get or create stats for this routine (handle missing tables gracefully)
            routine_stats = None
            try:
                routine_stats = RoutineStats.query.filter_by(routine_id=routine.routine_id).first()
            except Exception as stats_err:
                # Table might not exist - that's okay
                current_app.logger.debug(f"RoutineStats query failed (expected if table missing): {stats_err}")
            
            user_stats = None
            try:
                user_stats = UserRoutineStats.query.filter_by(
                    user_id=current_user.user_id,
                    routine_id=routine.routine_id
                ).first()
            except Exception as user_stats_err:
                # Table might not exist - that's okay
                current_app.logger.debug(f"UserRoutineStats query failed (expected if table missing): {user_stats_err}")
            
            # Build stats objects with safe attribute access
            public_stats = {
                'times_copied': getattr(routine_stats, 'times_copied', 0) if routine_stats else 0,
                'total_completions': getattr(routine_stats, 'total_completions_all_users', 0) if routine_stats else 0,
                'active_users': getattr(routine_stats, 'active_users_count', 0) if routine_stats else 0,
                'popularity_score': getattr(routine_stats, 'popularity_score', 0.0) if routine_stats else 0.0,
                'last_used_by_anyone': routine_stats.last_used_by_anyone.isoformat() if routine_stats and hasattr(routine_stats, 'last_used_by_anyone') and routine_stats.last_used_by_anyone else None
            }
            
            personal_stats = {
                'times_completed': getattr(user_stats, 'times_completed', 0) if user_stats else 0,
                'last_used': user_stats.last_used.isoformat() if user_stats and hasattr(user_stats, 'last_used') and user_stats.last_used else None,
                'total_volume': getattr(user_stats, 'total_volume_lifted', 0.0) if user_stats else 0.0,
                'current_streak': getattr(user_stats, 'current_streak', 0) if user_stats else 0,
                'longest_streak': getattr(user_stats, 'longest_streak', 0) if user_stats else 0,
                'average_duration': getattr(user_stats, 'average_duration', None) if user_stats else None,
                'best_time': getattr(user_stats, 'best_completion_time', None) if user_stats else None
            }
            
            try:
                routines_data.append({
                    'routine_id': routine.routine_id,
                    'routine_name': routine.routine_name,
                    'description': routine.description or '',
                    'visibility': getattr(routine, 'visibility', 'private') or 'private',
                    'is_imported': getattr(routine, 'is_imported', False) or False,
                    'imported_from_username': routine.imported_from_user.username if routine.imported_from_user and hasattr(routine.imported_from_user, 'username') else None,
                    'created_at': routine.created_at.isoformat() if routine.created_at else None,
                    'updated_at': routine.updated_at.isoformat() if routine.updated_at else None,
                    'exercises': exercises_data,
                    'public_stats': public_stats,
                    'personal_stats': personal_stats
                })
            except Exception as append_err:
                current_app.logger.error(f"Error appending routine data: {append_err}", exc_info=True)
                continue
        
        return jsonify({'routines': routines_data})
    
    except Exception as e:
        current_app.logger.error(f"Error fetching routines: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'An internal error occurred',
            'message': str(e)
        }), 500


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

