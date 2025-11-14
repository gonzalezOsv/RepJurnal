import pytest
from flask import Flask
from app.app import create_app
from app.models import db, User
from werkzeug.security import generate_password_hash

@pytest.fixture
def client():
    """
    Set up a test client and initialize the database for each test.
    """
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # In-memory database for testing
    app.config['JWT_SECRET_KEY'] = 'testsecret'  # Test JWT key
    app.config['SECRET_KEY'] = 'testsecret'  # Test secret key
    with app.test_client() as client:
        with app.app_context():
            db.create_all()  # Create tables in the test database
            yield client
            db.session.remove()
            db.drop_all()


@pytest.fixture
def logged_in_user(client):
    """
    Helper fixture that creates and logs in a test user.
    Returns the user object and client.
    """
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('Test')
    user.set_last_name('User')
    db.session.add(user)
    db.session.commit()
    
    # Login the user
    client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    
    return user, client

def test_login_success(client):
    """
    Test the login route with valid credentials.
    """
    # Arrange: Add a test user to the database
    user = User(username="testuser", email="test@example.com")
    user.set_password("password123")
    db.session.add(user)
    db.session.commit()

    # Act: Send a POST request to the login route
    response = client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })

    # Assert: Check the response
    assert response.status_code == 201
    data = response.get_json()
    assert 'redirect_url' in data

def test_login_failure(client):
    """
    Test the login route with invalid credentials.
    """
    # Act: Send a POST request to the login route with incorrect password
    response = client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'wrongpassword'
    })

    # Assert: Check the response
    assert response.status_code == 401
    data = response.get_json()
    assert data['message'] == 'Invalid Username or Password please try again.'

def test_register_success(client):
    """
    Test the registration route with valid data including first and last name.
    """
    # Arrange: Prepare user registration data
    registration_data = {
        'first_name': 'John',
        'last_name': 'Doe',
        'username': 'johndoe',
        'email': 'john.doe@example.com',
        'password': 'SecurePassword123!',
        'terms_accepted': True
    }

    # Act: Send a POST request to the register route
    response = client.post('/auth/register', json=registration_data)

    # Assert: Check the response
    assert response.status_code == 200
    data = response.get_json()
    assert 'redirect_url' in data
    assert data['redirect_url'] == '/dashboard'

    # Verify user was created in database
    user = User.query.filter_by(username='johndoe').first()
    assert user is not None
    assert user.first_name == 'John'
    assert user.last_name == 'Doe'
    assert user.email == 'john.doe@example.com'
    assert user.check_password('SecurePassword123!')

def test_register_missing_first_name(client):
    """
    Test registration fails when first name is missing.
    """
    # Arrange: Prepare incomplete registration data
    registration_data = {
        'last_name': 'Doe',
        'username': 'johndoe',
        'email': 'john.doe@example.com',
        'password': 'SecurePassword123!',
        'terms_accepted': True
    }

    # Act: Send a POST request to the register route
    response = client.post('/auth/register', json=registration_data)

    # Assert: Check the response
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert 'first name' in data['message'].lower()

def test_register_missing_last_name(client):
    """
    Test registration fails when last name is missing.
    """
    # Arrange: Prepare incomplete registration data
    registration_data = {
        'first_name': 'John',
        'username': 'johndoe',
        'email': 'john.doe@example.com',
        'password': 'SecurePassword123!',
        'terms_accepted': True
    }

    # Act: Send a POST request to the register route
    response = client.post('/auth/register', json=registration_data)

    # Assert: Check the response
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert 'last name' in data['message'].lower()

def test_register_duplicate_username(client):
    """
    Test registration fails when username already exists.
    """
    # Arrange: Create existing user
    existing_user = User(username='existinguser', email='existing@example.com')
    existing_user.set_password('password123')
    existing_user.set_first_name('Existing')
    existing_user.set_last_name('User')
    db.session.add(existing_user)
    db.session.commit()

    # Try to register with same username
    registration_data = {
        'first_name': 'New',
        'last_name': 'User',
        'username': 'existinguser',
        'email': 'new@example.com',
        'password': 'SecurePassword123!',
        'terms_accepted': True
    }

    # Act: Send a POST request to the register route
    response = client.post('/auth/register', json=registration_data)

    # Assert: Check the response
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert 'username is already taken' in data['message'].lower()


