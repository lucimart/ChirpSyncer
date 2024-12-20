from tweety import Twitter

from db_handler import is_tweet_seen, mark_tweet_as_seen, store_api_rate_limit
from config import TWITTER_USERNAME, TWITTER_PASSWORD

# Initialize Twitter API
app = Twitter("session")


def login():
    try:
        app.connect()
    except:
        app.sign_in(TWITTER_USERNAME, TWITTER_PASSWORD)

# Fetch recent tweets
def fetch_tweets():
    tweets = app.get_tweets(TWITTER_USERNAME, pages=1, replies=True)
    unseen_tweets = [tweet for tweet in tweets if not is_tweet_seen(tweet.id)]
    for tweet in unseen_tweets:
        mark_tweet_as_seen(tweet.id)
    return unseen_tweets
