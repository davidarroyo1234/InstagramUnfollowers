import { UserNode } from "../model/user";
import { DEFAULT_USERS_PER_SEARCH_CYCLE, INSTAGRAM_ASBD_ID, INSTAGRAM_UNFOLLOW_DOC_ID, INSTAGRAM_UNFOLLOW_FRIENDLY_NAME, INSTAGRAM_WEB_APP_ID, UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_IDS } from "../constants/constants";
import { ScanningTab } from "../model/scanning-tab";
import { ScanningFilter } from "../model/scanning-filter";
import { UnfollowLogEntry } from "../model/unfollow-log-entry";
import { UnfollowFilter } from "../model/unfollow-filter";

export async function copyListToClipboard(nonFollowersList: readonly UserNode[], alertMessage: string = 'List copied to clipboard!'): Promise<void> {
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

  let output = '';
  sortedList.forEach(user => {
    output += user.username + '\n';
  });

  await navigator.clipboard.writeText(output);
  alert(alertMessage);
}

export function exportToJSON(users: readonly UserNode[]) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", "instagram_unfollowers.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function exportToCSV(users: readonly UserNode[]) {
  const headers = ['id', 'username', 'full_name', 'is_verified', 'is_private', 'profile_pic_url'];
  const rows = users.map(user => [
    user.id,
    user.username,
    `"${user.full_name.replace(/"/g, '""')}"`,
    user.is_verified,
    user.is_private,
    user.profile_pic_url
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "instagram_unfollowers.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function getMaxPage(nonFollowersList: readonly UserNode[]): number {
  const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
  return pageCalc < 1 ? 1 : pageCalc;
}

export function getCurrentPageUnfollowers(nonFollowersList: readonly UserNode[], currentPage: number): readonly UserNode[] {
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));
  const startIndex = UNFOLLOWERS_PER_PAGE * (currentPage - 1);
  return sortedList.slice(startIndex, startIndex + UNFOLLOWERS_PER_PAGE);
}

export function isWithoutProfilePicture(user: UserNode): boolean {
  if (!user.profile_pic_url) {
    return true;
  }
  return WITHOUT_PROFILE_PICTURE_URL_IDS.some(id => user.profile_pic_url.includes(id));
}

export function getUsersForDisplay(
  results: readonly UserNode[],
  whitelistedResults: readonly UserNode[],
  currentTab: ScanningTab,
  searchTerm: string,
  filter: ScanningFilter,
): readonly UserNode[] {
  const users: UserNode[] = [];
  for (const result of results) {
    const isWhitelisted = whitelistedResults.find(user => user.id === result.id) !== undefined;
    switch (currentTab) {
      case "non_whitelisted":
        if (isWhitelisted) {
          continue;
        }
        break;
      case "whitelisted":
        if (!isWhitelisted) {
          continue;
        }
        break;
      default:
        assertUnreachable(currentTab);
    }
    if (!filter.showPrivate && result.is_private) {
      continue;
    }
    if (!filter.showVerified && result.is_verified) {
      continue;
    }
    // Scans only keep accounts that don't follow back; this also hides
    // mutuals stored by older cached scans.
    if (result.follows_viewer) {
      continue;
    }
    if (!filter.showWithOutProfilePicture && isWithoutProfilePicture(result)) {
      continue;
    }
    const userMatchesSearchTerm =
      result.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm !== "" && !userMatchesSearchTerm) {
      continue;
    }
    users.push(result);
  }
  return users;
}

export function getUnfollowLogForDisplay(log: readonly UnfollowLogEntry[], searchTerm: string, filter: UnfollowFilter) {
  const entries: UnfollowLogEntry[] = [];
  for (const entry of log) {
    if (!filter.showSucceeded && entry.unfollowedSuccessfully) {
      continue;
    }
    if (!filter.showFailed && !entry.unfollowedSuccessfully) {
      continue;
    }
    const userMatchesSearchTerm = entry.user.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm !== "" && !userMatchesSearchTerm) {
      continue;
    }
    entries.push(entry);
  }
  return entries;
}

/**
 * When writing a switch-case with a finite number of cases, use this function in the
 * `default` clause of switch-case statements for exhaustive checking. This will make
 * TS complain until ALL cases are handled. For example, if we have a switch-case
 * in-which we evaluate every possible status of a component's state, if we add this
 * to the default clause and then add a new status to the state type, TS will complain
 * and force us to handle it as well, thus avoiding forgetting it.
 */
export function assertUnreachable(_value: never): never {
  throw new Error('Statement should be unreachable');
}

