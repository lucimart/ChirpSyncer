"""
OAuth Providers Configuration - SSO Authentication

Configures OAuth 2.0 providers (Google, GitHub, Twitter/X) for SSO authentication.
Uses Authlib for OAuth flow management.
"""

import os
from typing import Optional
from dataclasses import dataclass


@dataclass
class OAuthProviderConfig:
    """OAuth provider configuration."""

    client_id: Optional[str]
    client_secret: Optional[str]
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str
    # Additional fields for provider-specific behavior
    emails_url: Optional[str] = None  # GitHub requires separate call for emails


# Provider configurations
# Note: token_url values are public OAuth endpoint URLs, not secrets
OAUTH_PROVIDERS: dict[str, OAuthProviderConfig] = {
    "google": OAuthProviderConfig(  # nosec B106 - token_url is a public OAuth endpoint URL
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
        scope="openid email profile",
    ),
    "github": OAuthProviderConfig(  # nosec B106 - token_url is a public OAuth endpoint URL
        client_id=os.getenv("GITHUB_CLIENT_ID"),
        client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
        authorize_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        userinfo_url="https://api.github.com/user",
        scope="read:user user:email",
        emails_url="https://api.github.com/user/emails",
    ),
    "twitter": OAuthProviderConfig(  # nosec B106 - token_url is a public OAuth endpoint URL
        client_id=os.getenv("TWITTER_CLIENT_ID"),
        client_secret=os.getenv("TWITTER_CLIENT_SECRET"),
        authorize_url="https://twitter.com/i/oauth2/authorize",
        token_url="https://api.twitter.com/2/oauth2/token",
        userinfo_url="https://api.twitter.com/2/users/me",
        scope="tweet.read users.read offline.access",
    ),
}


def get_provider_config(provider: str) -> Optional[OAuthProviderConfig]:
    """
    Get OAuth provider configuration.

    Args:
        provider: Provider name ('google', 'github', 'twitter')

    Returns:
        OAuthProviderConfig or None if provider not found
    """
    return OAUTH_PROVIDERS.get(provider)


def is_provider_configured(provider: str) -> bool:
    """
    Check if OAuth provider is properly configured with credentials.

    Args:
        provider: Provider name

    Returns:
        True if provider has client_id and client_secret set
    """
    config = get_provider_config(provider)
    if not config:
        return False
    return bool(config.client_id and config.client_secret)


def get_configured_providers() -> list[str]:
    """
    Get list of properly configured OAuth providers.

    Returns:
        List of provider names that have credentials configured
    """
    return [p for p in OAUTH_PROVIDERS.keys() if is_provider_configured(p)]


# OAuth redirect base URL (for callback URLs)
OAUTH_REDIRECT_BASE = os.getenv("OAUTH_REDIRECT_BASE", "http://localhost:5000")
