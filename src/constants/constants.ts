export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";

// CANCEL PENDING REQUESTS
// App id required by Instagram's private web API endpoints used to resolve ids,
// check friendship state and cancel outgoing follow requests.
export const IG_APP_ID = "936619743392459";
// Delay between individual cancellations (jittered at runtime).
export const DEFAULT_TIME_BETWEEN_CANCELS = 5000;
// How many cancellations before taking a longer "burst" pause.
export const DEFAULT_CANCELS_BEFORE_PAUSE = 5;
// Length of the longer pause taken after each burst.
export const DEFAULT_TIME_TO_WAIT_AFTER_BURST = 60000;
// Pause applied when Instagram answers with HTTP 429 (rate limited).
export const RATE_LIMIT_COOLDOWN = 60000;
// During the scan, take a longer "temp block" pause after this many profiles.
export const PROFILES_BEFORE_SCAN_PAUSE = 20;
// Base length of that scan pause (a random 0–5s is added on top, like the original scan).
export const SCAN_PAUSE_BASE = 10000;
// Batch sizes offered for scanning in chunks (0 means "scan all remaining").
export const SCAN_BATCH_SIZES: readonly number[] = [20, 50, 100];
// Cancel-flow whitelist: usernames to protect (e.g. requests you still want accepted).
// Stored separately from the shared unfollowers whitelist so it works before profiles are resolved.
export const CANCEL_WHITELIST_STORAGE_KEY = "iucr_whitelist";
// Rough estimate of how long one account's API request(s) take — used to predict a stable,
// decreasing ETA from the start (network time the timings don't account for).
export const EST_SCAN_REQUEST_MS = 800;
export const EST_CANCEL_REQUEST_MS = 800;

//TIMINGS CONSTANTS
export const DEFAULT_TIME_BETWEEN_SEARCH_CYCLES = 1000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES = 10000;
export const DEFAULT_TIME_BETWEEN_UNFOLLOWS = 4000;
export const DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS = 300000;

// FILTER CONSTANTS
export const WITHOUT_PROFILE_PICTURE_URL_IDS = [
  "44884218_345707102882519_2446069589734326272_n",
  "464760996_1254146839119862_3605321457742435801_n",
];
