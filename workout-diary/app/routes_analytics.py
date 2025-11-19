"""
Advanced Analytics Routes with Muscle Mapping Integration
Provides comprehensive fitness metrics for the Progress Dashboard
"""

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from .models import db, Exercise, StandardExercise, Workout, BodyPart, CustomExercise
from .rate_limiter import rate_limit_lenient
from sqlalchemy import func, text, and_, or_
from datetime import datetime, timedelta, date
from math import isfinite

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

MAX_DAYS = 365
MIN_DAYS = 1
MAX_WEEKS = 52
MIN_WEEKS = 1
MAX_LIMIT = 50
MIN_LIMIT = 1


def clamp_query_param(name, default, min_value, max_value):
    raw_value = request.args.get(name)
    if raw_value is None:
        value = default
    else:
        try:
            value = int(raw_value)
        except (ValueError, TypeError):
            value = default
    return max(min_value, min(max_value, value))


# ===================================
# KPI Endpoints
# ===================================

@analytics_bp.route('/kpis', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def get_kpis():
    """
    Get Key Performance Indicators for dashboard cards
    Returns: Total volume, muscle balance score, training frequency, weak points count
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        # 1. Total Volume (30 days)
        current_volume = db.session.query(
            func.sum(Exercise.sets * Exercise.reps * Exercise.weight).label('volume')
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= start_date,
            Exercise.exercise_type == 'strength'
        ).scalar() or 0
        
        # Previous period for comparison
        prev_start = start_date - timedelta(days=days)
        prev_volume = db.session.query(
            func.sum(Exercise.sets * Exercise.reps * Exercise.weight).label('volume')
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= prev_start,
            Exercise.date < start_date,
            Exercise.exercise_type == 'strength'
        ).scalar() or 0
        
        volume_change = ((current_volume - prev_volume) / prev_volume * 100) if prev_volume > 0 else 0
        
        # 2. Training Frequency
        training_days = db.session.query(
            func.count(func.distinct(Exercise.date))
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= start_date
        ).scalar() or 0
        
        frequency = training_days / (days / 7) if days > 0 else 0
        
        # 3. Muscle Balance Score (placeholder - will be enhanced with muscle mapping)
        balance_score = calculate_muscle_balance_score(current_user.user_id, days)
        
        # 4. Weak Points Count
        weak_points = get_weak_points_count(current_user.user_id, days)
        
        return jsonify({
            'success': True,
            'kpis': [
                {
                    'title': f'Total Volume ({days}d)',
                    'value': f'{int(current_volume):,} kg',
                    'change': f'{volume_change:+.1f}%',
                    'trend': 'up' if volume_change > 0 else 'down' if volume_change < 0 else 'neutral',
                    'color': 'text-green-600' if volume_change > 0 else 'text-red-600'
                },
                {
                    'title': 'Muscle Balance Score',
                    'value': f'{balance_score}/100',
                    'change': 'Good' if balance_score >= 70 else 'Needs Work',
                    'trend': 'up' if balance_score >= 70 else 'down',
                    'color': 'text-blue-600' if balance_score >= 70 else 'text-orange-600'
                },
                {
                    'title': 'Training Frequency',
                    'value': f'{frequency:.1f}x/week',
                    'change': 'Optimal' if 3 <= frequency <= 6 else 'Adjust',
                    'trend': 'neutral' if 3 <= frequency <= 6 else 'down',
                    'color': 'text-purple-600' if 3 <= frequency <= 6 else 'text-orange-600'
                },
                {
                    'title': 'Weak Points',
                    'value': f'{weak_points} areas',
                    'change': 'Needs attention' if weak_points > 0 else 'Balanced',
                    'trend': 'down' if weak_points > 2 else 'neutral',
                    'color': 'text-orange-600' if weak_points > 0 else 'text-green-600'
                }
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching KPIs: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===================================
# Muscle Volume Analytics
# ===================================

@analytics_bp.route('/volume-by-muscle', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def volume_by_muscle():
    """
    Get volume breakdown by muscle groups (uses muscle mapping if available)
    Falls back to body parts if muscle mapping not installed
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Check if muscle mapping tables exist
        has_muscle_mapping = check_muscle_mapping_exists()
        
        if has_muscle_mapping:
            # Use muscle mapping for detailed analysis
            data = get_volume_by_muscle_groups(current_user.user_id, start_date)
        else:
            # Fall back to body parts
            data = get_volume_by_body_parts(current_user.user_id, start_date)
        
        return jsonify({
            'success': True,
            'data': data,
            'has_muscle_mapping': has_muscle_mapping
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching volume by muscle: {str(e)}")
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/muscle-balance', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def muscle_balance():
    """
    Get muscle balance radar chart data
    Returns balance scores per muscle category
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        has_muscle_mapping = check_muscle_mapping_exists()
        
        if has_muscle_mapping:
            # Get detailed muscle balance from view
            balance_data = get_muscle_balance_from_view(current_user.user_id, days)
        else:
            # Calculate balance from body parts
            balance_data = get_body_part_balance(current_user.user_id, start_date)
        
        return jsonify({
            'success': True,
            'data': balance_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching muscle balance: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===================================
# Volume Progression
# ===================================

@analytics_bp.route('/volume-progression', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def volume_progression():
    """
    Enhanced: Get weekly volume progression for major muscle groups using BodyPartCategories
    """
    weeks = clamp_query_param('weeks', 4, MIN_WEEKS, MAX_WEEKS)

    try:
        end_date = date.today()
        start_date = end_date - timedelta(weeks=weeks)
        categories = ['Chest', 'Back', 'Legs']

        query = text("""
            SELECT
                YEARWEEK(e.date, 1) AS year_week,
                bpc.anatomical_category AS category,
                COALESCE(SUM(e.sets * e.reps * COALESCE(e.weight, 0)), 0) AS volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id
              AND e.date >= :start_date
              AND e.date <= :end_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Legs')
            GROUP BY year_week, category
        """)

        results = db.session.execute(query, {
            'user_id': current_user.user_id,
            'start_date': start_date,
            'end_date': end_date
        }).all()

        volume_map = {}
        for row in results:
            week_key = row.year_week
            cat = row.category
            volume_map.setdefault(week_key, {})[cat] = int(row.volume or 0)

        data = []
        current_week = date.today().isocalendar()[1]
        current_year = date.today().isocalendar()[0]

        for offset in range(weeks):
            week_date = date.today() - timedelta(weeks=weeks - offset - 1)
            iso = week_date.isocalendar()
            year_week = int(f"{iso[0]}{iso[1]:02d}")
            entry = {
                'week': f"{iso[0]}-W{iso[1]:02d}",
                'chest': volume_map.get(year_week, {}).get('Chest', 0),
                'back': volume_map.get(year_week, {}).get('Back', 0),
                'legs': volume_map.get(year_week, {}).get('Legs', 0)
            }
            data.append(entry)

        return jsonify({
            'success': True,
            'data': data
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching volume progression: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================================
# Push/Pull Balance
# ===================================

@analytics_bp.route('/push-pull-balance', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def push_pull_balance():
    """
    Calculate Push vs Pull exercise balance using BodyPartCategories
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        push_volume = 0
        pull_volume = 0
        
        # Try to use BodyPartCategories for accurate Push/Pull classification
        try:
            grouped_query = text("""
                SELECT bpc.muscle_group_type,
                       COALESCE(SUM(e.sets * e.reps * COALESCE(e.weight, 0)), 0) AS volume
                FROM Exercises e
                JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
                JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
                WHERE e.user_id = :user_id
                  AND e.date >= :start_date
                  AND e.exercise_type = 'strength'
                  AND bpc.muscle_group_type IN ('Push', 'Pull')
                GROUP BY bpc.muscle_group_type
            """)

            grouped_result = db.session.execute(grouped_query, {
                'user_id': current_user.user_id,
                'start_date': start_date
            }).all()

            for row in grouped_result:
                if row.muscle_group_type == 'Push':
                    push_volume = row.volume or 0
                elif row.muscle_group_type == 'Pull':
                    pull_volume = row.volume or 0
             
            current_app.logger.info(f"Push/Pull from BodyPartCategories - Push: {push_volume}, Pull: {pull_volume}")
        
        except Exception as e:
            current_app.logger.warning(f"BodyPartCategories not available for Push/Pull, falling back: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback to hardcoded body part names
            push_body_parts = ['Chest', 'Shoulders', 'Triceps', 'Front Delts', 'Side Delts']
            pull_body_parts = ['Back', 'Biceps', 'Lats', 'Traps', 'Rear Delts', 'Upper Back', 'Mid Back', 'Lower Back']
            
            push_volume = db.session.query(
                func.sum(Exercise.sets * Exercise.reps * func.coalesce(Exercise.weight, 0))
            ).join(
                BodyPart, Exercise.body_part_id == BodyPart.body_part_id
            ).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.date >= start_date,
                Exercise.exercise_type == 'strength',
                BodyPart.body_part_name.in_(push_body_parts)
            ).scalar() or 0
            
            pull_volume = db.session.query(
                func.sum(Exercise.sets * Exercise.reps * func.coalesce(Exercise.weight, 0))
            ).join(
                BodyPart, Exercise.body_part_id == BodyPart.body_part_id
            ).filter(
                Exercise.user_id == current_user.user_id,
                Exercise.date >= start_date,
                Exercise.exercise_type == 'strength',
                BodyPart.body_part_name.in_(pull_body_parts)
            ).scalar() or 0
        
        total = push_volume + pull_volume
        push_pct = int((push_volume / total * 100)) if total > 0 else 50
        pull_pct = int((pull_volume / total * 100)) if total > 0 else 50
        
        data = [
            {'name': 'Push', 'value': push_pct, 'color': '#3b82f6'},
            {'name': 'Pull', 'value': pull_pct, 'color': '#10b981'}
        ]
        
        # Determine if there's an imbalance
        imbalance = abs(push_pct - pull_pct)
        recommendation = ''
        if imbalance > 15:
            if push_pct > pull_pct:
                recommendation = f'⚠️ Push bias detected - Add {int((push_pct - pull_pct) / 10)} more pull exercises'
            else:
                recommendation = f'⚠️ Pull bias detected - Add {int((pull_pct - push_pct) / 10)} more push exercises'
        else:
            recommendation = '✅ Good push/pull balance!'
        
        current_app.logger.info(f"Push/Pull result - Push: {push_pct}%, Pull: {pull_pct}%, Recommendation: {recommendation}")
        
        return jsonify({
            'success': True,
            'data': data,
            'recommendation': recommendation,
            'push_volume': int(push_volume),
            'pull_volume': int(pull_volume)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error calculating push/pull balance: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500


# ===================================
# Weak Points Analysis
# ===================================

@analytics_bp.route('/weak-points', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def weak_points():
    """
    Advanced: Comprehensive muscle analysis with frequency, intensity, and dynamic targets
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Get comprehensive muscle data with frequency and intensity metrics
        actual_volumes = {}
        
        try:
            # Enhanced query with frequency and intensity tracking
            query = text("""
                SELECT 
                    bpc.anatomical_category,
                    SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume,
                    COUNT(DISTINCT e.date) as days_trained,
                    COUNT(DISTINCT e.exercise_id) as exercise_count,
                    AVG(e.sets) as avg_sets,
                    AVG(e.reps) as avg_reps,
                    AVG(e.weight) as avg_weight,
                    COUNT(DISTINCT e.workout_id) as session_count
                FROM Exercises e
                JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
                JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
                WHERE e.user_id = :user_id 
                  AND e.date >= :start_date
                  AND e.exercise_type = 'strength'
                  AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
                GROUP BY bpc.anatomical_category
            """)
            
            result = db.session.execute(query, {'user_id': current_user.user_id, 'start_date': start_date})
            for row in result:
                # Calculate frequency per week
                frequency_per_week = (row[2] / (days / 7)) if days > 0 else 0
                
                # Approximate RPE/intensity based on reps (lower reps = higher intensity)
                avg_reps = row[5] or 0  # row[5] is avg_reps, not row[6]
                avg_weight = row[6] or 0
                intensity_score = calculate_intensity_score(avg_reps, avg_weight)
                
                actual_volumes[row[0]] = {
                    'volume': row[1] or 0,
                    'days_trained': row[2] or 0,
                    'exercise_count': row[3] or 0,
                    'avg_sets': row[4] or 0,
                    'avg_reps': row[5] or 0,
                    'avg_weight': row[6] or 0,
                    'session_count': row[7] or 0,
                    'frequency_per_week': round(frequency_per_week, 1),
                    'intensity_score': intensity_score
                }
            
            current_app.logger.info(f"Weak points - actual volumes: {actual_volumes}")
            
        except Exception as e:
            current_app.logger.warning(f"BodyPartCategories query failed, using fallback: {e}")
            
            # Fallback to simple body parts
            categories = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
            for category in categories:
                vol = get_body_part_volume(current_user.user_id, category, start_date, date.today())
                actual_volumes[category] = {
                    'volume': vol,
                    'days_trained': 0,
                    'exercise_count': 0,
                    'frequency_per_week': 0,
                    'intensity_score': 0
                }
        
        # DYNAMIC TARGETS based on user profile
        dynamic_targets = calculate_dynamic_targets(current_user, days)
        
        # Calculate average volume and frequency
        total_volume = sum(v['volume'] for v in actual_volumes.values())
        avg_volume = total_volume / len(actual_volumes) if actual_volumes else 0
        
        total_frequency = sum(v.get('frequency_per_week', 0) for v in actual_volumes.values())
        avg_frequency = total_frequency / len(actual_volumes) if actual_volumes else 0
        
        current_app.logger.info(f"Total volume: {total_volume}, Avg: {avg_volume}, Avg frequency: {avg_frequency}/week")
        
        # Get PREVIOUS PERIOD data for trend analysis
        prev_start_date = start_date - timedelta(days=days)
        prev_volumes = get_previous_period_volumes(current_user.user_id, prev_start_date, start_date)
        
        # Build comprehensive analysis for ALL categories
        analysis_list = []
        categories = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
        
        for category in categories:
            actual = actual_volumes.get(category, {
                'volume': 0, 'days_trained': 0, 'exercise_count': 0,
                'frequency_per_week': 0, 'intensity_score': 0
            })
            actual_vol = actual['volume']
            frequency = actual.get('frequency_per_week', 0)
            intensity = actual.get('intensity_score', 0)
            
            # Get previous period volume for trend
            prev_vol = prev_volumes.get(category, 0)
            trend = calculate_trend(actual_vol, prev_vol)
            
            # MULTI-FACTOR STATUS DETERMINATION
            # Consider: Volume, Frequency, and Trend
            percentage_of_avg = (actual_vol / avg_volume * 100) if avg_volume > 0 else 0
            
            # Frequency classification (optimal: 2-3x per week for most muscles)
            optimal_frequency = dynamic_targets.get('optimal_frequency', {}).get(category, 2.0)
            frequency_ratio = (frequency / optimal_frequency) if optimal_frequency > 0 else 0
            
            # Combined score: 50% volume, 30% frequency, 20% trend
            # Trend weight increased from 10% to 20% because progressive overload is critical
            # Volume reduced from 60% to 50% to balance with trend importance
            combined_score = (
                (percentage_of_avg * 0.5) +
                (frequency_ratio * 100 * 0.3) +
                (trend * 0.2)
            )
            
            # Enhanced classification with frequency consideration
            if actual_vol == 0:
                status = 'critical'
                deficit = -100
                message = 'No training detected'
            elif combined_score >= 120:
                status = 'strong'
                deficit = int(percentage_of_avg - 100)
                message = f'Well developed • {frequency:.1f}x/week'
            elif combined_score >= 80:
                status = 'balanced'
                deficit = 0
                message = f'Balanced training • {frequency:.1f}x/week'
            elif combined_score >= 40:
                status = 'warning'
                deficit = int(percentage_of_avg - 100)
                if frequency < optimal_frequency * 0.7:
                    message = f'Low frequency • {frequency:.1f}x/week (target: {optimal_frequency}x)'
                else:
                    message = f'Below average volume • {frequency:.1f}x/week'
            else:
                status = 'critical'
                deficit = int(percentage_of_avg - 100)
                if frequency == 0:
                    message = 'Not trained this period'
                else:
                    message = f'Significantly undertrained • {frequency:.1f}x/week'
            
            analysis_list.append({
                'muscle': category,
                'deficit': deficit,
                'actual_volume': int(actual_vol),
                'percentage_of_avg': int(percentage_of_avg),
                'days_trained': actual['days_trained'],
                'exercise_count': actual['exercise_count'],
                'frequency_per_week': frequency,
                'optimal_frequency': optimal_frequency,
                'intensity_score': intensity,
                'trend': trend,
                'prev_volume': int(prev_vol),
                'combined_score': int(combined_score),
                'status': status,
                'message': message
            })
        
        # Sort: Critical first, then Warning, then Balanced, then Strong
        status_priority = {'critical': 0, 'warning': 1, 'balanced': 2, 'strong': 3}
        analysis_list.sort(key=lambda x: (status_priority.get(x['status'], 2), x['deficit']))
        
        current_app.logger.info(f"Weak points analysis: {analysis_list}")
        
        return jsonify({
            'success': True,
            'data': analysis_list,
            'total_volume': int(total_volume),
            'avg_volume': int(avg_volume),
            'avg_frequency': round(avg_frequency, 1),
            'dynamic_targets': dynamic_targets
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in weak points analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ===================================
# Movement Pattern Analysis
# ===================================

@analytics_bp.route('/movement-patterns', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def movement_patterns():
    """
    Analyze training by fundamental movement patterns:
    - Squat (knee-dominant)
    - Hinge (hip-dominant)
    - Push (horizontal/vertical)
    - Pull (horizontal/vertical)
    - Carry (loaded carries, farmer walks)
    - Core (anti-rotation, anti-extension)
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Enhanced movement pattern categorization (more anatomically accurate)
        movement_patterns = {
            'Squat Pattern': ['Quads'],  # Knee-dominant (removed generic 'Legs')
            'Hinge Pattern': ['Hamstrings', 'Glutes', 'Lower Back'],  # Hip-dominant
            'Horizontal Push': ['Chest', 'Triceps'],  # Triceps heavily involved
            'Vertical Push': ['Shoulders', 'Front Delts', 'Side Delts', 'Triceps'],  # Triceps in both push patterns
            'Horizontal Pull': ['Back', 'Lats', 'Mid Back', 'Biceps'],  # Rows
            'Vertical Pull': ['Upper Back', 'Traps', 'Rear Delts', 'Biceps'],  # Pull-ups, lat pulldowns
            'Core/Anti-Rotation': ['Abs', 'Obliques', 'Core', 'Serratus']
        }
        
        pattern_data = []
        
        for pattern, body_parts in movement_patterns.items():
            # Calculate total volume for this movement pattern
            total_pattern_volume = 0
            total_exercises = 0
            total_days = set()
            
            for body_part in body_parts:
                vol = get_body_part_volume(current_user.user_id, body_part, start_date, date.today())
                total_pattern_volume += vol
                
                # Count exercises for this body part
                exercises = db.session.query(
                    func.count(func.distinct(Exercise.exercise_id))
                ).join(
                    BodyPart, Exercise.body_part_id == BodyPart.body_part_id
                ).filter(
                    Exercise.user_id == current_user.user_id,
                    Exercise.date >= start_date,
                    Exercise.exercise_type == 'strength',
                    BodyPart.body_part_name == body_part
                ).scalar() or 0
                
                total_exercises += exercises
                
                # Count unique days
                days_result = db.session.query(
                    func.distinct(Exercise.date)
                ).join(
                    BodyPart, Exercise.body_part_id == BodyPart.body_part_id
                ).filter(
                    Exercise.user_id == current_user.user_id,
                    Exercise.date >= start_date,
                    Exercise.exercise_type == 'strength',
                    BodyPart.body_part_name == body_part
                ).all()
                
                for day in days_result:
                    if day[0]:
                        total_days.add(day[0])
            
            frequency_per_week = (len(total_days) / (days / 7)) if days > 0 else 0
            
            pattern_data.append({
                'pattern': pattern,
                'volume': int(total_pattern_volume),
                'exercise_count': total_exercises,
                'frequency_per_week': round(frequency_per_week, 1),
                'days_trained': len(total_days)
            })
        
        # Sort by volume
        pattern_data.sort(key=lambda x: x['volume'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': pattern_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in movement pattern analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===================================
# Personal Records
# ===================================

@analytics_bp.route('/recent-prs', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def recent_prs():
    """
    Get recent personal records (top weight for each exercise)
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    limit = clamp_query_param('limit', 5, MIN_LIMIT, MAX_LIMIT)
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Find max weight per exercise in the time period
        prs = db.session.query(
            Exercise.exercise_name,
            func.max(Exercise.weight).label('max_weight'),
            func.max(Exercise.date).label('pr_date'),
            Exercise.body_part_id
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= start_date,
            Exercise.exercise_type == 'strength',
            Exercise.weight.isnot(None),
            Exercise.exercise_name.isnot(None),  # Filter out null exercise names
            Exercise.exercise_name != ''  # Filter out empty exercise names
        ).group_by(
            Exercise.exercise_name,
            Exercise.body_part_id
        ).order_by(
            func.max(Exercise.date).desc()
        ).limit(limit).all()
        
        pr_list = []
        for pr in prs:
            # Get body part name
            body_part = db.session.query(BodyPart.body_part_name).filter(
                BodyPart.body_part_id == pr.body_part_id
            ).scalar()
            
            # Calculate days ago
            days_ago = (date.today() - pr.pr_date).days
            if days_ago == 0:
                date_str = 'Today'
            elif days_ago == 1:
                date_str = 'Yesterday'
            elif days_ago < 7:
                date_str = f'{days_ago} days ago'
            else:
                date_str = f'{days_ago // 7} week{"s" if days_ago // 7 > 1 else ""} ago'
            
            pr_list.append({
                'exercise': pr.exercise_name,
                'weight': f'{int(pr.max_weight)} lbs',
                'date': date_str,
                'muscles': body_part or 'Unknown'
            })
        
        return jsonify({
            'success': True,
            'data': pr_list
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching recent PRs: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===================================
# AI Recommendations
# ===================================

@analytics_bp.route('/recommendations', methods=['GET'])
@login_required
@rate_limit_lenient(max_requests=60, time_window_seconds=60)
def recommendations():
    """
    Enhanced AI-powered workout recommendations using advanced analytics
    """
    days = clamp_query_param('days', 30, MIN_DAYS, MAX_DAYS)
    
    try:
        recs = []
        start_date = date.today() - timedelta(days=days)
        
        # Get dynamic targets based on user's profile
        targets = calculate_dynamic_targets(current_user, days)
        
        # 1. PRIORITY WEAK POINT - Use enhanced weak points analysis
        weak_points_query = text("""
            SELECT 
                bpc.anatomical_category as muscle,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as actual_volume,
                COUNT(DISTINCT e.date) as days_trained,
                COUNT(e.exercise_id) as exercise_count,
                AVG(e.sets) as avg_sets,
                AVG(e.reps) as avg_reps
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
            GROUP BY bpc.anatomical_category
        """)
        
        try:
            result = db.session.execute(weak_points_query, {'user_id': current_user.user_id, 'start_date': start_date})
            muscle_data = {row[0]: {
                'volume': row[1] or 0,
                'days': row[2] or 0,
                'exercises': row[3] or 0,
                'avg_sets': row[4] or 0,
                'avg_reps': row[5] or 0
            } for row in result}
        except:
            muscle_data = {}
        
        # Find critical weak points
        categories = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
        all_volumes = [muscle_data.get(cat, {}).get('volume', 0) for cat in categories]
        avg_volume = sum(all_volumes) / len(all_volumes) if all_volumes else 0
        
        critical_muscles = []
        for category in categories:
            data = muscle_data.get(category, {})
            actual = data.get('volume', 0)
            days_trained = data.get('days', 0)
            
            if avg_volume > 0:
                percentage = (actual / avg_volume * 100)
                if percentage < 50:  # Critical: Less than 50% of average
                    critical_muscles.append({
                        'muscle': category,
                        'percentage': int(percentage),
                        'days': days_trained,
                        'target_volume': targets.get('volume_targets', {}).get(category)
                    })
        
        if critical_muscles:
            critical_muscles.sort(key=lambda x: x['percentage'])
            top_critical = critical_muscles[0]
            freq_text = "not trained" if top_critical['days'] == 0 else f"only {top_critical['days']} days"
            recs.append({
                'title': '🚨 Critical Priority',
                'message': f'Focus on {top_critical["muscle"]} - {freq_text} this month. Add 2-3 exercises, train 2x/week for balance.',
                'priority': 'critical'
            })
        else:
            # Check for warning level (50-80% of average)
            warning_muscles = []
            for category in categories:
                data = muscle_data.get(category, {})
                actual = data.get('volume', 0)
                if avg_volume > 0:
                    percentage = (actual / avg_volume * 100)
                    if 50 <= percentage < 80:
                        warning_muscles.append({
                            'muscle': category,
                            'percentage': int(percentage)
                        })
            
            if warning_muscles:
                warning_muscles.sort(key=lambda x: x['percentage'])
                top_warning = warning_muscles[0]
                recs.append({
                    'title': '⚠️ Needs Attention',
                    'message': f'{top_warning["muscle"]} is lagging at {top_warning["percentage"]}% of your average. Add 1-2 exercises this week.',
                    'priority': 'warning'
                })
            else:
                recs.append({
                    'title': '✅ Balanced Training',
                    'message': 'All muscle groups are well-balanced! Keep up the great work and focus on progressive overload.',
                    'priority': 'good'
                })
        
        # 2. FREQUENCY OPTIMIZATION
        low_frequency = []
        for category in categories:
            data = muscle_data.get(category, {})
            days_trained = data.get('days', 0)
            frequency_per_week = (days_trained / days * 7) if days > 0 else 0
            optimal_freq = targets.get('optimal_frequency', {}).get(category, 2.0)
            
            if frequency_per_week < optimal_freq * 0.5 and data.get('volume', 0) > 0:  # Training but infrequently
                low_frequency.append({
                    'muscle': category,
                    'current_freq': round(frequency_per_week, 1),
                    'optimal_freq': optimal_freq
                })
        
        if low_frequency:
            low_frequency.sort(key=lambda x: x['current_freq'])
            top_low = low_frequency[0]
            recs.append({
                'title': '📅 Frequency Optimization',
                'message': f'{top_low["muscle"]} is only trained {top_low["current_freq"]}x/week. Increase to {top_low["optimal_freq"]}x/week for better results.',
                'priority': 'warning'
            })
        
        # 3. PUSH/PULL BALANCE
        try:
            grouped_query = text("""
                SELECT bpc.muscle_group_type,
                       COALESCE(SUM(e.sets * e.reps * COALESCE(e.weight, 0)), 0) AS volume
                FROM Exercises e
                JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
                JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
                WHERE e.user_id = :user_id 
                  AND e.date >= :start_date
                  AND e.exercise_type = 'strength'
                  AND bpc.muscle_group_type IN ('Push', 'Pull')
                GROUP BY bpc.muscle_group_type
            """)

            grouped_result = db.session.execute(grouped_query, {
                'user_id': current_user.user_id,
                'start_date': start_date
            }).all()

            push_volume = 0
            pull_volume = 0
            for row in grouped_result:
                if row.muscle_group_type == 'Push':
                    push_volume = row.volume or 0
                elif row.muscle_group_type == 'Pull':
                    pull_volume = row.volume or 0
            
            total = push_volume + pull_volume
            if total > 0:
                push_pct = int((push_volume / total * 100))
                pull_pct = int((pull_volume / total * 100))
                
                if abs(push_pct - pull_pct) > 15:  # More than 15% imbalance
                    if push_pct > pull_pct:
                        recs.append({
                            'title': '⚖️ Push/Pull Balance',
                            'message': f'Too much pushing ({push_pct}%). Add more pulling exercises (rows, pull-ups) to prevent imbalances.',
                            'priority': 'warning'
                        })
                    else:
                        recs.append({
                            'title': '⚖️ Push/Pull Balance',
                            'message': f'Too much pulling ({pull_pct}%). Add more pushing exercises (bench, shoulder press) for balance.',
                            'priority': 'warning'
                        })
                else:
                    recs.append({
                        'title': '⚖️ Push/Pull Balance',
                        'message': f'Excellent balance at {push_pct}/{pull_pct}! This prevents injury and optimizes strength.',
                        'priority': 'good'
                    })
        except:
            pass  # Skip if BodyPartCategories not available
        
        # 4. PROGRESSIVE OVERLOAD - Smart recommendation
        training_days = db.session.query(
            func.count(func.distinct(Exercise.date))
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= start_date
        ).scalar() or 0
        
        if training_days >= 12:  # Trained at least 3x/week
            recs.append({
                'title': '📈 Progressive Overload',
                'message': 'Strong consistency! Add 2.5-5 lbs to your main lifts or increase reps by 1-2.',
                'priority': 'good'
            })
        elif training_days >= 6:
            recs.append({
                'title': '💪 Build Consistency',
                'message': 'You\'re building momentum! Try to hit 3-4 sessions per week before increasing weights.',
                'priority': 'info'
            })
        else:
            recs.append({
                'title': '🎯 Get Started',
                'message': 'Aim for 3+ workouts per week to build a solid foundation before focusing on progression.',
                'priority': 'info'
            })
        
        # 5. RECOVERY STATUS - Intelligent frequency check
        weekly_training_days = db.session.query(
            func.count(func.distinct(Exercise.date))
        ).filter(
            Exercise.user_id == current_user.user_id,
            Exercise.date >= date.today() - timedelta(days=7)
        ).scalar() or 0
        
        if weekly_training_days >= 6:
            recs.append({
                'title': '🛌 Recovery Alert',
                'message': f'{weekly_training_days} days this week! Take 1-2 rest days to prevent overtraining and optimize gains.',
                'priority': 'warning'
            })
        elif weekly_training_days >= 3:
            recs.append({
                'title': '✅ Great Frequency',
                'message': f'{weekly_training_days} workouts this week - ideal for muscle growth and recovery.',
                'priority': 'good'
            })
        else:
            recs.append({
                'title': '📊 Frequency Target',
                'message': f'{weekly_training_days} workouts this week. Aim for 3-5 sessions for optimal progress.',
                'priority': 'info'
            })
        
        return jsonify({
            'success': True,
            'data': recs
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ===================================
# Helper Functions
# ===================================

def check_muscle_mapping_exists():
    """Check if muscle mapping tables are installed"""
    try:
        result = db.session.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'MuscleGroups'"
        )).scalar()
        return result > 0
    except:
        return False


def get_volume_by_muscle_groups(user_id, start_date):
    """Get volume using muscle mapping (if available)"""
    # This will use the WorkoutMuscleCoverage view once muscle mapping is installed
    query = text("""
        SELECT 
            muscle_region as muscle,
            SUM(total_volume) as volume
        FROM WorkoutMuscleCoverage
        WHERE user_id = :user_id AND date >= :start_date
        GROUP BY muscle_region
        ORDER BY volume DESC
    """)
    
    result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date})
    return [{'muscle': row[0], 'volume': int(row[1]) if row[1] else 0} for row in result]


def get_volume_by_body_parts(user_id, start_date):
    """Enhanced: Get volume by anatomical categories using BodyPartCategories"""
    try:
        # Try to use BodyPartCategories for better grouping
        query = text("""
            SELECT 
                bpc.anatomical_category as muscle,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            LEFT JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IS NOT NULL
            GROUP BY bpc.anatomical_category
            ORDER BY volume DESC
        """)
        
        result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date})
        data = [{'muscle': row[0], 'volume': int(row[1]) if row[1] else 0} for row in result]
        
        # If we got results, return them
        if data:
            return data
            
    except Exception as e:
        current_app.logger.warning(f"BodyPartCategories not available, falling back to simple body parts: {e}")
    
    # Fallback to simple body parts if BodyPartCategories doesn't exist
    body_parts = db.session.query(BodyPart.body_part_name).all()
    data = []
    
    for bp in body_parts:
        volume = get_body_part_volume(user_id, bp[0], start_date, date.today())
        if volume > 0:
            data.append({'muscle': bp[0], 'volume': int(volume)})
    
    data.sort(key=lambda x: x['volume'], reverse=True)
    return data


def get_body_part_volume(user_id, body_part_name, start_date, end_date):
    """Calculate total volume for a specific body part"""
    body_part_id = db.session.query(BodyPart.body_part_id).filter(
        BodyPart.body_part_name == body_part_name
    ).scalar()
    
    if not body_part_id:
        return 0
    
    volume = db.session.query(
        func.sum(Exercise.sets * Exercise.reps * Exercise.weight)
    ).filter(
        Exercise.user_id == user_id,
        Exercise.date >= start_date,
        Exercise.date < end_date,
        Exercise.exercise_type == 'strength',
        Exercise.body_part_id == body_part_id
    ).scalar() or 0
    
    return volume


def get_category_volume(user_id, anatomical_category, start_date, end_date):
    """Enhanced: Calculate total volume for an anatomical category using BodyPartCategories"""
    try:
        query = text("""
            SELECT COALESCE(SUM(e.sets * e.reps * COALESCE(e.weight, 0)), 0) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.date < :end_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category = :category
        """)
        
        result = db.session.execute(query, {
            'user_id': user_id,
            'start_date': start_date,
            'end_date': end_date,
            'category': anatomical_category
        }).scalar()
        
        return result or 0
    
    except Exception as e:
        current_app.logger.warning(f"BodyPartCategories not available, falling back to body part volume: {e}")
        # Fall back to simple body part lookup
        return get_body_part_volume(user_id, anatomical_category, start_date, end_date)


def calculate_muscle_balance_score(user_id, days):
    """Enhanced: Calculate muscle balance score using BodyPartCategories"""
    import statistics
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Try to use BodyPartCategories for comprehensive balance
        query = text("""
            SELECT 
                bpc.anatomical_category,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
            GROUP BY bpc.anatomical_category
        """)
        
        result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date})
        volumes = [row[1] for row in result if row[1] is not None and row[1] > 0]
        
        if volumes and len(volumes) >= 2:
            mean_vol = statistics.mean(volumes)
            if mean_vol > 0:
                std_dev = statistics.stdev(volumes)
                cv = (std_dev / mean_vol) * 100
                score = max(0, min(100, 100 - cv))
                return int(score)
    
    except Exception as e:
        current_app.logger.warning(f"BodyPartCategories not available for balance score: {e}")
        
        # Fallback to simple body parts
        major_groups = ['Chest', 'Back', 'Shoulders', 'Legs']
        volumes = []
        
        for group in major_groups:
            vol = get_body_part_volume(user_id, group, start_date, date.today())
            volumes.append(vol)
        
        if not volumes or max(volumes) == 0:
            return 50
        
        mean_vol = statistics.mean(volumes)
        if mean_vol == 0:
            return 50
        
        std_dev = statistics.stdev(volumes) if len(volumes) > 1 else 0
        cv = (std_dev / mean_vol) * 100 if mean_vol > 0 else 100
        
        # Convert to 0-100 score (lower CV = higher score)
        score = max(0, min(100, 100 - cv))
        return int(score)


def get_weak_points_count(user_id, days):
    """Enhanced: Count critical/warning muscle groups using relative comparison"""
    start_date = date.today() - timedelta(days=days)
    
    try:
        # Get all volumes
        query = text("""
            SELECT 
                bpc.anatomical_category,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
            GROUP BY bpc.anatomical_category
        """)
        
        result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date})
        volumes = {row[0]: row[1] or 0 for row in result}
        
        # Calculate average
        all_vols = list(volumes.values())
        avg_volume = sum(all_vols) / len(all_vols) if all_vols else 0
        
        # Count categories below 80% of average (warning or critical)
        categories = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
        weak_count = 0
        
        for category in categories:
            actual = volumes.get(category, 0)
            if avg_volume > 0:
                percentage = (actual / avg_volume * 100)
                if percentage < 80:  # Below 80% of average = weak
                    weak_count += 1
            elif actual == 0:
                weak_count += 1
        
        return weak_count
    
    except Exception as e:
        current_app.logger.warning(f"Error counting weak points: {e}")
        return 0


def get_muscle_balance_from_view(user_id, days):
    """Get muscle balance using the UserMuscleBalance30Days view"""
    query = text("""
        SELECT 
            muscle_region,
            (total_volume / (SELECT MAX(total_volume) FROM UserMuscleBalance30Days WHERE user_id = :user_id) * 100) as balance_score
        FROM UserMuscleBalance30Days
        WHERE user_id = :user_id
        ORDER BY muscle_region
    """)
    
    result = db.session.execute(query, {'user_id': user_id})
    return [{'category': row[0], 'value': int(row[1]) if row[1] else 0} for row in result]


def get_body_part_balance(user_id, start_date):
    """Enhanced: Calculate balance scores using BodyPartCategories"""
    try:
        # Try to use BodyPartCategories for accurate anatomical grouping
        query = text("""
            SELECT 
                bpc.anatomical_category,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
            GROUP BY bpc.anatomical_category
        """)
        
        result = db.session.execute(query, {'user_id': user_id, 'start_date': start_date})
        volumes = {row[0]: row[1] for row in result if row[1] is not None}
        
        if volumes:
            max_vol = max(volumes.values()) if volumes.values() else 1
            return [
                {'category': category, 'value': int((vol / max_vol * 100)) if max_vol > 0 else 0}
                for category, vol in volumes.items()
            ]
    
    except Exception as e:
        current_app.logger.warning(f"BodyPartCategories not available for balance: {e}")
    
    # Fallback to simple body parts
    body_parts = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']
    volumes = {}
    
    for bp in body_parts:
        vol = get_body_part_volume(user_id, bp, start_date, date.today())
        volumes[bp] = vol
    
    max_vol = max(volumes.values()) if volumes.values() else 1
    
    return [
        {'category': bp, 'value': int((vol / max_vol * 100)) if max_vol > 0 else 0}
        for bp, vol in volumes.items()
    ]


# ===================================
# ADVANCED ANALYTICS HELPER FUNCTIONS
# ===================================

def calculate_intensity_score(avg_reps, avg_weight):
    """
    Calculate intensity score based on rep range
    Lower reps = higher intensity (approximates RPE/1RM%)
    
    Rep Ranges:
    1-3 reps = 90-100% 1RM (Very High intensity)
    4-6 reps = 80-89% 1RM (High intensity)
    7-10 reps = 70-79% 1RM (Moderate-High intensity)
    11-15 reps = 60-69% 1RM (Moderate intensity)
    16+ reps = 50-59% 1RM (Low intensity)
    """
    if not avg_reps or avg_reps == 0:
        return 50  # Default moderate
    
    if avg_reps <= 3:
        return 95  # Very High
    elif avg_reps <= 6:
        return 85  # High
    elif avg_reps <= 10:
        return 75  # Moderate-High
    elif avg_reps <= 15:
        return 65  # Moderate
    else:
        return 55  # Low


def calculate_dynamic_targets(user, days):
    """
    Calculate personalized volume and frequency targets based on:
    - User's fitness goal
    - Activity level
    - Body weight (NEW!)
    - Training experience (inferred from account age)
    """
    # Base targets (conservative starting point for 180 lbs / 80 kg person)
    base_volume_targets = {
        'Chest': 15000,
        'Back': 18000,
        'Shoulders': 12000,
        'Arms': 10000,
        'Legs': 20000,
        'Core': 8000
    }
    
    # Optimal frequency (times per week)
    base_frequency = {
        'Chest': 2.0,
        'Back': 2.0,
        'Shoulders': 2.0,
        'Arms': 2.0,
        'Legs': 2.0,
        'Core': 3.0  # Core can be trained more frequently
    }
    
    # Adjust based on fitness goal
    goal_multipliers = {
        'Muscle Gain': 1.4,
        'Weight Loss': 1.0,
        'Improved Endurance': 0.8,
        'General Fitness': 1.0,
        'Strength': 1.3
    }
    
    # Adjust based on activity level
    activity_multipliers = {
        'Sedentary': 0.7,
        'Lightly Active': 0.9,
        'Moderately Active': 1.0,
        'Very Active': 1.2,
        'Extremely Active': 1.4
    }
    
    goal = getattr(user, 'fitness_goal', 'General Fitness')
    activity = getattr(user, 'activity_level', 'Moderately Active')
    
    goal_mult = goal_multipliers.get(goal, 1.0)
    activity_mult = activity_multipliers.get(activity, 1.0)
    
    # BODY WEIGHT ADJUSTMENT (NEW!)
    # Get user's weight (prefer kg, fallback to weight_kg field)
    body_weight_kg = getattr(user, 'weight_kg', None) or getattr(user, 'weight', None)
    
    if body_weight_kg:
        # Convert to lbs for calculation (180 lbs = baseline)
        body_weight_lbs = body_weight_kg * 2.20462
        # Weight factor: 70-130% of baseline (capped for safety)
        # Lighter users get lower targets, heavier users get higher targets
        weight_factor = max(0.7, min(1.3, body_weight_lbs / 180))
    else:
        weight_factor = 1.0  # Default if no weight data
    
    # Combined multiplier with body weight
    combined_mult = goal_mult * activity_mult * weight_factor
    
    # Calculate final targets
    volume_targets = {
        category: int(base_vol * combined_mult)
        for category, base_vol in base_volume_targets.items()
    }
    
    # Frequency targets (slightly adjusted for very active users)
    frequency_targets = {
        category: base_freq * (1.0 if activity_mult < 1.2 else 1.1)
        for category, base_freq in base_frequency.items()
    }
    
    return {
        'volume_targets': volume_targets,
        'optimal_frequency': frequency_targets,
        'goal_multiplier': goal_mult,
        'activity_multiplier': activity_mult,
        'weight_factor': round(weight_factor, 2),
        'body_weight_kg': body_weight_kg,
        'combined_multiplier': round(combined_mult, 2),
        'user_goal': goal,
        'user_activity': activity
    }


def get_previous_period_volumes(user_id, prev_start, prev_end):
    """Get volumes from previous period for trend analysis"""
    try:
        query = text("""
            SELECT 
                bpc.anatomical_category,
                SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as volume
            FROM Exercises e
            JOIN BodyParts bp ON e.body_part_id = bp.body_part_id
            JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
            WHERE e.user_id = :user_id 
              AND e.date >= :start_date
              AND e.date < :end_date
              AND e.exercise_type = 'strength'
              AND bpc.anatomical_category IN ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core')
            GROUP BY bpc.anatomical_category
        """)
        
        result = db.session.execute(query, {
            'user_id': user_id,
            'start_date': prev_start,
            'end_date': prev_end
        })
        
        return {row[0]: row[1] or 0 for row in result}
    
    except Exception as e:
        current_app.logger.warning(f"Error getting previous period volumes: {e}")
        return {}


def calculate_trend(current_volume, previous_volume):
    """
    Calculate trend score for volume change
    Returns: -100 to +100 (negative = declining, positive = improving)
    """
    if previous_volume == 0:
        return 100 if current_volume > 0 else 0
    
    change = ((current_volume - previous_volume) / previous_volume * 100)
    
    # Cap at ±100
    return max(-100, min(100, int(change)))

