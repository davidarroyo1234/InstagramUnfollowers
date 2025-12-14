import { UserNode } from "../model/user";
import { WHITELISTED_RESULTS_STORAGE_KEY } from "../constants/constants";

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
  const whitelistedResultsFromStorage = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
  return whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);
};

/**
 * Save whitelist to localStorage
 */
export const saveWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(whitelistedUsers));
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
