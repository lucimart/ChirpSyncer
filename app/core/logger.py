import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Define logs directory
LOGS_DIR = Path(__file__).parent.parent / 'logs'


def setup_logger(name):
    """
    Setup logger with rotation and formatting.

    Args:
        name: Logger name (typically __name__ from the calling module)

    Returns:
        logging.Logger: Configured logger instance

    Configuration:
        - Format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        - Console handler: INFO level
        - File handler: DEBUG level, rotate at 10MB, keep 5 backups
        - File location: logs/chirpsyncer.log
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # Set to DEBUG to capture all levels

    # Prevent adding duplicate handlers if logger already exists
    if logger.handlers:
        return logger

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Console handler (INFO level)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Create logs directory if it doesn't exist
    LOGS_DIR.mkdir(exist_ok=True)

    # File handler with rotation (DEBUG level)
    log_file = LOGS_DIR / 'chirpsyncer.log'
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


# Alias for backwards compatibility
get_logger = setup_logger
