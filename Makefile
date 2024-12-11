# Variables
PYTHON_VERSION := 3.10.8
VENV_NAME := chirpsyncer-env
PYTHON := $(if $(findstring Windows_NT, $(OS)), .\$(VENV_NAME)\Scripts\python, ./$(VENV_NAME)/bin/python)
PIP := $(PYTHON) -m pip

# Targets
.PHONY: help install install-dev lint test run clean docker-build docker-up docker-down pyenv-setup pre-commit-setup logs rebuild db-reset pre-commit-run

help:
	@echo "Usage: make [target]"
	@echo "Targets:"
	@echo "  pyenv-setup       Set up pyenv and virtual environment"
	@echo "  install           Install production dependencies"
	@echo "  install-dev       Install development dependencies"
	@echo "  lint              Run linters and formatters (black, flake8)"
	@echo "  test              Run tests using pytest"
	@echo "  run               Run the application locally"
	@echo "  clean             Remove temporary files and cache"
	@echo "  docker-build      Build Docker images"
	@echo "  docker-up         Start the Docker containers"
	@echo "  docker-down       Stop and remove the Docker containers"
	@echo "  rebuild           Rebuild and restart Docker containers"
	@echo "  logs              View real-time Docker container logs"
	@echo "  db-reset          Reset the SQLite database"
	@echo "  pre-commit-setup  Install and set up pre-commit hooks"
	@echo "  pre-commit-run    Manually run pre-commit hooks on all files"

pyenv-setup:
	@echo "Setting up Python environment with pyenv..."
	pyenv install -s $(PYTHON_VERSION)
	pyenv global $(PYTHON_VERSION)
	python -m venv $(VENV_NAME)
	$(if $(findstring Windows_NT, $(OS)), \
		.\$(VENV_NAME)\Scripts\python -m pip install --upgrade pip, \
		./$(VENV_NAME)/bin/python -m pip install --upgrade pip)


install:
	$(PIP) install -r requirements.txt

install-dev:
	$(PIP) install -r requirements-dev.txt

pre-commit-setup:
	@echo "Installing pre-commit and setting up hooks..."
	$(PIP) install pre-commit
	pre-commit install
	@echo "Pre-commit hooks installed successfully."

pre-commit-run:
	@echo "Running pre-commit hooks on all files..."
	pre-commit run --all-files

lint:
	black app tests
	flake8 app tests

test:
	pytest

run:
	$(PYTHON) app/main.py

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

rebuild:
	docker-compose up --build -d

logs:
	docker-compose logs -f chirp-syncer

db-reset:
	@echo "Resetting the SQLite database..."
	rm -f data.db
	@echo "Database reset successfully."
