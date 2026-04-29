import { UserNode } from "../model/user";
import { Timings } from "../model/timings";
import { WHITELISTED_RESULTS_STORAGE_KEY, TIMINGS_STORAGE_KEY } from "../constants/constants";

/**
 * Ekspor whitelist ke file JSON.
 */
export const exportWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  if (whitelistedUsers.length === 0) {
    alert("Tidak ada user di whitelist untuk diekspor");
    return;
  }

  const dataStr = JSON.stringify(whitelistedUsers, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `instagram-whitelist-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Impor whitelist dari file JSON.
 */
export const importWhitelist = (
  file: File,
  onSuccess: (users: readonly UserNode[]) => void,
  onError: (message: string) => void
): void => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const importedUsers = JSON.parse(content) as UserNode[];
      
      // Validasi data hasil impor
      if (!Array.isArray(importedUsers)) {
        onError("Format file tidak valid: seharusnya berupa array user");
        return;
      }
      
      // Validasi struktur dasar user
      const isValid = importedUsers.every(user => 
        user.id && 
        user.username && 
        typeof user.id === "string" && 
        typeof user.username === "string"
      );
      
      if (!isValid) {
        onError("Format file tidak valid: ada user yang tidak punya field wajib (id, username)");
        return;
      }
      
      onSuccess(importedUsers);
    } catch (error) {
      onError(`Gagal membaca JSON: ${error instanceof Error ? error.message : "Error tidak diketahui"}`);
    }
  };
  
  reader.onerror = () => {
    onError("Gagal membaca file");
  };
  
  reader.readAsText(file);
};

/**
 * Hapus semua data whitelist.
 */
export const clearWhitelist = (): void => {
  if (!confirm("Yakin ingin mengosongkan whitelist? Aksi ini tidak bisa dibatalkan.")) {
    return;
  }
  
  localStorage.removeItem(WHITELISTED_RESULTS_STORAGE_KEY);
};

/**
 * Muat whitelist dari localStorage.
 */
export const loadWhitelist = (): readonly UserNode[] => {
  const whitelistedResultsFromStorage = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
  return whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);
};

/**
 * Simpan whitelist ke localStorage.
 */
export const saveWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(whitelistedUsers));
};

/**
 * Gabungkan whitelist hasil impor dengan whitelist yang sudah ada (tanpa duplikat).
 */
export const mergeWhitelists = (
  existing: readonly UserNode[],
  imported: readonly UserNode[]
): readonly UserNode[] => {
  const existingIds = new Set(existing.map(user => user.id));
  const uniqueImported = imported.filter(user => !existingIds.has(user.id));
  return [...existing, ...uniqueImported];
};

const isTimings = (value: unknown): value is Timings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((timing) => typeof timing === "number");
};

/**
 * Muat timings dari localStorage.
 */
export const loadTimings = (): Timings | null => {
  const timingsFromStorage = localStorage.getItem(TIMINGS_STORAGE_KEY);

  if (timingsFromStorage === null) {
    return null;
  }

  try {
    const parsedTimings: unknown = JSON.parse(timingsFromStorage);
    return isTimings(parsedTimings) ? parsedTimings : null;
  } catch {
    return null;
  }
};

/**
 * Simpan timings ke localStorage.
 */
export const saveTimings = (timings: Timings): void => {
  localStorage.setItem(TIMINGS_STORAGE_KEY, JSON.stringify(timings));
};
