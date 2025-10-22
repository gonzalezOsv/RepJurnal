from flask import request, flash, redirect, url_for, Blueprint, jsonify
from flask_login import login_required, current_user
from .models import db, User
from .my_utils import format_phone_number

# Define blueprints
account_bp = Blueprint('account', __name__)



from flask import request, flash, jsonify
from flask_login import login_required, current_user
from datetime import datetime

@account_bp.route('/update', methods=['POST'])
@login_required
def update_account():
    """
    Update user account information.
    """
    from flask import current_app
    
    current_app.logger.info(f"User {current_user.user_id} updating account information")
    
    try:
        user = User.query.get(current_user.user_id)
        
        # Existing Fields
        user.first_name = request.form.get('first_name')
        user.last_name = request.form.get('last_name')
        user.phone_number = format_phone_number(request.form.get('phone_number'))
        user.address = request.form.get('address')

        # New Fields
        height_cm = request.form.get('height_cm')
        if height_cm:
            user.height_cm = float(height_cm)
            
        weight_kg = request.form.get('weight_kg')
        if weight_kg:
            user.weight_kg = float(weight_kg)

        fitness_goal = request.form.get('fitness_goal')
        if fitness_goal:
            user.fitness_goal = fitness_goal

        dietary_preferences = request.form.get('dietary_preferences')
        if dietary_preferences:
            user.dietary_preferences = dietary_preferences

        preferred_workout_time = request.form.get('preferred_workout_time')
        if preferred_workout_time:
            try:
                user.preferred_workout_time = datetime.strptime(preferred_workout_time, '%H:%M').time()
            except ValueError:
                current_app.logger.warning(f"Invalid time format for user {current_user.user_id}")
                user.preferred_workout_time = None
        
        # Save the updated user object
        db.session.commit()
        
        current_app.logger.info(f"User {current_user.user_id} account updated successfully")
        current_app.security_logger.info(f"Event: account_updated | User: {current_user.user_id} | IP: {request.remote_addr}")
        
        flash("Account details updated successfully!", "success")
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating account for user {current_user.user_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to update account'}), 500
