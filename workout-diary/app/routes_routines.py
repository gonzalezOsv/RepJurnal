from flask import Blueprint, jsonify, render_template, request, url_for
from flask_login import login_required, current_user
from .models import db, WorkoutRoutine, RoutineExercise, BodyPart, User
from .validators import sanitize_input
from sqlalchemy.orm import joinedload
import secrets

routines_bp = Blueprint('routines', __name__)


@routines_bp.route('/routines')
@login_required
def routines():
    """Display the workout routines page"""
    return render_template('my_routines.html')


@routines_bp.route('/api/routines', methods=['GET'])
@login_required
def get_routines():
    """Get all routines for the current user"""
    # Use joinedload to eager load relationships for better performance
    routines = WorkoutRoutine.query.options(
        joinedload(WorkoutRoutine.imported_from_user)
    ).filter_by(user_id=current_user.user_id)\
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
        
        routines_data.append({
            'routine_id': routine.routine_id,
            'routine_name': routine.routine_name,
            'description': routine.description,
            'is_imported': routine.is_imported if routine.is_imported else False,
            'imported_from_username': routine.imported_from_user.username if routine.imported_from_user else None,
            'created_at': routine.created_at.isoformat() if routine.created_at else None,
            'updated_at': routine.updated_at.isoformat() if routine.updated_at else None,
            'exercises': exercises_data
        })
    
    return jsonify({'routines': routines_data})


