import instaloader
import time

# Configure your credentials (replace with your username and password)
USERNAME = 'username'
PASSWORD = 'passwd'

# Initialize Instaloader
L = instaloader.Instaloader()

# Log in to Instagram
L.login(USERNAME, PASSWORD)
time.sleep(10)

# Load your profile
profile = instaloader.Profile.from_username(L.context, USERNAME)
time.sleep(10)

# Get the list of followers and followees (people you follow)
followers = {follower.username for follower in profile.get_followers()}
time.sleep(10)
followees = {followee.username for followee in profile.get_followees()}
time.sleep(10)

# Users you follow but who don't follow you back
unfollowers = followees - followers
time.sleep(10)

print("Users who don't follow you back:")
for user in sorted(unfollowers):
    print(user)

# Close the Instaloader session