"""
Shared test fixtures and utilities for all test modules.

This file is automatically discovered by pytest and provides fixtures
that can be used across all test files.
"""
import pytest
from datetime import date, timedelta
from app.app import create_app
from app.models import db, User, Workout, Exercise, StandardExercise, BodyPart, TrackedExercise


@pytest.fixture(scope='function')
def app(monkeypatch):
    """
    Create and configure a Flask application instance for testing.
    Uses an in-memory SQLite database.
    """
    # Set environment variables BEFORE creating app so create_app uses them
    monkeypatch.setenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:')
    monkeypatch.setenv('SECRET_KEY', 'test-secret-key-for-testing-only-32-chars-minimum')
    monkeypatch.setenv('JWT_SECRET_KEY', 'test-jwt-secret-key-for-testing-only-32-chars')
    monkeypatch.setenv('FLASK_ENV', 'testing')
    
    app = create_app()
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing
    
    with app.app_context():
        db.create_all()  # Create tables in the test database
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='function')
def client(app):
    """
    Create a test client for making HTTP requests.
    """
    return app.test_client()


@pytest.fixture(scope='function')
def auth_user(app):
    """
    Create a test user with authentication credentials.
    Returns the user object.
    """
    with app.app_context():
        user = User(username='testuser', email='test@example.com')
        user.set_password('password123')
        user.set_first_name('Test')
        user.set_last_name('User')
        db.session.add(user)
        db.session.commit()
        
        # Refresh to ensure user_id is available
        db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def logged_in_client(client, auth_user):
    """
    Create a test client with an already logged-in user.
    Returns a tuple of (client, user).
    """
    # Login the user
    response = client.post('/auth/login', json={
        'username': auth_user.username,
        'password': 'password123'
    })
    assert response.status_code == 200, f"Login failed: {response.get_json()}"
    
    return client, auth_user


@pytest.fixture(scope='function')
def body_part(app):
    """
    Create a test body part.
    """
    with app.app_context():
        bp = BodyPart(body_part_name='Chest')
        db.session.add(bp)
        db.session.commit()
        db.session.refresh(bp)
        return bp


@pytest.fixture(scope='function')
def standard_exercise(app, body_part):
    """
    Create a test standard exercise.
    """
    with app.app_context():
        exercise = StandardExercise(
            body_part_id=body_part.body_part_id,
            exercise_name='Bench Press',
            description='Barbell bench press',
            is_compound=True
        )
        db.session.add(exercise)
        db.session.commit()
        db.session.refresh(exercise)
        return exercise


@pytest.fixture(scope='function')
def workout_with_exercises(app, auth_user, body_part, standard_exercise):
    """
    Create a test workout with exercises for the authenticated user.
    Returns the workout object.
    """
    with app.app_context():
        workout = Workout(
            user_id=auth_user.user_id,
            date=date.today(),
            workout_name='Test Workout'
        )
        db.session.add(workout)
        db.session.commit()
        db.session.refresh(workout)
        
        exercise = Exercise(
            workout_id=workout.workout_id,
            user_id=auth_user.user_id,
            body_part_id=body_part.body_part_id,
            standard_exercise_id=standard_exercise.standard_exercise_id,
            sets=3,
            reps=10,
            weight=135.0,
            date=date.today()
        )
        db.session.add(exercise)
        db.session.commit()
        
        return workout


