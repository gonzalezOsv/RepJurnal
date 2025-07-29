import pytest
from flask import Flask
from app.app import app, db
from app.models import User
from werkzeug.security import generate_password_hash

@pytest.fixture
def client():
    """
    Set up a test client and initialize the database for each test.
    """
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # In-memory database for testing
    app.config['JWT_SECRET_KEY'] = 'testsecret'  # Test JWT key
    with app.test_client() as client:
        with app.app_context():
            db.create_all()  # Create tables in the test database
            yield client
            db.session.remove()
            db.drop_all()

def test_login_success(client):
    """
    Test the login route with valid credentials.
    """
    # Arrange: Add a test user to the database
    hashed_password = generate_password_hash("password123")
    user = User(username="testuser", password=hashed_password)
    db.session.add(user)
    db.session.commit()

    # Act: Send a POST request to the login route
    response = client.post('/login', json={
        'username': 'testuser',
        'password': 'password123'
    })

    # Assert: Check the response
    assert response.status_code == 200
    data = response.get_json()
    assert 'token' in data

def test_login_failure(client):
    """
    Test the login route with invalid credentials.
    """
    # Act: Send a POST request to the login route with incorrect password
    response = client.post('/login', json={
        'username': 'testuser',
        'password': 'wrongpassword'
    })

    # Assert: Check the response
    assert response.status_code == 401
    data = response.get_json()
    assert data['message'] == 'Invalid username or password'
