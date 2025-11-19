from datetime import datetime

from flask import Blueprint, flash, jsonify, request
from flask_login import current_user, login_required

from .models import User, db, Block
from .my_utils import format_phone_number
from .rate_limiter import rate_limit_strict

account_bp = Blueprint('account', __name__)

@account_bp.route('/update', methods=['POST'])
@login_required
@rate_limit_strict(max_requests=20, time_window_seconds=60)
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

        # Profile basics
        date_of_birth_raw = request.form.get('date_of_birth', '').strip()
        if date_of_birth_raw:
            try:
                user.date_of_birth = datetime.strptime(date_of_birth_raw, '%Y-%m-%d').date()
            except ValueError:
                current_app.logger.warning(f"Invalid date_of_birth for user {current_user.user_id}: {date_of_birth_raw}")
                user.date_of_birth = None
        else:
            user.date_of_birth = None

        gender = request.form.get('gender', '').strip()
        user.gender = gender or None

        # New Fields
        height_cm_raw = request.form.get('height_cm', '').strip()
        if height_cm_raw:
            try:
                user.height_cm = float(height_cm_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid height_cm for user {current_user.user_id}: {height_cm_raw}")
                user.height_cm = None
        else:
            user.height_cm = None
            
        weight_kg_raw = request.form.get('weight_kg', '').strip()
        if weight_kg_raw:
            try:
                user.weight_kg = float(weight_kg_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid weight_kg for user {current_user.user_id}: {weight_kg_raw}")
                user.weight_kg = None
        else:
            user.weight_kg = None

        fitness_goal = request.form.get('fitness_goal', '').strip()
        user.fitness_goal = fitness_goal or None

        dietary_preferences = request.form.get('dietary_preferences', '').strip()
        user.dietary_preferences = dietary_preferences or None

        preferred_workout_time = request.form.get('preferred_workout_time', '').strip()
        if preferred_workout_time:
            try:
                # Accept both HH:MM and HH:MM:SS by trimming seconds if provided
                time_value = preferred_workout_time[:5] if len(preferred_workout_time) >= 5 else preferred_workout_time
                user.preferred_workout_time = datetime.strptime(time_value, '%H:%M').time()
            except ValueError:
                current_app.logger.warning(f"Invalid time format for user {current_user.user_id}: {preferred_workout_time}")
                user.preferred_workout_time = None
        else:
            user.preferred_workout_time = None

        # Additional Body Metrics
        body_fat_raw = request.form.get('body_fat_percentage', '').strip()
        if body_fat_raw:
            try:
                user.body_fat_percentage = float(body_fat_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid body_fat_percentage for user {current_user.user_id}: {body_fat_raw}")
                user.body_fat_percentage = None
        else:
            user.body_fat_percentage = None

        activity_level = request.form.get('activity_level', '').strip()
        user.activity_level = activity_level or None

        # Goal Tracking
        target_weight_kg_raw = request.form.get('target_weight_kg', '').strip()
        if target_weight_kg_raw:
            try:
                user.target_weight_kg = float(target_weight_kg_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid target_weight_kg for user {current_user.user_id}: {target_weight_kg_raw}")
                user.target_weight_kg = None
        else:
            user.target_weight_kg = None

        target_body_fat_raw = request.form.get('target_body_fat_percentage', '').strip()
        if target_body_fat_raw:
            try:
                user.target_body_fat_percentage = float(target_body_fat_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid target_body_fat_percentage for user {current_user.user_id}: {target_body_fat_raw}")
                user.target_body_fat_percentage = None
        else:
            user.target_body_fat_percentage = None

        weekly_weight_loss_goal_raw = request.form.get('weekly_weight_loss_goal', '').strip()
        if weekly_weight_loss_goal_raw:
            try:
                user.weekly_weight_loss_goal = float(weekly_weight_loss_goal_raw)
            except ValueError:
                current_app.logger.warning(f"Invalid weekly_weight_loss_goal for user {current_user.user_id}: {weekly_weight_loss_goal_raw}")
                user.weekly_weight_loss_goal = None
        else:
            user.weekly_weight_loss_goal = None

        # Health & Medical Information
        medical_conditions = request.form.get('medical_conditions', '').strip()
        user.medical_conditions = medical_conditions or None

        allergies = request.form.get('allergies', '').strip()
        user.allergies = allergies or None

        injuries = request.form.get('injuries', '').strip()
        user.injuries = injuries or None

        # Lifestyle Factors
        smoking_status = request.form.get('smoking_status', '').strip()
        user.smoking_status = smoking_status or None

        alcohol_consumption = request.form.get('alcohol_consumption', '').strip()
        user.alcohol_consumption = alcohol_consumption or None

        motivation_level = request.form.get('motivation_level', '').strip()
        user.motivation_level = motivation_level or None
        
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


@account_bp.route('/privacy', methods=['POST'])
@login_required
@rate_limit_strict(max_requests=10, time_window_seconds=60)
def update_privacy_settings():
    """
    Update user privacy and social sharing preferences.
    """
    from flask import current_app

    current_app.logger.info(f"User {current_user.user_id} updating privacy settings")

    try:
        user = User.query.get(current_user.user_id)

        visibility = request.form.get('profile_visibility', '').strip()
        if visibility in {'public', 'friends_only', 'private'}:
            user.profile_visibility = visibility

        bio = request.form.get('bio', '')
        user.bio = bio.strip() or None

        user.show_stats_to_friends = request.form.get('show_stats_to_friends') == 'true'
        user.show_workouts_to_friends = request.form.get('show_workouts_to_friends') == 'true'
        user.show_routines_to_public = request.form.get('show_routines_to_public') == 'true'

        db.session.commit()

        current_app.logger.info(f"User {current_user.user_id} privacy settings updated successfully")
        current_app.security_logger.info(f"Event: privacy_updated | User: {current_user.user_id} | IP: {request.remote_addr}")

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating privacy for user {current_user.user_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to update privacy settings'}), 500


@account_bp.route('/blocked', methods=['GET'])
@login_required
@rate_limit_strict(max_requests=30, time_window_seconds=60)
def get_blocked_users():
    """
    Get list of users blocked by current user.
    """
    from flask import current_app
    
    try:
        blocks = Block.query.filter(
            Block.user_id == current_user.user_id
        ).all()
        
        blocked_users = []
        for block in blocks:
            blocked_user = block.blocked_user
            blocked_users.append({
                'user_id': blocked_user.user_id,
                'username': blocked_user.username,
                'first_name': blocked_user.first_name,
                'last_name': blocked_user.last_name,
                'block_id': block.block_id,
                'blocked_at': block.created_at.isoformat() if block.created_at else None
            })
        
        return jsonify({'blocked_users': blocked_users}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching blocked users for user {current_user.user_id}: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to fetch blocked users'}), 500
