# routes/main_routes.py
import json
from urllib.parse import urlparse, urljoin

from flask import Blueprint, jsonify, render_template, request, redirect, url_for, flash, current_app
from werkzeug.security import generate_password_hash
from .models import db, User, Workout, Exercise, CustomExercise, MotivationalQuote, BodyPart, StandardExercise, WorkoutRoutine, RoutineExercise, Friend
from .auth_service import AuthService
from .validators import (
    validate_registration_data,
    sanitize_input,
    validate_email,
    validate_password_strength,
    validate_username,
)
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import joinedload


# Define blueprints
main_bp = Blueprint('main', __name__)
auth_bp = Blueprint('auth', __name__)


# Define the user retrieval function
def get_user_by_username(username):
    return User.query.filter_by(username=username).first()

# Initialize AuthService
auth_service = AuthService(get_user_by_username)


def is_safe_url(target):
    """
    Validate that a redirect URL is safe (same origin).
    Prevents open redirect vulnerabilities.
    
    Args:
        target: URL to validate
    
    Returns:
        bool: True if URL is safe, False otherwise
    """
    if not target:
        return False
    
    # Get the referrer URL
    ref_url = urlparse(request.host_url)
    # Parse the target URL
    test_url = urlparse(urljoin(request.host_url, target))
    
    # Check that the scheme is http or https
    if test_url.scheme not in ('http', 'https', ''):
        return False
    
    # Check that the network location matches (same domain)
    if test_url.netloc and test_url.netloc != ref_url.netloc:
        return False
    
    return True

# Main routes
@main_bp.route('/')
def home():
    return render_template('home.html')

@main_bp.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        # Example authentication logic
        username = request.form.get('username')
        password = request.form.get('password')
        user = auth_service.authenticate(username, password)
        
        if user:
            login_user(user)
            flash('You are now logged in!', 'success')

            # SECURE redirect - validate 'next' parameter to prevent open redirect
            next_page = request.args.get('next')
            if next_page and not is_safe_url(next_page):
                # Log the suspicious redirect attempt
                current_app.logger.warning(
                    f"Attempted open redirect to: {next_page} from IP: {request.remote_addr}"
                )
                # Ignore the malicious redirect and go to dashboard
                next_page = None
            
            return redirect(next_page or url_for('main.dashboard'))
        else:
            flash('Invalid username or password. Please try again.', 'danger')

    return render_template('login.html')

@main_bp.route('/register')
def register_page():
    return render_template('register.html')


