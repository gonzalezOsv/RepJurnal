"""
Friends and Social Features Routes
Handles friend requests, friendships, and social interactions
"""

from flask import Blueprint, jsonify, request, current_app, render_template
from flask_login import login_required, current_user
from sqlalchemy import or_, and_, desc, func
from datetime import datetime, timedelta

from .models import db, User, Friend, FriendRequest, Block, WorkoutRoutine, Workout, Exercise, BodyPart, RoutineStats, TrackedExercise, StandardExercise, CustomExercise
from sqlalchemy.orm import joinedload
from .rate_limiter import rate_limit_strict, rate_limit_lenient

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
@rate_limit_lenient(max_requests=50, time_window_seconds=60)
def search_users():
    """Search for users by username or name"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query or len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Get blocked user IDs (users I blocked and users who blocked me)
        blocked_by_me = db.session.query(Block.blocked_user_id).filter(
            Block.user_id == current_user.user_id
        ).all()
        blocked_me = db.session.query(Block.user_id).filter(
            Block.blocked_user_id == current_user.user_id
        ).all()
        blocked_ids = {b[0] for b in blocked_by_me}.union({b[0] for b in blocked_me})
        
        # Search users (exclude current user and blocked users)
        # Use MySQL-compatible LIKE (case-insensitive with utf8mb4_unicode_ci collation)
        search_pattern = f'%{query}%'
        users = User.query.filter(
            and_(
                User.user_id != current_user.user_id,
                ~User.user_id.in_(blocked_ids) if blocked_ids else True,
                or_(
                    User.username.like(search_pattern),
                    User.first_name.like(search_pattern),
                    User.last_name.like(search_pattern)
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
            # Handle case where profile_visibility might not exist yet
            profile_visibility = getattr(user, 'profile_visibility', 'public')
            if profile_visibility == 'private' and user.user_id not in friend_ids:
                continue
                
            # Serialize user data for search results
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile_visibility': profile_visibility,
                'bio': getattr(user, 'bio', None),
                'profile_picture_url': getattr(user, 'profile_picture_url', None),
                'is_friend': user.user_id in friend_ids,
                'has_pending_request': user.user_id in pending_ids
            }
            results.append(user_data)
        
        return jsonify({'users': results}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error searching users: {e}", exc_info=True)
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
        
        # Check if either user blocked the other
        block_exists = Block.query.filter(
            or_(
                and_(Block.user_id == current_user.user_id, Block.blocked_user_id == receiver_id),
                and_(Block.user_id == receiver_id, Block.blocked_user_id == current_user.user_id)
            )
        ).first()
        
        if block_exists:
            return jsonify({'error': 'Cannot send friend request to blocked user'}), 403
        
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
    """Get list of all friends for current user (excluding blocked users)"""
    try:
        # Get blocked user IDs (users I blocked and users who blocked me)
        blocked_by_me = db.session.query(Block.blocked_user_id).filter(
            Block.user_id == current_user.user_id
        ).all()
        blocked_me = db.session.query(Block.user_id).filter(
            Block.blocked_user_id == current_user.user_id
        ).all()
        blocked_ids = {b[0] for b in blocked_by_me}.union({b[0] for b in blocked_me})
        
        query = Friend.query.options(
            joinedload(Friend.friend)
        ).filter(
            Friend.user_id == current_user.user_id
        )
        
        # Exclude blocked users
        if blocked_ids:
            query = query.filter(~Friend.friend_id.in_(blocked_ids))
        
        friendships = query.all()
        
        friends_data = []
        for friendship in friendships:
            friend = friendship.friend
            # Use privacy-aware serialization - friends can see bio since they're already friends
            friend_data = friend.to_friend_dict(requester_is_friend=True)
            friend_data['friendship_id'] = friendship.friendship_id
            friend_data['created_at'] = friendship.created_at.isoformat() if friendship.created_at else None
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


@friends_bp.route('/api/block/<int:user_id>', methods=['POST'])
@login_required
@rate_limit_strict(max_requests=10, time_window_seconds=60)
def block_user(user_id):
    """Block a user"""
    try:
        # Can't block yourself
        if user_id == current_user.user_id:
            return jsonify({'error': 'Cannot block yourself'}), 400
        
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if already blocked
        existing_block = Block.query.filter(
            and_(
                Block.user_id == current_user.user_id,
                Block.blocked_user_id == user_id
            )
        ).first()
        
        if existing_block:
            return jsonify({'error': 'User is already blocked'}), 400
        
        # Remove friendship if exists (both directions)
        Friend.query.filter(
            or_(
                and_(Friend.user_id == current_user.user_id, Friend.friend_id == user_id),
                and_(Friend.user_id == user_id, Friend.friend_id == current_user.user_id)
            )
        ).delete()
        
        # Remove any pending friend requests
        FriendRequest.query.filter(
            or_(
                and_(FriendRequest.sender_id == current_user.user_id, FriendRequest.receiver_id == user_id),
                and_(FriendRequest.sender_id == user_id, FriendRequest.receiver_id == current_user.user_id)
            )
        ).delete()
        
        # Create block
        block = Block(
            user_id=current_user.user_id,
            blocked_user_id=user_id
        )
        
        db.session.add(block)
        db.session.commit()
        
        current_app.logger.info(f"User {current_user.user_id} blocked user {user_id}")
        
        return jsonify({
            'message': 'User blocked successfully',
            'block': block.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error blocking user: {e}")
        return jsonify({'error': 'Failed to block user'}), 500


@friends_bp.route('/api/block/<int:user_id>', methods=['DELETE'])
@login_required
def unblock_user(user_id):
    """Unblock a user"""
    try:
        block = Block.query.filter(
            and_(
                Block.user_id == current_user.user_id,
                Block.blocked_user_id == user_id
            )
        ).first()
        
        if not block:
            return jsonify({'error': 'User is not blocked'}), 404
        
        db.session.delete(block)
        db.session.commit()
        
        current_app.logger.info(f"User {current_user.user_id} unblocked user {user_id}")
        
        return jsonify({'message': 'User unblocked successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error unblocking user: {e}")
        return jsonify({'error': 'Failed to unblock user'}), 500


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
        
        # Check if either user blocked the other
        block_exists = Block.query.filter(
            or_(
                and_(Block.user_id == current_user.user_id, Block.blocked_user_id == user_id),
                and_(Block.user_id == user_id, Block.blocked_user_id == current_user.user_id)
            )
        ).first()
        
        if block_exists:
            return jsonify({'error': 'Cannot view profile of blocked user'}), 403
        
        # Check if they're friends
        is_friend = Friend.query.filter(
            Friend.user_id == current_user.user_id,
            Friend.friend_id == user_id
        ).first() is not None
        
        # Check privacy settings
        if user.profile_visibility == 'private' and not is_friend:
            return jsonify({'error': 'This profile is private'}), 403
        
        # Use privacy-aware serialization method
        profile_data = user.to_friend_dict(requester_is_friend=is_friend)
        profile_data['is_friend'] = is_friend
        
        # Add extended data (best lift stats) only if user allows sharing with friends AND requester is a friend
        if is_friend and user.show_stats_to_friends:
            # Get best lift stats for the Big 3: Bench Press, Squat, Deadlift
            best_lifts = []
            
            # Define the Big 3 exercises to track with their display names and search variations
            big_3_config = [
                {'display': 'Bench Press', 'patterns': ['Bench Press', 'Bench']},
                {'display': 'Squat', 'patterns': ['Squat', 'Squats']},
                {'display': 'Deadlift', 'patterns': ['Deadlift', 'Deadlifts']}
            ]
            
            for exercise_config in big_3_config:
                target_exercise = exercise_config['display']
                search_patterns = exercise_config['patterns']
                
                # Find max weight for this exercise across all sources and variations
                max_weight_result = None
                matched_exercise_name = None
                matched_pattern = None
                
                # Try exact matches first, then pattern matches
                for pattern in search_patterns:
                    # First try exact match (case-insensitive)
                    result = db.session.query(
                        func.max(Exercise.weight).label('max_weight')
                    ).outerjoin(
                        StandardExercise,
                        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
                    ).outerjoin(
                        CustomExercise,
                        Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
                    ).filter(
                        Exercise.user_id == user_id,
                        Exercise.exercise_type == 'strength',
                        Exercise.weight.isnot(None),
                        or_(
                            func.lower(StandardExercise.exercise_name) == pattern.lower(),
                            func.lower(CustomExercise.exercise_name) == pattern.lower(),
                            func.lower(Exercise.exercise_name) == pattern.lower()
                        )
                    ).first()
                    
                    # If no exact match, try pattern match (contains)
                    if not result or not result.max_weight:
                        result = db.session.query(
                            func.max(Exercise.weight).label('max_weight')
                        ).outerjoin(
                            StandardExercise,
                            Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
                        ).outerjoin(
                            CustomExercise,
                            Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
                        ).filter(
                            Exercise.user_id == user_id,
                            Exercise.exercise_type == 'strength',
                            Exercise.weight.isnot(None),
                            or_(
                                func.lower(StandardExercise.exercise_name).like(f'%{pattern.lower()}%'),
                                func.lower(CustomExercise.exercise_name).like(f'%{pattern.lower()}%'),
                                func.lower(Exercise.exercise_name).like(f'%{pattern.lower()}%')
                            )
                        ).first()
                    
                    if result and result.max_weight:
                        # Found a match - get the actual exercise name used
                        pr_exercise = db.session.query(Exercise).outerjoin(
                            StandardExercise,
                            Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
                        ).outerjoin(
                            CustomExercise,
                            Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
                        ).filter(
                            Exercise.user_id == user_id,
                            Exercise.exercise_type == 'strength',
                            Exercise.weight == result.max_weight,
                            or_(
                                func.lower(StandardExercise.exercise_name).like(f'%{pattern.lower()}%'),
                                func.lower(CustomExercise.exercise_name).like(f'%{pattern.lower()}%'),
                                func.lower(Exercise.exercise_name).like(f'%{pattern.lower()}%')
                            )
                        ).order_by(Exercise.date.desc()).first()
                        
                        if pr_exercise:
                            matched_exercise_name = pr_exercise.get_exercise_name()
                            max_weight_result = result
                            matched_pattern = pattern
                            break  # Found best match for this exercise
                
                if max_weight_result and max_weight_result.max_weight and matched_exercise_name and matched_pattern:
                    # Get the date for this PR using the matched pattern
                    pr_exercise_for_date = db.session.query(Exercise).outerjoin(
                        StandardExercise,
                        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
                    ).outerjoin(
                        CustomExercise,
                        Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
                    ).filter(
                        Exercise.user_id == user_id,
                        Exercise.exercise_type == 'strength',
                        Exercise.weight == max_weight_result.max_weight,
                        or_(
                            func.lower(StandardExercise.exercise_name).like(f'%{matched_pattern.lower()}%'),
                            func.lower(CustomExercise.exercise_name).like(f'%{matched_pattern.lower()}%'),
                            func.lower(Exercise.exercise_name).like(f'%{matched_pattern.lower()}%')
                        )
                    ).order_by(Exercise.date.desc()).first()
                    
                    pr_date = pr_exercise_for_date.date if pr_exercise_for_date and pr_exercise_for_date.date else None
                    
                    best_lifts.append({
                        'exercise_name': matched_exercise_name or target_exercise,
                        'max_weight': float(max_weight_result.max_weight),
                        'date': pr_date.isoformat() if pr_date else None
                    })
            
            current_app.logger.debug(f"Calculated {len(best_lifts)} best lifts (Big 3) for user {user_id}")
            profile_data['best_lifts'] = best_lifts
            
            # Get recent PRs (personal records) - up to 6 most recent
            recent_prs = []
            
            # Get recent exercises (last 30 days) ordered by date descending
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            recent_exercises = db.session.query(Exercise).options(
                joinedload(Exercise.standard_exercise),
                joinedload(Exercise.custom_exercise)
            ).filter(
                Exercise.user_id == user_id,
                Exercise.date >= thirty_days_ago.date(),
                Exercise.exercise_type == 'strength',
                Exercise.weight.isnot(None)
            ).order_by(Exercise.date.desc(), Exercise.weight.desc()).limit(20).all()  # Get more to filter PRs
            
            # Check each recent exercise to see if it's a PR
            for ex in recent_exercises:
                exercise_name = ex.get_exercise_name()
                
                # Check if this weight beats previous max for this exercise
                if ex.standard_exercise_id:
                    max_before = db.session.query(func.max(Exercise.weight)).filter(
                        Exercise.user_id == user_id,
                        Exercise.standard_exercise_id == ex.standard_exercise_id,
                        Exercise.date < ex.date,
                        Exercise.exercise_type == 'strength',
                        Exercise.weight.isnot(None)
                    ).scalar()
                elif ex.custom_exercise_id:
                    max_before = db.session.query(func.max(Exercise.weight)).filter(
                        Exercise.user_id == user_id,
                        Exercise.custom_exercise_id == ex.custom_exercise_id,
                        Exercise.date < ex.date,
                        Exercise.exercise_type == 'strength',
                        Exercise.weight.isnot(None)
                    ).scalar()
                else:
                    # Fallback to exercise_name matching
                    max_before = db.session.query(func.max(Exercise.weight)).outerjoin(
                        StandardExercise,
                        Exercise.standard_exercise_id == StandardExercise.standard_exercise_id
                    ).outerjoin(
                        CustomExercise,
                        Exercise.custom_exercise_id == CustomExercise.custom_exercise_id
                    ).filter(
                        Exercise.user_id == user_id,
                        Exercise.date < ex.date,
                        Exercise.exercise_type == 'strength',
                        Exercise.weight.isnot(None),
                        or_(
                            StandardExercise.exercise_name == exercise_name,
                            CustomExercise.exercise_name == exercise_name,
                            Exercise.exercise_name == exercise_name
                        )
                    ).scalar()
                
                # If no previous max or this weight beats it, it's a PR
                if max_before is None or (ex.weight and float(ex.weight) > float(max_before)):
                    # Check if we already have a PR for this exercise (avoid duplicates)
                    if not any(pr['exercise_name'] == exercise_name and pr['date'] == ex.date.isoformat() for pr in recent_prs):
                        recent_prs.append({
                            'exercise_name': exercise_name,
                            'weight': float(ex.weight),
                            'date': ex.date.isoformat() if ex.date else None
                        })
                        
                        if len(recent_prs) >= 6:  # Limit to 6 most recent PRs
                            break
            
            current_app.logger.debug(f"Calculated {len(recent_prs)} recent PRs for user {user_id}")
            profile_data['recent_prs'] = recent_prs
        else:
            # Log why best_lifts aren't being included
            if not is_friend:
                current_app.logger.debug(f"Not including best_lifts - users are not friends (requester: {current_user.user_id}, target: {user_id})")
            elif not user.show_stats_to_friends:
                current_app.logger.debug(f"Not including best_lifts - user {user_id} has show_stats_to_friends disabled")
            # Don't set best_lifts at all if conditions aren't met
        
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
        
        # Eager load stats and check imports efficiently to avoid N+1 queries
        from sqlalchemy.orm import joinedload
        routines = routines_query.options(
            joinedload(WorkoutRoutine.stats)
        ).order_by(desc(WorkoutRoutine.created_at)).all()
        
        current_app.logger.info(f"📊 Found {len(routines)} routines for user {user_id}")
        
        # Pre-fetch all routine IDs and check imports in batch
        routine_ids = [r.routine_id for r in routines]
        routine_names = {r.routine_id: r.routine_name for r in routines}
        
        # Batch check for already imported routines
        imported_routines = WorkoutRoutine.query.filter(
                WorkoutRoutine.user_id == current_user.user_id,
                WorkoutRoutine.imported_from_user_id == user_id,
                WorkoutRoutine.is_deleted == False
        ).all()
        imported_names = {r.routine_name for r in imported_routines}
        
        routines_data = []
        for routine in routines:
            current_app.logger.info(f"  📝 Processing routine: {routine.routine_name}, Exercises: {len(routine.exercises)}")
            # Get public stats for this routine (eager loaded)
            routine_stats = routine.stats if hasattr(routine, 'stats') and routine.stats else None
            
            # Check if current user has already imported this routine (from batch check)
            already_imported = routine.routine_name in imported_names
            
            routine_dict = {
                'routine_id': routine.routine_id,
                'routine_name': routine.routine_name,
                'description': routine.description,
                'visibility': routine.visibility,
                'created_at': routine.created_at.isoformat() if routine.created_at else None,
                # Removed creator_username and creator_name - not used by frontend and reduces data exposure
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
        
        # Batch fetch user privacy settings to avoid N+1 queries
        activity_user_ids = [activity[1] for activity in activities]
        friend_settings = db.session.query(
            User.user_id,
            User.show_workouts_to_friends
        ).filter(
            User.user_id.in_(activity_user_ids)
        ).all()
        allowed_user_ids = {user_id for user_id, show_workouts in friend_settings if show_workouts}
        
        activities_data = []
        for activity in activities:
            # Check if friend allows showing workouts (from batch check)
            if activity[1] not in allowed_user_ids:
                continue
            
            # Return only fields needed for activity feed display
            # Note: username removed as it's not used by frontend (only first_name/last_name for display)
            activity_dict = {
                'workout_id': activity[0],
                'user_id': activity[1],
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

