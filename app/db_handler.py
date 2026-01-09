import os
import sqlite3
from app.utils import compute_content_hash

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


# BIDIR-003: Database Schema Migration Functions

def migrate_database(db_path=None):
    """
    Migrate from seen_tweets to synced_posts schema.

    Creates new synced_posts table with full metadata tracking for bidirectional sync.
    Handles migration gracefully - doesn't fail if old table doesn't exist.

    Args:
        db_path: Path to database file (defaults to DB_PATH)
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Check if old table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='seen_tweets'")
    old_table_exists = cursor.fetchone() is not None

    # Create new synced_posts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS synced_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        -- Identifiers
        twitter_id TEXT,
        bluesky_uri TEXT,

        -- Metadata of origin
        source TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,

        -- Sync metadata
        synced_to TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Original content
        original_text TEXT NOT NULL,

        -- Constraints
        CHECK (source IN ('twitter', 'bluesky')),
        CHECK (synced_to IN ('bluesky', 'twitter', 'both'))
    )
    """)

    # Create indexes for fast queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON synced_posts(source)")

    conn.commit()
    conn.close()


def should_sync_post(content: str, source: str, post_id: str, db_path=None) -> bool:
    """
    Check if post should be synced (not a duplicate).

    Args:
        content: Post text content
        source: 'twitter' or 'bluesky'
        post_id: Platform-specific ID (tweet_id or bluesky_uri)
        db_path: Path to database file (defaults to DB_PATH)

    Returns:
        True if should sync, False if duplicate detected
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Compute content hash
    content_hash = compute_content_hash(content)

    # Check for duplicate hash (same content already synced)
    cursor.execute("SELECT 1 FROM synced_posts WHERE content_hash = ?", (content_hash,))
    if cursor.fetchone():
        conn.close()
        return False

    # Check for duplicate ID based on source
    if source == 'twitter':
        cursor.execute("SELECT 1 FROM synced_posts WHERE twitter_id = ?", (post_id,))
    else:  # bluesky
        cursor.execute("SELECT 1 FROM synced_posts WHERE bluesky_uri = ?", (post_id,))

    if cursor.fetchone():
        conn.close()
        return False

    conn.close()
    return True


def save_synced_post(twitter_id=None, bluesky_uri=None, source=None,
                     synced_to=None, content=None, db_path=None):
    """
    Save synced post to database with metadata.

    Args:
        twitter_id: Twitter tweet ID (optional)
        bluesky_uri: Bluesky post URI (optional)
        source: 'twitter' or 'bluesky'
        synced_to: 'bluesky', 'twitter', or 'both'
        content: Original post text content
        db_path: Path to database file (defaults to DB_PATH)
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Compute content hash
    content_hash = compute_content_hash(content)

    # Insert into synced_posts
    cursor.execute("""
    INSERT INTO synced_posts (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (twitter_id, bluesky_uri, source, content_hash, synced_to, content))

    conn.commit()
    conn.close()


def get_post_by_hash(content_hash: str, db_path=None):
    """
    Get post by content hash.

    Args:
        content_hash: SHA256 hash of content
        db_path: Path to database file (defaults to DB_PATH)

    Returns:
        Tuple of post data or None if not found
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM synced_posts WHERE content_hash = ?", (content_hash,))
    result = cursor.fetchone()

    conn.close()
    return result


# THREAD-BIDIR-003: Database Schema for Threads

def migrate_database_v2(db_path=None):
    """
    Migración v2: Agregar soporte para threads.

    Cambios:
    - Agregar columna thread_id (nullable)
    - Agregar columna thread_position (nullable, 0-indexed)
    - Crear índice en thread_id

    thread_id format: "{platform}_{original_post_id}"
    Ejemplo: "twitter_12345" para thread iniciado en Twitter

    thread_position:
    - 0: Primer post del thread
    - 1: Segundo post
    - N: N-ésimo post

    Args:
        db_path: Path to database file (defaults to DB_PATH)
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(synced_posts)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]

    # Add thread_id column if not exists
    if 'thread_id' not in column_names:
        cursor.execute("ALTER TABLE synced_posts ADD COLUMN thread_id TEXT")

    # Add thread_position column if not exists
    if 'thread_position' not in column_names:
        cursor.execute("ALTER TABLE synced_posts ADD COLUMN thread_position INTEGER")

    # Create index on thread_id
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_thread_id ON synced_posts(thread_id)")

    conn.commit()
    conn.close()


def save_synced_thread(posts: list, source: str, synced_to: str,
                       thread_id: str, db_path=None):
    """
    Guarda un thread completo con metadatos.

    Args:
        posts: Lista de dicts con {twitter_id, bluesky_uri, content}
        source: 'twitter' o 'bluesky'
        synced_to: 'twitter' o 'bluesky'
        thread_id: ID único del thread

    Ejemplo:
        posts = [
            {'twitter_id': 'tw1', 'bluesky_uri': 'bs1', 'content': 'First'},
            {'twitter_id': 'tw2', 'bluesky_uri': 'bs2', 'content': 'Second'}
        ]
        save_synced_thread(posts, 'twitter', 'bluesky', 'twitter_tw1')
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    # Save each post with thread metadata
    for position, post in enumerate(posts):
        content_hash = compute_content_hash(post['content'])

        cursor.execute("""
        INSERT INTO synced_posts
        (twitter_id, bluesky_uri, source, content_hash, synced_to, original_text, thread_id, thread_position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            post.get('twitter_id'),
            post.get('bluesky_uri'),
            source,
            content_hash,
            synced_to,
            post['content'],
            thread_id,
            position  # 0-indexed position
        ))

    conn.commit()
    conn.close()


def is_thread_synced(thread_id: str, db_path=None) -> bool:
    """
    Verifica si un thread ya fue sincronizado.

    Args:
        thread_id: ID único del thread
        db_path: Path to database file (defaults to DB_PATH)

    Returns:
        bool: True si el thread_id existe en la base de datos
    """
    resolved_path = db_path or DB_PATH
    conn = sqlite3.connect(resolved_path)
    cursor = conn.cursor()

    cursor.execute("SELECT 1 FROM synced_posts WHERE thread_id = ? LIMIT 1", (thread_id,))
    result = cursor.fetchone()

    conn.close()
    return result is not None