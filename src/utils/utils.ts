import { UserNode } from "../model/user";
import { UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_ID } from "../constants/constants";
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

export function getMaxPage(nonFollowersList: readonly UserNode[]): number {
  const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
  return pageCalc < 1 ? 1 : pageCalc;
}

export function getCurrentPageUnfollowers(nonFollowersList: readonly UserNode[], currentPage: number): readonly UserNode[] {
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));
  return sortedList.splice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE);
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
    if(!filter.showWithOutProfilePicture && result.profile_pic_url.includes(WITHOUT_PROFILE_PICTURE_URL_ID)){
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

export function urlGenerator(nextCode?: string): string {
  const ds_user_id = getCookie('ds_user_id');
  if (nextCode === undefined) {
    // First url
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
  }
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}