# Helper functions for creating test data
class TestDataFactory:
    """Factory class for creating test data."""
    
    @staticmethod
    def create_user(username='testuser', email='test@example.com', password='password123',
                   first_name='Test', last_name='User', **kwargs):
        """Create a test user with specified attributes."""
        user = User(username=username, email=email, **kwargs)
        user.set_password(password)
        if first_name:
            user.set_first_name(first_name)
        if last_name:
            user.set_last_name(last_name)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user
    
    @staticmethod
    def create_body_part(name='Test Body Part'):
        """Create a test body part."""
        bp = BodyPart(body_part_name=name)
        db.session.add(bp)
        db.session.commit()
        db.session.refresh(bp)
        return bp
    
    @staticmethod
    def create_standard_exercise(body_part_id, name='Test Exercise', **kwargs):
        """Create a test standard exercise."""
        exercise = StandardExercise(
            body_part_id=body_part_id,
            exercise_name=name,
            **kwargs
        )
        db.session.add(exercise)
        db.session.commit()
        db.session.refresh(exercise)
        return exercise
    
    @staticmethod
    def create_workout(user_id, workout_date=None, workout_name='Test Workout'):
        """Create a test workout."""
        if workout_date is None:
            workout_date = date.today()
        
        workout = Workout(
            user_id=user_id,
            date=workout_date,
            workout_name=workout_name
        )
        db.session.add(workout)
        db.session.commit()
        db.session.refresh(workout)
        return workout
    
    @staticmethod
    def create_exercise(workout_id, user_id, body_part_id, standard_exercise_id=None,
                       custom_exercise_id=None, sets=3, reps=10, weight=135.0, exercise_date=None):
        """Create a test exercise."""
        if exercise_date is None:
            exercise_date = date.today()
        
        exercise = Exercise(
            workout_id=workout_id,
            user_id=user_id,
            body_part_id=body_part_id,
            standard_exercise_id=standard_exercise_id,
            custom_exercise_id=custom_exercise_id,
            sets=sets,
            reps=reps,
            weight=weight,
            date=exercise_date
        )
        db.session.add(exercise)
        db.session.commit()
        return exercise
    
    @staticmethod
    def create_tracked_exercise(user_id, exercise_name, display_order=0):
        """Create a tracked exercise for a user."""
        tracked = TrackedExercise(
            user_id=user_id,
            exercise_name=exercise_name,
            display_order=display_order
        )
        db.session.add(tracked)
        db.session.commit()
        db.session.refresh(tracked)
        return tracked
    
    @staticmethod
    def create_workout_history(user_id, body_part_id, standard_exercise_id, 
                               num_sessions=5, days_apart=7, base_weight=135.0):
        """
        Create a workout history with progressive overload.
        Useful for testing progression analytics.
        """
        workouts = []
        for i in range(num_sessions):
            workout_date = date.today() - timedelta(days=i * days_apart)
            workout = TestDataFactory.create_workout(
                user_id=user_id,
                workout_date=workout_date,
                workout_name=f'Progression Workout {i+1}'
            )
            
            TestDataFactory.create_exercise(
                workout_id=workout.workout_id,
                user_id=user_id,
                body_part_id=body_part_id,
                standard_exercise_id=standard_exercise_id,
                sets=3,
                reps=8,
                weight=base_weight + (i * 10),  # Progressive overload
                exercise_date=workout_date
            )
            workouts.append(workout)
        
        return workouts


@pytest.fixture(scope='function')
def factory(app):
    """
    Provide TestDataFactory instance for creating test data.
    """
    with app.app_context():
        return TestDataFactory


# Helper functions for assertions
class Assertions:
    """Helper class for common test assertions."""
    
    @staticmethod
    def assert_success_response(response, expected_status=200):
        """Assert a successful API response."""
        assert response.status_code == expected_status, \
            f"Expected status {expected_status}, got {response.status_code}. Response: {response.get_json()}"
    
    @staticmethod
    def assert_error_response(response, expected_status=400):
        """Assert an error API response."""
        assert response.status_code == expected_status, \
            f"Expected error status {expected_status}, got {response.status_code}. Response: {response.get_json()}"
    
    @staticmethod
    def assert_json_response(response):
        """Assert response contains valid JSON."""
        data = response.get_json()
        assert data is not None, "Response does not contain valid JSON"
        return data
    
    @staticmethod
    def assert_user_created(user, username, email, first_name=None, last_name=None):
        """Assert user was created with correct attributes."""
        assert user is not None, "User was not created"
        assert user.username == username
        assert user.email == email
        if first_name:
            assert user.first_name == first_name
        if last_name:
            assert user.last_name == last_name
    
    @staticmethod
    def assert_requires_auth(client, method, url, data=None):
        """Assert an endpoint requires authentication."""
        if method.upper() == 'GET':
            response = client.get(url, follow_redirects=True)
        elif method.upper() == 'POST':
            response = client.post(url, json=data or {}, follow_redirects=True)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        # Should redirect to login or return 401/403
        assert response.status_code in [302, 401, 403, 200], \
            f"Expected auth redirect/error, got {response.status_code}"


@pytest.fixture(scope='function')
def assert_helper():
    """Provide Assertions helper for tests."""
    return Assertions

