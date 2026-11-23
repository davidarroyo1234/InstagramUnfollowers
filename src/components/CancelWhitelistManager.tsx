import React, { useEffect, useRef, useState } from "react";
import { CancelRequest } from "../model/cancel-request";
import { clearCancelWhitelist, exportCancelWhitelist, importCancelWhitelist } from "../utils/cancel-requests";
import { Language, t } from "../utils/i18n";

interface CancelWhitelistManagerProps {
  // Protected usernames (lowercased) currently in the cancel whitelist.
  whitelistUsernames: readonly string[];
  // The loaded requests, used to enrich the export with resolved profile data when available.
  requests: readonly CancelRequest[];
  // Called with the new whitelist (lowercased usernames) after import / clear.
  onWhitelistUpdate: (usernames: readonly string[]) => void;
  lang: Language;
}

// Backup/restore panel for the CANCEL whitelist (the accounts you do NOT want to cancel).
// Mirrors the original tool's "Whitelist Management" section, but works on the cancel-specific
// store (`iucr_whitelist`) so it never mixes with the unfollowers whitelist.
export const CancelWhitelistManager = ({ whitelistUsernames, requests, onWhitelistUpdate, lang }: CancelWhitelistManagerProps) => {
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
    flash("success", count === 1 ? t(lang, "crExportedOne") : t(lang, "crExportedMany", count));
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
      lang,
      imported => {
        if (importMode === "merge") {
          const merged = Array.from(new Set([...whitelistUsernames, ...imported]));
          const added = merged.length - whitelistUsernames.length;
          onWhitelistUpdate(merged);
          flash("success", t(lang, "crMerged", added, imported.length), 5000);
        } else {
          onWhitelistUpdate(imported);
          flash("success", t(lang, "crReplaced", imported.length), 5000);
        }
      },
      errorMessage => flash("error", errorMessage, 5000),
    );
  };

  const handleClear = () => {
    if (clearCancelWhitelist(lang)) {
      onWhitelistUpdate([]);
      flash("success", t(lang, "crWhitelistCleared"));
    }
  };

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h4>{t(lang, "whitelistTitle")}</h4>
        <span className="whitelist-count">
          {whitelistUsernames.length} {t(lang, whitelistUsernames.length === 1 ? "userSingular" : "userPlural")}
        </span>
      </div>

      {message && (
        <div className={`whitelist-message ${message.type === "error" ? "error" : "success"}`}>
          {message.text}
        </div>
      )}

      <div className="whitelist-actions">
        <button
          type="button"
          className="btn btn-export"
          onClick={handleExport}
          disabled={whitelistUsernames.length === 0}
          title={t(lang, whitelistUsernames.length === 0 ? "crNoAccountsToExport" : "crExportWhitelistTitle")}
        >
          📥 {t(lang, "exportWhitelist")}
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
              {t(lang, "mergeWhitelist")}
            </label>
            <label>
              <input
                type="radio"
                name="cancelImportMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              {t(lang, "replaceWhitelist")}
            </label>
          </div>

          <button type="button" className="btn btn-import" onClick={handleImportClick} title={t(lang, "crImportWhitelistTitle")}>
            📤 {t(lang, "importWhitelist")}
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
          type="button"
          className="btn btn-clear"
          onClick={handleClear}
          disabled={whitelistUsernames.length === 0}
          title={t(lang, whitelistUsernames.length === 0 ? "crWhitelistEmpty" : "crClearWhitelistTitle")}
        >
          🗑️ {t(lang, "clearWhitelist")}
        </button>
      </div>

      <div className="whitelist-info">
        <p className="info-text">
          <strong>💡 {t(lang, "crTip")}</strong> {t(lang, "crWhitelistTip")}
        </p>
      </div>
    </div>
  );
};
