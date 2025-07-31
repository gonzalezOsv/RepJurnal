from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from .models import db, Workout, Exercise, BodyPart, StandardExercise, CustomExercise
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
    print("get bodyparts api....")
    body_parts = BodyPart.query.order_by(BodyPart.body_part_name).all()
    print("done...")
    return jsonify([bp.body_part_name for bp in body_parts])



@workout_bp.route('/api/custom-exercise', methods=['POST'])
@login_required
def add_custom_exercise():
    print("get custom exercies api....")
    data = request.get_json()
    
    body_part = BodyPart.query.filter_by(body_part_name=data['bodyPart']).first()
    if not body_part:
        return jsonify({'error': 'Invalid body part'}), 400
        
    new_exercise = CustomExercise(
        user_id=current_user.user_id,
        body_part_id=body_part.body_part_id,
        exercise_name=data['exerciseName']
    )
    
    db.session.add(new_exercise)
    db.session.commit()
    print("done...")
    return jsonify({'customExerciseId': new_exercise.custom_exercise_id})

@workout_bp.route('/api/exercise_log', methods=['POST'])
@login_required
def add_exercise():
    data = request.get_json()
    data_sets = 1; 
    # Get or create today's workout
    today_workout = Workout.query.filter_by(
        user_id=current_user.user_id,
        date=date.today()
    ).first()
    
    if not today_workout:
        today_workout = Workout(
            user_id=current_user.user_id,
            date=date.today()
        )
        db.session.add(today_workout)
        db.session.commit()
    
    data_sets = int(data['sets'])
    print("-----")
    print(data_sets)
    # Get body part
    body_part = BodyPart.query.filter_by(body_part_name=data['bodyPart']).first()
    if not body_part:
        return jsonify({'error': 'Invalid body part'}), 400
    
    for i in range(data_sets):
        # Create new exercise
        new_exercise = Exercise(
            workout_id=today_workout.workout_id,
            body_part_id=body_part.body_part_id,
            standard_exercise_id=data.get('standardExerciseId'),
            custom_exercise_id=data.get('customExerciseId'),
            sets=1,  # Assuming one set at a time
            reps=int(data['reps']),
            weight=float(data['weight']),
            date=date.today()
        )
        
        db.session.add(new_exercise)
    db.session.commit()
    
    return jsonify({'success': True})


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
