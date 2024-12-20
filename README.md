# ChirpSyncer

**ChirpSyncer** is a cross-posting tool that bridges the gap between Twitter and Bluesky. It monitors your tweets and posts them on Bluesky, ensuring your audience stays up-to-date on both platforms.


## Features

- Automatically syncs tweets from Twitter to Bluesky.
- Avoids duplicate posting using an integrated SQLite database.
- Efficiently adheres to Twitter’s API rate limits (100 reads per month).
- Designed for easy deployment using Docker and Docker Compose.


## Prerequisites

### 0. Make
If you are using MacOS or Linux, you already have it by default and can jump to the next step.
If you are using windows:
1. Install [Chocolatey](https://docs.chocolatey.org/en-us/choco/setup/#installing-chocolatey-cli) (if not already installed).
2. Install make:
```bash
choco install make
```

### 1. Python and pyenv
Ensure you have Python (3.10.x) installed. Using **pyenv** is recommended to manage the Python version and virtual environments.

1. Install pyenv:
   Follow the instructions at [pyenv installation guide](https://github.com/pyenv/pyenv).
   Alternatively, if you are on windows use the [pyenv-win installation guide](https://github.com/pyenv-win/pyenv-win?tab=readme-ov-file#quick-start)

2. Install the required Python version:
```bash
   make pyenv-setup
```
### 2. Twitter API Credentials
To use ChirpSyncer, you'll need access to the Twitter API. Follow these steps:

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/).
2. Log in and create a developer account if you don’t have one.
3. Create a new project and app:
   - Navigate to **Projects & Apps > Overview**.
   - Click **Create App** and follow the prompts.
4. Once the app is created, go to **Keys and Tokens** to retrieve:
   - `API Key`
   - `API Key Secret`
   - `Access Token`
   - `Access Token Secret`

### 3. Bluesky API Credentials
You need to paste your username and password


### 4. Docker and Docker Compose
Ensure you have Docker and Docker Compose installed on your machine:

- **Docker**: Install from the [official Docker website](https://www.docker.com/).
- **Docker Compose**: Usually included with Docker Desktop. Verify installation by running: `docker-compose --version`


# Installation

## 1. Clone the Repository
Clone this repository to your local machine:

```bash
   git clone https://github.com/lucimart/chirpsyncer.git
   cd chirpsyncer
```

## 2. Set Up Environment Variables
Create a `.env` file in the root directory and add your API credentials:

 ```bash
    TWITTER_USERNAME=your-twitter-username
    TWITTER_PASSWORD=your-twitter-password
    BSKY_USERNAME=your-bluesky-username
    BSKY_PASSWORD=your-bluesky-app-password
 ```
## 3. Install dependencies
For production dependencies:
```bash
   make install
```

For development dependencies:
```bash
   make install-dev
```

## 4. Build the Docker Containers
Run the following commands to build the service:

 ```bash
    make docker-build
 ```



# Usage

## Start
Run the following commands to start the service:

 ```bash
    make docker-up
 ```


## Monitor Logs
To ensure the bot is running correctly, monitor the logs:

 ```bash
   make logs
 ```

## Stop the Application
To stop the containers, run:

 ```bash
   make docker-down
 ```

## Rebuild After Changes
If you make changes to the code, rebuild the containers:

 ```bash
   make rebuild
 ```


# Troubleshooting

## Database Issues
If the database (`data.db`) gets corrupted or you want to reset it, delete the file:

 ```bash
   make db-reset
 ```

Restart the containers to regenerate it.

## API Limits
If you exceed Twitter’s rate limit, the bot will pause until the limit resets. You can check the reset time in the logs.


# For Developers / Contributors
1. Clone the Repository:
```bash    
   git clone https://github.com/lucimart/chirpsyncer.git
   cd chirpsyncer
```

2. Set Up Environment Variables:
   Follow the instructions in the **Installation** section to create a `.env` file.
3. Set Up the Python Environment: If you are using `pyenv`:
```bash
   make pyenv-setup
```

4. Install Development Dependencies:
    This installs all production dependencies as well as additional tools for development, testing, and linting:

```bash
   make install-dev
   pre-commit install
```

5. Set Up Pre-Commit Hooks
   Install and set up the pre-commit hooks:
```bash
   make pre-commit-setup
```

   To manually run pre-commit hooks on all files:
```bash
   make pre-commit-run
```

6. Run Tests:
```bash
   make test
```

7. Lint and Format Code: Ensure code style consistency:
```bash
   make lint
```


## Continuous Integration with GitHub Actions

Every time you push code or open a pull request, the CI pipeline will:
1. Set up Python in a virtual environment.
2. Install dependencies.
3. Run the test suite using `pytest`.


# License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
