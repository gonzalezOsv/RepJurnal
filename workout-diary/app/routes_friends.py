"""
Friends and Social Features Routes
Handles friend requests, friendships, and social interactions
"""

from flask import Blueprint, jsonify, request, current_app, render_template
from flask_login import login_required, current_user
from sqlalchemy import or_, and_, desc, func
from datetime import datetime, timedelta

from .models import db, User, Friend, FriendRequest, WorkoutRoutine, Workout, Exercise, BodyPart, RoutineStats
from sqlalchemy.orm import joinedload

friends_bp = Blueprint('friends', __name__, url_prefix='/friends')

# ===================================
# PAGE ROUTES
# ===================================

@friends_bp.route('/', methods=['GET'])
@login_required
def friends_page():
    """Render the friends page with user privacy settings"""
    # Pass user privacy settings to enforce on frontend
    user_settings = {
        'show_routines_to_public': current_user.show_routines_to_public if hasattr(current_user, 'show_routines_to_public') else False,
        'profile_visibility': current_user.profile_visibility if hasattr(current_user, 'profile_visibility') else 'private',
        'show_stats_to_friends': current_user.show_stats_to_friends if hasattr(current_user, 'show_stats_to_friends') else False,
        'show_workouts_to_friends': current_user.show_workouts_to_friends if hasattr(current_user, 'show_workouts_to_friends') else False
    }
    return render_template('friends.html', user_settings=user_settings)

# ===================================
# FRIEND SEARCH & DISCOVERY
# ===================================