@main_bp.route('/dashboard')
@login_required
def dashboard():
    from datetime import datetime, timedelta
    from flask import request
    from collections import defaultdict

    # Get the selected date from query parameters, default to today
    date_str = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    selected_date = datetime.strptime(date_str, '%Y-%m-%d')

    # Get user info
    user_data = User.query.get(current_user.user_id)

    # Get the workouts for the selected date
    workouts = Workout.get_workouts_for_date(current_user.user_id, selected_date)
    workout_ids = [workout.workout_id for workout in workouts]

    # Fetch exercise details for the selected date's workouts with eager loading to prevent N+1 queries
    exercises = Exercise.query.options(
        joinedload(Exercise.body_part),
        joinedload(Exercise.standard_exercise),
        joinedload(Exercise.custom_exercise)
    ).filter(Exercise.workout_id.in_(workout_ids)).all()

    # Group exercises by workout, body part, and aggregate similar entries
    workout_exercises = {}
    for exercise in exercises:
        workout_id = exercise.workout_id
        body_part_name = exercise.body_part.body_part_name if exercise.body_part else "Unknown"

        if workout_id not in workout_exercises:
            workout_exercises[workout_id] = defaultdict(list)

        # Determine exercise type - check both attribute and value
        exercise_type = 'strength'  # Default
        if hasattr(exercise, 'exercise_type') and exercise.exercise_type:
            exercise_type = exercise.exercise_type
        
        # Create appropriate key based on exercise type
        if exercise_type == 'cardio':
            exercise_key = (exercise.get_exercise_name(), exercise.duration_minutes, exercise.intensity)
        else:
            exercise_key = (exercise.get_exercise_name(), exercise.weight, exercise.reps)

        # Check if an entry already exists; if yes, aggregate
        found = False
        for grouped_exercise in workout_exercises[workout_id][body_part_name]:
            if grouped_exercise["key"] == exercise_key:
                if exercise_type == 'cardio':
                    # For cardio, we don't aggregate - each session is separate
                    # But if exact duplicate, we can note it happened multiple times
                    grouped_exercise["count"] = grouped_exercise.get("count", 1) + 1
                else:
                    # For strength, aggregate sets
                    grouped_exercise["sets"] += exercise.sets if exercise.sets else 0
                found = True
                break

        # If no match found, create a new entry
        if not found:
            exercise_dict = {
                "key": exercise_key,
                "exercise_name": exercise.get_exercise_name(),
                "exercise_type": exercise_type,
            }
            
            if exercise_type == 'cardio':
                exercise_dict.update({
                    "duration_minutes": float(exercise.duration_minutes) if exercise.duration_minutes else None,
                    "distance_miles": float(exercise.distance_miles) if exercise.distance_miles else None,
                    "distance_km": float(exercise.distance_km) if exercise.distance_km else None,
                    "intensity": exercise.intensity if exercise.intensity else None,
                    "calories_burned": int(exercise.calories_burned) if exercise.calories_burned else None,
                    "count": 1
                })
                # Debug: log cardio exercise data
                current_app.logger.debug(f"Cardio exercise: {exercise.get_exercise_name()} - Duration: {exercise.duration_minutes}, Distance: {exercise.distance_miles}, Intensity: {exercise.intensity}")
            else:
                exercise_dict.update({
                    "weight": float(exercise.weight) if exercise.weight else 0,
                    "reps": exercise.reps if exercise.reps else 0,
                    "sets": exercise.sets if exercise.sets else 0,
                    "unit": 'lbs'  # Default unit (Exercise model doesn't have unit field yet)
                })
            
            workout_exercises[workout_id][body_part_name].append(exercise_dict)

    # Check if no workouts exist for the selected date
    workouts_exist = bool(workouts)

    # Calculate the total weight lifted and total reps performed for the selected date
    # Convert to float to avoid Decimal type issues in templates
    total_weight_lifted = float(Exercise.get_total_weight_lifted(workout_ids))
    total_reps_performed = float(Exercise.get_total_reps(workout_ids))
    
    # Calculate total volume correctly: sum of (weight * reps * sets) for each exercise (only strength)
    if workout_ids:
        total_volume = db.session.query(func.sum(Exercise.weight * Exercise.reps * Exercise.sets)).filter(
            Exercise.workout_id.in_(workout_ids),
            Exercise.exercise_type == 'strength',
            Exercise.weight.isnot(None),
            Exercise.reps.isnot(None),
            Exercise.sets.isnot(None)
        ).scalar() or 0
        total_volume = float(total_volume)
    else:
        total_volume = 0.0

    # Get the workouts this week for progress snapshot
    workouts_this_week = Workout.get_workouts_this_week(current_user.user_id)
    
    # Calculate workout streak
    workout_streak = Workout.calculate_consecutive_workout_days(current_user.user_id)
    
    # Get max single lift (all time, only strength exercises) with eager loading
    max_lift_exercise = db.session.query(Exercise).options(
        joinedload(Exercise.standard_exercise),
        joinedload(Exercise.custom_exercise)
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.exercise_type == 'strength',
        Exercise.weight.isnot(None)
    ).order_by(Exercise.weight.desc()).first()
    max_single_lift = float(max_lift_exercise.weight) if max_lift_exercise else 0.0
    max_lift_name = max_lift_exercise.get_exercise_name() if max_lift_exercise else None
    
    # Get unique exercises count (this week)
    week_start = datetime.now() - timedelta(days=datetime.now().weekday())
    week_workouts = Workout.query.filter(
        Workout.user_id == current_user.user_id,
        Workout.date >= week_start.date()
    ).all()
    week_workout_ids = [w.workout_id for w in week_workouts]
    
    # Count unique exercises by name (MySQL doesn't support COUNT(DISTINCT col1, col2))
    if week_workout_ids:
        unique_exercises = db.session.query(
            func.count(func.distinct(Exercise.exercise_name))
        ).filter(Exercise.workout_id.in_(week_workout_ids)).scalar()
    else:
        unique_exercises = 0
    
    # Get a random motivational quote (handle if table doesn't exist yet)
    try:
        quote = MotivationalQuote.get_random_quote()
    except Exception as e:
        print(f"Warning: Could not fetch quote: {e}")
        quote = None
    
    # Get recent PRs (last 7 days, only strength exercises) - optimized with eager loading
    week_ago = datetime.now() - timedelta(days=7)
    recent_prs = []
    
    # Get recent exercises with eager loading to prevent N+1 queries
    recent_exercises = db.session.query(Exercise).options(
        joinedload(Exercise.standard_exercise),
        joinedload(Exercise.custom_exercise)
    ).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= week_ago.date(),
        Exercise.exercise_type == 'strength',
        Exercise.weight.isnot(None)
    ).order_by(Exercise.weight.desc()).limit(10).all()  # Get more to filter PRs
    
    # Batch check for PRs more efficiently
    for ex in recent_exercises:
        # For standard exercises, check previous max
        if ex.standard_exercise_id:
            max_for_exercise = db.session.query(func.max(Exercise.weight)).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.standard_exercise_id == ex.standard_exercise_id,
                Exercise.date < ex.date,
                Exercise.exercise_type == 'strength',
                Exercise.weight.isnot(None)
            ).scalar()
        elif ex.custom_exercise_id:
            max_for_exercise = db.session.query(func.max(Exercise.weight)).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.custom_exercise_id == ex.custom_exercise_id,
                Exercise.date < ex.date,
                Exercise.exercise_type == 'strength',
                Exercise.weight.isnot(None)
            ).scalar()
        else:
            max_for_exercise = None
        
        if max_for_exercise is None or (ex.weight and float(ex.weight) > float(max_for_exercise)):
            recent_prs.append({
                'name': ex.get_exercise_name(),
                'weight': float(ex.weight),
                'date': ex.date
            })
            if len(recent_prs) >= 5:  # Limit to 5 PRs
                break
    
    # Pass data to the template
    return render_template(
        'dashboard.html',
        current_date=selected_date.strftime('%Y-%m-%d'),
        current_date_formatted=selected_date.strftime('%B %d, %Y'),
        is_today=(selected_date.date() == datetime.now().date()),
        workouts_this_week=len(workouts_this_week),
        total_weight_lifted=total_weight_lifted,
        total_reps_performed=total_reps_performed,
        total_volume=total_volume,
        max_single_lift=max_single_lift,
        max_lift_name=max_lift_name,
        unique_exercises_count=unique_exercises,
        workout_streak=workout_streak,
        quote=quote,
        recent_prs=recent_prs,
        user=user_data,
        workouts=workouts,
        workout_exercises=workout_exercises,
        workouts_exist=workouts_exist
    )




