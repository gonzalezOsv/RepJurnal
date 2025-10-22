# routes/main_routes.py
import json
from urllib.parse import urlparse, urljoin

from flask import Blueprint, jsonify, render_template, request, redirect, url_for, flash, current_app
from werkzeug.security import generate_password_hash
from .models import db, User, Workout, Exercise, CustomExercise, MotivationalQuote
from .auth_service import AuthService
from .validators import (
    validate_registration_data, 
    sanitize_input, 
    validate_email,
    validate_password_strength
)
from flask_login import login_user, logout_user, login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy import func


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

    # Fetch exercise details for the selected date's workouts
    exercises = Exercise.query.filter(Exercise.workout_id.in_(workout_ids)).all()

    # Group exercises by workout, body part, and aggregate similar entries
    workout_exercises = {}
    for exercise in exercises:
        workout_id = exercise.workout_id
        body_part_name = exercise.body_part.body_part_name if exercise.body_part else "Unknown"

        if workout_id not in workout_exercises:
            workout_exercises[workout_id] = defaultdict(list)

        # Use a tuple of exercise_name, weight, and reps as the key
        exercise_key = (exercise.get_exercise_name(), exercise.weight, exercise.reps)

        # Check if an entry already exists; if yes, aggregate the sets
        found = False
        for grouped_exercise in workout_exercises[workout_id][body_part_name]:
            if grouped_exercise["key"] == exercise_key:
                grouped_exercise["sets"] += exercise.sets
                found = True
                break

        # If no match found, create a new entry
        if not found:
            workout_exercises[workout_id][body_part_name].append({
                "key": exercise_key,
                "exercise_name": exercise.get_exercise_name(),
                "weight": float(exercise.weight),
                "reps": exercise.reps,
                "sets": exercise.sets,
            })

    # Check if no workouts exist for the selected date
    workouts_exist = bool(workouts)

    # Calculate the total weight lifted and total reps performed for the selected date
    # Convert to float to avoid Decimal type issues in templates
    total_weight_lifted = float(Exercise.get_total_weight_lifted(workout_ids))
    total_reps_performed = float(Exercise.get_total_reps(workout_ids))

    # Get the workouts this week for progress snapshot
    workouts_this_week = Workout.get_workouts_this_week(current_user.user_id)
    
    # Calculate workout streak
    workout_streak = Workout.calculate_consecutive_workout_days(current_user.user_id)
    
    # Get max single lift (all time)
    max_lift_exercise = db.session.query(Exercise).filter(
        Exercise.user_id == current_user.user_id
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
    
    # Get recent PRs (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_prs = []
    recent_exercises = db.session.query(Exercise).filter(
        Exercise.user_id == current_user.user_id,
        Exercise.date >= week_ago.date()
    ).order_by(Exercise.weight.desc()).limit(5).all()
    
    for ex in recent_exercises:
        # Check if this is a PR (highest weight for this exercise)
        max_for_exercise = db.session.query(func.max(Exercise.weight)).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.standard_exercise_id == ex.standard_exercise_id if ex.standard_exercise_id else None,
            Exercise.custom_exercise_id == ex.custom_exercise_id if ex.custom_exercise_id else None,
            Exercise.date < ex.date
        ).scalar()
        
        if max_for_exercise is None or ex.weight > max_for_exercise:
            recent_prs.append({
                'name': ex.get_exercise_name(),
                'weight': float(ex.weight),
                'date': ex.date
            })
    
    # Pass data to the template
    return render_template(
        'dashboard.html',
        workouts_this_week=len(workouts_this_week),
        total_weight_lifted=total_weight_lifted,
        total_reps_performed=total_reps_performed,
        max_single_lift=max_single_lift,
        max_lift_name=max_lift_name,
        unique_exercises_count=unique_exercises,
        workout_streak=workout_streak,
        quote=quote,
        recent_prs=recent_prs,
        user=user_data,
        workouts=workouts,
        workout_exercises=workout_exercises,
        current_date=selected_date.strftime('%Y-%m-%d'),
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
            'message': 'Registration failed. Please try different credentials.',
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

