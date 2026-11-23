export const INSTAGRAM_HOSTNAME = "www.instagram.com";
export const UNFOLLOWERS_PER_PAGE = 50;

// The app id Instagram's own web frontend sends on its private REST API
// calls (e.g. /api/v1/friendships/<id>/following/). Required or these
// endpoints behave inconsistently; it is not a secret, just an identifier
// for "the instagram.com web client" and is safe to keep public.
export const INSTAGRAM_WEB_APP_ID = "936619743392459";
// Changed from "129477" to "359341" in Oct 2026: with the old value the
// friendships endpoints answer with the HTML page instead of JSON. If scans
// start failing with "Unexpected token '<'" again, read the X-ASBD-ID header
// Instagram's own followers request sends in DevTools and update it here.
export const INSTAGRAM_ASBD_ID = "359341";

// The persisted GraphQL query instagram.com's own Unfollow button runs
// (fb_api_req_friendly_name "usePolarisUnfollowMutation"). Instagram can rotate
// this id on a deploy; if unfollows start failing with a GraphQL error, capture
// the button's /api/graphql request in DevTools and update it here.
export const INSTAGRAM_UNFOLLOW_DOC_ID = "27789106940691111";
export const INSTAGRAM_UNFOLLOW_FRIENDLY_NAME = "usePolarisUnfollowMutation";

// Page-count safety cap for loading the viewer's own following and followers lists
// (see utils/utils.ts and main.tsx). Instagram returns ~25 users per page no
// matter what `count` asks for, so 250 pages stopped at ~5,700 accounts. The cap
// only guards against an endless walk (a stuck cursor is caught separately in
// main.tsx), so it sits far above any real list: following tops out at 7,500.
export const FOLLOWING_PAGE_SAFETY_LIMIT = 2000;
export const FOLLOWERS_PAGE_SAFETY_LIMIT = 2000;
// A long safety sleep is taken once every this many scan requests.
export const CHECKS_BEFORE_LONG_SLEEP = 15;
export const RATE_LIMIT_COOLDOWN_SECONDS = 30;
export const WHITELISTED_RESULTS_STORAGE_KEY = "iu_whitelisted-results";
export const TIMINGS_STORAGE_KEY = "iu_timings";
export const LAST_SCAN_RESULTS_STORAGE_KEY = "iu_last-scan-results";
export const LAST_SCAN_TIMESTAMP_STORAGE_KEY = "iu_last-scan-time";
// Persisted across reloads: starting a scan/unfollow before this is refused.
export const BLOCKED_UNTIL_STORAGE_KEY = "iu_blocked_until";
export const BLOCKED_COOLDOWN_MS = 10 * 60 * 1000;

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

// ── Pending Requests feature ──────────────────────────────────────────────
export const CANCEL_WHITELIST_STORAGE_KEY = "iucr_whitelist";
// Scan/cancel pacing (anti-ban). Reuses the search-cycle defaults above for the scan timings.
export const DEFAULT_TIME_BETWEEN_CANCELS = 5000;
export const DEFAULT_CANCELS_BEFORE_PAUSE = 5;
export const DEFAULT_TIME_TO_WAIT_AFTER_BURST = 60000;
// Block recovery: the cooldown grows with each attempt on the same account (1, 2, 3 minutes),
// attempts are capped, and several accounts refused in a row stop the run - that pattern means a
// session or header problem that no amount of waiting fixes.
export const RATE_LIMIT_COOLDOWN = 60000;
export const MAX_BLOCK_RETRIES = 3;
export const MAX_CONSECUTIVE_BLOCKS = 3;
// The pending scan makes up to three requests per account (the follower scan gets a whole page per request),
// so it needs a slower pace of its own to stay under Instagram's limits.
export const PROFILES_BEFORE_SCAN_PAUSE = 10;
export const SCAN_BATCH_SIZES: readonly number[] = [20, 50, 100];
// ETA estimates (ms per request) + minimums for the settings panel.
export const EST_SCAN_REQUEST_MS = 800;
export const EST_CANCEL_REQUEST_MS = 800;
export const MIN_SCAN_DELAY = 3000;
export const MIN_SCAN_LONG_PAUSE = 15000;
export const MIN_TIME_BETWEEN_CANCELS = 1000;
export const MIN_BURST_PAUSE = 30000;