#def dashboradChartData():
            # Prepare chart data
   # recent_dates = [selected_date - timedelta(days=x) for x in range(7)]
   # recent_dates.reverse()  # Ensure chronological order

    # Function to calculate total weight for a specific date
    # def calculate_total_weight(date):
    #     workouts = Workout.get_workouts_for_date(current_user.user_id, date)
    #     workout_ids = [workout.workout_id for workout in workouts]
    #     return Exercise.get_total_weight_lifted(workout_ids) if workout_ids else 0

    # # Prepare chart data
    # chart_labels = [date.strftime('%Y-%m-%d') for date in recent_dates]
    # chart_data = [calculate_total_weight(date) for date in recent_dates]


    # # Pass data to the template
    # return render_template(
    #     'dashboard.html',
        
    #chart_labels=json.dumps(chart_labels)
    #chart_data=json.dumps(chart_data)
    #     workouts_this_week=len(workouts_this_week),
    #     total_weight_lifted=total_weight_lifted,
    #     total_reps_performed=total_reps_performed,
    #     user=user_data,
    #     workouts=workouts,
    #     workout_exercises=workout_exercises,
    #     current_date=selected_date.strftime('%Y-%m-%d'),
    #     workouts_exist=workouts_exist
   # )



@main_bp.route('/repLog')
@login_required
def replogger():
    return render_template('repLogger.html')

