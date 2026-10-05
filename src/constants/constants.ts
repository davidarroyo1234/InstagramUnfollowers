export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;

// The app id Instagram's own web frontend sends on its private REST API
// calls (e.g. /api/v1/friendships/<id>/following/). Required or these
// endpoints behave inconsistently; it is not a secret, just an identifier
// for "the instagram.com web client" and is safe to keep public.
export const INSTAGRAM_WEB_APP_ID = "936619743392459";
export const INSTAGRAM_ASBD_ID = "129477";

// Page-count safety cap for loading the viewer's own following list
// (see utils/utils.ts and main.tsx).
export const FOLLOWING_PAGE_SAFETY_LIMIT = 250;
// To decide whether an account follows the viewer we only read the first page
// of *its* following list: Instagram lists the viewer first when they're
// followed by that account.
export const FOLLOW_CHECK_PAGE_SIZE = 12;
// A long safety sleep is taken once every this many scan requests.
export const CHECKS_BEFORE_LONG_SLEEP = 15;
export const RATE_LIMIT_COOLDOWN_SECONDS = 30;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";
export const LAST_SCAN_RESULTS_STORAGE_KEY = "iu_last-scan-results";
export const LAST_SCAN_TIMESTAMP_STORAGE_KEY = "iu_last-scan-time";

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
