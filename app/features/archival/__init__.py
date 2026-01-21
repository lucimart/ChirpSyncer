"""
Archival feature for managing old posts.

Provides functionality to archive posts older than a retention period
to cold storage (JSON files) and restore them when needed.
"""

from app.features.archival.manager import ArchivalManager

__all__ = ["ArchivalManager"]
