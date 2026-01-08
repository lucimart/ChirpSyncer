import sqlite3
import os
import tempfile
from app.db_handler import initialize_db, is_tweet_seen, mark_tweet_as_seen

def test_db_operations():
    # Use a temporary file for testing (in-memory doesn't work with separate connections)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Initialize the database
        initialize_db(db_path=db_path)

        # Create connection for testing
        conn = sqlite3.connect(db_path)

        # Perform some database operations to test functionality
        tweet_id = "12345"
        assert not is_tweet_seen(tweet_id, conn=conn)
        mark_tweet_as_seen(tweet_id, conn=conn)
        assert is_tweet_seen(tweet_id, conn=conn)

        # Close the connection after the test
        conn.close()
    finally:
        # Clean up the temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)
