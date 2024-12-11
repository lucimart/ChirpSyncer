import os
import sqlite3

# Define the database file path
DB_PATH = os.path.join(os.getcwd(), "data.db")

def initialize_db(db_path=None):

    resolved_path = db_path or DB_PATH

    # Ensure the path is treated as a file, not a directory
    if os.path.exists(resolved_path) and os.path.isdir(resolved_path):
        raise ValueError(f"{resolved_path} exists and is a directory! Please remove it.")

    # Automatically create the database file if it doesn't exist
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Create required tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seen_tweets (
        id INTEGER PRIMARY KEY,
        tweet_id TEXT NOT NULL UNIQUE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS api_usage (
        id INTEGER PRIMARY KEY,
        remaining_reads INTEGER,
        reset_time INTEGER
    )
    """)
    conn.commit()
    conn.close()
def is_tweet_seen(tweet_id, conn=None):
    conn = conn or sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM seen_tweets WHERE tweet_id = ?", (tweet_id,))
    result = cursor.fetchone()
    return result is not None

def mark_tweet_as_seen(tweet_id, conn=None):
    conn = conn or sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO seen_tweets (tweet_id) VALUES (?)", (tweet_id,))
    conn.commit()

def store_api_rate_limit(remaining_reads, reset_time, conn=None):
    conn = conn or sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO api_usage (id, remaining_reads, reset_time)
    VALUES (1, ?, ?)
    """, (remaining_reads, reset_time))
    conn.commit()