@main_bp.route('/viewProgress')
@login_required
def viewProgress():
    return render_template('viewProgress.html')


# Auth routes
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    API endpoint for user login.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        current_app.logger.debug(f"Login API request from IP: {request.remote_addr}")
        
        user = auth_service.authenticate(username, password)
        
        if user:
            login_user(user)
            current_app.logger.info(f"User {user.user_id} logged in successfully via API")
            return jsonify({'redirect_url': url_for('main.dashboard')}), 200
        else:
            current_app.logger.warning(f"Failed login attempt from IP: {request.remote_addr}")
            return jsonify({
                'message': 'Invalid Username or Password please try again.'
            }), 401
    except Exception as e:
        current_app.logger.error(f"Error during login: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'An error occurred during login. Please try again.'
        }), 500


@auth_bp.route('/check-username', methods=['POST'])
def check_username_availability():
    """
    Validate username format and report availability status.
    """
    data = request.get_json(silent=True) or {}
    raw_username = data.get('username', '')
    username = sanitize_input(raw_username, 20)

    is_valid, error_message = validate_username(username)
    if not is_valid:
        return jsonify({
            'available': False,
            'message': error_message
        }), 400

    existing_user = get_user_by_username(username)

    if existing_user:
        return jsonify({
            'available': False,
            'message': 'Username is already taken'
        }), 200

    return jsonify({
        'available': True,
        'message': 'Username is available'
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register_user():
    """
    User registration endpoint with comprehensive input validation.
    """
    data = request.get_json()
    
    # Sanitize inputs
    username = sanitize_input(data.get('username', ''), 20)
    email = sanitize_input(data.get('email', ''), 254)
    password = data.get('password', '')  # Don't sanitize passwords
    first_name = sanitize_input(data.get('first_name', ''), 50, allow_special_chars=True)
    last_name = sanitize_input(data.get('last_name', ''), 50, allow_special_chars=True)

    # Comprehensive validation using validators module
    is_valid, errors = validate_registration_data(
        username, email, password, first_name, last_name
    )
    
    if not is_valid:
        # Return first error found
        field, message = next(iter(errors.items()))
        return jsonify({
            'message': message,
            'fields': errors
        }), 400
    
    # Check if username already exists (use generic error to prevent user enumeration)
    if get_user_by_username(username):
        current_app.logger.warning(
            f"Registration attempt with existing username: {username} from IP: {request.remote_addr}"
        )
        return jsonify({
            'message': 'Username is already taken. Please choose another.',
            'fields': {'username': 'This username is not available'}
        }), 400
    
    # Check if email already exists
    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        current_app.logger.warning(
            f"Registration attempt with existing email from IP: {request.remote_addr}"
        )
        return jsonify({
            'message': 'An account with this email already exists.',
            'fields': {'email': 'This email is already registered'}
        }), 400

    # Create new user
    new_user = User(username=username)
    new_user.set_password(password)
    new_user.set_email(email)
    new_user.set_first_name(first_name)
    new_user.set_last_name(last_name)

    try:
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        
        # Log successful registration (no sensitive data)
        current_app.logger.info(f"New user registered: ID {new_user.user_id}")
        
        return jsonify({'redirect_url': url_for('main.dashboard')}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration failed: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'An error occurred during registration. Please try again later.'
        }), 500




@main_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """
    Log out the current user.
    """
    user_id = current_user.user_id
    current_app.logger.info(f"User {user_id} logging out")
    current_app.security_logger.info(f"Event: logout | User: {user_id} | IP: {request.remote_addr}")
    
    logout_user()
    return redirect(url_for('main.home'))


@main_bp.route('/account')
@login_required
def account():
    """
    Display user account page.
    """
    user = User.query.get(current_user.user_id)
    current_app.logger.debug(f"User {current_user.user_id} accessing account page")
    
    return render_template('account.html', user=user)



@auth_bp.route('/protected', methods=['GET'])
def protected():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'message': 'Token is missing'}), 401

    try:
        data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        user_id = data['user_id']
        
        user = User.query.get(user_id)
        if user:
            return jsonify({
                'message': f'Protected data for user {user.username}'
            }), 200
        else:
            return jsonify({'message': 'User not found'}), 404
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid token'}), 401