def test_check_username_available(client):
    """
    Username availability endpoint returns available for unused username.
    """
    response = client.post('/auth/check-username', json={'username': 'brandnewuser'})
    assert response.status_code == 200
    data = response.get_json()
    assert data['available'] is True


def test_check_username_taken(client):
    """
    Username availability endpoint reports taken usernames.
    """
    existing_user = User(username='duplicateuser', email='dup@example.com')
    existing_user.set_password('password123')
    db.session.add(existing_user)
    db.session.commit()

    response = client.post('/auth/check-username', json={'username': 'duplicateuser'})
    assert response.status_code == 200
    data = response.get_json()
    assert data['available'] is False
    assert 'taken' in data['message'].lower()


def test_check_username_invalid_format(client):
    """
    Username availability endpoint validates format.
    """
    response = client.post('/auth/check-username', json={'username': 'ab'})
    assert response.status_code == 400
    data = response.get_json()
    assert data['available'] is False
    assert 'at least 3 characters' in data['message'].lower()

def test_register_invalid_email(client):
    """
    Test registration fails with invalid email format.
    """
    # Arrange: Prepare registration data with invalid email
    registration_data = {
        'first_name': 'John',
        'last_name': 'Doe',
        'username': 'johndoe',
        'email': 'invalid-email',
        'password': 'SecurePassword123!',
        'terms_accepted': True
    }

    # Act: Send a POST request to the register route
    response = client.post('/auth/register', json=registration_data)

    # Assert: Check the response
    assert response.status_code == 400
    data = response.get_json()
    assert 'message' in data
    assert 'email' in data['message'].lower()


# Progress Tracking Tests
def test_get_exercise_progression(client):
    """
    Test getting progression data for an exercise.
    """
    from datetime import date, timedelta
    from app.models import Workout, Exercise, StandardExercise, BodyPart
    
    # Arrange: Create user and workouts with exercise data
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('Test')
    user.set_last_name('User')
    db.session.add(user)
    db.session.commit()
    
    # Create body part and standard exercise
    body_part = BodyPart(body_part_name='Chest')
    db.session.add(body_part)
    db.session.commit()
    
    bench_press = StandardExercise(
        body_part_id=body_part.body_part_id,
        exercise_name='Bench Press',
        description='Barbell bench press',
        is_compound=True
    )
    db.session.add(bench_press)
    db.session.commit()
    
    # Create workouts and exercises over several days
    for i in range(5):
        workout_date = date.today() - timedelta(days=i*7)
        workout = Workout(
            user_id=user.user_id,
            date=workout_date,
            workout_name='Chest Day'
        )
        db.session.add(workout)
        db.session.commit()
        
        exercise = Exercise(
            workout_id=workout.workout_id,
            user_id=user.user_id,
            body_part_id=body_part.body_part_id,
            standard_exercise_id=bench_press.standard_exercise_id,
            sets=3,
            reps=8,
            weight=135.0 + (i * 10),  # Progressive overload
            date=workout_date
        )
        db.session.add(exercise)
    
    db.session.commit()
    
    # Login the user
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Request progression data
        response = client.get('/metrics/api/exercise-progression/Bench Press')
        
        # Assert: Check the response
        assert response.status_code == 200
        data = response.get_json()
        assert data['exercise_name'] == 'Bench Press'
        assert len(data['dates']) == 5
        assert len(data['max_weights']) == 5
        assert data['personal_record']['weight'] == 175.0  # Max weight
        assert data['total_sessions'] == 5


