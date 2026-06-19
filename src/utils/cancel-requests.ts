import { CancelRequest, CancelStatus } from "../model/cancel-request";
import { CANCEL_WHITELIST_STORAGE_KEY, IG_APP_ID } from "../constants/constants";

interface OldFormatJson {
  readonly relationships_follow_requests_sent?: ReadonlyArray<{
    readonly string_list_data?: ReadonlyArray<{
      readonly value?: string;
      readonly href?: string;
      readonly timestamp?: number;
    }>;
  }>;
}

// NEW format (2025+): flat array. The entry's `fbid` is NOT the pk the cancel endpoint needs
// (different namespace) — ignored; the real id is resolved at scan time via web_profile_info.
interface NewFormatEntry {
  readonly timestamp?: number;
  readonly label_values?: ReadonlyArray<{
    readonly label?: string;
    readonly value?: string;
  }>;
}

/** Parse `pending_follow_requests.json` (old and new export formats) into a deduplicated list. */
export function parsePendingRequests(jsonText: string): CancelRequest[] {
  const raw = JSON.parse(jsonText);

  if (Array.isArray(raw)) {
    return parseNewFormat(raw as NewFormatEntry[]);
  }

  const entries = (raw as OldFormatJson)?.relationships_follow_requests_sent;
  if (!Array.isArray(entries)) {
    throw new Error(
      'Invalid format: expected a JSON array (new format) or an object with "relationships_follow_requests_sent" (old format).',
    );
  }

  const seen = new Set<string>();
  const requests: CancelRequest[] = [];
  for (const entry of entries) {
    const data0 = entry?.string_list_data?.[0];
    const username = (data0?.value ?? "").trim().replace(/^@/, "");
    if (!username) continue;
    const key = username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    requests.push({ username, id: null, timestamp: data0?.timestamp ?? 0, status: "unverified" });
  }
  return requests;
}

function parseNewFormat(entries: NewFormatEntry[]): CancelRequest[] {
  const seen = new Set<string>();
  const requests: CancelRequest[] = [];

  for (const entry of entries) {
    const labelValues = entry.label_values ?? [];
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
          console.warn("[parseNewFormat] username label not found; using positional fallback:", val, entry);
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
      id: null, // resolved at scan time via web_profile_info (fbid is a different id namespace)
      timestamp: entry.timestamp ?? 0,
      status: "unverified",
    });
  }

  return requests;
}

const IG_HEADERS: Record<string, string> = { "x-ig-app-id": IG_APP_ID };

export type Relationship = "pending" | "following" | "resolved" | null;

export interface ResolvedProfile {
  readonly id: string;
  readonly fullName: string;
  readonly profilePicUrl: string;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
  readonly relationship: Relationship;
}

export type ProfileResult = ResolvedProfile | "RATE_LIMIT" | "NOT_FOUND" | null;

/**
 * Resolve a profile + relationship in one call via web_profile_info.
 * The web endpoint does NOT return a `friendship_status` object (that's the mobile API shape); it
 * exposes the relationship as FLAT boolean fields on `user`: `requested_by_viewer` (outgoing pending)
 * and `followed_by_viewer` (you follow them). Read those directly; `friendship_status` is only a
 * secondary fallback for mobile-shaped responses.
 */
