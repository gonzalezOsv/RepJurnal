# Test Suite Documentation

This directory contains the comprehensive test suite for the Fitness Diary application.

## Test Structure

Tests are organized into logical modules:

- **`conftest.py`** - Shared fixtures and test utilities used across all test files
- **`test_auth.py`** - Authentication tests (login, registration, username validation)
- **`test_account.py`** - Account management tests (profile updates, field validation)
- **`test_metrics.py`** - Metrics and analytics tests (exercise progression, tracked exercises)
- **`test_access_control.py`** - Authorization and access control tests

## Running Tests

### Run All Tests

```bash
# From workout-diary directory
pytest tests/ -v
```

### Run Specific Test File

```bash
pytest tests/test_auth.py -v
pytest tests/test_account.py -v
pytest tests/test_metrics.py -v
pytest tests/test_access_control.py -v
```

### Run Specific Test Class

```bash
pytest tests/test_auth.py::TestLogin -v
pytest tests/test_account.py::TestAccountUpdate -v
```

### Run Specific Test

```bash
pytest tests/test_auth.py::TestLogin::test_login_success -v
```

### Run Tests with Filter

```bash
# Run all login tests
pytest tests/ -k login -v

# Run all account update tests
pytest tests/ -k account_update -v
```

## Test Fixtures

### Core Fixtures (from `conftest.py`)

- **`app`** - Flask application instance with test configuration
- **`client`** - Test client for making HTTP requests
- **`auth_user`** - Creates a test user (not logged in)
- **`logged_in_client`** - Returns `(client, user)` tuple with authenticated session
- **`factory`** - `TestDataFactory` instance for creating test data

### Helper Fixtures

- **`body_part`** - Creates a test body part
- **`standard_exercise`** - Creates a test standard exercise
- **`workout_with_exercises`** - Creates a workout with exercises
- **`assert_helper`** - `Assertions` helper class for common assertions

## Test Utilities

### TestDataFactory

The `TestDataFactory` class provides methods for creating test data:

```python
# Create a user
user = factory.create_user(username='testuser', email='test@example.com')

# Create workout history with progressive overload
workouts = factory.create_workout_history(
    user_id=user.user_id,
    body_part_id=body_part.body_part_id,
    standard_exercise_id=exercise.standard_exercise_id,
    num_sessions=5
)

# Create tracked exercise
tracked = factory.create_tracked_exercise(
    user_id=user.user_id,
    exercise_name='Bench Press'
)
```

### Assertions Helper

The `Assertions` class provides common assertion methods:

```python
# Assert successful response
assert_helper.assert_success_response(response, expected_status=200)

# Assert error response
assert_helper.assert_error_response(response, expected_status=400)

# Assert valid JSON
data = assert_helper.assert_json_response(response)

# Assert user was created correctly
assert_helper.assert_user_created(user, 'username', 'email@example.com', 'First', 'Last')

# Assert endpoint requires authentication
assert_helper.assert_requires_auth(client, 'GET', '/dashboard')
```

## Test Coverage

### Authentication (`test_auth.py`)

- ✅ Login success and failure cases
- ✅ Registration with validation
- ✅ Username availability checking
- ✅ Input validation and sanitization
- ✅ Duplicate username/email prevention
- ✅ Password strength validation

### Account Management (`test_account.py`)

- ✅ Update all account fields
- ✅ Update personal information
- ✅ Update fitness information
- ✅ Update health/medical information
- ✅ Update goal tracking
- ✅ Update lifestyle factors
- ✅ Phone number formatting
- ✅ Time format validation
- ✅ Numeric field validation
- ✅ Enum option validation
- ✅ Empty value handling
- ✅ Authorization requirements

### Metrics & Analytics (`test_metrics.py`)

- ✅ Exercise progression tracking
- ✅ Tracked exercises CRUD operations
- ✅ Exercise history with progressive overload
- ✅ Authorization and user isolation

### Access Control (`test_access_control.py`)

- ✅ Protected route access control
- ✅ Unauthorized access handling
- ✅ Session management
- ✅ Logout functionality
- ✅ Public route accessibility

## Writing New Tests

### Example Test Structure

```python
class TestFeatureName:
    """Test suite for feature description."""
    
    def test_feature_success(self, logged_in_client, assert_helper):
        """Test successful feature operation."""
        client, user = logged_in_client
        
        # Arrange: Set up test data
        # Act: Perform action
        response = client.post('/endpoint', json={'data': 'value'})
        
        # Assert: Verify results
        assert_helper.assert_success_response(response)
        data = assert_helper.assert_json_response(response)
        assert data['expected_field'] == 'expected_value'
    
    def test_feature_failure(self, logged_in_client):
        """Test feature handles errors correctly."""
        client, user = logged_in_client
        
        # Test error cases
        response = client.post('/endpoint', json={'invalid': 'data'})
        assert response.status_code == 400
```

### Best Practices

1. **Use fixtures** - Leverage `logged_in_client`, `factory`, etc. instead of duplicating setup
2. **Clear test names** - Use descriptive names that explain what is being tested
3. **Arrange-Act-Assert** - Organize tests clearly into these three sections
4. **One assertion per test** - Or group related assertions logically
5. **Test edge cases** - Include tests for invalid input, boundary conditions, etc.
6. **Use assert_helper** - Use helper methods for common assertions
7. **Clean up** - Tests automatically clean up (fixtures handle this)

## Test Database

Tests use an in-memory SQLite database (`sqlite:///:memory:`) that:

- ✅ Is created fresh for each test
- ✅ Is automatically cleaned up after each test
- ✅ Doesn't affect your development database
- ✅ Runs faster than using a real database
- ✅ Is isolated per test function

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```bash
# Run with short traceback
pytest tests/ -v --tb=short

# Run with coverage
pytest tests/ --cov=app --cov-report=html -v
```

## Troubleshooting

### Tests Fail with Import Errors

Make sure you're running tests from the `workout-diary` directory:

```bash
cd workout-diary
pytest tests/ -v
```

### Database Errors

Tests use an in-memory database. If you see database errors:
- Check that fixtures are being used correctly
- Verify `db.create_all()` is called in the `app` fixture
- Ensure database models are properly imported

### Authentication Issues

If tests fail due to authentication:
- Use the `logged_in_client` fixture for authenticated tests
- Check that login endpoints return expected status codes
- Verify session persistence with Flask's test client

### CSRF Errors

CSRF is automatically disabled in test mode via the `app` fixture configuration.

## Test Statistics

Current test suite:
- **Total Tests**: 59
- **All Passing**: ✅
- **Coverage Areas**: Authentication, Account Management, Metrics, Access Control
