export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";
export const LAST_POST_CACHE_STORAGE_KEY = "iu_last-post-cache";
export const FEATURE_SETTINGS_STORAGE_KEY = "iu_feature-settings";

// Public app id IG web itself sends with web_profile_info requests.
export const IG_APP_ID = "936619743392459";

// Throttle window (ms) between consecutive last-post fetches in the queue.
export const LAST_POST_MIN_DELAY = 2000;
export const LAST_POST_MAX_DELAY = 4000;

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
