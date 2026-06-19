export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";

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

// ── Pending Requests feature ──────────────────────────────────────────────
export const IG_APP_ID = "936619743392459";
export const CANCEL_WHITELIST_STORAGE_KEY = "iucr_whitelist";
// Scan/cancel pacing (anti-ban). Reuses the search-cycle defaults above for the scan timings.
export const DEFAULT_TIME_BETWEEN_CANCELS = 5000;
export const DEFAULT_CANCELS_BEFORE_PAUSE = 5;
export const DEFAULT_TIME_TO_WAIT_AFTER_BURST = 60000;
export const RATE_LIMIT_COOLDOWN = 60000;
export const PROFILES_BEFORE_SCAN_PAUSE = 20;
export const SCAN_BATCH_SIZES: readonly number[] = [20, 50, 100];
// ETA estimates (ms per request) + minimums for the settings panel.
export const EST_SCAN_REQUEST_MS = 800;
export const EST_CANCEL_REQUEST_MS = 800;
export const MIN_SCAN_DELAY = 500;
export const MIN_SCAN_LONG_PAUSE = 4000;
export const MIN_TIME_BETWEEN_CANCELS = 1000;
export const MIN_BURST_PAUSE = 30000;
