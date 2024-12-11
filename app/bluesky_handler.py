from atproto import Client
from config import BSKY_USERNAME, BSKY_PASSWORD

# Initialize Bluesky client
bsky_client = Client()

# Function to login (explicitly called when needed)
def login_to_bluesky():
    bsky_client.login(BSKY_USERNAME, BSKY_PASSWORD)

# Post to Bluesky
def post_to_bluesky(content):
    try:
        bsky_client.post(content)
        print(f"Posted to Bluesky: {content}")
    except Exception as e:
        print(f"Error posting to Bluesky: {e}")
