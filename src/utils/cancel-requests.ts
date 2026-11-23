import { CancelRequest, CancelStatus } from "../model/cancel-request";
import { CANCEL_WHITELIST_STORAGE_KEY } from "../constants/constants";
import { Language, t } from "./i18n";
import { findFriendshipStatus, getCookie, getWebSessionTokens, instagramApiHeaders, isStillFollowing, jazoest, rememberWwwClaim } from "./utils";

// Each entry of pending_follow_requests.json (Instagram data export): the username sits in
// label_values. The real id is resolved at scan time from the profile page.
interface PendingRequestEntry {
  readonly timestamp?: number;
  readonly label_values?: ReadonlyArray<{
    readonly label?: string;
    readonly value?: string;
  }>;
}

/** Parse `pending_follow_requests.json` into a deduplicated list. */
export function parsePendingRequests(jsonText: string): CancelRequest[] {
  const raw = JSON.parse(jsonText);
  if (!Array.isArray(raw)) {
    throw new Error("Invalid format: expected the JSON array of pending_follow_requests.json.");
  }
  return parseEntries(raw as PendingRequestEntry[]);
}

function parseEntries(entries: PendingRequestEntry[]): CancelRequest[] {
  const seen = new Set<string>();
  const requests: CancelRequest[] = [];

  for (const entry of entries) {
    const labelValues = Array.isArray(entry?.label_values) ? entry.label_values : [];
    let username = "";

    // Locate the username field by label name (language-agnostic).
    for (const lv of labelValues) {
      const label = (lv.label ?? "").toLowerCase();
      if (label === "username" || label.includes("usuario") || label.includes("benutzer")) {
        username = (lv.value ?? "").trim().replace(/^@/, "");
        if (username) break;
      }
    }

    // Positional fallback: if IG adds a text field after username this silently picks the wrong value, so log it.
    if (!username) {
      for (let i = labelValues.length - 1; i >= 0; i--) {
        const val = (labelValues[i].value ?? "").trim().replace(/^@/, "");
        if (val && !val.startsWith("http")) {
          console.warn("Pending requests: username label not found; using positional fallback:", val, entry);
          username = val;
          break;
        }
      }
    }

    if (!username) continue;
    const key = username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    requests.push({
      username,
      id: null, // resolved at scan time from the profile page
      timestamp: entry?.timestamp ?? 0,
      status: "unverified",
    });
  }

  return requests;
}

// Every call goes out with the scan's header set (instagramApiHeaders): Instagram answers its private
// API with the HTML page instead of JSON when the request does not look like the web client's.
async function igGet(url: string): Promise<Response> {
  const res = await fetch(url, { headers: instagramApiHeaders(), credentials: "same-origin" });
  rememberWwwClaim(res);
  return res;
}

/** Reads the JSON body without throwing; an HTML page (a followed redirect) yields null. */
async function readJson(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text.replace(/^for \(;;\);/, ""));
  } catch {
    return null;
  }
}

/**
 * Problems unrelated to the account being processed. "AUTH": the session is gone (login redirect,
 * 401/403) and no cooldown can fix it. "RATE_LIMIT": Instagram is refusing requests for now - seen
 * as a 429, as a fail body with a spam/feedback message, or (verified in captured traffic) as a 302
 * to the homepage that fetch follows into a 200 HTML page. Callers bound how often a RATE_LIMIT is
 * retried, so a wrong guess here costs a few minutes instead of hanging the run.
 */
function apiProblem(res: Response, data: any): "RATE_LIMIT" | "AUTH" | null {
  const message = typeof data?.message === "string" ? data.message : "";
  if (data?.require_login === true || /login_required/i.test(message)) {
    return "AUTH";
  }
  // Action blocks can arrive as 400/403 with a spam/feedback body: that is a cooldown, not a lost session.
  if (data?.spam === true || /feedback_required|checkpoint|action_blocked|rate limit|please wait/i.test(message)) {
    return "RATE_LIMIT";
  }
  if (res.status === 401 || res.status === 403) {
    return "AUTH";
  }
  if (res.redirected) {
    let path = "";
    try {
      path = new URL(res.url).pathname;
    } catch {
      path = "";
    }
    if (path.startsWith("/accounts/login")) {
      return "AUTH";
    }
    if (path === "/") {
      return "RATE_LIMIT";
    }
  }
  if (res.status === 429) {
    return "RATE_LIMIT";
  }
  return null;
}

