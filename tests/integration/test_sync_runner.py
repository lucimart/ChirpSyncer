import os
from unittest.mock import MagicMock, patch

import pytest

from app.auth.credential_manager import CredentialManager
from app.services.sync_runner import sync_twitter_to_bluesky, sync_bluesky_to_twitter


@pytest.fixture(scope="function")
def master_key_hex():
    return "01" * 32


def _set_master_key(master_key_hex):
    os.environ["MASTER_KEY"] = master_key_hex


def _clear_master_key():
    os.environ.pop("MASTER_KEY", None)


def test_sync_twitter_to_bluesky_happy_path(
    test_db, test_db_path, test_user, master_key_hex
):
    _set_master_key(master_key_hex)
    manager = CredentialManager(bytes.fromhex(master_key_hex), test_db_path)
    manager.init_db()
    manager.save_credentials(
        test_user["id"],
        "twitter",
        "scraping",
        {
            "username": "testuser",
            "password": "pw",
            "email": "test@example.com",
            "email_password": "pw",
        },
    )
    manager.save_credentials(
        test_user["id"],
        "bluesky",
        "api",
        {"username": "test.bsky.social", "password": "app-pass"},
    )

    tweet = MagicMock()
    tweet.id = "1001"
    tweet.text = "Hello world"
    tweet._tweet = MagicMock()

    with (
        patch(
            "app.services.sync_runner.twitter_scraper.fetch_tweets",
            return_value=[tweet],
        ),
        patch("app.services.sync_runner.twitter_scraper.is_thread", return_value=False),
        patch("app.services.sync_runner.login_to_bluesky"),
        patch("app.services.sync_runner.post_to_bluesky", return_value="at://post/1"),
    ):
        synced = sync_twitter_to_bluesky(test_user["id"], test_db_path)

    cursor = test_db.cursor()
    cursor.execute("SELECT COUNT(*) FROM synced_posts")
    count = cursor.fetchone()[0]
    assert synced == 1
    assert count == 1
    _clear_master_key()


def test_sync_bluesky_to_twitter_happy_path(
    test_db, test_db_path, test_user, master_key_hex
):
    _set_master_key(master_key_hex)
    manager = CredentialManager(bytes.fromhex(master_key_hex), test_db_path)
    manager.init_db()
    manager.save_credentials(
        test_user["id"],
        "twitter",
        "api",
        {
            "api_key": "key",
            "api_secret": "secret",
            "access_token": "token",
            "access_secret": "token_secret",
        },
    )
    manager.save_credentials(
        test_user["id"],
        "bluesky",
        "api",
        {"username": "test.bsky.social", "password": "app-pass"},
    )

    post = MagicMock()
    post.uri = "at://post/42"
    post.text = "From bluesky"

    with (
        patch("app.services.sync_runner.fetch_posts_from_bluesky", return_value=[post]),
        patch("app.services.sync_runner.login_to_bluesky"),
        patch(
            "app.services.sync_runner.post_tweet_with_credentials", return_value="555"
        ),
    ):
        synced = sync_bluesky_to_twitter(test_user["id"], test_db_path)

    cursor = test_db.cursor()
    cursor.execute("SELECT COUNT(*) FROM synced_posts")
    count = cursor.fetchone()[0]
    assert synced == 1
    assert count == 1
    _clear_master_key()
