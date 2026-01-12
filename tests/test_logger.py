import sys
import os
import logging
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

# Mock config before importing logger
sys.modules['config'] = MagicMock()

from app.core.logger import setup_logger


def test_logger_setup_creates_handlers():
    """Test that setup_logger creates both console and file handlers"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Mock the logs directory to use temp directory
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger = setup_logger('test_logger_handlers')

            # Should have 2 handlers: console and file
            assert len(logger.handlers) == 2

            # Check handler types
            handler_types = [type(h).__name__ for h in logger.handlers]
            assert 'StreamHandler' in handler_types
            assert 'RotatingFileHandler' in handler_types

            # Clean up handlers
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)


def test_logger_format_correct():
    """Test that logger format includes required fields"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger = setup_logger('test_logger_format')

            # Check that all handlers have formatters
            for handler in logger.handlers:
                assert handler.formatter is not None
                format_string = handler.formatter._fmt
                # Check required format fields
                assert '%(asctime)s' in format_string
                assert '%(name)s' in format_string
                assert '%(levelname)s' in format_string
                assert '%(message)s' in format_string

            # Clean up handlers
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)


def test_file_rotation_configured():
    """Test that file rotation is configured with correct parameters"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger = setup_logger('test_logger_rotation')

            # Find the RotatingFileHandler
            file_handler = None
            for handler in logger.handlers:
                if type(handler).__name__ == 'RotatingFileHandler':
                    file_handler = handler
                    break

            assert file_handler is not None, "RotatingFileHandler not found"

            # Check rotation settings: 10MB max size, 5 backup files
            assert file_handler.maxBytes == 10 * 1024 * 1024  # 10MB
            assert file_handler.backupCount == 5

            # Check that file handler is set to DEBUG level
            assert file_handler.level == logging.DEBUG

            # Clean up handlers
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)


def test_multiple_loggers_independent():
    """Test that multiple loggers are independent and don't interfere"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger1 = setup_logger('test_logger_1')
            logger2 = setup_logger('test_logger_2')

            # Loggers should have different names
            assert logger1.name == 'test_logger_1'
            assert logger2.name == 'test_logger_2'

            # Each logger should have its own handlers
            assert len(logger1.handlers) == 2
            assert len(logger2.handlers) == 2

            # Handlers should be different objects
            assert logger1.handlers[0] is not logger2.handlers[0]
            assert logger1.handlers[1] is not logger2.handlers[1]

            # Clean up handlers
            for logger in [logger1, logger2]:
                for handler in logger.handlers[:]:
                    handler.close()
                    logger.removeHandler(handler)


def test_console_handler_info_level():
    """Test that console handler is set to INFO level"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger = setup_logger('test_console_level')

            # Find the StreamHandler (console)
            console_handler = None
            for handler in logger.handlers:
                if type(handler).__name__ == 'StreamHandler':
                    console_handler = handler
                    break

            assert console_handler is not None, "StreamHandler not found"
            assert console_handler.level == logging.INFO

            # Clean up handlers
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)


def test_logger_logs_to_correct_file():
    """Test that logger writes to chirpsyncer.log"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch('app.core.logger.LOGS_DIR', Path(tmpdir)):
            logger = setup_logger('test_file_output')

            # Find the file handler and check its filename
            file_handler = None
            for handler in logger.handlers:
                if type(handler).__name__ == 'RotatingFileHandler':
                    file_handler = handler
                    break

            assert file_handler is not None
            # The baseFilename should end with chirpsyncer.log
            assert file_handler.baseFilename.endswith('chirpsyncer.log')

            # Clean up handlers
            for handler in logger.handlers[:]:
                handler.close()
                logger.removeHandler(handler)