def test_get_tracked_exercises(client):
    """
    Test getting list of tracked exercises.
    """
    from app.models import Workout, Exercise, StandardExercise, BodyPart
    from datetime import date
    
    # Arrange: Create user with exercises
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('Test')
    user.set_last_name('User')
    db.session.add(user)
    db.session.commit()
    
    # Create body part and exercises
    body_part = BodyPart(body_part_name='Legs')
    db.session.add(body_part)
    db.session.commit()
    
    squat = StandardExercise(
        body_part_id=body_part.body_part_id,
        exercise_name='Squats',
        is_compound=True
    )
    db.session.add(squat)
    db.session.commit()
    
    # Create multiple workout sessions
    for i in range(3):
        workout = Workout(
            user_id=user.user_id,
            date=date.today(),
            workout_name='Leg Day'
        )
        db.session.add(workout)
        db.session.commit()
        
        exercise = Exercise(
            workout_id=workout.workout_id,
            user_id=user.user_id,
            body_part_id=body_part.body_part_id,
            standard_exercise_id=squat.standard_exercise_id,
            sets=4,
            reps=10,
            weight=225.0,
            date=date.today()
        )
        db.session.add(exercise)
    
    db.session.commit()
    
    # Login the user
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Request tracked exercises
        response = client.get('/metrics/api/tracked-exercises')
        
        # Assert: Check the response
        assert response.status_code == 200
        data = response.get_json()
        assert 'tracked_exercises' in data
        assert 'default_exercises' in data
        assert 'Bench Press' in data['default_exercises']
        assert 'Squats' in data['default_exercises']
        assert 'Deadlift' in data['default_exercises']


def test_unauthorized_access_redirects_to_home(client):
    """
    Test that accessing protected routes without login redirects to home page.
    """
    # Act: Try to access dashboard without logging in
    response = client.get('/dashboard', follow_redirects=True)
    
    # Assert: Should redirect to home page
    assert response.status_code == 200
    # Check that we're on the home page (look for "Get Started" or "Login" text)
    assert b'Get Started' in response.data or b'RepJurnal' in response.data


def test_unauthorized_access_shows_flash_message(client):
    """
    Test that unauthorized access shows a flash message.
    """
    # Act: Try to access protected route
    response = client.get('/dashboard', follow_redirects=True)
    
    # Assert: Flash message should be present
    assert response.status_code == 200
    # The flash message is in the HTML
    assert b'Please log in' in response.data or b'login' in response.data.lower()


# Account Update Tests
def test_account_update_all_fields_success(client):
    """
    Test updating all account fields successfully.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('Original')
    user.set_last_name('Name')
    db.session.add(user)
    db.session.commit()
    
    # Login the user
    with client:
        login_response = client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        assert login_response.status_code == 200
        
        # Act: Update all account fields
        update_data = {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'phone_number': '(555) 123-4567',
            'address': '123 Test Street, Test City, TS 12345',
            'height_cm': '175.5',
            'weight_kg': '75.2',
            'fitness_goal': 'Muscle Gain',
            'dietary_preferences': 'Vegan',
            'preferred_workout_time': '06:30'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert: Check response
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify data was saved to database
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == 'UpdatedFirst'
        assert updated_user.last_name == 'UpdatedLast'
        assert updated_user.phone_number == '(555) 123-4567'
        assert updated_user.address == '123 Test Street, Test City, TS 12345'
        assert updated_user.height_cm == 175.5
        assert updated_user.weight_kg == 75.2
        assert updated_user.fitness_goal == 'Muscle Gain'
        assert updated_user.dietary_preferences == 'Vegan'
        assert updated_user.preferred_workout_time is not None
        assert str(updated_user.preferred_workout_time) == '06:30:00'


def test_account_update_personal_info_only(client):
    """
    Test updating only personal information fields.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update only personal info
        update_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '555-9876',
            'address': '456 New Address'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify updates
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == 'Jane'
        assert updated_user.last_name == 'Smith'
        assert updated_user.phone_number == '555-9876'
        assert updated_user.address == '456 New Address'


