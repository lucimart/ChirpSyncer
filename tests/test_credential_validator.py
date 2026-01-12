"""
Tests for credential_validator module

Tests the validation of Twitter and Bluesky credentials against actual APIs.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.integrations.credential_validator import (
    validate_twitter_scraping,
    validate_twitter_api,
    validate_bluesky,
    validate_credentials
)


class TestTwitterScrapingValidation:
    """Tests for Twitter scraping credential validation"""

    def test_validate_twitter_scraping_valid_credentials(self):
        """Test validation with valid Twitter scraping credentials"""
        credentials = {
            'username': 'testuser',
            'password': 'password123',
            'email': 'test@example.com',
            'email_password': 'emailpass'
        }

        success, message = validate_twitter_scraping(credentials)
        assert success is True
        assert 'validated' in message.lower()

    def test_validate_twitter_scraping_missing_fields(self):
        """Test validation with missing required fields"""
        credentials = {
            'username': 'testuser',
            'password': 'password123'
            # Missing email and email_password
        }

        success, message = validate_twitter_scraping(credentials)
        assert success is False
        assert 'missing' in message.lower()
        assert 'email' in message.lower()

    def test_validate_twitter_scraping_empty_fields(self):
        """Test validation with empty required fields"""
        credentials = {
            'username': '',
            'password': 'password123',
            'email': 'test@example.com',
            'email_password': 'emailpass'
        }

        success, message = validate_twitter_scraping(credentials)
        assert success is False
        assert 'missing' in message.lower()


class TestTwitterAPIValidation:
    """Tests for Twitter API credential validation"""

    def test_validate_twitter_api_valid_credentials(self):
        """Test validation with valid Twitter API credentials"""
        credentials = {
            'api_key': 'test_api_key',
            'api_secret': 'test_api_secret',
            'access_token': 'test_access_token',
            'access_secret': 'test_access_secret'
        }

        success, message = validate_twitter_api(credentials)
        assert success is True
        assert 'validated' in message.lower()

    def test_validate_twitter_api_missing_fields(self):
        """Test validation with missing required fields"""
        credentials = {
            'api_key': 'test_api_key',
            'api_secret': 'test_api_secret'
            # Missing access_token and access_secret
        }

        success, message = validate_twitter_api(credentials)
        assert success is False
        assert 'missing' in message.lower()

    def test_validate_twitter_api_empty_values(self):
        """Test validation with empty credential values"""
        credentials = {
            'api_key': '',
            'api_secret': 'test_api_secret',
            'access_token': 'test_access_token',
            'access_secret': 'test_access_secret'
        }

        success, message = validate_twitter_api(credentials)
        assert success is False
        assert 'missing' in message.lower()


class TestBlueskyValidation:
    """Tests for Bluesky credential validation"""

    @patch('app.integrations.credential_validator.Client')
    def test_validate_bluesky_valid_credentials(self, mock_client_class):
        """Test validation with valid Bluesky credentials"""
        # Mock successful login
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        credentials = {
            'username': 'test.bsky.social',
            'password': 'app_password_123'
        }

        success, message = validate_bluesky(credentials)
        assert success is True
        assert 'validated successfully' in message.lower()
        mock_client.login.assert_called_once_with('test.bsky.social', 'app_password_123')

    @patch('app.integrations.credential_validator.Client')
    def test_validate_bluesky_invalid_credentials(self, mock_client_class):
        """Test validation with invalid Bluesky credentials"""
        # Mock failed login with authentication error
        mock_client = MagicMock()
        mock_client.login.side_effect = Exception("Invalid identifier or password")
        mock_client_class.return_value = mock_client

        credentials = {
            'username': 'test.bsky.social',
            'password': 'wrong_password'
        }

        success, message = validate_bluesky(credentials)
        assert success is False
        assert 'invalid' in message.lower()

    @patch('app.integrations.credential_validator.Client')
    def test_validate_bluesky_network_error(self, mock_client_class):
        """Test validation with network error"""
        # Mock network error
        mock_client = MagicMock()
        mock_client.login.side_effect = Exception("Network error: connection refused")
        mock_client_class.return_value = mock_client

        credentials = {
            'username': 'test.bsky.social',
            'password': 'app_password_123'
        }

        success, message = validate_bluesky(credentials)
        assert success is False
        assert 'network' in message.lower()

    def test_validate_bluesky_missing_username(self):
        """Test validation with missing username"""
        credentials = {
            'password': 'app_password_123'
        }

        success, message = validate_bluesky(credentials)
        assert success is False
        assert 'username' in message.lower()

    def test_validate_bluesky_missing_password(self):
        """Test validation with missing password"""
        credentials = {
            'username': 'test.bsky.social'
        }

        success, message = validate_bluesky(credentials)
        assert success is False
        assert 'password' in message.lower()


class TestUnifiedValidation:
    """Tests for unified validate_credentials function"""

    @patch('app.integrations.credential_validator.validate_twitter_scraping')
    def test_validate_credentials_twitter_scraping(self, mock_validate):
        """Test routing to Twitter scraping validator"""
        mock_validate.return_value = (True, "Success")

        credentials = {'username': 'test'}
        success, message = validate_credentials('twitter', 'scraping', credentials)

        assert success is True
        mock_validate.assert_called_once_with(credentials)

    @patch('app.integrations.credential_validator.validate_twitter_api')
    def test_validate_credentials_twitter_api(self, mock_validate):
        """Test routing to Twitter API validator"""
        mock_validate.return_value = (True, "Success")

        credentials = {'api_key': 'test'}
        success, message = validate_credentials('twitter', 'api', credentials)

        assert success is True
        mock_validate.assert_called_once_with(credentials)

    @patch('app.integrations.credential_validator.validate_bluesky')
    def test_validate_credentials_bluesky(self, mock_validate):
        """Test routing to Bluesky validator"""
        mock_validate.return_value = (True, "Success")

        credentials = {'username': 'test'}
        success, message = validate_credentials('bluesky', 'api', credentials)

        assert success is True
        mock_validate.assert_called_once_with(credentials)

    def test_validate_credentials_invalid_platform(self):
        """Test with invalid platform name"""
        with pytest.raises(ValueError, match="Invalid platform"):
            validate_credentials('invalid', 'api', {})

    def test_validate_credentials_invalid_credential_type_twitter(self):
        """Test with invalid credential type for Twitter"""
        with pytest.raises(ValueError, match="Invalid credential_type"):
            validate_credentials('twitter', 'invalid', {})

    def test_validate_credentials_invalid_credential_type_bluesky(self):
        """Test with invalid credential type for Bluesky"""
        with pytest.raises(ValueError, match="Invalid credential_type"):
            validate_credentials('bluesky', 'scraping', {})
