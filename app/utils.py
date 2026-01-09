import hashlib
import re


def compute_content_hash(text: str) -> str:
    """
    Compute SHA256 hash of normalized content.
    Normalization: lowercase, strip whitespace, remove URLs

    Args:
        text: The text content to hash

    Returns:
        SHA256 hash as hexadecimal string
    """
    # Normalize
    normalized = text.lower().strip()
    normalized = re.sub(r'https?://\S+', '', normalized)  # Remove URLs
    normalized = re.sub(r'\s+', ' ', normalized)  # Normalize whitespace

    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
