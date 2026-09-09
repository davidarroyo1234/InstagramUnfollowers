import { UserNode } from "../model/user";
import { INSTAGRAM_WEB_APP_ID, UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_IDS } from "../constants/constants";
import { ScanningTab } from "../model/scanning-tab";
import { ScanningFilter } from "../model/scanning-filter";
import { UnfollowLogEntry } from "../model/unfollow-log-entry";
import { UnfollowFilter } from "../model/unfollow-filter";

export async function copyListToClipboard(nonFollowersList: readonly UserNode[]): Promise<void> {
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

  let output = '';
  sortedList.forEach(user => {
    output += user.username + '\n';
  });

  await navigator.clipboard.writeText(output);
  alert('List copied to clipboard!');
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
  return sortedList.splice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE);
}

export function isWithoutProfilePicture(user: UserNode): boolean {
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
    if (!filter.showFollowers && result.follows_viewer) {
      continue;
    }
    if (!filter.showNonFollowers && !result.follows_viewer) {
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

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
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

export function friendshipsUrlGenerator(kind: FriendshipsListKind, maxId?: string): string {
  const viewerId = getCookie('ds_user_id');
  const base = `https://www.instagram.com/api/v1/friendships/${viewerId}/${kind}/?count=200`;
  return maxId === undefined ? base : `${base}&max_id=${encodeURIComponent(maxId)}`;
}

export async function fetchFriendshipsPage(kind: FriendshipsListKind, maxId?: string): Promise<FriendshipsPage> {
  const response = await fetch(friendshipsUrlGenerator(kind, maxId), {
    credentials: 'same-origin',
    headers: { 'X-IG-App-ID': INSTAGRAM_WEB_APP_ID },
  });
  if (!response.ok) {
    throw new Error(`Instagram returned HTTP ${response.status} while fetching ${kind}`);
  }
  return response.json() as Promise<FriendshipsPage>;
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