export type Relationship = "pending" | "following" | "resolved" | null;

export interface ResolvedProfile {
  readonly id: string;
  readonly fullName: string;
  readonly profilePicUrl: string;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
  readonly relationship: Relationship;
}

export type ProfileResult = ResolvedProfile | "RATE_LIMIT" | "AUTH" | "NOT_FOUND" | null;

/**
 * Resolves one account with the requests Instagram still serves to the web client (Nov 2026: the
 * old web_profile_info and topsearch routes answer 404). First the same following-list search the
 * unfollow check uses: a hit means the request was accepted, and it brings the picture, name and
 * badges. Otherwise the account's own profile page gives its id, and friendships/show tells whether
 * the request is still pending.
 */
export async function fetchProfile(username: string): Promise<ProfileResult> {
  try {
    const followed = await findInFollowing(username);
    if (followed !== undefined) {
      return followed;
    }
    return await fetchProfilePage(username);
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** Searches the viewer's following list for this username; undefined when it is not there. */
async function findInFollowing(username: string): Promise<ProfileResult | undefined> {
  const viewerId = getCookie("ds_user_id");
  if (viewerId === null) {
    return "AUTH";
  }
  const res = await igGet(
    `https://www.instagram.com/api/v1/friendships/${viewerId}/following/?count=12&query=${encodeURIComponent(username)}&search_surface=follow_list_page`,
  );
  const data = await readJson(res);
  const problem = apiProblem(res, data);
  if (problem) {
    return problem;
  }
  if (res.ok && data === null) {
    return "RATE_LIMIT";
  }
  if (!res.ok || data === null || !Array.isArray(data.users)) {
    return null;
  }
  const wanted = username.toLowerCase();
  const user = data.users.find((u: any) => String(u?.username ?? "").toLowerCase() === wanted);
  if (!user) {
    return undefined;
  }
  return {
    id: String(user.pk_id ?? user.pk),
    fullName: user.full_name ?? "",
    profilePicUrl: user.profile_pic_url ?? "",
    isPrivate: user.is_private === true,
    isVerified: user.is_verified === true,
    relationship: "following",
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unescapeJson = (s: string) => {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
};
let profilePageWarned = false;

/** Reads the account id (and, when present, picture, name and badges) from its profile page. */
export async function fetchProfilePage(username: string): Promise<ProfileResult> {
  const res = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    credentials: "same-origin",
    headers: { Accept: "text/html" },
  });
  let path = "";
  try {
    path = new URL(res.url).pathname;
  } catch {
    path = "";
  }
  if (path.startsWith("/accounts/login")) {
    return "AUTH";
  }
  if (res.status === 429 || (res.redirected && path === "/")) {
    return "RATE_LIMIT";
  }
  if (res.status === 404) {
    return "NOT_FOUND";
  }
  if (!res.ok) {
    return null;
  }
  const html = await res.text();
  const u = escapeRegExp(username);
  const viewerId = getCookie("ds_user_id");
  const candidates = [
    new RegExp(`"(?:pk|pk_id|id)":"(\\d+)","username":"${u}"`, "i"),
    new RegExp(`"username":"${u}"[^{}]{0,600}?"(?:pk|pk_id|id)":"(\\d+)"`, "i"),
    /"profilePage_(\d+)"/,
    /"target_id":"(\d+)"/,
  ];
  let id = "";
  for (const re of candidates) {
    const m = re.exec(html);
    if (m && m[1] !== viewerId) {
      id = m[1];
      break;
    }
  }
  if (!id) {
    if (/"HttpErrorPage"|page isn(?:'|\\u2019|’)t available|página no está disponible/i.test(html)) {
      return "NOT_FOUND";
    }
    if (!profilePageWarned) {
      profilePageWarned = true;
      console.warn(`Could not read the account id from the profile page of ${username} (HTTP ${res.status}, ${html.length} bytes)`);
    }
    return null;
  }
  // Picture, name and badges sit next to the username in the page data; og:image is the fallback picture.
  const at = html.search(new RegExp(`"username":"${u}"`, "i"));
  const near = at >= 0 ? html.slice(Math.max(0, at - 1500), at + 1500) : "";
  const pic = /"profile_pic_url(?:_hd)?":"([^"]+)"/.exec(near)?.[1];
  const og = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html)?.[1];
  const name = /"full_name":"([^"]*)"/.exec(near)?.[1];
  const ogName = /<meta[^>]+property="og:title"[^>]+content="([^"]*?)\s*\((?:@|&#0?64;)/i.exec(html)?.[1];
  let isPrivate = /"is_private":true/.test(near);
  // Not being in the following list does not mean the request is still pending (it may have been
  // withdrawn or declined): friendships/show decides.
  const shown = await checkFriendship(id);
  if (shown === "RATE_LIMIT" || shown === "AUTH") {
    return shown;
  }
  const relationship = shown?.relationship ?? null;
  isPrivate = isPrivate || shown?.isPrivate === true;
  return {
    id,
    fullName: name ? unescapeJson(name) : ogName ? decodeEntities(ogName) : "",
    profilePicUrl: pic ? unescapeJson(pic) : og ? decodeEntities(og) : "",
    isPrivate,
    isVerified: /"is_verified":true/.test(near),
    relationship,
  };
}

let showWarned = false;
let showUnavailable = false;

/** Decodes the HTML entities Instagram uses in its meta tags (&#x28d;, &#064;, &amp;...). */
const decodeEntities = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

type ShownFriendship = { readonly relationship: Relationship; readonly isPrivate: boolean } | "RATE_LIMIT" | "AUTH" | null;

/** friendships/show by id: "pending" / "following" / "resolved", or null when Instagram doesn't answer it. */
async function checkFriendship(userId: string): Promise<ShownFriendship> {
  if (showUnavailable) {
    return null;
  }
  try {
    const res = await igGet(`https://www.instagram.com/api/v1/friendships/show/${encodeURIComponent(userId)}/`);
    const data = await readJson(res);
    const problem = apiProblem(res, data);
    if (problem) {
      return problem;
    }
    if (res.ok && data === null) {
      return "RATE_LIMIT"; // the HTML page instead of JSON is Instagram's throttle
    }
    if (!res.ok || data === null) {
      showUnavailable = res.status === 404;
      if (!showWarned) {
        showWarned = true;
        console.warn(`friendships/show did not answer with JSON (HTTP ${res.status}); accounts stay unverified`);
      }
      return null;
    }
    const isPrivate = data.is_private === true;
    if (data.outgoing_request === true || data.outgoing_requested_follow === true) {
      return { relationship: "pending", isPrivate };
    }
    if (data.following === true) {
      return { relationship: "following", isPrivate };
    }
    const known = typeof data.following === "boolean" && typeof data.outgoing_request === "boolean";
    return { relationship: known ? "resolved" : null, isPrivate };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export type CancelResult = true | false | "RATE_LIMIT" | "AUTH";

type WriteResult = { readonly data: any } | "RATE_LIMIT" | "AUTH" | null;

/**
 * POST /api/v1/friendships/{destroy|create}/{id}/ the way instagram.com's own buttons send it
 * (Oct 2026): fb_dtsg/jazoest in the body and X-Instagram-AJAX, same as the unfollow in utils.ts.
 * null means Instagram answered but not with a usable {"status":"ok"} body.
 */
async function friendshipWrite(action: "destroy" | "create", userId: string, csrftoken: string): Promise<WriteResult> {
  const tokens = await getWebSessionTokens();
  if (tokens === null) {
    console.warn("Could not find the fb_dtsg/lsd session tokens on the page");
    return null;
  }
  const body = new URLSearchParams({
    container_module: "profile",
    nav_chain: "PolarisProfilePostsTabRoot:profilePage:1:via_cold_start",
    user_id: userId,
    jazoest: jazoest(tokens.fbDtsg),
    fb_dtsg: tokens.fbDtsg,
  });
  const extra: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRFToken": csrftoken,
  };
  if (tokens.revision) {
    extra["X-Instagram-AJAX"] = tokens.revision;
  }
  const res = await fetch(`https://www.instagram.com/api/v1/friendships/${action}/${encodeURIComponent(userId)}/`, {
    method: "POST",
    headers: instagramApiHeaders(extra),
    credentials: "same-origin",
    body: body.toString(),
  });
  rememberWwwClaim(res);
  const data = await readJson(res);
  const problem = apiProblem(res, data);
  if (problem) {
    return problem;
  }
  if (res.ok && data === null) {
    return "RATE_LIMIT";
  }
  const errorText = `${JSON.stringify(data?.errors ?? data?.error ?? "")} ${data?.message ?? ""} ${data?.errorSummary ?? ""}`;
  if (/feedback_required|checkpoint|action_blocked|try again later|rate limit/i.test(errorText)) {
    return "RATE_LIMIT";
  }
  if (!res.ok || data === null || data.errors || data.error || data.status !== "ok") {
    console.warn(`friendships/${action} for ${userId} not confirmed: HTTP ${res.status}`, data ?? `not JSON (final URL ${res.url})`);
    return null;
  }
  return { data };
}

/**
 * Cancel a pending follow request, or unfollow an accepted one: both are the same destroy call the
 * web client's "Requested" / "Following" buttons send. It only counts once Instagram confirms that
 * neither a follow nor an outgoing request is left, from the response or the following-list search.
 */
export async function cancelFollowRequest(userId: string, username: string, csrftoken: string): Promise<CancelResult> {
  try {
    const result = await friendshipWrite("destroy", userId, csrftoken);
    if (result === null) {
      return false;
    }
    if (result === "RATE_LIMIT" || result === "AUTH") {
      return result;
    }
    const fs = findFriendshipStatus(result.data);
    if (fs && typeof fs.following === "boolean") {
      return fs.following === false && fs.outgoing_request !== true;
    }
    // No friendship_status in the answer: same check as the unfollow queue, the following-list search.
    const stillFollowing = await isStillFollowing({ id: userId, username });
    return stillFollowing === false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** Recycle: re-send a follow request. Counts once Instagram reports it as requested (or followed). */
export async function requestFollow(userId: string, csrftoken: string): Promise<CancelResult> {
  try {
    const result = await friendshipWrite("create", userId, csrftoken);
    if (result === null) {
      return false;
    }
    if (result === "RATE_LIMIT" || result === "AUTH") {
      return result;
    }
    const fs = findFriendshipStatus(result.data);
    if (fs && (typeof fs.following === "boolean" || typeof fs.outgoing_request === "boolean")) {
      return fs.outgoing_request === true || fs.following === true;
    }
    return true; // {"status":"ok"} without friendship_status: the request was accepted by Instagram
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** Format a millisecond duration as a short human-readable ETA string. */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) {
    return "—";
  }
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/** Format a Unix timestamp (seconds) as a short local date, or "" when unknown. */
export function formatRequestedAt(timestampSeconds: number): string {
  if (!timestampSeconds || timestampSeconds < 0) {
    return "";
  }
  try {
    return new Date(timestampSeconds * 1000).toLocaleDateString();
  } catch {
    return "";
  }
}

/** Month + year bucket label (e.g. "January 2026"); "Unknown date" when no timestamp. */
export function monthYearLabel(timestampSeconds: number, lang: Language): string {
  if (!timestampSeconds || timestampSeconds < 0) {
    return t(lang, "crUnknownDate");
  }
  try {
    const label = new Date(timestampSeconds * 1000).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return t(lang, "crUnknownDate");
  }
}

// Export helpers — cancel-only, never mixed with the unfollowers whitelist.

// Same shape as the Unfollowers export (UserNode) so both JSONs are interchangeable, plus
// cancel-only fields (status/whitelisted/requested_at) for a faithful re-import.
export interface CancelExportRow {
  readonly id: string;
  readonly username: string;
  readonly full_name: string;
  readonly profile_pic_url: string;
  readonly is_private: boolean;
  readonly is_verified: boolean;
  readonly followed_by_viewer: boolean;
  readonly follows_viewer: boolean;
  readonly requested_by_viewer: boolean;
  readonly reel: null;
  readonly status: CancelStatus;
  readonly whitelisted: boolean;
  readonly requested_at: number;
}

export function buildCancelExportRows(
  requests: readonly CancelRequest[],
  isWhitelisted: (username: string) => boolean,
): CancelExportRow[] {
  return requests.map(r => ({
    id: r.id ?? "",
    username: r.username,
    full_name: r.fullName ?? "",
    profile_pic_url: r.profilePicUrl ?? "",
    is_private: r.isPrivate ?? false,
    is_verified: r.isVerified ?? false,
    followed_by_viewer: r.status === "following",
    follows_viewer: false,
    requested_by_viewer: r.status === "pending",
    reel: null,
    status: r.status,
    whitelisted: isWhitelisted(r.username),
    requested_at: r.timestamp ?? 0,
  }));
}

const todayStamp = (): string => new Date().toISOString().split("T")[0];

function triggerDownload(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revocation: Safari/Firefox download lazily; <1000ms can produce an empty file on slow machines.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy usernames (sorted A→Z, "; "-separated) to the clipboard. Returns the count. */
export async function copyCancelList(rows: readonly CancelExportRow[]): Promise<number> {
  const text = [...rows]
    .sort((a, b) => (a.username > b.username ? 1 : -1))
    .map(r => r.username)
    .join("; ");
  await navigator.clipboard.writeText(text);
  return rows.length;
}

export function exportCancelJSON(rows: readonly CancelExportRow[]): void {
  triggerDownload(JSON.stringify(rows, null, 2), "application/json", "instagram_pending_requests.json");
}

export function exportCancelCSV(rows: readonly CancelExportRow[]): void {
  const headers = [
    "id", "username", "full_name", "profile_pic_url", "is_private", "is_verified",
    "followed_by_viewer", "follows_viewer", "requested_by_viewer",
    "status", "whitelisted", "requested_at",
  ];
  const esc = (v: unknown) => `"${String(v).replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
  const lines = rows.map(r =>
    [r.id, r.username, r.full_name, r.profile_pic_url, r.is_private, r.is_verified,
      r.followed_by_viewer, r.follows_viewer, r.requested_by_viewer,
      r.status, r.whitelisted, r.requested_at]
      .map(esc)
      .join(","),
  );
  triggerDownload([headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8", "instagram_pending_requests.csv");
}

// Cancel whitelist persistence + backup — separate store from the unfollowers whitelist.

/** Load the cancel whitelist (lowercased usernames) from localStorage. */
export function loadCancelWhitelist(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CANCEL_WHITELIST_STORAGE_KEY) ?? "[]");
    return Array.isArray(v) ? v.map(x => String(x).toLowerCase()) : [];
  } catch {
    return [];
  }
}

/** Persist the cancel whitelist (deduped, lowercased). */
export function saveCancelWhitelist(usernames: readonly string[]): void {
  const unique = Array.from(new Set(usernames.map(u => u.toLowerCase())));
  localStorage.setItem(CANCEL_WHITELIST_STORAGE_KEY, JSON.stringify(unique));
}

/** Download the whitelisted accounts as a JSON backup (UserNode shape). Returns how many were written. */
export function exportCancelWhitelist(usernames: readonly string[], requests: readonly CancelRequest[]): number {
  const byName = new Map(requests.map(r => [r.username.toLowerCase(), r]));
  const rows = usernames.map(u => {
    const r = byName.get(u.toLowerCase());
    return {
      id: r?.id ?? "",
      username: r?.username ?? u,
      full_name: r?.fullName ?? "",
      profile_pic_url: r?.profilePicUrl ?? "",
      is_private: r?.isPrivate ?? false,
      is_verified: r?.isVerified ?? false,
      followed_by_viewer: r?.status === "following",
      follows_viewer: false,
      requested_by_viewer: r?.status === "pending",
      reel: null,
    };
  });
  triggerDownload(JSON.stringify(rows, null, 2), "application/json", `cancel-whitelist-${todayStamp()}.json`);
  return rows.length;
}

/** Import a cancel whitelist: accepts an array of usernames or of objects with a `username` field. */
export function importCancelWhitelist(
  file: File,
  lang: Language,
  onSuccess: (usernames: string[]) => void,
  onError: (message: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (!Array.isArray(parsed)) {
        onError(t(lang, "crImportNotArray"));
        return;
      }
      const usernames = parsed
        .map((item: unknown) => (typeof item === "string" ? item : (item as { username?: unknown })?.username))
        .filter((u): u is string => typeof u === "string" && u.trim() !== "")
        .map(u => u.trim().replace(/^@/, "").toLowerCase());
      if (usernames.length === 0) {
        onError(t(lang, "crImportNoUsernames"));
        return;
      }
      onSuccess(Array.from(new Set(usernames)));
    } catch (err) {
      onError(t(lang, "crImportParseFailed", err instanceof Error ? err.message : "?"));
    }
  };
  reader.onerror = () => onError(t(lang, "crImportReadFailed"));
  reader.readAsText(file);
}

/** Clear the cancel whitelist (with confirmation). Returns true if it was cleared. */
export function clearCancelWhitelist(lang: Language): boolean {
  if (!confirm(t(lang, "crClearWhitelistConfirm"))) {
    return false;
  }
  localStorage.removeItem(CANCEL_WHITELIST_STORAGE_KEY);
  return true;
}
