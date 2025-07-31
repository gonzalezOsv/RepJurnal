# routes/main_routes.py
import json

from flask import Blueprint, jsonify, render_template, request, redirect, url_for, flash, current_app
from werkzeug.security import generate_password_hash
from .models import db, User, Workout, Exercise, CustomExercise
from .auth_service import AuthService
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

            # Redirect to 'next' or default to the dashboard
            next_page = request.args.get('next')
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
                "weight": exercise.weight,
                "reps": exercise.reps,
                "sets": exercise.sets,
            })

    # Check if no workouts exist for the selected date
    workouts_exist = bool(workouts)

    # Calculate the total weight lifted and total reps performed for the selected date
    total_weight_lifted = Exercise.get_total_weight_lifted(workout_ids)
    total_reps_performed = Exercise.get_total_reps(workout_ids)

    # Get the workouts this week for progress snapshot
    workouts_this_week = Workout.get_workouts_this_week(current_user.user_id)

   # max_single_lift = Exercise.query.filter_by(workout_id=workout_ids).order_by(Exercise.weight.desc()).first().weight
   # unique_exercises_count = Exercise.query.filter_by(workout_id=workout_ids).distinct(Exercise.exercise_name).count()
    #workout_streak = Workout.calculate_consecutive_workout_days(current_user.user_id)

    # Pass data to the template
    return render_template(
        'dashboard.html',
        #unique_exercises_count = unique_exercises_count,
        #max_single_lift = max_single_lift,
        workouts_this_week=len(workouts_this_week),
        total_weight_lifted=total_weight_lifted,
        total_reps_performed=total_reps_performed,
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
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    print("Login start...")
    user = auth_service.authenticate(username, password)
    login_user(user)  # Log the user in
    print("is this a user >>> ")
    print(user)

    if user:
        print("we are in ...")
        return jsonify({'redirect_url': url_for('main.dashboard')})
    else:
        print("we have failed....")
        return jsonify({
            'message': 'Invalid Username or Password please try again.'
        }), 401

@auth_bp.route('/register', methods=['POST'])
def register_user():
    print("starting register process....")
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')


    if get_user_by_username(username):
        return jsonify({
        'message': 'Username already exists', 'fields': {'username': 'This username is taken'}
    }), 400
    
    if not email or '@' not in email:
        return jsonify({'message': 'Invalid email address', 'fields': {'email': 'Please provide a valid email'}
    }), 400

    print("data gathered....")
    if get_user_by_username(username) is not None:
        return jsonify({'message': 'Username already exists'}), 400



    new_user = User(username=username)
    new_user.set_password(password)
    new_user.set_email(email)

    # db.session.commit() fails or if login_user(new_user) throws an exception, you should log it on the server and provide a generic error message to the client.
    try:
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return jsonify({'redirect_url': url_for('main.dashboard')})
    except Exception as e:
        print(f"Registration failed: {e}")
        return jsonify({'message': 'An error occurred during registration. Please try again.'}), 500




@main_bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    print("Logging out...")
    logout_user()
    print("Done.")
    return redirect(url_for('main.home'))


@main_bp.route('/account')
@login_required
def account():
    user = User.query.get(current_user.user_id)
    print("going to account... ")

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