export function sleep(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) {
    return null;
  }
  return parts.pop()!.split(';').shift()!;
}

export type UnfollowOutcome = 'unfollowed' | 'failed' | 'blocked';

export interface UnfollowResult {
  readonly outcome: UnfollowOutcome;
  readonly detail: string;
}

interface WebSessionTokens {
  readonly fbDtsg: string;
  readonly lsd: string;
  readonly revision?: string;
}

let cachedWebSessionTokens: WebSessionTokens | null = null;

function tokensFromHtml(html: string): WebSessionTokens | null {
  const fbDtsg = /"DTSGInitialData",\[\],\{"token":"([^"]+)"/.exec(html)?.[1] ?? /"dtsg":\{"token":"([^"]+)"/.exec(html)?.[1];
  const lsd = /"LSD",\[\],\{"token":"([^"]+)"/.exec(html)?.[1];
  if (!fbDtsg || !lsd) {
    return null;
  }
  return { fbDtsg, lsd, revision: /"client_revision":(\d+)/.exec(html)?.[1] };
}

// fb_dtsg and lsd are the per-session tokens instagram.com's GraphQL writes
// carry. They come from the page's module registry when it is still loaded,
// otherwise from the inline page data, otherwise from a fresh copy of the page.
async function getWebSessionTokens(): Promise<WebSessionTokens | null> {
  if (cachedWebSessionTokens !== null) {
    return cachedWebSessionTokens;
  }
  try {
    const req = (window as any).require;
    if (typeof req === 'function') {
      const fbDtsg = req('DTSGInitialData')?.token;
      const lsd = req('LSD')?.token;
      if (fbDtsg && lsd) {
        cachedWebSessionTokens = { fbDtsg, lsd, revision: String(req('SiteData')?.client_revision ?? '') || undefined };
        return cachedWebSessionTokens;
      }
    }
  } catch {
    // Module registry unavailable; fall back to the HTML.
  }
  cachedWebSessionTokens = tokensFromHtml(document.documentElement.innerHTML);
  if (cachedWebSessionTokens === null) {
    try {
      const res = await fetch('https://www.instagram.com/', { credentials: 'same-origin' });
      cachedWebSessionTokens = tokensFromHtml(await res.text());
    } catch (e) {
      console.warn('Could not load Instagram session tokens:', e);
    }
  }
  return cachedWebSessionTokens;
}

// Instagram's checksum of fb_dtsg: "2" followed by the sum of its char codes.
function jazoest(fbDtsg: string): string {
  let sum = 0;
  for (let i = 0; i < fbDtsg.length; i++) {
    sum += fbDtsg.charCodeAt(i);
  }
  return `2${sum}`;
}

