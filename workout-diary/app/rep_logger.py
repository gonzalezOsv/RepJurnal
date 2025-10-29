from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from .models import db, Workout, Exercise, BodyPart, StandardExercise, CustomExercise
from .validators import validate_exercise_log, validate_date_string, sanitize_input
from datetime import date
from sqlalchemy.orm import joinedload

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
        
        # Validate body part first (needed to determine exercise type)
        body_part_name = sanitize_input(data.get('bodyPart', ''), 50)
        body_part = BodyPart.query.filter_by(body_part_name=body_part_name).first()
        if not body_part:
            current_app.logger.warning(
                f"Invalid body part '{body_part_name}' from user {current_user.user_id}"
            )
            return jsonify({'error': 'Invalid body part'}), 400
        
        # Determine exercise type
        exercise_type = data.get('exercise_type', 'strength')
        is_cardio = exercise_type == 'cardio' or body_part_name == 'Cardio'
        
        # Validate exercise data based on type
        if is_cardio:
            # Cardio validation
            duration_minutes = data.get('duration_minutes')
            distance_miles = data.get('distance_miles')
            distance_km = data.get('distance_km')
            
            if not duration_minutes and not distance_miles and not distance_km:
                return jsonify({'error': 'Please enter at least duration or distance'}), 400
            
            # Set defaults for cardio
            weight = 0
            reps = 1
            sets = 1
        else:
            # Strength validation
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
        
        # Create exercise entries (one per set for strength, single entry for cardio)
        num_entries = sets if not is_cardio else 1
        
        for i in range(num_entries):
            new_exercise = Exercise(
                workout_id=workout.workout_id,
                user_id=current_user.user_id,
                body_part_id=body_part.body_part_id,
                standard_exercise_id=data.get('standardExerciseId'),
                custom_exercise_id=data.get('customExerciseId'),
                sets=1,  # Each DB entry represents 1 set
                reps=reps,
                weight=weight,
                date=workout_date,
                exercise_type=exercise_type
            )
            
            # Add cardio-specific fields if this is cardio
            if is_cardio:
                new_exercise.duration_minutes = data.get('duration_minutes')
                new_exercise.distance_miles = data.get('distance_miles')
                new_exercise.distance_km = data.get('distance_km')
                new_exercise.intensity = data.get('intensity')
                new_exercise.calories_burned = data.get('calories_burned')
            
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

    # Use eager loading to prevent N+1 queries when accessing exercise names
    exercises = Exercise.query.options(
        joinedload(Exercise.standard_exercise),
        joinedload(Exercise.custom_exercise)
    ).filter(Exercise.workout_id.in_(workout_ids)).all()

    logged_sets = []
    for exercise in exercises:
        set_data = {
            "id": exercise.exercise_id,
            "exercise_name": exercise.get_exercise_name(),
            "exercise_type": exercise.exercise_type if hasattr(exercise, 'exercise_type') else 'strength',
        }
        
        # Add fields based on exercise type
        if hasattr(exercise, 'exercise_type') and exercise.exercise_type == 'cardio':
            # Cardio fields
            set_data["duration_minutes"] = exercise.duration_minutes
            set_data["distance_miles"] = exercise.distance_miles
            set_data["distance_km"] = exercise.distance_km
            set_data["intensity"] = exercise.intensity
            set_data["calories_burned"] = exercise.calories_burned
            # For grouping/compatibility
            set_data["weight"] = 0
            set_data["reps"] = 1
            set_data["sets"] = 1
            set_data["unit"] = "lbs"
        else:
            # Strength fields
            set_data["weight"] = exercise.weight
            set_data["unit"] = "lbs"  # Adjust unit logic as needed
            set_data["reps"] = exercise.reps
            set_data["sets"] = exercise.sets

        logged_sets.append(set_data)

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


