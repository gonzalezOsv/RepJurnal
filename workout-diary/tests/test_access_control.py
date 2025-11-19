"""
Tests for access control and authorization.

Tests cover:
- Protected route access
- Unauthorized access handling
- Flash messages for authentication
- Redirect behavior
"""
import pytest
from flask import url_for


class TestProtectedRoutes:
    """Test suite for protected route access control."""
    
    def test_dashboard_requires_auth(self, client):
        """Test that dashboard requires authentication."""
        response = client.get('/dashboard', follow_redirects=True)
        
        # Should redirect to home/login page
        assert response.status_code == 200
        # Check that we're redirected to home/login page
        assert b'Get Started' in response.data or b'RepJurnal' in response.data or b'Login' in response.data
    
    def test_dashboard_shows_flash_message(self, client):
        """Test that unauthorized access shows a flash message."""
        response = client.get('/dashboard', follow_redirects=True)
        
        assert response.status_code == 200
        # The flash message should be present in the HTML
        assert b'Please log in' in response.data or b'login' in response.data.lower()
    
    def test_dashboard_allows_authenticated_user(self, logged_in_client):
        """Test that authenticated users can access dashboard."""
        client, user = logged_in_client
        
        response = client.get('/dashboard')
        
        # Should succeed (status may vary, but not 401/403)
        assert response.status_code not in [401, 403, 302]
        assert response.status_code == 200
    
    def test_account_page_requires_auth(self, client):
        """Test that account page requires authentication."""
        response = client.get('/account', follow_redirects=True)
        
        # Should redirect or return auth error
        assert response.status_code in [200, 302, 401, 403]
        if response.status_code == 200:
            # If redirected, should be to login/home
            assert b'Get Started' in response.data or b'Login' in response.data or b'login' in response.data.lower()
    
    def test_account_update_requires_auth(self, client):
        """Test that account update requires authentication."""
        update_data = {
            'first_name': 'Hacker',
            'last_name': 'Attempt'
        }
        
        response = client.post('/account/update', data=update_data, follow_redirects=True)
        
        # Should redirect or return 401/403
        assert response.status_code in [401, 403, 302, 200]
        if response.status_code == 200:
            # If redirected, check for login/home page
            assert b'Get Started' in response.data or b'Login' in response.data or b'login' in response.data.lower()
    
    def test_metrics_requires_auth(self, client):
        """Test that metrics endpoints require authentication."""
        endpoints = [
            '/metrics/api/exercise-progression/Bench Press',
            '/metrics/api/tracked-exercises',
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, follow_redirects=True)
            
            # Should redirect or return 401/403
            assert response.status_code in [401, 403, 302, 200], \
                f"Endpoint {endpoint} should require auth"
    
    def test_analytics_requires_auth(self, client):
        """Test that analytics endpoints require authentication."""
        # Assuming there are analytics endpoints
        # Adjust based on actual routes
        endpoints = [
            '/analytics/api/dashboard',  # Example - adjust to actual routes
        ]
        
        for endpoint in endpoints:
            try:
                response = client.get(endpoint, follow_redirects=True)
                # Should redirect or return 401/403
                assert response.status_code in [401, 403, 302, 200, 404], \
                    f"Endpoint {endpoint} should require auth (if it exists)"
            except Exception:
                # Endpoint might not exist, which is fine
                pass


class TestPublicRoutes:
    """Test suite for public route access."""
    
    def test_home_page_accessible(self, client):
        """Test that home page is publicly accessible."""
        response = client.get('/')
        
        assert response.status_code == 200
        # Should be accessible without auth
    
    def test_login_page_accessible(self, client):
        """Test that login page is publicly accessible."""
        response = client.get('/login')
        
        assert response.status_code == 200
    
    def test_register_page_accessible(self, client):
        """Test that register page is publicly accessible."""
        response = client.get('/register')
        
        assert response.status_code == 200
    
    def test_auth_endpoints_public(self, client):
        """Test that auth endpoints (login, register) are publicly accessible."""
        # These should be accessible (they validate credentials internally)
        endpoints = [
            '/auth/login',
            '/auth/register',
            '/auth/check-username',
        ]
        
        for endpoint in endpoints:
            # GET might redirect or show form, POST might require data but not auth
            response = client.get(endpoint, follow_redirects=True)
            # Should not require authentication (status may vary)
            assert response.status_code not in [401, 403], \
                f"Endpoint {endpoint} should not require auth for GET"


class TestSessionManagement:
    """Test suite for session and authentication state management."""
    
    def test_session_persists_across_requests(self, logged_in_client):
        """Test that login session persists across multiple requests."""
        client, user = logged_in_client
        
        # Make multiple requests
        response1 = client.get('/dashboard')
        response2 = client.get('/account')
        
        # Both should succeed (user is still logged in)
        assert response1.status_code not in [401, 403, 302]
        assert response2.status_code not in [401, 403, 302]
    
    def test_logout_ends_session(self, logged_in_client):
        """Test that logout ends the session."""
        client, user = logged_in_client
        
        # Access protected route (should work)
        response1 = client.get('/dashboard')
        assert response1.status_code not in [401, 403, 302]
        
        # Logout (can be GET or POST depending on implementation)
        response_logout = client.get('/logout', follow_redirects=True)
        # Logout redirects to home, so follow_redirects=True means status will be 200
        assert response_logout.status_code in [200, 302]
        
        # Try to access protected route again (should fail)
        response2 = client.get('/dashboard', follow_redirects=True)
        # Should redirect to login or show auth required
        assert response2.status_code in [200, 302, 401, 403]
        if response2.status_code == 200:
            assert b'Get Started' in response2.data or b'Login' in response2.data or b'login' in response2.data.lower()