@routines_bp.route('/api/routines', methods=['POST'])
@login_required
def create_routine():
    """Create a new workout routine"""
    data = request.get_json()
    
    routine_name = sanitize_input(data.get('routine_name', '').strip())
    description = sanitize_input(data.get('description', '').strip()) if data.get('description') else None
    exercises = data.get('exercises', [])
    
    if not routine_name:
        return jsonify({'error': 'Routine name is required'}), 400
    
    # Create the routine
    routine = WorkoutRoutine(
        user_id=current_user.user_id,
        routine_name=routine_name,
        description=description
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
    """Delete a workout routine"""
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    try:
        db.session.delete(routine)
        db.session.commit()
        return jsonify({'message': 'Routine deleted successfully'}), 200
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


@routines_bp.route('/share/routine/<token>', methods=['GET'])
def get_shared_routine(token):
    """
    Public endpoint to retrieve a shared routine by token.
    No authentication required - this is for sharing.
    Security: Token must exist and be valid.
    """
    from flask import current_app
    
    # Validate token format (should be 32 character URL-safe string)
    if not token or len(token) != 32 or not all(c.isalnum() or c in '-_' for c in token):
        current_app.logger.warning(f"Invalid share token format attempted: {token[:10] if token else 'None'}...")
        return jsonify({'error': 'Invalid share token'}), 400
    
    # Find routine by share token
    routine = WorkoutRoutine.query.filter_by(share_token=token).first()
    
    if not routine:
        current_app.logger.warning(f"Share token not found: {token[:10]}...")
        return jsonify({'error': 'Routine not found or no longer available'}), 404
    
    # Build routine data (do not include user_id or sensitive info)
    exercises_data = []
    for exercise in routine.exercises:
        exercises_data.append({
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
    
    # Get creator's username (safe for sharing)
    creator_username = routine.user.username if routine.user else None
    
    # Return routine data (safe for public sharing - only creator username, no user_id)
    return jsonify({
        'routine_name': routine.routine_name,
        'description': routine.description,
        'exercises': exercises_data,
        'created_at': routine.created_at.isoformat() if routine.created_at else None,
        'creator_username': creator_username  # Include creator username for import tracking
    }), 200


@routines_bp.route('/api/routines/<int:routine_id>/share-token', methods=['POST'])
@login_required
def generate_share_token(routine_id):
    """
    Generate or retrieve a share token for a routine.
    Only the routine owner can generate a share token.
    """
    from flask import current_app
    
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    # Generate new token if one doesn't exist
    if not routine.share_token:
        # Generate cryptographically secure token (32 characters, URL-safe)
        max_attempts = 10
        for attempt in range(max_attempts):
            token = secrets.token_urlsafe(24)[:32]  # Get first 32 chars
            # Normalize to alphanumeric + dash/underscore only
            token = ''.join(c if c.isalnum() or c in '-_' else 'x' for c in token)[:32]
            # Ensure exactly 32 chars
            while len(token) < 32:
                token += secrets.token_urlsafe(1)[:1]
            token = token[:32]
            
            # Check for uniqueness
            existing = WorkoutRoutine.query.filter_by(share_token=token).first()
            if not existing:
                routine.share_token = token
                db.session.commit()
                current_app.logger.info(f"Generated share token for routine {routine_id} by user {current_user.user_id}")
                break
        else:
            # If we couldn't generate unique token after max attempts
            db.session.rollback()
            return jsonify({'error': 'Failed to generate unique share token'}), 500
    
    # Build share URL
    share_url = request.url_root.rstrip('/') + url_for('routines.get_shared_routine', token=routine.share_token)
    
    return jsonify({
        'share_token': routine.share_token,
        'share_url': share_url
    }), 200


@routines_bp.route('/api/routines/<int:routine_id>/share-token', methods=['DELETE'])
@login_required
def revoke_share_token(routine_id):
    """
    Revoke (delete) a share token for a routine.
    Only the routine owner can revoke sharing.
    """
    routine = WorkoutRoutine.query.filter_by(
        routine_id=routine_id,
        user_id=current_user.user_id
    ).first_or_404()
    
    routine.share_token = None
    db.session.commit()
    
    return jsonify({'message': 'Share token revoked successfully'}), 200


@routines_bp.route('/api/routines/import', methods=['POST'])
@login_required
def import_routine():
    """
    Import a shared routine into the current user's account.
    Validates and sanitizes all input data.
    """
    from flask import current_app
    
    try:
        data = request.get_json()
        
        routine_name = sanitize_input(data.get('routine_name', '').strip(), 100)
        description = sanitize_input(data.get('description', '').strip()) if data.get('description') else None
        exercises = data.get('exercises', [])
        creator_username = data.get('creator_username')  # Username of original creator
        
        if not routine_name:
            return jsonify({'error': 'Routine name is required'}), 400
        
        # Validate exercises count (prevent abuse)
        if len(exercises) > 100:  # Reasonable limit
            return jsonify({'error': 'Too many exercises in routine'}), 400
        
        # Find the original creator's user_id if username provided
        imported_from_user_id = None
        if creator_username:
            creator_user = User.query.filter_by(username=creator_username).first()
            if creator_user:
                imported_from_user_id = creator_user.user_id
        
        # Create the routine
        new_routine = WorkoutRoutine(
            user_id=current_user.user_id,
            routine_name=routine_name,
            description=description,
            is_imported=True,  # Mark as imported
            imported_from_user_id=imported_from_user_id  # Track original creator
            # share_token is NULL for imported routines (user must explicitly share)
        )
        db.session.add(new_routine)
        db.session.flush()  # Get the routine_id
        
        # Add exercises with validation
        for idx, exercise_data in enumerate(exercises):
            body_part_name = sanitize_input(exercise_data.get('body_part', ''), 50)
            body_part = BodyPart.query.filter_by(body_part_name=body_part_name).first()
            
            if not body_part:
                db.session.rollback()
                return jsonify({'error': f'Invalid body part "{body_part_name}"'}), 400
            
            exercise_type = exercise_data.get('exercise_type', 'strength')
            if exercise_type not in ['strength', 'cardio']:
                exercise_type = 'strength'  # Default fallback
            
            routine_exercise = RoutineExercise(
                routine_id=new_routine.routine_id,
                body_part_id=body_part.body_part_id,
                exercise_name=sanitize_input(exercise_data.get('exercise_name', '').strip(), 100),
                exercise_order=idx,
                exercise_type=exercise_type
            )
            
            if exercise_type == 'strength':
                # Validate and sanitize numeric inputs
                try:
                    routine_exercise.sets = int(exercise_data.get('sets')) if exercise_data.get('sets') is not None else None
                    routine_exercise.reps = int(exercise_data.get('reps')) if exercise_data.get('reps') is not None else None
                    routine_exercise.weight = float(exercise_data.get('weight')) if exercise_data.get('weight') is not None else None
                    routine_exercise.unit = sanitize_input(exercise_data.get('unit', 'lb'), 10)
                    
                    # Validate ranges (prevent malicious data)
                    if routine_exercise.sets is not None and (routine_exercise.sets < 0 or routine_exercise.sets > 1000):
                        raise ValueError('Sets out of valid range')
                    if routine_exercise.reps is not None and (routine_exercise.reps < 0 or routine_exercise.reps > 10000):
                        raise ValueError('Reps out of valid range')
                    if routine_exercise.weight is not None and (routine_exercise.weight < 0 or routine_exercise.weight > 10000):
                        raise ValueError('Weight out of valid range')
                except (ValueError, TypeError):
                    db.session.rollback()
                    return jsonify({'error': 'Invalid exercise data format'}), 400
            else:  # cardio
                try:
                    routine_exercise.duration_minutes = float(exercise_data.get('duration_minutes')) if exercise_data.get('duration_minutes') is not None else None
                    routine_exercise.distance_miles = float(exercise_data.get('distance_miles')) if exercise_data.get('distance_miles') is not None else None
                    routine_exercise.distance_km = float(exercise_data.get('distance_km')) if exercise_data.get('distance_km') is not None else None
                    routine_exercise.intensity = sanitize_input(exercise_data.get('intensity', ''), 20)
                    
                    # Validate ranges
                    if routine_exercise.duration_minutes is not None and (routine_exercise.duration_minutes < 0 or routine_exercise.duration_minutes > 1440):
                        raise ValueError('Duration out of valid range')
                    if routine_exercise.distance_miles is not None and routine_exercise.distance_miles < 0:
                        raise ValueError('Distance cannot be negative')
                    if routine_exercise.distance_km is not None and routine_exercise.distance_km < 0:
                        raise ValueError('Distance cannot be negative')
                except (ValueError, TypeError):
                    db.session.rollback()
                    return jsonify({'error': 'Invalid cardio exercise data format'}), 400
            
            db.session.add(routine_exercise)
        
        db.session.commit()
        current_app.logger.info(f"User {current_user.user_id} imported routine: {routine_name}")
        
        return jsonify({
            'message': 'Routine imported successfully',
            'routine_id': new_routine.routine_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error importing routine: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to import routine'}), 500

