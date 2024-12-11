import sqlite3
from app.db_handler import initialize_db, is_tweet_seen, mark_tweet_as_seen

def test_db_operations():
    # Use an in-memory SQLite database for testing
    conn = sqlite3.connect(":memory:")

    # Initialize the database
    initialize_db(conn=conn)

    # Perform some database operations to test functionality
    tweet_id = "12345"
    assert not is_tweet_seen(tweet_id, conn=conn)
    mark_tweet_as_seen(tweet_id, conn=conn)
    assert is_tweet_seen(tweet_id, conn=conn)

    # Close the connection after the test
    conn.close()
