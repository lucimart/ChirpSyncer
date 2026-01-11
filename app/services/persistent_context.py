"""
Persistent Context System

Provides persistent state management across agent conversations,
long-running tasks, and multi-step workflows with checkpoint support.
"""
import json
import os
import sqlite3
import time
from typing import Any, Dict, Optional
from pathlib import Path


class PersistentContext:
    """
    Persistent context store with file and database backends.
    
    Maintains state across sessions with checkpoint/restore capabilities.
    """
    
    def __init__(self, context_id: str, backend: str = 'file', db_path: str = 'chirpsyncer.db'):
        """
        Initialize persistent context.
        
        Args:
            context_id: Unique identifier for this context
            backend: 'file', 'database', or 'hybrid'
            db_path: Path to SQLite database (for database backend)
        """
        self.context_id = context_id
        self.backend = backend
        self.db_path = db_path
        self._state = {}
        self._checkpoints = {}
        
        if backend in ['file', 'hybrid']:
            self.context_dir = Path.home() / '.chirpsyncer' / 'context'
            self.context_dir.mkdir(parents=True, exist_ok=True)
            self.file_path = self.context_dir / f'{context_id}.json'
        
        if backend in ['database', 'hybrid']:
            self._init_db()
        
        # Load existing state
        self.load()
    
    def _init_db(self):
        """Initialize database table for context storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS context_store (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                context_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(context_id, key)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS context_checkpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                context_id TEXT NOT NULL,
                label TEXT NOT NULL,
                state_snapshot TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE(context_id, label)
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_context_id ON context_store(context_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_checkpoint_id ON context_checkpoints(context_id)')
        
        conn.commit()
        conn.close()
    
    def save_state(self, key: str, value: Any):
        """
        Save state with key.
        
        Args:
            key: State key
            value: State value (must be JSON serializable)
        """
        self._state[key] = value
        self.persist()
    
    def load_state(self, key: str, default: Any = None) -> Any:
        """
        Load state by key.
        
        Args:
            key: State key
            default: Default value if key not found
            
        Returns:
            State value or default
        """
        return self._state.get(key, default)
    
    def get_all_state(self) -> Dict:
        """Get all state as dictionary"""
        return self._state.copy()
    
    def clear_state(self, key: Optional[str] = None):
        """
        Clear state.
        
        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            self._state.pop(key, None)
        else:
            self._state.clear()
        self.persist()
    
    def checkpoint(self, label: str):
        """
        Create named checkpoint of current state.
        
        Args:
            label: Checkpoint label
        """
        self._checkpoints[label] = self._state.copy()
        
        if self.backend in ['database', 'hybrid']:
            self._save_checkpoint_db(label)
    
    def restore_checkpoint(self, label: str) -> bool:
        """
        Restore from checkpoint.
        
        Args:
            label: Checkpoint label
            
        Returns:
            True if restored, False if checkpoint not found
        """
        if label in self._checkpoints:
            self._state = self._checkpoints[label].copy()
            self.persist()
            return True
        
        if self.backend in ['database', 'hybrid']:
            return self._load_checkpoint_db(label)
        
        return False
    
    def list_checkpoints(self) -> list:
        """List all checkpoint labels"""
        checkpoints = list(self._checkpoints.keys())
        
        if self.backend in ['database', 'hybrid']:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'SELECT label, created_at FROM context_checkpoints WHERE context_id = ? ORDER BY created_at DESC',
                (self.context_id,)
            )
            rows = cursor.fetchall()
            conn.close()
            
            for label, created_at in rows:
                if label not in checkpoints:
                    checkpoints.append(label)
        
        return checkpoints
    
    def persist(self):
        """Persist current state to backend"""
        if self.backend in ['file', 'hybrid']:
            self._save_file()
        
        if self.backend in ['database', 'hybrid']:
            self._save_db()
    
    def load(self):
        """Load state from backend"""
        if self.backend in ['file', 'hybrid'] and self.file_path.exists():
            self._load_file()
        
        if self.backend in ['database', 'hybrid']:
            self._load_db()
    
    def _save_file(self):
        """Save state to JSON file"""
        data = {
            'context_id': self.context_id,
            'state': self._state,
            'checkpoints': self._checkpoints,
            'updated_at': int(time.time())
        }
        
        with open(self.file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load_file(self):
        """Load state from JSON file"""
        try:
            with open(self.file_path, 'r') as f:
                data = json.load(f)
            
            self._state = data.get('state', {})
            self._checkpoints = data.get('checkpoints', {})
        except Exception as e:
            print(f"Warning: Failed to load context from file: {e}")
    
    def _save_db(self):
        """Save state to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = int(time.time())
        
        for key, value in self._state.items():
            value_json = json.dumps(value)
            
            cursor.execute('''
                INSERT OR REPLACE INTO context_store (context_id, key, value, created_at, updated_at)
                VALUES (?, ?, ?, 
                    COALESCE((SELECT created_at FROM context_store WHERE context_id = ? AND key = ?), ?),
                    ?)
            ''', (self.context_id, key, value_json, self.context_id, key, now, now))
        
        conn.commit()
        conn.close()
    
    def _load_db(self):
        """Load state from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT key, value FROM context_store WHERE context_id = ?',
            (self.context_id,)
        )
        
        for key, value_json in cursor.fetchall():
            try:
                self._state[key] = json.loads(value_json)
            except:
                self._state[key] = value_json
        
        conn.close()
    
    def _save_checkpoint_db(self, label: str):
        """Save checkpoint to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        state_json = json.dumps(self._checkpoints[label])
        now = int(time.time())
        
        cursor.execute('''
            INSERT OR REPLACE INTO context_checkpoints (context_id, label, state_snapshot, created_at)
            VALUES (?, ?, ?, ?)
        ''', (self.context_id, label, state_json, now))
        
        conn.commit()
        conn.close()
    
    def _load_checkpoint_db(self, label: str) -> bool:
        """Load checkpoint from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT state_snapshot FROM context_checkpoints WHERE context_id = ? AND label = ?',
            (self.context_id, label)
        )
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            try:
                self._state = json.loads(row[0])
                self.persist()
                return True
            except:
                return False
        
        return False


# Global context instance for Sprint 7
sprint7_context = PersistentContext('sprint7', backend='hybrid')
