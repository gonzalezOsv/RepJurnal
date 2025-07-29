from flask import request, flash, redirect, url_for, Blueprint, jsonify
from flask_login import login_required, current_user
from models import db, User
from my_utils import format_phone_number

# Define blueprints
account_bp = Blueprint('account', __name__)



from flask import request, flash, jsonify
from flask_login import login_required, current_user
from datetime import datetime

@account_bp.route('/update', methods=['POST'])
@login_required
def update_account():
    print("saving changes ...")
    user = User.query.get(current_user.user_id)
    
    # Existing Fields
    user.first_name = request.form.get('first_name')
    user.last_name = request.form.get('last_name')
    user.phone_number = format_phone_number(request.form.get('phone_number'))
    user.address = request.form.get('address')

    # New Fields
    # Make sure these fields are converted correctly (e.g., to float for height, weight, or time for preferred workout time)
    height_cm = request.form.get('height_cm')
    if height_cm:
        user.height_cm = float(height_cm)  # Convert to float
    weight_kg = request.form.get('weight_kg')
    if weight_kg:
        user.weight_kg = float(weight_kg)  # Convert to float

    fitness_goal = request.form.get('fitness_goal')
    if fitness_goal:
        user.fitness_goal = fitness_goal

    dietary_preferences = request.form.get('dietary_preferences')
    if dietary_preferences:
        user.dietary_preferences = dietary_preferences

    preferred_workout_time = request.form.get('preferred_workout_time')
    if preferred_workout_time:
        try:
            user.preferred_workout_time = datetime.strptime(preferred_workout_time, '%H:%M').time()  # Converting string to time
        except ValueError:
            user.preferred_workout_time = None  # If conversion fails, set it to None
    
    # Save the updated user object
    db.session.commit()
    print("done ...")
    flash("Account details updated successfully!", "success")
    
    return jsonify({'success': True})