@workout_bp.route('/api/logged-sets/<int:lift_id>', methods=['PUT'])
@login_required
def update_logged_set(lift_id):
    """
    Update a logged exercise set. Updates all sets in the same variation (same weight/reps/unit).
    """
    try:
        data = request.get_json()
        
        # Fetch the lift by ID
        lift = Exercise.query.get_or_404(lift_id)

        # Check if the lift belongs to the current user
        if lift.workout.user_id != current_user.user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Determine exercise type
        exercise_type = data.get('exercise_type', 'strength')
        is_cardio = exercise_type == 'cardio'
        
        # Find all exercises with the same IDs as this variation
        variation_ids = data.get('variation_ids', [lift_id])
        
        # Get all exercises in this variation
        variation_exercises = Exercise.query.filter(Exercise.exercise_id.in_(variation_ids)).all()
        
        # Verify all belong to the user
        for ex in variation_exercises:
            if ex.workout.user_id != current_user.user_id:
                return jsonify({"error": "Unauthorized"}), 403
        
        if is_cardio:
            # Cardio update
            duration_minutes = data.get('duration_minutes')
            distance_miles = data.get('distance_miles')
            distance_km = data.get('distance_km')
            intensity = data.get('intensity')
            calories_burned = data.get('calories_burned')
            
            if not duration_minutes and not distance_miles and not distance_km:
                return jsonify({'error': 'Please enter at least duration or distance'}), 400
            
            # Cardio exercises are single entries, just update the first one
            if variation_exercises:
                ex = variation_exercises[0]
                ex.duration_minutes = duration_minutes
                ex.distance_miles = distance_miles
                ex.distance_km = distance_km
                ex.intensity = intensity
                ex.calories_burned = calories_burned
                ex.exercise_type = 'cardio'
                ex.weight = 0
                ex.reps = 1
                ex.sets = 1
                
                # Delete any extra entries if there are multiple
                for extra_ex in variation_exercises[1:]:
                    db.session.delete(extra_ex)
        else:
            # Strength update
            weight = data.get('weight')
            reps = data.get('reps')
            sets = data.get('sets')
            unit = data.get('unit', 'lbs')  # Default to lbs
            
            # Validate exercise log data
            is_valid, errors = validate_exercise_log(weight, reps, sets, allow_bodyweight=True)
            if not is_valid:
                field, message = next(iter(errors.items()))
                return jsonify({'error': message}), 400
            
            # Convert to proper types
            weight = float(weight)
            reps = int(reps)
            sets = int(sets)
            
            # Calculate how many sets we have vs how many we want
            current_set_count = len(variation_exercises)
            
            if sets > current_set_count:
                # Need to add more sets
                workout = variation_exercises[0].workout
                body_part = variation_exercises[0].body_part
                standard_exercise_id = variation_exercises[0].standard_exercise_id
                custom_exercise_id = variation_exercises[0].custom_exercise_id
                exercise_date = variation_exercises[0].date
                
                # Update existing sets
                for ex in variation_exercises:
                    ex.weight = weight
                    ex.reps = reps
                    ex.sets = 1  # Each entry is 1 set
                    ex.exercise_type = 'strength'
                
                # Add new sets
                for i in range(sets - current_set_count):
                    new_exercise = Exercise(
                        workout_id=workout.workout_id,
                        user_id=current_user.user_id,
                        body_part_id=body_part.body_part_id,
                        standard_exercise_id=standard_exercise_id,
                        custom_exercise_id=custom_exercise_id,
                        sets=1,
                        reps=reps,
                        weight=weight,
                        date=exercise_date,
                        exercise_type='strength'
                    )
                    db.session.add(new_exercise)
            else:
                # Update all sets and remove extras if needed
                exercises_to_update = variation_exercises[:sets]
                exercises_to_delete = variation_exercises[sets:]
                
                # Update existing sets
                for ex in exercises_to_update:
                    ex.weight = weight
                    ex.reps = reps
                    ex.sets = 1
                    ex.exercise_type = 'strength'
                
                # Delete extra sets
                for ex in exercises_to_delete:
                    db.session.delete(ex)
        
        db.session.commit()
        
        current_app.logger.info(
            f"User {current_user.user_id} updated exercise set {lift_id}"
        )
        
        return jsonify({"success": True}), 200
        
    except ValueError as e:
        db.session.rollback()
        current_app.logger.error(f"Value error in update_logged_set: {str(e)}")
        return jsonify({'error': 'Invalid data format'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in update_logged_set: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred while updating the exercise'}), 500
