import { UserNode } from "../model/user";
import { Timings } from "../model/timings";
import { WHITELISTED_RESULTS_STORAGE_KEY, TIMINGS_STORAGE_KEY, LAST_SCAN_RESULTS_STORAGE_KEY, LAST_SCAN_TIMESTAMP_STORAGE_KEY } from "../constants/constants";

/**
 * Export whitelist to a JSON file
 */
export const exportWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  if (whitelistedUsers.length === 0) {
    alert("No users in whitelist to export");
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
 * Import whitelist from a JSON file
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
      
      // Validate the imported data
      if (!Array.isArray(importedUsers)) {
        onError("Invalid file format: Expected an array of users");
        return;
      }
      
      // Basic validation of user structure
      const isValid = importedUsers.every(user => 
        user.id && 
        user.username && 
        typeof user.id === "string" && 
        typeof user.username === "string"
      );
      
      if (!isValid) {
        onError("Invalid file format: Users missing required fields (id, username)");
        return;
      }
      
      onSuccess(importedUsers);
    } catch (error) {
      onError(`Failed to parse JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  reader.onerror = () => {
    onError("Failed to read file");
  };
  
  reader.readAsText(file);
};

/**
 * Clear all whitelist data
 */
export const clearWhitelist = (): void => {
  if (!confirm("Are you sure you want to clear the entire whitelist? This action cannot be undone.")) {
    return;
  }
  
  localStorage.removeItem(WHITELISTED_RESULTS_STORAGE_KEY);
};

/**
 * Load whitelist from localStorage
 */
export const loadWhitelist = (): readonly UserNode[] => {
  try {
    const whitelistedResultsFromStorage = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
    if (!whitelistedResultsFromStorage) {
      return [];
    }
    const parsed = JSON.parse(whitelistedResultsFromStorage);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Save whitelist to localStorage
 */
export const saveWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  try {
    localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(whitelistedUsers));
  } catch (e) {
    console.warn("Could not save whitelist to storage:", e);
  }
};

/**
 * Merge imported whitelist with existing whitelist (avoiding duplicates)
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
 * Load timings from localStorage
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
 * Save timings to localStorage
 */
export const saveTimings = (timings: Timings): void => {
  try {
    localStorage.setItem(TIMINGS_STORAGE_KEY, JSON.stringify(timings));
  } catch (e) {
    console.warn("Could not save timings to storage:", e);
  }
};

/**
 * Cache completed scan results locally for instant recall
 */
export const saveCachedScanResults = (results: readonly UserNode[]): void => {
  try {
    localStorage.setItem(LAST_SCAN_RESULTS_STORAGE_KEY, JSON.stringify(results));
    localStorage.setItem(LAST_SCAN_TIMESTAMP_STORAGE_KEY, String(Date.now()));
  } catch (e) {
    console.warn("Could not cache scan results:", e);
  }
};

/**
 * Load cached scan results from localStorage
 */
export const loadCachedScanResults = (): { results: readonly UserNode[]; timestamp: number } | null => {
  try {
    const raw = localStorage.getItem(LAST_SCAN_RESULTS_STORAGE_KEY);
    const time = localStorage.getItem(LAST_SCAN_TIMESTAMP_STORAGE_KEY);
    if (!raw || !time) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    return {
      results: parsed as readonly UserNode[],
      timestamp: Number(time),
    };
  } catch {
    return null;
  }
};
