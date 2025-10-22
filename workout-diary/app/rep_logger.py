from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from .models import db, Workout, Exercise, BodyPart, StandardExercise, CustomExercise
from .validators import validate_exercise_log, validate_date_string, sanitize_input
from datetime import date

workout_bp = Blueprint('workout', __name__)
@workout_bp.route('/api/exercises/<body_part>', methods=['GET'])
@login_required
def get_exercises(body_part):
    # Get the body part
    body_part_obj = BodyPart.query.filter_by(body_part_name=body_part).first()
    if not body_part_obj:
        return jsonify({'error': 'Body part not found'}), 404
    
    # Get standard exercises
    standard_exercises = StandardExercise.query.filter_by(body_part_id=body_part_obj.body_part_id)\
        .order_by(StandardExercise.exercise_name).all()
    
    # Get custom exercises
    custom_exercises = CustomExercise.query.filter_by(
        body_part_id=body_part_obj.body_part_id,
        user_id=current_user.user_id
    ).order_by(CustomExercise.exercise_name).all()
    
    return jsonify({
        'standardExercises': [{
            'standard_exercise_id': ex.standard_exercise_id,
            'exercise_name': ex.exercise_name,
            'description': ex.description,
            'is_compound': ex.is_compound
        } for ex in standard_exercises],
        'customExercises': [{
            'custom_exercise_id': ex.custom_exercise_id,
            'exercise_name': ex.exercise_name
        } for ex in custom_exercises]
    })

@workout_bp.route('/api/bodyparts', methods=['GET'])
@login_required
def get_body_parts():
    """
    Get list of all available body parts.
    """
    current_app.logger.debug(f"User {current_user.user_id} requesting body parts list")
    
    body_parts = BodyPart.query.order_by(BodyPart.body_part_name).all()
    
    return jsonify([bp.body_part_name for bp in body_parts]), 200



@workout_bp.route('/api/custom-exercise', methods=['POST'])
@login_required
def add_custom_exercise():
    """
    Create a new custom exercise for the user.
    """
    current_app.logger.info(f"User {current_user.user_id} creating custom exercise")
    
    try:
        data = request.get_json()
        
        body_part = BodyPart.query.filter_by(body_part_name=data['bodyPart']).first()
        if not body_part:
            current_app.logger.warning(f"Invalid body part '{data['bodyPart']}' from user {current_user.user_id}")
            return jsonify({'error': 'Invalid body part'}), 400
            
        new_exercise = CustomExercise(
            user_id=current_user.user_id,
            body_part_id=body_part.body_part_id,
            exercise_name=sanitize_input(data['exerciseName'], 100)
        )
        
        db.session.add(new_exercise)
        db.session.commit()
        
        current_app.logger.info(
            f"User {current_user.user_id} created custom exercise: {new_exercise.exercise_name}"
        )
        
        return jsonify({'customExerciseId': new_exercise.custom_exercise_id}), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating custom exercise: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to create custom exercise'}), 500

@workout_bp.route('/api/exercise_log', methods=['POST'])
@login_required
def add_exercise():
    """
    Log an exercise with comprehensive input validation.
    """
    from datetime import datetime
    
    try:
        data = request.get_json()
        
        # Validate and parse date
        workout_date_str = data.get('date')
        if workout_date_str:
            is_valid, error = validate_date_string(workout_date_str)
            if not is_valid:
                return jsonify({'error': error}), 400
            workout_date = datetime.strptime(workout_date_str, '%Y-%m-%d').date()
        else:
            workout_date = date.today()
        
        # Validate exercise data
        weight = data.get('weight', 0)
        reps = data.get('reps', 0)
        sets = data.get('sets', 0)
        
        # Validate exercise log data (allow 0 weight for bodyweight exercises)
        is_valid, errors = validate_exercise_log(weight, reps, sets, allow_bodyweight=True)
        if not is_valid:
            # Return first error
            field, message = next(iter(errors.items()))
            return jsonify({'error': message}), 400
        
        # Convert to proper types after validation
        weight = float(weight)
        reps = int(reps)
        sets = int(sets)
        
        # Validate body part
        body_part_name = sanitize_input(data.get('bodyPart', ''), 50)
        body_part = BodyPart.query.filter_by(body_part_name=body_part_name).first()
        if not body_part:
            current_app.logger.warning(
                f"Invalid body part '{body_part_name}' from user {current_user.user_id}"
            )
            return jsonify({'error': 'Invalid body part'}), 400
        
        # Get or create workout for the selected date
        workout = Workout.query.filter_by(
            user_id=current_user.user_id,
            date=workout_date
        ).first()
        
        if not workout:
            workout = Workout(
                user_id=current_user.user_id,
                date=workout_date
            )
            db.session.add(workout)
            db.session.commit()
        
        # Create exercise entries (one per set)
        for i in range(sets):
            new_exercise = Exercise(
                workout_id=workout.workout_id,
                user_id=current_user.user_id,
                body_part_id=body_part.body_part_id,
                standard_exercise_id=data.get('standardExerciseId'),
                custom_exercise_id=data.get('customExerciseId'),
                sets=1,  # Each DB entry represents 1 set
                reps=reps,
                weight=weight,
                date=workout_date
            )
            db.session.add(new_exercise)
        
        db.session.commit()
        
        current_app.logger.info(
            f"User {current_user.user_id} logged {sets} sets of {body_part_name}"
        )
        
        return jsonify({'success': True}), 201
        
    except ValueError as e:
        current_app.logger.error(f"Value error in add_exercise: {str(e)}")
        return jsonify({'error': 'Invalid data format'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in add_exercise: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred while logging the exercise'}), 500


@workout_bp.route('/api/logged-sets', methods=['GET'])
@login_required
def get_logged_sets():
    from datetime import datetime
    from flask import request, jsonify

    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    selected_date = datetime.strptime(date_str, '%Y-%m-%d')

    workouts = Workout.get_workouts_for_date(current_user.user_id, selected_date)
    workout_ids = [workout.workout_id for workout in workouts]

    exercises = Exercise.query.filter(Exercise.workout_id.in_(workout_ids)).all()

    logged_sets = []
    for exercise in exercises:
        logged_sets.append({
            "id": exercise.exercise_id,  # Include the ID of the lift
            "exercise_name": exercise.get_exercise_name(),
            "weight": exercise.weight,
            "unit": "lbs",  # Adjust unit logic as needed
            "reps": exercise.reps,
            "sets": exercise.sets,
        })

    return jsonify({"logged_sets": logged_sets})





@workout_bp.route('/api/logged-sets/<int:lift_id>', methods=['DELETE'])
@login_required
def delete_logged_set(lift_id):
    from flask import jsonify

    # Fetch the lift by ID
    lift = Exercise.query.get_or_404(lift_id)

    # Check if the lift belongs to the current user
    if lift.workout.user_id != current_user.user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Delete the lift
    db.session.delete(lift)
    db.session.commit()

    return jsonify({"success": True}), 200
