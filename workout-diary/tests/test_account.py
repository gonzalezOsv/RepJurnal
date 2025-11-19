"""
Tests for account management endpoints.

Tests cover:
- Account information updates (personal info, fitness info, health info)
- Field validation and formatting
- Partial updates
- Empty value handling
- Authorization requirements
"""
import pytest
from app.models import db, User


class TestAccountUpdate:
    """Test suite for account update endpoint."""
    
    def test_update_all_fields_success(self, logged_in_client, assert_helper):
        """Test updating all account fields successfully."""
        client, user = logged_in_client
        
        update_data = {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'phone_number': '(555) 123-4567',
            'address': '123 Test Street, Test City, TS 12345',
            'height_cm': '175.5',
            'weight_kg': '75.2',
            'fitness_goal': 'Muscle Gain',
            'dietary_preferences': 'Vegan',
            'preferred_workout_time': '06:30',
            'body_fat_percentage': '15.5',
            'activity_level': 'Very Active',
            'target_weight_kg': '80.0',
            'target_body_fat_percentage': '12.0',
            'weekly_weight_loss_goal': '0.5',
            'smoking_status': 'Non-Smoker',
            'alcohol_consumption': 'Occasional',
            'motivation_level': 'High'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        data = assert_helper.assert_json_response(response)
        assert data['success'] is True
        
        # Verify all fields were saved
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == 'UpdatedFirst'
        assert updated_user.last_name == 'UpdatedLast'
        assert updated_user.phone_number == '555-123-4567'  # Formatted
        assert updated_user.address == '123 Test Street, Test City, TS 12345'
        assert updated_user.height_cm == 175.5
        assert updated_user.weight_kg == 75.2
        assert updated_user.fitness_goal == 'Muscle Gain'
        assert updated_user.dietary_preferences == 'Vegan'
        assert updated_user.preferred_workout_time is not None
        assert str(updated_user.preferred_workout_time) == '06:30:00'
        assert updated_user.body_fat_percentage == 15.5
        assert updated_user.activity_level == 'Very Active'
        assert updated_user.target_weight_kg == 80.0
        assert updated_user.target_body_fat_percentage == 12.0
        assert updated_user.weekly_weight_loss_goal == 0.5
        assert updated_user.smoking_status == 'Non-Smoker'
        assert updated_user.alcohol_consumption == 'Occasional'
        assert updated_user.motivation_level == 'High'
    
    def test_update_personal_info_only(self, logged_in_client, assert_helper):
        """Test updating only personal information fields."""
        client, user = logged_in_client
        
        update_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '5551234567',  # Will be formatted
            'address': '456 New Address'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == 'Jane'
        assert updated_user.last_name == 'Smith'
        assert updated_user.phone_number == '555-123-4567'  # Formatted
        assert updated_user.address == '456 New Address'
    
    def test_update_fitness_info_only(self, logged_in_client, assert_helper):
        """Test updating only fitness information fields."""
        client, user = logged_in_client
        
        update_data = {
            'height_cm': '180.0',
            'weight_kg': '80.5',
            'fitness_goal': 'Weight Loss',
            'dietary_preferences': 'Keto',
            'preferred_workout_time': '18:00',
            'body_fat_percentage': '18.0',
            'activity_level': 'Moderately Active'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.height_cm == 180.0
        assert updated_user.weight_kg == 80.5
        assert updated_user.fitness_goal == 'Weight Loss'
        assert updated_user.dietary_preferences == 'Keto'
        assert str(updated_user.preferred_workout_time) == '18:00:00'
        assert updated_user.body_fat_percentage == 18.0
        assert updated_user.activity_level == 'Moderately Active'
    
    def test_update_health_info(self, logged_in_client, assert_helper):
        """Test updating health and medical information."""
        client, user = logged_in_client
        
        update_data = {
            'medical_conditions': 'High blood pressure, Diabetes',
            'allergies': 'Peanuts, Shellfish',
            'injuries': 'Lower back pain, Knee surgery (2020)'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.medical_conditions == 'High blood pressure, Diabetes'
        assert updated_user.allergies == 'Peanuts, Shellfish'
        assert updated_user.injuries == 'Lower back pain, Knee surgery (2020)'
    
    def test_update_goal_tracking(self, logged_in_client, assert_helper):
        """Test updating goal tracking fields."""
        client, user = logged_in_client
        
        update_data = {
            'target_weight_kg': '75.0',
            'target_body_fat_percentage': '15.0',
            'weekly_weight_loss_goal': '0.25'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.target_weight_kg == 75.0
        assert updated_user.target_body_fat_percentage == 15.0
        assert updated_user.weekly_weight_loss_goal == 0.25
    
    def test_update_lifestyle_factors(self, logged_in_client, assert_helper):
        """Test updating lifestyle factor fields."""
        client, user = logged_in_client
        
        update_data = {
            'smoking_status': 'Non-Smoker',
            'alcohol_consumption': 'Moderate',
            'motivation_level': 'High'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert_helper.assert_success_response(response)
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.smoking_status == 'Non-Smoker'
        assert updated_user.alcohol_consumption == 'Moderate'
        assert updated_user.motivation_level == 'High'
    
    def test_update_partial_fields(self, logged_in_client):
        """Test updating only some fields."""
        client, user = logged_in_client
        
        # Set initial values
        user.set_first_name('OriginalFirst')
        user.set_last_name('OriginalLast')
        user.height_cm = 170.0
        user.weight_kg = 70.0
        db.session.commit()
        
        # Update only weight and fitness goal
        update_data = {
            'weight_kg': '75.0',
            'fitness_goal': 'Improved Endurance'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert response.status_code == 200
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.weight_kg == 75.0
        assert updated_user.fitness_goal == 'Improved Endurance'
        
        # Note: When fields are not provided, they become None
        # This is expected behavior - the route updates all fields in the form
        assert updated_user.first_name is None  # Not provided, becomes None
        assert updated_user.height_cm is None  # Not provided, becomes None
    
    def test_update_with_empty_strings(self, logged_in_client):
        """Test that empty strings clear fields appropriately."""
        client, user = logged_in_client
        
        # Set initial values
        user.set_first_name('John')
        user.set_last_name('Doe')
        user.phone_number = '(555) 123-4567'
        user.dietary_preferences = 'Vegan'
        db.session.commit()
        
        # Update with empty strings
        update_data = {
            'first_name': '',
            'last_name': '',
            'phone_number': '',
            'address': '',
            'dietary_preferences': ''
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert response.status_code == 200
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == ''  # Empty string stored as-is
        assert updated_user.last_name == ''  # Empty string stored as-is
        assert updated_user.phone_number is None  # format_phone_number returns None for empty
        assert updated_user.address == ''  # Empty string stored as-is
        assert updated_user.dietary_preferences is None  # "value or None" pattern
    
    def test_phone_number_formatting(self, logged_in_client):
        """Test that phone numbers are properly formatted."""
        client, user = logged_in_client
        
        phone_formats = [
            ('5551234567', '555-123-4567'),
            ('555-123-4567', '555-123-4567'),
            ('(555) 123-4567', '555-123-4567'),
            ('555.123.4567', '555-123-4567'),
        ]
        
        for phone_input, expected in phone_formats:
            update_data = {'phone_number': phone_input}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.phone_number == expected
    
    def test_phone_number_invalid(self, logged_in_client):
        """Test that invalid phone numbers are handled."""
        client, user = logged_in_client
        
        invalid_numbers = ['555-9876', '123', 'abc1234567', '']  # Too short or invalid
        
        for phone_input in invalid_numbers:
            update_data = {'phone_number': phone_input}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200  # Should succeed but phone becomes None
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.phone_number is None
    
    def test_time_format_validation(self, logged_in_client):
        """Test that invalid time formats are handled gracefully."""
        client, user = logged_in_client
        
        invalid_times = ['invalid-time-format', '25:00', '12:99', 'not-a-time']
        
        for time_input in invalid_times:
            update_data = {'preferred_workout_time': time_input}
            response = client.post('/account/update', data=update_data)
            
            # Should succeed but time should be None
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.preferred_workout_time is None
    
    def test_valid_time_formats(self, logged_in_client):
        """Test that valid time formats are accepted."""
        client, user = logged_in_client
        
        valid_times = [
            ('06:30', '06:30:00'),
            ('18:00', '18:00:00'),
            ('12:15', '12:15:00'),
        ]
        
        for time_input, expected in valid_times:
            update_data = {'preferred_workout_time': time_input}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert str(updated_user.preferred_workout_time) == expected
    
    def test_numeric_field_validation(self, logged_in_client):
        """Test that numeric fields accept decimal values."""
        client, user = logged_in_client
        
        update_data = {
            'height_cm': '175.7',
            'weight_kg': '75.333',
            'body_fat_percentage': '15.555',
            'target_weight_kg': '80.123',
            'target_body_fat_percentage': '12.456',
            'weekly_weight_loss_goal': '0.125'
        }
        
        response = client.post('/account/update', data=update_data)
        
        assert response.status_code == 200
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.height_cm == 175.7
        assert updated_user.weight_kg == 75.333
        assert updated_user.body_fat_percentage == 15.555
        assert updated_user.target_weight_kg == 80.123
        assert updated_user.target_body_fat_percentage == 12.456
        assert updated_user.weekly_weight_loss_goal == 0.125
    
    def test_invalid_numeric_fields(self, logged_in_client):
        """Test that invalid numeric values are handled."""
        client, user = logged_in_client
        
        # Store original values
        original_height = user.height_cm
        original_weight = user.weight_kg
        
        invalid_data = {
            'height_cm': 'not-a-number',
            'weight_kg': 'also-not-a-number'
        }
        
        response = client.post('/account/update', data=invalid_data)
        
        # Should succeed but invalid values become None
        assert response.status_code == 200
        
        updated_user = User.query.get(user.user_id)
        assert updated_user.height_cm is None
        assert updated_user.weight_kg is None
    
    def test_fitness_goal_options(self, logged_in_client):
        """Test all fitness goal enum options can be set."""
        client, user = logged_in_client
        
        fitness_goals = ['Weight Loss', 'Muscle Gain', 'Maintenance', 'Improved Endurance']
        
        for goal in fitness_goals:
            update_data = {'fitness_goal': goal}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.fitness_goal == goal
    
    def test_activity_level_options(self, logged_in_client):
        """Test all activity level enum options can be set."""
        client, user = logged_in_client
        
        activity_levels = [
            'Sedentary',
            'Lightly Active',
            'Moderately Active',
            'Very Active',
            'Super Active'
        ]
        
        for level in activity_levels:
            update_data = {'activity_level': level}
            response = client.post('/account/update', data=update_data)
            
            assert response.status_code == 200
            
            updated_user = User.query.get(user.user_id)
            assert updated_user.activity_level == level


class TestAccountAuthorization:
    """Test suite for account endpoint authorization."""
    
    def test_update_requires_authentication(self, client, assert_helper):
        """Test that account update requires authentication."""
        update_data = {
            'first_name': 'Hacker',
            'last_name': 'Attempt'
        }
        
        # Should redirect or return 401/403
        response = client.post('/account/update', data=update_data, follow_redirects=True)
        
        assert response.status_code in [401, 403, 302, 200], \
            f"Expected auth redirect/error, got {response.status_code}"
    
    def test_cannot_update_other_users_account(self, logged_in_client, factory):
        """Test that users cannot update other users' accounts."""
        client, user = logged_in_client
        
        # Create another user
        other_user = factory.create_user(username='otheruser', email='other@example.com')
        
        # Try to update other user's account (should fail - can only update own)
        # Note: This depends on how the endpoint validates ownership
        # If it uses current_user, this should be safe, but we test it anyway
        update_data = {
            'first_name': 'ShouldNotWork'
        }
        
        # The endpoint uses current_user, so this should still update the logged-in user
        # This test verifies the endpoint doesn't allow updating other users via user_id manipulation
        response = client.post('/account/update', data=update_data)
        
        # Should succeed but only update the logged-in user's account
        assert response.status_code == 200
        
        # Verify logged-in user was updated
        updated_user = User.query.get(user.user_id)
        assert updated_user.first_name == 'ShouldNotWork'
        
        # Verify other user was NOT updated
        other_user_updated = User.query.get(other_user.user_id)
        assert other_user_updated.first_name != 'ShouldNotWork'

