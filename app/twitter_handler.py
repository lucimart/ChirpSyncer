import tweepy
from tweepy import OAuth1UserHandler
from db_handler import is_tweet_seen, mark_tweet_as_seen, store_api_rate_limit
from config import TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET

# Initialize Twitter API
auth = OAuth1UserHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)
twitter_api = tweepy.API(auth)


# Fetch recent tweets
def fetch_tweets():
    remaining_reads, reset_time = get_rate_limit_status()
    if remaining_reads <= 0:
        print(f"Rate limit reached. Reset time: {reset_time}")
        return []
    tweets = twitter_api.user_timeline(count=5, exclude_replies=True, include_rts=False)
    unseen_tweets = [tweet for tweet in tweets if not is_tweet_seen(tweet.id)]
    for tweet in unseen_tweets:
        mark_tweet_as_seen(tweet.id)
    return unseen_tweets

# Get Twitter API rate limit status
def get_rate_limit_status():
    rate_limit = twitter_api.rate_limit_status()
    remaining = rate_limit['resources']['statuses']['/statuses/user_timeline']['remaining']
    reset = rate_limit['resources']['statuses']['/statuses/user_timeline']['reset']
    store_api_rate_limit(remaining, reset)
    return remaining, reset
