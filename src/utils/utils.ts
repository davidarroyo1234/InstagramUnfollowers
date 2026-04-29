import { UserNode } from "../model/user";
import { UNFOLLOWERS_PER_PAGE, WITHOUT_PROFILE_PICTURE_URL_IDS } from "../constants/constants";
import { ScanningTab } from "../model/scanning-tab";
import { ScanningFilter } from "../model/scanning-filter";
import { UnfollowLogEntry } from "../model/unfollow-log-entry";
import { UnfollowFilter } from "../model/unfollow-filter";

export async function copyListToClipboard(nonFollowersList: readonly UserNode[]): Promise<void> {
  // Salin daftar username (urut A-Z) ke clipboard agar mudah ditempel ke tempat lain.
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

  let output = '';
  sortedList.forEach(user => {
    output += user.username + '\n';
  });

  await navigator.clipboard.writeText(output);
  alert('Daftar berhasil disalin ke clipboard!');
}

export function exportToJSON(users: readonly UserNode[]) {
  // Ekspor daftar user yang sedang ditampilkan ke file JSON.
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", "instagram_unfollowers.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function exportToCSV(users: readonly UserNode[]) {
  // Ekspor daftar user yang sedang ditampilkan ke file CSV (bisa dibuka di Excel/Google Sheets).
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
 * Jika kamu membuat switch-case dengan jumlah case yang terbatas, gunakan fungsi ini di
 * clause `default` untuk memastikan semua case ditangani (exhaustive checking).
 *
 * Manfaatnya:
 * - Saat kamu menambah nilai baru di tipe (mis. status baru), TypeScript akan memaksa
 *   kamu untuk menambah case-nya juga.
 * - Ini mencegah bug karena ada case yang lupa ditangani.
 */
export function assertUnreachable(_value: never): never {
  throw new Error('Kode seharusnya tidak pernah mencapai bagian ini');
}

export function sleep(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function getCookie(name: string): string | null {
  // Baca nilai cookie dari `document.cookie` (format: "a=1; b=2; ...").
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) {
    return null;
  }
  return parts.pop()!.split(';').shift()!;
}

export function urlGenerator(nextCode?: string): string {
  // Endpoint GraphQL Instagram yang dipakai untuk mengambil daftar akun yang kamu follow.
  // Catatan: `query_hash` bisa berubah sewaktu-waktu dari pihak Instagram, jadi tool ini bisa tiba-tiba tidak bekerja.
  const ds_user_id = getCookie('ds_user_id');
  if (nextCode === undefined) {
    // URL pertama (fetch awal).
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
  }
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

export function unfollowUserUrlGenerator(idToUnfollow: string): string {
  // Endpoint web untuk berhenti mengikuti user tertentu.
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}