@friends_bp.route('/api/search', methods=['GET'])
@login_required
def search_users():
    """Search for users by username or name"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search users (exclude current user)
        users = User.query.filter(
            and_(
                User.user_id != current_user.user_id,
                or_(
                    User.username.ilike(f'%{query}%'),
                    User.first_name.ilike(f'%{query}%'),
                    User.last_name.ilike(f'%{query}%')
                )
            )
        ).limit(20).all()
        
        # Get existing friend IDs for current user
        existing_friends = db.session.query(Friend.friend_id).filter(
            Friend.user_id == current_user.user_id
        ).all()
        friend_ids = {f[0] for f in existing_friends}
        
        # Get pending request IDs (sent or received)
        pending_sent = db.session.query(FriendRequest.receiver_id).filter(
            and_(
                FriendRequest.sender_id == current_user.user_id,
                FriendRequest.status == 'pending'
            )
        ).all()
        pending_received = db.session.query(FriendRequest.sender_id).filter(
            and_(
                FriendRequest.receiver_id == current_user.user_id,
                FriendRequest.status == 'pending'
            )
        ).all()
        pending_ids = {r[0] for r in pending_sent}.union({r[0] for r in pending_received})
        
        results = []
        for user in users:
            # Only show users with public profiles or friends
            if user.profile_visibility == 'private' and user.user_id not in friend_ids:
                continue
                
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'bio': user.bio if user.profile_visibility == 'public' or user.user_id in friend_ids else None,
                'profile_picture_url': user.profile_picture_url,
                'is_friend': user.user_id in friend_ids,
                'has_pending_request': user.user_id in pending_ids
            }
            results.append(user_data)
        
        return jsonify({'users': results}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error searching users: {e}")
        return jsonify({'error': 'Failed to search users'}), 500


# ===================================
# FRIEND REQUESTS
# ===================================

@friends_bp.route('/api/requests/send', methods=['POST'])
@login_required
def send_friend_request():
    """Send a friend request to another user"""
    try:
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        message = data.get('message', '').strip()
        
        if not receiver_id:
            return jsonify({'error': 'Receiver ID is required'}), 400
        
        # Check if receiver exists
        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({'error': 'User not found'}), 404
        
        # Can't send request to yourself
        if receiver_id == current_user.user_id:
            return jsonify({'error': 'Cannot send friend request to yourself'}), 400
        
        # Check if already friends
        existing_friendship = Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.user_id, Friend.friend_id == receiver_id),
                and_(Friend.user_id == receiver_id, Friend.friend_id == current_user.user_id)
            )
        ).first()
        
        if existing_friendship:
            return jsonify({'error': 'Already friends with this user'}), 400
        
        # Check for existing pending request
        existing_request = FriendRequest.query.filter(
            or_(
                and_(
                    FriendRequest.sender_id == current_user.user_id,
                    FriendRequest.receiver_id == receiver_id,
                    FriendRequest.status == 'pending'
                ),
                and_(
                    FriendRequest.sender_id == receiver_id,
                    FriendRequest.receiver_id == current_user.user_id,
                    FriendRequest.status == 'pending'
                )
            )
        ).first()
        
        if existing_request:
            return jsonify({'error': 'Friend request already pending'}), 400
        
        # Create friend request
        friend_request = FriendRequest(
            sender_id=current_user.user_id,
            receiver_id=receiver_id,
            message=message[:500] if message else None,  # Limit message length
            status='pending'
        )
        
        db.session.add(friend_request)
        db.session.commit()
        
        current_app.logger.info(f"Friend request sent from user {current_user.user_id} to user {receiver_id}")
        
        return jsonify({
            'message': 'Friend request sent successfully',
            'request': friend_request.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error sending friend request: {e}")
        return jsonify({'error': 'Failed to send friend request'}), 500


@friends_bp.route('/api/requests/incoming', methods=['GET'])
@login_required
def get_incoming_requests():
    """Get all incoming friend requests for current user"""
    try:
        requests = FriendRequest.query.filter(
            FriendRequest.receiver_id == current_user.user_id,
            FriendRequest.status == 'pending'
        ).order_by(desc(FriendRequest.created_at)).all()
        
        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching incoming requests: {e}")
        return jsonify({'error': 'Failed to fetch friend requests'}), 500


@friends_bp.route('/api/requests/outgoing', methods=['GET'])
@login_required
def get_outgoing_requests():
    """Get all outgoing friend requests sent by current user"""
    try:
        requests = FriendRequest.query.filter(
            FriendRequest.sender_id == current_user.user_id,
            FriendRequest.status == 'pending'
        ).order_by(desc(FriendRequest.created_at)).all()
        
        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching outgoing requests: {e}")
        return jsonify({'error': 'Failed to fetch friend requests'}), 500


@friends_bp.route('/api/requests/<int:request_id>/accept', methods=['POST'])
@login_required
def accept_friend_request(request_id):
    """Accept a friend request"""
    try:
        friend_request = FriendRequest.query.get(request_id)
        
        if not friend_request:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Only the receiver can accept
        if friend_request.receiver_id != current_user.user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if friend_request.status != 'pending':
            return jsonify({'error': 'Request already processed'}), 400
        
        # Update request status
        friend_request.status = 'accepted'
        
        # Create bidirectional friendship
        friendship1 = Friend(
            user_id=current_user.user_id,
            friend_id=friend_request.sender_id
        )
        friendship2 = Friend(
            user_id=friend_request.sender_id,
            friend_id=current_user.user_id
        )
        
        db.session.add(friendship1)
        db.session.add(friendship2)
        db.session.commit()
        
        current_app.logger.info(f"Friend request {request_id} accepted - Users {current_user.user_id} and {friend_request.sender_id} are now friends")
        
        return jsonify({
            'message': 'Friend request accepted',
            'friendship': friendship1.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error accepting friend request: {e}")
        return jsonify({'error': 'Failed to accept friend request'}), 500


@friends_bp.route('/api/requests/<int:request_id>/decline', methods=['POST'])
@login_required
def decline_friend_request(request_id):
    """Decline a friend request"""
    try:
        friend_request = FriendRequest.query.get(request_id)
        
        if not friend_request:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Only the receiver can decline
        if friend_request.receiver_id != current_user.user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if friend_request.status != 'pending':
            return jsonify({'error': 'Request already processed'}), 400
        
        friend_request.status = 'declined'
        db.session.commit()
        
        current_app.logger.info(f"Friend request {request_id} declined by user {current_user.user_id}")
        
        return jsonify({'message': 'Friend request declined'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error declining friend request: {e}")
        return jsonify({'error': 'Failed to decline friend request'}), 500


@friends_bp.route('/api/requests/<int:request_id>/cancel', methods=['DELETE'])
@login_required
def cancel_friend_request(request_id):
    """Cancel a sent friend request"""
    try:
        friend_request = FriendRequest.query.get(request_id)
        
        if not friend_request:
            return jsonify({'error': 'Friend request not found'}), 404
        
        # Only the sender can cancel
        if friend_request.sender_id != current_user.user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if friend_request.status != 'pending':
            return jsonify({'error': 'Can only cancel pending requests'}), 400
        
        db.session.delete(friend_request)
        db.session.commit()
        
        current_app.logger.info(f"Friend request {request_id} cancelled by user {current_user.user_id}")
        
        return jsonify({'message': 'Friend request cancelled'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error cancelling friend request: {e}")
        return jsonify({'error': 'Failed to cancel friend request'}), 500


# ===================================
# FRIENDS LIST & MANAGEMENT
# ===================================

@friends_bp.route('/api/list', methods=['GET'])
@login_required
def get_friends_list():
    """Get list of all friends for current user"""
    try:
        friendships = Friend.query.options(
            joinedload(Friend.friend)
        ).filter(
            Friend.user_id == current_user.user_id
        ).all()
        
        friends_data = []
        for friendship in friendships:
            friend = friendship.friend
            friend_data = {
                'friendship_id': friendship.friendship_id,
                'user_id': friend.user_id,
                'username': friend.username,
                'first_name': friend.first_name,
                'last_name': friend.last_name,
                'bio': friend.bio,
                'profile_picture_url': friend.profile_picture_url,
                'profile_visibility': friend.profile_visibility,
                'friends_since': friendship.created_at.isoformat() if friendship.created_at else None
            }
            friends_data.append(friend_data)
        
        return jsonify({'friends': friends_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friends list: {e}")
        return jsonify({'error': 'Failed to fetch friends list'}), 500


@friends_bp.route('/api/<int:friendship_id>', methods=['DELETE'])
@login_required
def remove_friend(friendship_id):
    """Remove a friend (unfriend)"""
    try:
        friendship = Friend.query.get(friendship_id)
        
        if not friendship:
            return jsonify({'error': 'Friendship not found'}), 404
        
        # Only the owner of this friendship entry can delete it
        if friendship.user_id != current_user.user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        friend_id = friendship.friend_id
        
        # Delete both directions of friendship
        Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.user_id, Friend.friend_id == friend_id),
                and_(Friend.user_id == friend_id, Friend.friend_id == current_user.user_id)
            )
        ).delete()
        
        db.session.commit()
        
        current_app.logger.info(f"User {current_user.user_id} unfriended user {friend_id}")
        
        return jsonify({'message': 'Friend removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing friend: {e}")
        return jsonify({'error': 'Failed to remove friend'}), 500


# ===================================
# FRIEND PROFILE & DATA
# ===================================

@friends_bp.route('/api/<int:user_id>/profile', methods=['GET'])
@login_required
def get_friend_profile(user_id):
    """Get profile information for a specific user"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if they're friends
        is_friend = Friend.query.filter(
            Friend.user_id == current_user.user_id,
            Friend.friend_id == user_id
        ).first() is not None
        
        # Check privacy settings
        if user.profile_visibility == 'private' and not is_friend:
            return jsonify({'error': 'This profile is private'}), 403
        
        # Basic profile data
        profile_data = {
            'user_id': user.user_id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'bio': user.bio,
            'profile_picture_url': user.profile_picture_url,
            'profile_visibility': user.profile_visibility,
            'is_friend': is_friend
        }
        
        # Add extended data for friends
        if is_friend and user.show_stats_to_friends:
            # Get workout stats
            stats = db.session.execute(
                db.text("""
                    SELECT * FROM UserWorkoutStats 
                    WHERE user_id = :user_id
                """),
                {'user_id': user_id}
            ).fetchone()
            
            if stats:
                profile_data['stats'] = {
                    'total_workouts': stats[4],
                    'total_workout_days': stats[5],
                    'total_exercises_logged': stats[6],
                    'total_sets': stats[7],
                    'total_volume_lbs': float(stats[8]) if stats[8] else 0,
                    'first_workout_date': stats[9].isoformat() if stats[9] else None,
                    'last_workout_date': stats[10].isoformat() if stats[10] else None,
                    'total_routines_created': stats[11]
                }
        
        return jsonify({'profile': profile_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friend profile: {e}")
        return jsonify({'error': 'Failed to fetch profile'}), 500


@friends_bp.route('/api/<int:user_id>/routines', methods=['GET'])
@login_required
def get_friend_routines(user_id):
    """Get public/shared routines from a friend"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # ENFORCE PRIVACY SETTING: Check if user allows sharing routines
        if not user.show_routines_to_public:
            return jsonify({
                'error': 'This user has disabled public routines sharing',
                'routines': []
            }), 403
        
        # Check if they're friends
        is_friend = Friend.query.filter(
            Friend.user_id == current_user.user_id,
            Friend.friend_id == user_id
        ).first() is not None
        
        # Build query based on relationship - EAGER LOAD exercises for performance
        if is_friend:
            # Friends can see public and friends_only routines
            routines_query = WorkoutRoutine.query.options(
                joinedload(WorkoutRoutine.exercises).joinedload('body_part')
            ).filter(
                WorkoutRoutine.user_id == user_id,
                WorkoutRoutine.visibility.in_(['public', 'friends_only']),
                WorkoutRoutine.is_deleted == False
            )
        else:
            # Non-friends can only see public routines
            routines_query = WorkoutRoutine.query.options(
                joinedload(WorkoutRoutine.exercises).joinedload('body_part')
            ).filter(
                WorkoutRoutine.user_id == user_id,
                WorkoutRoutine.visibility == 'public',
                WorkoutRoutine.is_deleted == False
            )
        
        routines = routines_query.order_by(desc(WorkoutRoutine.created_at)).all()
        
        current_app.logger.info(f"📊 Found {len(routines)} routines for user {user_id}")
        
        routines_data = []
        for routine in routines:
            current_app.logger.info(f"  📝 Processing routine: {routine.routine_name}, Exercises: {len(routine.exercises)}")
            # Get public stats for this routine
            routine_stats = RoutineStats.query.filter_by(routine_id=routine.routine_id).first()
            
            # Check if current user has already imported this routine
            already_imported = WorkoutRoutine.query.filter(
                WorkoutRoutine.user_id == current_user.user_id,
                WorkoutRoutine.imported_from_user_id == user_id,
                WorkoutRoutine.routine_name == routine.routine_name,
                WorkoutRoutine.is_deleted == False
            ).first() is not None
            
            routine_dict = {
                'routine_id': routine.routine_id,
                'routine_name': routine.routine_name,
                'description': routine.description,
                'visibility': routine.visibility,
                'created_at': routine.created_at.isoformat() if routine.created_at else None,
                'creator_username': user.username,
                'creator_name': f"{user.first_name} {user.last_name}".strip(),
                'already_imported_by_user': already_imported,
                'exercises': [],
                # Add public stats (visible to everyone viewing)
                'public_stats': {
                    'times_copied': routine_stats.times_copied if routine_stats else 0,
                    'total_completions': routine_stats.total_completions_all_users if routine_stats else 0,
                    'active_users': routine_stats.active_users_count if routine_stats else 0,
                    'popularity_score': routine_stats.popularity_score if routine_stats else 0,
                    'last_used_by_anyone': routine_stats.last_used_by_anyone.isoformat() if routine_stats and routine_stats.last_used_by_anyone else None
                }
            }
            
            # Add exercises
            for exercise in routine.exercises:
                exercise_dict = {
                    'exercise_name': exercise.exercise_name,
                    'body_part': exercise.body_part.body_part_name if exercise.body_part else None,
                    'sets': exercise.sets,
                    'reps': exercise.reps,
                    'weight': exercise.weight,
                    'unit': exercise.unit,
                    'exercise_type': exercise.exercise_type,
                    'exercise_order': exercise.exercise_order
                }
                
                # Add cardio fields if applicable
                if exercise.exercise_type == 'cardio':
                    exercise_dict.update({
                        'duration_minutes': exercise.duration_minutes,
                        'distance_miles': exercise.distance_miles,
                        'distance_km': exercise.distance_km,
                        'intensity': exercise.intensity
                    })
                
                routine_dict['exercises'].append(exercise_dict)
            
            routines_data.append(routine_dict)
        
        return jsonify({'routines': routines_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friend routines: {e}")
        return jsonify({'error': 'Failed to fetch routines'}), 500


@friends_bp.route('/api/<int:user_id>/workouts/recent', methods=['GET'])
@login_required
def get_friend_recent_workouts(user_id):
    """Get recent workout activity from a friend"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Must be friends to see workouts
        is_friend = Friend.query.filter(
            Friend.user_id == current_user.user_id,
            Friend.friend_id == user_id
        ).first() is not None
        
        if not is_friend or not user.show_workouts_to_friends:
            return jsonify({'error': 'Not authorized to view workouts'}), 403
        
        # Get recent workouts (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        workouts = db.session.execute(
            db.text("""
                SELECT * FROM WorkoutActivityFeed 
                WHERE user_id = :user_id 
                AND workout_date >= :since_date
                ORDER BY workout_date DESC
                LIMIT 20
            """),
            {'user_id': user_id, 'since_date': thirty_days_ago}
        ).fetchall()
        
        workouts_data = []
        for workout in workouts:
            workout_dict = {
                'workout_id': workout[0],
                'workout_date': workout[5].isoformat() if workout[5] else None,
                'workout_notes': workout[6],
                'exercises_count': workout[7],
                'body_parts_count': workout[8],
                'total_sets': workout[9],
                'total_volume': float(workout[10]) if workout[10] else 0
            }
            workouts_data.append(workout_dict)
        
        return jsonify({'workouts': workouts_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friend workouts: {e}")
        return jsonify({'error': 'Failed to fetch workouts'}), 500


# ===================================
# FRIEND ACTIVITY FEED
# ===================================

@friends_bp.route('/api/feed', methods=['GET'])
@login_required
def get_friends_activity_feed():
    """Get combined activity feed from all friends"""
    try:
        # Get all friend IDs
        friend_ids = db.session.query(Friend.friend_id).filter(
            Friend.user_id == current_user.user_id
        ).all()
        friend_ids = [f[0] for f in friend_ids]
        
        if not friend_ids:
            return jsonify({'activities': []}), 200
        
        # Get recent workouts from friends
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        activities = db.session.execute(
            db.text("""
                SELECT * FROM WorkoutActivityFeed 
                WHERE user_id IN :friend_ids
                AND workout_date >= :since_date
                ORDER BY workout_date DESC
                LIMIT 50
            """),
            {'friend_ids': tuple(friend_ids), 'since_date': seven_days_ago}
        ).fetchall()
        
        activities_data = []
        for activity in activities:
            # Check if friend allows showing workouts
            friend = User.query.get(activity[1])
            if not friend or not friend.show_workouts_to_friends:
                continue
            
            activity_dict = {
                'workout_id': activity[0],
                'user_id': activity[1],
                'username': activity[2],
                'first_name': activity[3],
                'last_name': activity[4],
                'workout_date': activity[5].isoformat() if activity[5] else None,
                'exercises_count': activity[7],
                'body_parts_count': activity[8],
                'total_sets': activity[9],
                'total_volume': float(activity[10]) if activity[10] else 0
            }
            activities_data.append(activity_dict)
        
        return jsonify({'activities': activities_data}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching friends activity feed: {e}")
        return jsonify({'error': 'Failed to fetch activity feed'}), 500