function findFriendshipStatus(node: any): any {
  if (node === null || typeof node !== 'object') {
    return undefined;
  }
  if (node.friendship_status && typeof node.friendship_status === 'object') {
    return node.friendship_status;
  }
  for (const value of Object.values(node)) {
    const found = findFriendshipStatus(value);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

// Searches the viewer's own following list for one account, the same way the
// followers search in probe/issue.md works. Returns null if the lookup failed.
export async function isStillFollowing(user: { readonly id: string; readonly username: string }): Promise<boolean | null> {
  const viewerId = getCookie('ds_user_id');
  if (viewerId === null) {
    return null;
  }
  const url = `https://www.instagram.com/api/v1/friendships/${viewerId}/following/?count=12&query=${encodeURIComponent(user.username)}&search_surface=follow_list_page`;
  try {
    const page = await fetchFriendshipsPageFromUrl(url);
    const target = user.username.toLowerCase();
    return (page.users ?? []).some(u => {
      const { ids, username } = extractUserIdentities(u);
      return ids.includes(user.id) || username === target;
    });
  } catch (e) {
    console.warn(`Could not verify unfollow of ${user.username}:`, e);
    return null;
  }
}

// Unfollows the way instagram.com's own Unfollow button does: the
// usePolarisUnfollowMutation GraphQL query. It only counts once Instagram
// confirms the follow is gone: either the response's friendship_status says
// so, or a follow-up search of the viewer's following list no longer finds the
// account. A 2xx alone proves nothing (Instagram answers unknown routes with a
// 200 HTML page).
export async function unfollowUser(user: { readonly id: string; readonly username: string }, csrftoken: string): Promise<UnfollowResult> {
  const tokens = await getWebSessionTokens();
  if (tokens === null) {
    return { outcome: 'failed', detail: 'could not find the fb_dtsg/lsd session tokens on the page' };
  }
  const params: Record<string, string> = {
    av: getCookie('ds_user_id') ?? '',
    __d: 'www',
    __user: '0',
    __a: '1',
    __comet_req: '7',
    fb_dtsg: tokens.fbDtsg,
    jazoest: jazoest(tokens.fbDtsg),
    lsd: tokens.lsd,
    fb_api_caller_class: 'RelayModern',
    fb_api_req_friendly_name: INSTAGRAM_UNFOLLOW_FRIENDLY_NAME,
    variables: JSON.stringify({
      target_user_id: user.id,
      container_module: 'profile',
      nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start',
    }),
    server_timestamps: 'true',
    doc_id: INSTAGRAM_UNFOLLOW_DOC_ID,
  };
  if (tokens.revision) {
    params.__rev = tokens.revision;
    params.__spin_r = tokens.revision;
  }

  const res = await fetch('https://www.instagram.com/api/graphql', {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-csrftoken': csrftoken,
      'x-fb-friendly-name': INSTAGRAM_UNFOLLOW_FRIENDLY_NAME,
      'x-fb-lsd': tokens.lsd,
      'x-ig-app-id': INSTAGRAM_WEB_APP_ID,
      'x-asbd-id': INSTAGRAM_ASBD_ID,
    },
    method: 'POST',
    credentials: 'same-origin',
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text().catch(() => '');
  let data: any = null;
  try {
    // Facebook-style endpoints may prefix JSON with an anti-hijacking guard.
    data = JSON.parse(text.replace(/^for \(;;\);/, ''));
  } catch {
    // Not JSON; reported below with enough context to see what came back.
  }

  const errorText = JSON.stringify(data?.errors ?? data?.error ?? '') + ` ${data?.message ?? ''} ${data?.errorSummary ?? ''}`;
  const isActionBlocked =
    res.status === 429 ||
    data?.spam === true ||
    /feedback_required|checkpoint|action_blocked|try again later|rate limit/i.test(errorText);
  if (isActionBlocked) {
    return { outcome: 'blocked', detail: `HTTP ${res.status}: ${errorText.trim()}` };
  }
  if (!res.ok || data === null || data.errors || data.error || data.status === 'fail' || !data.data) {
    const body = data === null
      ? `not JSON (content-type ${res.headers.get('content-type')}, redirected ${res.redirected}, final URL ${res.url}): ${text.slice(0, 300)}`
      : JSON.stringify(data).slice(0, 1000);
    return { outcome: 'failed', detail: `HTTP ${res.status}, body ${body}` };
  }

  const fs = findFriendshipStatus(data.data);
  if (fs && (fs.following === true || fs.outgoing_request === true)) {
    return { outcome: 'failed', detail: `Instagram answered but friendship_status still shows following: ${JSON.stringify(fs)}` };
  }

  const stillFollowing = await isStillFollowing(user);
  if (stillFollowing === true) {
    return { outcome: 'failed', detail: `Instagram answered but the account is still in your following list. Response: ${JSON.stringify(data).slice(0, 500)}` };
  }
  if (stillFollowing === null && !(fs && fs.following === false)) {
    return { outcome: 'failed', detail: `Instagram answered but the unfollow could not be confirmed. Response: ${JSON.stringify(data).slice(0, 500)}` };
  }
  return { outcome: 'unfollowed', detail: 'confirmed' };
}

export type FriendshipsListKind = 'following' | 'followers';

/**
 * A single user entry as returned by Instagram's private
 * /api/v1/friendships/<id>/following|followers/ REST endpoints. This is a
 * different (and much less rich) shape than the old public GraphQL
 * following-edges endpoint this app used to call, which was the actual
 * cause of scans always completing instantly with 0 results: that GraphQL
 * `query_hash` is a years-old, publicly-known value that Instagram now
 * serves as a structurally-valid but data-empty response (200 OK, correct
 * total count, zero edges, has_next_page: false) rather than an outright
 * error, so the old code had no way to detect the failure.
 */
export interface RawFriendshipUser {
  readonly pk: string | number;
  readonly pk_id?: string;
  readonly username: string;
  readonly full_name?: string;
  readonly profile_pic_url: string;
  readonly is_private?: boolean;
  readonly is_verified?: boolean;
}

export interface FriendshipsPage {
  readonly users?: readonly RawFriendshipUser[];
  // Instagram sometimes omits next_max_id even when has_more is true right
  // at the very end of a list; both are checked when deciding to continue.
  readonly next_max_id?: string;
  readonly has_more?: boolean;
}

// `userId` defaults to the logged-in viewer; pass another account's id to read
// that account's following/followers list instead.
export function friendshipsUrlGenerator(kind: FriendshipsListKind, maxId?: string, count: number = DEFAULT_USERS_PER_SEARCH_CYCLE, userId?: string): string {
  const targetId = userId ?? getCookie('ds_user_id');
  const base = `https://www.instagram.com/api/v1/friendships/${targetId}/${kind}/?count=${count}`;
  return maxId === undefined ? base : `${base}&max_id=${encodeURIComponent(maxId)}`;
}

export class InstagramApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, InstagramApiError.prototype);
    this.name = 'InstagramApiError';
    this.status = status;
  }
}