# ===================================
# FRIEND ROUTINES API
# ===================================

@main_bp.route('/friends/api/<int:user_id>/routines', methods=['GET'])
@login_required
def get_friend_routines(user_id):
    """Get public routines from a friend"""
    try:
        # Get the friend/user whose routines we're viewing
        routine_owner = User.query.get(user_id)
        if not routine_owner:
            return jsonify({'error': 'User not found'}), 404
        
        # ENFORCE PRIVACY SETTING: Check if owner allows sharing routines
        if not getattr(routine_owner, 'show_routines_to_public', False):
            return jsonify({
                'error': 'This user has disabled public routine sharing in their privacy settings',
                'privacy_restriction': True,
                'routines': []
            }), 403
        
        # Check if the user is a friend
        friendship = Friend.query.filter(
            ((Friend.user_id == current_user.user_id) & (Friend.friend_id == user_id)) |
            ((Friend.user_id == user_id) & (Friend.friend_id == current_user.user_id))
        ).first()
        
        if not friendship:
            return jsonify({'error': 'User is not your friend'}), 403
        
        # Get the friend's public routines
        routines = WorkoutRoutine.query.filter(
            WorkoutRoutine.user_id == user_id,
            WorkoutRoutine.visibility == 'public'
        ).all()
        
        # Get exercises for each routine
        routine_data = []
        for routine in routines:
            exercises = RoutineExercise.query.filter_by(routine_id=routine.routine_id).order_by(RoutineExercise.exercise_order).all()
            
            # Format exercises for frontend
            exercises_data = []
            for exercise in exercises:
                exercise_data = {
                    'exercise_name': exercise.exercise_name,
                    'body_part': exercise.body_part_id,  # This will be the body part ID, we might need to get the name
                    'exercise_type': exercise.exercise_type,
                    'exercise_order': exercise.exercise_order
                }
                
                if exercise.exercise_type == 'strength':
                    exercise_data.update({
                        'sets': exercise.sets,
                        'reps': exercise.reps,
                        'weight': exercise.weight,
                        'unit': exercise.unit
                    })
                else:  # cardio
                    exercise_data.update({
                        'duration_minutes': exercise.duration_minutes,
                        'distance_miles': exercise.distance_miles,
                        'distance_km': exercise.distance_km,
                        'intensity': exercise.intensity
                    })
                
                exercises_data.append(exercise_data)
            
            # Check if current user already imported this routine (and it's not soft-deleted)
            already_imported = WorkoutRoutine.query.filter(
                WorkoutRoutine.user_id == current_user.user_id,
                WorkoutRoutine.imported_from_user_id == user_id,
                WorkoutRoutine.routine_name.like(f"%{routine.routine_name}%"),
                WorkoutRoutine.is_deleted == False
            ).first() is not None
            
            routine_data.append({
                'routine_id': routine.routine_id,
                'name': routine.routine_name,
                'description': routine.description,
                'exercises_count': len(exercises_data),
                'exercises': exercises_data,
                'created_at': routine.created_at.isoformat() if routine.created_at else None,
                'is_imported': routine.is_imported,
                'already_imported_by_user': already_imported
            })
        
        return jsonify({
            'routines': routine_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friend routines: {str(e)}")
        return jsonify({'error': 'Failed to fetch routines'}), 500

@main_bp.route('/friends/api/routines/<int:routine_id>/copy', methods=['POST'])
@login_required
def copy_friend_routine(routine_id):
    """Copy a friend's routine to user's imported routines"""
    try:
        # Get the original routine
        original_routine = WorkoutRoutine.query.get(routine_id)
        if not original_routine:
            return jsonify({'error': 'Routine not found'}), 404
        
        # Get the routine owner
        routine_owner = User.query.get(original_routine.user_id)
        if not routine_owner:
            return jsonify({'error': 'Routine owner not found'}), 404
        
        # ENFORCE PRIVACY SETTING: Check if owner allows sharing routines
        if not getattr(routine_owner, 'show_routines_to_public', False):
            return jsonify({
                'error': 'This user has disabled public routine sharing in their privacy settings',
                'privacy_restriction': True
            }), 403
        
        # Check if the routine is public
        if original_routine.visibility != 'public':
            return jsonify({'error': 'Routine is not public'}), 403
        
        # Check if user is friends with the routine owner
        friendship = Friend.query.filter(
            ((Friend.user_id == current_user.user_id) & (Friend.friend_id == original_routine.user_id)) |
            ((Friend.user_id == original_routine.user_id) & (Friend.friend_id == current_user.user_id))
        ).first()
        
        if not friendship:
            return jsonify({'error': 'You are not friends with this user'}), 403
        
        # Check if user already has this routine (including soft-deleted)
        existing_routine = WorkoutRoutine.query.filter(
            WorkoutRoutine.user_id == current_user.user_id,
            WorkoutRoutine.imported_from_user_id == original_routine.user_id,
            WorkoutRoutine.routine_name.like(f"%{original_routine.routine_name}%")
        ).first()
        
        if existing_routine:
            # If soft-deleted, restore it instead of creating duplicate
            if existing_routine.is_deleted:
                existing_routine.is_deleted = False
                existing_routine.deleted_at = None
                db.session.commit()
                return jsonify({
                    'message': 'Routine restored successfully',
                    'routine_id': existing_routine.routine_id,
                    'restored': True
                }), 200
            else:
                # Already have active copy
                return jsonify({'error': 'You already have this routine'}), 400
        
        # Create a new imported routine
        new_routine = WorkoutRoutine(
            user_id=current_user.user_id,
            routine_name=f"{original_routine.routine_name} (Imported)",
            description=original_routine.description,
            visibility='private',  # User's copy is private by default
            is_imported=True,
            imported_from_user_id=original_routine.user_id
        )
        
        db.session.add(new_routine)
        db.session.flush()  # Get the new routine ID
        
        # Copy all exercises from the original routine
        original_exercises = RoutineExercise.query.filter_by(routine_id=routine_id).all()
        for exercise in original_exercises:
            new_exercise = RoutineExercise(
                routine_id=new_routine.routine_id,
                body_part_id=exercise.body_part_id,
                exercise_name=exercise.exercise_name,
                sets=exercise.sets,
                reps=exercise.reps,
                weight=exercise.weight,
                unit=exercise.unit,
                exercise_order=exercise.exercise_order,
                exercise_type=exercise.exercise_type,
                duration_minutes=exercise.duration_minutes,
                distance_miles=exercise.distance_miles,
                distance_km=exercise.distance_km,
                intensity=exercise.intensity
            )
            db.session.add(new_exercise)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Routine copied successfully',
            'routine_id': new_routine.routine_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error copying routine: {str(e)}")
        return jsonify({'error': 'Failed to copy routine'}), 500


# ===================================
# Workout History API
# ===================================

@main_bp.route('/api/workout-history', methods=['GET'])
@login_required
def workout_history():
    """
    Get comprehensive workout history - Groups exercises by date
    """
    try:
        days = request.args.get('days', 30, type=int)
        if days > 9000:  # "all" time
            start_date = datetime(2000, 1, 1)
        else:
            start_date = datetime.now() - timedelta(days=days)
        
        # Get all exercises for the user within the date range
        exercises = Exercise.query.options(
            joinedload(Exercise.body_part),
            joinedload(Exercise.standard_exercise),
            joinedload(Exercise.custom_exercise)
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= start_date.date() if hasattr(start_date, 'date') else start_date
        ).order_by(Exercise.date.desc(), Exercise.exercise_id).all()
        
        # Group exercises by date
        from collections import defaultdict
        exercises_by_date = defaultdict(list)
        
        for exercise in exercises:
            exercise_date = exercise.date
            exercises_by_date[exercise_date].append(exercise)
        
        # Prepare workout data
        workout_data = []
        total_exercises = 0
        total_sets = 0
        total_volume = 0
        
        # Process each date as a workout session
        for workout_date, date_exercises in sorted(exercises_by_date.items(), reverse=True):
            try:
                # Find workout record for this date (if exists) to get notes
                workout_record = Workout.query.filter_by(
                    user_id=current_user.user_id,
                    date=workout_date
                ).first()
                
                workout_notes = workout_record.notes if workout_record else None
                workout_id = workout_record.workout_id if workout_record else None
                
                exercises_grouped = {}
                for exercise in date_exercises:
                    try:
                        # Get body part name safely
                        body_part_name = 'Unknown'
                        if exercise.body_part:
                            body_part_name = exercise.body_part.body_part_name
                        elif exercise.body_part_id:
                            body_part = BodyPart.query.get(exercise.body_part_id)
                            if body_part:
                                body_part_name = body_part.body_part_name
                        
                        exercise_name = exercise.exercise_name
                        if not exercise_name and getattr(exercise, 'standard_exercise', None):
                            exercise_name = exercise.standard_exercise.exercise_name
                        if not exercise_name and getattr(exercise, 'custom_exercise', None):
                            exercise_name = exercise.custom_exercise.exercise_name
                        if not exercise_name:
                            exercise_name = 'Unknown Exercise'

                        exercise_data = {
                            'exercise_name': exercise_name,
                            'body_part': body_part_name,
                            'exercise_type': exercise.exercise_type or 'strength',
                            'sets': exercise.sets,
                            'reps': exercise.reps,
                            'weight': float(exercise.weight) if exercise.weight else None,
                            'unit': 'lb',
                            'duration_minutes': float(exercise.duration_minutes) if exercise.duration_minutes else None,
                            'intensity': exercise.intensity
                        }

                        exercises_grouped.setdefault(body_part_name, []).append(exercise_data)
                        
                        # Count for summary
                        if exercise.sets:
                            total_sets += exercise.sets
                        if exercise.weight and exercise.sets and exercise.reps:
                            total_volume += (exercise.weight * exercise.sets * exercise.reps)
                    except Exception as ex_error:
                        current_app.logger.error(f"Error processing exercise: {str(ex_error)}")
                        continue
                
                total_exercises += sum(len(items) for items in exercises_grouped.values())
                
                # Create workout session data
                workout_data.append({
                    'workout_id': workout_id,
                    'date': workout_date.isoformat() if workout_date else datetime.now().date().isoformat(),
                    'notes': workout_notes or '',
                    'exercises': [
                        {
                            'body_part': group_name,
                            'items': items
                        }
                        for group_name, items in exercises_grouped.items()
                    ]
                })
                
            except Exception as date_error:
                current_app.logger.error(f"Error processing workout session: {str(date_error)}")
                continue
        
        # Summary stats
        summary = {
            'total_workouts': len(workout_data),
            'total_exercises': total_exercises,
            'total_sets': total_sets,
            'total_volume': int(total_volume)
        }
        
        return jsonify({
            'success': True,
            'workouts': workout_data,
            'summary': summary
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching workout history: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to load workout history'
        }), 500

