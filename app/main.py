import time
from twitter_handler import fetch_tweets
from bluesky_handler import post_to_bluesky, login_to_bluesky
from config import POLL_INTERVAL
from db_handler import initialize_db
from validation import validate_credentials

def main():
    validate_credentials()
    initialize_db()
    login_to_bluesky()
    while True:
        print("Polling for new tweets...")
        tweets = fetch_tweets()
        for tweet in tweets:
            post_to_bluesky(tweet.text)
        print(f"Sleeping for {POLL_INTERVAL / 3600:.1f} hours...")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