export async function fetchFriendshipsPage(kind: FriendshipsListKind, maxId?: string, count?: number, userId?: string): Promise<FriendshipsPage> {
  const csrftoken = getCookie('csrftoken') || '';
  const headers: Record<string, string> = {
    'X-IG-App-ID': INSTAGRAM_WEB_APP_ID,
    'X-ASBD-ID': INSTAGRAM_ASBD_ID,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*',
  };
  if (csrftoken) {
    headers['X-CSRFToken'] = csrftoken;
  }

  return fetchFriendshipsPageFromUrl(friendshipsUrlGenerator(kind, maxId, count, userId), headers);
}

async function fetchFriendshipsPageFromUrl(url: string, headers?: Record<string, string>): Promise<FriendshipsPage> {
  if (headers === undefined) {
    const csrftoken = getCookie('csrftoken') || '';
    headers = {
      'X-IG-App-ID': INSTAGRAM_WEB_APP_ID,
      'X-ASBD-ID': INSTAGRAM_ASBD_ID,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': '*/*',
    };
    if (csrftoken) {
      headers['X-CSRFToken'] = csrftoken;
    }
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers,
  });
  if (!response.ok) {
    throw new InstagramApiError(response.status, `Instagram returned HTTP ${response.status} for ${url}`);
  }
  const data = (await response.json()) as any;
  if (data?.status === 'fail' || (!data?.users && data?.message)) {
    throw new InstagramApiError(response.status, data?.message || `Instagram returned failure status for ${url}`);
  }
  return data as FriendshipsPage;
}

export function rawFriendshipUserToUserNode(raw: RawFriendshipUser, followsViewer: boolean): UserNode {
  return {
    id: String(raw.pk_id ?? raw.pk),
    username: raw.username,
    full_name: raw.full_name ?? '',
    profile_pic_url: raw.profile_pic_url,
    is_private: raw.is_private ?? false,
    is_verified: raw.is_verified ?? false,
    // These endpoints don't expose either of these, and nothing in the app
    // reads them beyond this mapping, so they're set to the values that are
    // true by construction for entries drawn from your own following list.
    followed_by_viewer: true,
    requested_by_viewer: false,
    follows_viewer: followsViewer,
  };
}

export interface FollowerIndex {
  readonly ids: ReadonlySet<string>;
  readonly usernames: ReadonlySet<string>;
}

export function createFollowerIndex(): {
  readonly ids: Set<string>;
  readonly usernames: Set<string>;
} {
  return {
    ids: new Set<string>(),
    usernames: new Set<string>(),
  };
}

export function extractUserIdentities(user: RawFriendshipUser): {
  readonly ids: readonly string[];
  readonly username: string;
} {
  const ids: string[] = [];
  if (user.pk !== undefined && user.pk !== null) {
    const s = String(user.pk).trim();
    if (s) {
      ids.push(s);
    }
  }
  if (user.pk_id) {
    const s = String(user.pk_id).trim();
    if (s && !ids.includes(s)) {
      ids.push(s);
    }
  }
  if ((user as any).id) {
    const s = String((user as any).id).trim();
    if (s && !ids.includes(s)) {
      ids.push(s);
    }
  }
  const username = (user.username ?? "").trim().toLowerCase();
  return { ids, username };
}

export function addFollowerToIndex(
  index: { readonly ids: Set<string>; readonly usernames: Set<string> },
  user: RawFriendshipUser,
): void {
  const { ids, username } = extractUserIdentities(user);
  for (const id of ids) {
    index.ids.add(id);
  }
  if (username) {
    index.usernames.add(username);
  }
}

export function isUserInFollowerIndex(
  index: { readonly ids: ReadonlySet<string>; readonly usernames: ReadonlySet<string> },
  user: RawFriendshipUser,
): boolean {
  const { ids, username } = extractUserIdentities(user);
  if (ids.some(id => index.ids.has(id))) {
    return true;
  }
  if (username && index.usernames.has(username)) {
    return true;
  }
  return false;
}

