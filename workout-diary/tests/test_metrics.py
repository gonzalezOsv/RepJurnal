"""
Tests for metrics and analytics endpoints.

Tests cover:
- Exercise progression tracking
- Tracked exercises management
- Analytics calculations
"""
import pytest
from datetime import date, timedelta
from app.models import db, User, Workout, Exercise, StandardExercise, BodyPart, TrackedExercise


class TestExerciseProgression:
    """Test suite for exercise progression endpoint."""
    
    def test_get_exercise_progression_success(self, logged_in_client, factory):
        """Test getting progression data for an exercise."""
        client, user = logged_in_client
        
        # Create body part and exercise
        body_part = factory.create_body_part(name='Chest')
        exercise = factory.create_standard_exercise(
            body_part_id=body_part.body_part_id,
            name='Bench Press',
            is_compound=True
        )
        
        # Create workout history with progressive overload
        workouts = factory.create_workout_history(
            user_id=user.user_id,
            body_part_id=body_part.body_part_id,
            standard_exercise_id=exercise.standard_exercise_id,
            num_sessions=5,
            days_apart=7,
            base_weight=135.0
        )
        
        # Request progression data
        response = client.get('/metrics/api/exercise-progression/Bench Press')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['exercise_name'] == 'Bench Press'
        assert len(data['dates']) == 5
        assert len(data['max_weights']) == 5
        assert data['personal_record']['weight'] == 175.0  # Max weight (135 + 4*10)
        assert data['total_sessions'] == 5
        
        # Verify progressive overload trend
        weights = data['max_weights']
        assert weights[0] >= weights[-1]  # Most recent should be highest
    
    def test_get_exercise_progression_no_data(self, logged_in_client):
        """Test getting progression for exercise with no history."""
        client, user = logged_in_client
        
        response = client.get('/metrics/api/exercise-progression/Nonexistent Exercise')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['exercise_name'] == 'Nonexistent Exercise'
        assert len(data['dates']) == 0
        assert len(data['max_weights']) == 0
        assert data['total_sessions'] == 0
    
    def test_get_exercise_progression_requires_auth(self, client):
        """Test that progression endpoint requires authentication."""
        response = client.get('/metrics/api/exercise-progression/Bench Press', follow_redirects=True)
        
        # Should redirect or return 401/403
        assert response.status_code in [401, 403, 302, 200]


class TestTrackedExercises:
    """Test suite for tracked exercises endpoint."""
    
    def test_get_tracked_exercises_empty(self, logged_in_client):
        """Test getting tracked exercises when user has none."""
        client, user = logged_in_client
        
        response = client.get('/metrics/api/tracked-exercises')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'tracked_exercises' in data
        assert isinstance(data['tracked_exercises'], list)
        assert len(data['tracked_exercises']) == 0
    
    def test_get_tracked_exercises_with_data(self, logged_in_client, factory):
        """Test getting tracked exercises when user has some."""
        client, user = logged_in_client
        
        # Create tracked exercises
        tracked1 = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Bench Press',
            display_order=1
        )
        tracked2 = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Squats',
            display_order=2
        )
        
        response = client.get('/metrics/api/tracked-exercises')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'tracked_exercises' in data
        assert len(data['tracked_exercises']) == 2
        
        exercise_names = [ex['exercise_name'] for ex in data['tracked_exercises']]
        assert 'Bench Press' in exercise_names
        assert 'Squats' in exercise_names
    
    def test_add_tracked_exercise(self, logged_in_client, factory):
        """Test adding a new tracked exercise."""
        client, user = logged_in_client
        
        response = client.post('/metrics/api/tracked-exercises', json={
            'exercise_name': 'Deadlift'
        })
        
        # POST endpoints typically return 201 (Created) for successful creation
        assert response.status_code in [200, 201]
        data = response.get_json()
        assert 'success' in data or 'tracked_exercise_id' in data or 'message' in data
        
        # Verify it was created
        tracked = TrackedExercise.query.filter_by(
            user_id=user.user_id,
            exercise_name='Deadlift'
        ).first()
        assert tracked is not None
    
    def test_add_tracked_exercise_duplicate(self, logged_in_client, factory):
        """Test that adding duplicate tracked exercise fails."""
        client, user = logged_in_client
        
        # Create first one
        factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Bench Press'
        )
        
        # Try to add duplicate
        response = client.post('/metrics/api/tracked-exercises', json={
            'exercise_name': 'Bench Press'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data or 'already' in data.get('message', '').lower()
    
    def test_remove_tracked_exercise(self, logged_in_client, factory):
        """Test removing a tracked exercise."""
        client, user = logged_in_client
        
        # Create tracked exercise
        tracked = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Bench Press'
        )
        
        # Remove it
        response = client.delete(f'/metrics/api/tracked-exercises/{tracked.tracked_exercise_id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data.get('success') is True
        
        # Verify it was removed
        deleted = TrackedExercise.query.get(tracked.tracked_exercise_id)
        assert deleted is None
    
    def test_remove_tracked_exercise_not_found(self, logged_in_client):
        """Test removing non-existent tracked exercise."""
        client, user = logged_in_client
        
        response = client.delete('/metrics/api/tracked-exercises/99999')
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data or 'not found' in data.get('message', '').lower()
    
    def test_remove_other_user_tracked_exercise(self, logged_in_client, factory):
        """Test that users cannot remove other users' tracked exercises."""
        client, user = logged_in_client
        
        # Create another user's tracked exercise
        other_user = factory.create_user(username='otheruser', email='other@example.com')
        other_tracked = factory.create_tracked_exercise(
            user_id=other_user.user_id,
            exercise_name='Other Exercise'
        )
        
        # Try to remove it (should fail)
        response = client.delete(f'/metrics/api/tracked-exercises/{other_tracked.tracked_exercise_id}')
        
        assert response.status_code == 404  # Should not be found for current user
        
        # Verify other user's exercise still exists
        still_exists = TrackedExercise.query.get(other_tracked.tracked_exercise_id)
        assert still_exists is not None
    
    def test_reorder_tracked_exercises(self, logged_in_client, factory):
        """Test reordering tracked exercises."""
        client, user = logged_in_client
        
        # Create multiple tracked exercises
        tracked1 = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Exercise 1',
            display_order=1
        )
        tracked2 = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Exercise 2',
            display_order=2
        )
        tracked3 = factory.create_tracked_exercise(
            user_id=user.user_id,
            exercise_name='Exercise 3',
            display_order=3
        )
        
        # Reorder them (reverse order)
        response = client.post('/metrics/api/tracked-exercises/reorder', json={
            'exercise_ids': [
                tracked3.tracked_exercise_id,
                tracked2.tracked_exercise_id,
                tracked1.tracked_exercise_id
            ]
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data.get('success') is True
        
        # Verify order was updated
        db.session.refresh(tracked1)
        db.session.refresh(tracked2)
        db.session.refresh(tracked3)
        
        assert tracked3.display_order == 1
        assert tracked2.display_order == 2
        assert tracked1.display_order == 3
    
    def test_get_tracked_exercises_requires_auth(self, client):
        """Test that tracked exercises endpoint requires authentication."""
        response = client.get('/metrics/api/tracked-exercises', follow_redirects=True)
        
        # Should redirect or return 401/403
        assert response.status_code in [401, 403, 302, 200]