export async function fetchProfile(username: string): Promise<ProfileResult> {
  try {
    const res = await fetch(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, {
      headers: IG_HEADERS,
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const user = data?.data?.user;
      if (!user?.id) {
        return null;
      }
      let relationship: Relationship = null;
      if (user.requested_by_viewer === true) {
        relationship = "pending";
      } else if (user.followed_by_viewer === true) {
        relationship = "following";
      } else {
        // Fallback for mobile-shaped responses that carry `friendship_status` instead.
        const fs = user.friendship_status;
        if (fs && typeof fs === "object") {
          if (fs.outgoing_request === true) {
            relationship = "pending";
          } else if (fs.following === true) {
            relationship = "following";
          } else {
            relationship = "resolved";
          }
        } else {
          relationship = "resolved";
        }
      }
      return {
        id: user.id,
        fullName: user.full_name ?? "",
        profilePicUrl: user.profile_pic_url ?? "",
        isPrivate: user.is_private === true,
        isVerified: user.is_verified === true,
        relationship,
      };
    }
    if (res.status === 429) {
      return "RATE_LIMIT";
    }
    if (res.status === 404) {
      return "NOT_FOUND";
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export type FriendshipResult = "pending" | "following" | "resolved" | "RATE_LIMIT" | null;

/** Fallback friendship check by user id: "pending" / "following" / "resolved". */
export async function checkFriendship(userId: string): Promise<FriendshipResult> {
  try {
    const res = await fetch(`/api/v1/friendships/show/${userId}/`, {
      headers: IG_HEADERS,
      credentials: "include",
    });
    if (res.status === 429) {
      return "RATE_LIMIT";
    }
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (data.outgoing_request === true || data.outgoing_requested_follow === true) {
      return "pending";
    }
    if (data.following === true) {
      return "following";
    }
    return "resolved";
  } catch (e) {
    console.error(e);
  }
  return null;
}

export type CancelResult = true | false | "RATE_LIMIT";

/**
 * Cancel a pending follow request via POST `/web/friendships/{id}/unfollow/` — exactly what the
 * web UI calls to withdraw a "Requested". `/api/v1/friendships/destroy/` answers HTTP 200 without
 * actually cancelling (silent no-op), which is why a previous version "said yes but did nothing".
 */
export async function cancelFollowRequest(userId: string, csrftoken: string): Promise<CancelResult> {
  try {
    const res = await fetch(`https://www.instagram.com/web/friendships/${userId}/unfollow/`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": csrftoken,
        "x-ig-app-id": IG_APP_ID,
      },
      mode: "cors",
      credentials: "include",
    });
    if (res.status === 429) {
      return "RATE_LIMIT";
    }
    if (!res.ok) {
      return false;
    }
    const data = await res.json().catch(() => null);
    // Returns {"status":"ok"} on success; if the body is unreadable but HTTP was ok, treat as success.
    if (data && typeof data.status === "string") {
      return data.status === "ok";
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Recycle: re-send a follow request via POST `/api/v1/friendships/create/{id}/`.
 * The legacy `/web/friendships/{id}/follow/` endpoint is DEAD (returns Instagram's 404 page).
 */
export async function requestFollow(userId: string, csrftoken: string): Promise<CancelResult> {
  try {
    const url = `/api/v1/friendships/create/${userId}/`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": csrftoken,
        "x-ig-app-id": IG_APP_ID,
        "x-requested-with": "XMLHttpRequest",
      },
      body: `user_id=${encodeURIComponent(userId)}`,
      mode: "cors",
      credentials: "include",
    });
    if (res.status === 429) {
      return "RATE_LIMIT";
    }
    if (!res.ok) {
      return false;
    }
    const data = await res.json().catch(() => null);
    if (data && typeof data.status === "string") {
      return data.status === "ok";
    }
    return true;
  } catch (e) {
    console.error("[requestFollow] exception:", e);
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
export function monthYearLabel(timestampSeconds: number): string {
  if (!timestampSeconds || timestampSeconds < 0) {
    return "Unknown date";
  }
  try {
    return new Date(timestampSeconds * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "Unknown date";
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
  onSuccess: (usernames: string[]) => void,
  onError: (message: string) => void,
): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (!Array.isArray(parsed)) {
        onError("Invalid file: expected a JSON array");
        return;
      }
      const usernames = parsed
        .map((item: unknown) => (typeof item === "string" ? item : (item as { username?: unknown })?.username))
        .filter((u): u is string => typeof u === "string" && u.trim() !== "")
        .map(u => u.trim().replace(/^@/, "").toLowerCase());
      if (usernames.length === 0) {
        onError("No usernames found in the file");
        return;
      }
      onSuccess(Array.from(new Set(usernames)));
    } catch (err) {
      onError(`Failed to parse JSON: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };
  reader.onerror = () => onError("Failed to read the file");
  reader.readAsText(file);
}

/** Clear the cancel whitelist (with confirmation). Returns true if it was cleared. */
export function clearCancelWhitelist(): boolean {
  if (!confirm("Clear the entire cancel whitelist? This cannot be undone.")) {
    return false;
  }
  localStorage.removeItem(CANCEL_WHITELIST_STORAGE_KEY);
  return true;
}
