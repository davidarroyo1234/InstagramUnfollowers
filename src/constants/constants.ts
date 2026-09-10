export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;

// The app id Instagram's own web frontend sends on its private REST API
// calls (e.g. /api/v1/friendships/<id>/following/). Required or these
// endpoints behave inconsistently; it is not a secret, just an identifier
// for "the instagram.com web client" and is safe to keep public.
export const INSTAGRAM_WEB_APP_ID = "936619743392459";

// Page-count safety caps for the following/followers scan (see
// utils/utils.ts fetchAllFriendships and main.tsx). Instagram serves the
// followers list back in small, server-controlled chunks (observed ~15-25
// users/page, ignoring the `count` we request) rather than the larger
// chunks it gives for the following list, so followers needs a much higher
// cap to be able to finish a full scan.
export const FOLLOWING_PAGE_SAFETY_LIMIT = 60;
export const FOLLOWERS_PAGE_SAFETY_LIMIT = 250;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";

//TIMINGS CONSTANTS
export const DEFAULT_TIME_BETWEEN_SEARCH_CYCLES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES = 10000;
export const DEFAULT_TIME_BETWEEN_UNFOLLOWS = 4000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS = 300000;
export const DEFAULT_USERS_PER_SEARCH_CYCLE = 50;

// FILTER CONSTANTS
export const WITHOUT_PROFILE_PICTURE_URL_IDS = [
  "44884218_345707102882519_2446069589734326272_n",
  "464760996_1254146839119862_3605321457742435801_n",
];