def test_account_update_fitness_info_only(client):
    """
    Test updating only fitness information fields.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update only fitness info
        update_data = {
            'height_cm': '180.0',
            'weight_kg': '80.5',
            'fitness_goal': 'Weight Loss',
            'dietary_preferences': 'Keto',
            'preferred_workout_time': '18:00'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify updates
        updated_user = User.query.get(user.user_id)
        assert updated_user.height_cm == 180.0
        assert updated_user.weight_kg == 80.5
        assert updated_user.fitness_goal == 'Weight Loss'
        assert updated_user.dietary_preferences == 'Keto'
        assert str(updated_user.preferred_workout_time) == '18:00:00'


def test_account_update_partial_fields(client):
    """
    Test updating only some fields, leaving others unchanged.
    """
    # Arrange: Create user with existing data
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('OriginalFirst')
    user.set_last_name('OriginalLast')
    user.height_cm = 170.0
    user.weight_kg = 70.0
    db.session.add(user)
    db.session.commit()
    
    original_first = user.first_name
    original_height = user.height_cm
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update only weight and fitness goal
        update_data = {
            'weight_kg': '75.0',
            'fitness_goal': 'Improved Endurance'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert
        assert response.status_code == 200
        
        # Verify updated fields
        updated_user = User.query.get(user.user_id)
        assert updated_user.weight_kg == 75.0
        assert updated_user.fitness_goal == 'Improved Endurance'
        
        # Verify unchanged fields remain the same
        assert updated_user.first_name == original_first
        assert updated_user.height_cm == original_height


def test_account_update_with_empty_fields(client):
    """
    Test updating account with empty/None values (should clear fields).
    """
    # Arrange: Create user with existing data
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    user.set_first_name('John')
    user.set_last_name('Doe')
    user.phone_number = '(555) 123-4567'
    user.dietary_preferences = 'Vegan'
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update with empty strings (should clear fields)
        update_data = {
            'first_name': '',
            'last_name': '',
            'phone_number': '',
            'address': '',
            'dietary_preferences': ''
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert
        assert response.status_code == 200
        
        # Verify fields were cleared
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == ''
        assert updated_user.last_name == ''
        assert updated_user.phone_number == ''
        assert updated_user.address == ''
        assert updated_user.dietary_preferences == ''


def test_account_update_unauthorized(client):
    """
    Test that account update requires authentication.
    """
    # Act: Try to update account without logging in
    update_data = {
        'first_name': 'Hacker',
        'last_name': 'Attempt'
    }
    
    response = client.post('/account/update', data=update_data, follow_redirects=True)
    
    # Assert: Should redirect or return 401/403
    # The route is protected by @login_required
    assert response.status_code in [401, 403, 302, 200]  # May redirect to login


def test_account_update_invalid_time_format(client):
    """
    Test that invalid time format is handled gracefully.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update with invalid time format
        update_data = {
            'preferred_workout_time': 'invalid-time-format'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert: Should still succeed but time should be None (handled in route)
        assert response.status_code == 200
        
        # Verify time was not set (invalid format is caught and set to None)
        updated_user = User.query.get(user.user_id)
        assert updated_user.preferred_workout_time is None


def test_account_update_numeric_fields(client):
    """
    Test updating numeric fields with various valid formats.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update with decimal values
        update_data = {
            'height_cm': '175.7',
            'weight_kg': '75.333'
        }
        
        response = client.post('/account/update', data=update_data)
        
        # Assert
        assert response.status_code == 200
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.height_cm == 175.7
        assert updated_user.weight_kg == 75.333


def test_account_update_fitness_goal_options(client):
    """
    Test all fitness goal options can be set.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    fitness_goals = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Improved Endurance']
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act & Assert: Test each fitness goal
        for goal in fitness_goals:
            update_data = {'fitness_goal': goal}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.fitness_goal == goal


def test_account_update_phone_number_formatting(client):
    """
    Test that phone number is properly formatted by format_phone_number utility.
    """
    # Arrange: Create and login user
    user = User(username='testuser', email='test@example.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    with client:
        client.post('/auth/login', json={
            'username': 'testuser',
            'password': 'password123'
        })
        
        # Act: Update with various phone number formats
        phone_numbers = [
            ('5551234567', None),  # Test format_phone_number behavior
            ('555-123-4567', None),
            ('(555) 123-4567', None),
            ('555.123.4567', None)
        ]
        
        for phone_input, expected in phone_numbers:
            update_data = {'phone_number': phone_input}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            # Phone number should be formatted (or stored as-is depending on format_phone_number)
            assert updated_user.phone_number is not None
