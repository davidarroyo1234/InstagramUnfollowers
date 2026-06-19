import React, { useEffect, useRef, useState } from "react";
import { CancelRequest } from "../model/cancel-request";
import { clearCancelWhitelist, exportCancelWhitelist, importCancelWhitelist } from "../utils/cancel-requests";

interface CancelWhitelistManagerProps {
  // Protected usernames (lowercased) currently in the cancel whitelist.
  whitelistUsernames: readonly string[];
  // The loaded requests, used to enrich the export with resolved profile data when available.
  requests: readonly CancelRequest[];
  // Called with the new whitelist (lowercased usernames) after import / clear.
  onWhitelistUpdate: (usernames: readonly string[]) => void;
}

// Backup/restore panel for the CANCEL whitelist (the accounts you do NOT want to cancel).
// Mirrors the original tool's "Whitelist Management" section, but works on the cancel-specific
// store (`iucr_whitelist`) so it never mixes with the unfollowers whitelist.
export const CancelWhitelistManager = ({ whitelistUsernames, requests, onWhitelistUpdate }: CancelWhitelistManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current); }, []);

  const flash = (type: "success" | "error", text: string, ms = 3500) => {
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    setMessage({ type, text });
    flashTimerRef.current = setTimeout(() => setMessage(null), ms);
  };

  const handleExport = () => {
    const count = exportCancelWhitelist(whitelistUsernames, requests);
    flash("success", `Exported ${count} ${count === 1 ? "account" : "accounts"} successfully`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = ""; // allow re-importing the same file
    if (!file) {
      return;
    }
    importCancelWhitelist(
      file,
      imported => {
        if (importMode === "merge") {
          const merged = Array.from(new Set([...whitelistUsernames, ...imported]));
          const added = merged.length - whitelistUsernames.length;
          onWhitelistUpdate(merged);
          flash("success", `Merged successfully! Added ${added} new account(s) (${imported.length} in file)`, 5000);
        } else {
          onWhitelistUpdate(imported);
          flash("success", `Replaced whitelist with ${imported.length} account(s)`, 5000);
        }
      },
      errorMessage => flash("error", errorMessage, 5000),
    );
  };

  const handleClear = () => {
    if (clearCancelWhitelist()) {
      onWhitelistUpdate([]);
      flash("success", "Whitelist cleared successfully");
    }
  };

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h4>Whitelist Management</h4>
        <span className="whitelist-count">
          {whitelistUsernames.length} {whitelistUsernames.length === 1 ? "user" : "users"}
        </span>
      </div>

      {message && (
        <div className={`whitelist-message ${message.type === "error" ? "error" : "success"}`}>
          {message.text}
        </div>
      )}

      <div className="whitelist-actions">
        <button
          className="btn btn-export"
          onClick={handleExport}
          disabled={whitelistUsernames.length === 0}
          title={whitelistUsernames.length === 0 ? "No accounts to export" : "Export the cancel whitelist to a JSON file"}
        >
          📥 Export Whitelist
        </button>

        <div className="import-section">
          <div className="import-mode">
            <label>
              <input
                type="radio"
                name="cancelImportMode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              Merge (add to existing)
            </label>
            <label>
              <input
                type="radio"
                name="cancelImportMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              Replace (overwrite)
            </label>
          </div>

          <button className="btn btn-import" onClick={handleImportClick} title="Import a cancel whitelist from a JSON file">
            📤 Import Whitelist
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        <button
          className="btn btn-clear"
          onClick={handleClear}
          disabled={whitelistUsernames.length === 0}
          title={whitelistUsernames.length === 0 ? "Whitelist is empty" : "Clear the cancel whitelist"}
        >
          🗑️ Clear Whitelist
        </button>
      </div>

      <div className="whitelist-info">
        <p className="info-text">
          <strong>💡 Tip:</strong> Export your whitelist to save it as a backup.
          You can import it later to restore your protected accounts.
        </p>
      </div>
    </div>
  );
};
