# ChirpSyncer

**ChirpSyncer** is a cross-posting tool that bridges the gap between Twitter and Bluesky. It monitors your tweets and posts them on Bluesky, ensuring your audience stays up-to-date on both platforms.


## Features

- Automatically syncs tweets from Twitter to Bluesky.
- Avoids duplicate posting using an integrated SQLite database.
- Uses free Twitter scraping (no API rate limits or costs).
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
### 2. Twitter Credentials (twscrape)
ChirpSyncer now uses **twscrape** for Twitter scraping instead of the official Twitter API. This allows unlimited scraping without API rate limits.

You'll need the following credentials:
- Your Twitter username
- Your Twitter password
- Your Twitter email
- Your email password (for account verification)

**Important Security Notes:**
- Consider using a dedicated Twitter account for scraping
- Enable 2FA on your Twitter account for better security
- Never share or commit your credentials to version control

### 3. Bluesky API Credentials
You need to paste your username and password


### 4. Docker and Docker Compose
Ensure you have Docker and Docker Compose installed on your machine:

- **Docker**: Install from the [official Docker website](https://www.docker.com/).
- **Docker Compose**: Usually included with Docker Desktop. Verify installation by running: `docker-compose --version`


# Migration Guide: Twitter API to twscrape

If you're upgrading from the old Twitter API credentials to twscrape, follow this guide.

## Why Migrate?

The Twitter API has strict rate limits (100 requests/month on the free tier), which severely limits ChirpSyncer's functionality. By switching to twscrape, you get:
- Unlimited scraping (no API rate limits)
- No need for Twitter Developer account approval
- More reliable access to your tweets

## Migration Steps

### Step 1: Update Your .env File

Replace your old Twitter API credentials with the new twscrape credentials:

**OLD (deprecated):**
```bash
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-twitter-access-token
TWITTER_ACCESS_SECRET=your-twitter-access-secret
```

**NEW (required):**
```bash
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email@example.com
TWITTER_EMAIL_PASSWORD=your_email_password
```

### Step 2: Set Up twscrape Account (One-Time Setup)

After updating your credentials, you need to perform a one-time account setup:

1. Install twscrape in your environment:
   ```bash
   pip install twscrape
   ```

2. Add your Twitter account to twscrape:
   ```bash
   twscrape add_accounts accounts.txt your_username:your_password:your_email:your_email_password
   ```

3. Log in to your account (this may require 2FA verification):
   ```bash
   twscrape login_accounts
   ```

4. Verify your account is active:
   ```bash
   twscrape accounts
   ```

### Step 3: Test Your Setup

Verify that twscrape can access your Twitter account:
```bash
twscrape user_by_login your_username
```

If this command returns your Twitter profile information, your setup is complete!

### Step 4: Update Your Code (if applicable)

If you have custom code that uses the old Twitter API credentials, you'll need to update it to use the new twscrape library. The main application code has already been updated to support twscrape.

## Troubleshooting

### Account Login Issues
- Make sure 2FA is enabled on your Twitter account
- Check that your credentials are correct in the .env file
- Try logging in manually through twscrape: `twscrape login_accounts`

### Email Verification Required
- Some accounts may require email verification during setup
- Make sure your email password is correct in the .env file
- Check your email for verification codes during the login process

### Rate Limiting
- While twscrape has no official API limits, Twitter may still detect and limit scraping
- Consider using a dedicated Twitter account for scraping
- Add delays between requests if needed


# Installation

## 1. Clone the Repository
Clone this repository to your local machine:

```bash
   git clone https://github.com/lucimart/chirpsyncer.git
   cd chirpsyncer
```

## 2. Set Up Environment Variables
Create a `.env` file in the root directory by copying the example file:

 ```bash
    cp .env.example .env
 ```

Then edit the `.env` file and add your credentials:

 ```bash
    # Twitter credentials (for twscrape)
    TWITTER_USERNAME=your_twitter_username
    TWITTER_PASSWORD=your_twitter_password
    TWITTER_EMAIL=your_twitter_email@example.com
    TWITTER_EMAIL_PASSWORD=your_email_password

    # Bluesky credentials
    BSKY_USERNAME=your-username.bsky.social
    BSKY_PASSWORD=your-bluesky-app-password
 ```

**Note:** See the [Migration Guide](#migration-guide-twitter-api-to-twscrape) section above if you're upgrading from Twitter API credentials.
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

## Twitter Account Issues
Since ChirpSyncer uses web scraping via twscrape:
- If your Twitter account gets temporarily locked, you may need to verify it through Twitter's website
- Using a dedicated Twitter account for syncing is recommended
- Avoid running multiple instances with the same account simultaneously
- The scraping approach respects Twitter's natural rate limits


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
