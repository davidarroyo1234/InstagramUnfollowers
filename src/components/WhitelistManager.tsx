import React, { useRef, useState } from "react";
import { UserNode } from "../model/user";
import { exportWhitelist, importWhitelist, clearWhitelist, mergeWhitelists } from "../utils/whitelist-manager";
import { Language, t } from "../utils/i18n";

interface WhitelistManagerProps {
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
  lang: Language;
}

export const WhitelistManager = ({ whitelistedUsers, onWhitelistUpdate, lang }: WhitelistManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = () => {
    exportWhitelist(whitelistedUsers);
    setMessage({ type: "success", text: `Exported ${whitelistedUsers.length} users successfully` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    importWhitelist(
      file,
      (importedUsers) => {
        let finalUsers: readonly UserNode[];
        
        if (importMode === "merge") {
          finalUsers = mergeWhitelists(whitelistedUsers, importedUsers);
          const newUsersCount = finalUsers.length - whitelistedUsers.length;
          setMessage({ 
            type: "success", 
            text: `Merged successfully! Added ${newUsersCount} new users (${importedUsers.length} imported, ${importedUsers.length - newUsersCount} duplicates skipped)` 
          });
        } else {
          finalUsers = importedUsers;
          setMessage({ 
            type: "success", 
            text: `Replaced whitelist with ${importedUsers.length} users` 
          });
        }
        
        onWhitelistUpdate(finalUsers);
        setTimeout(() => setMessage(null), 5000);
      },
      (errorMessage) => {
        setMessage({ type: "error", text: errorMessage });
        setTimeout(() => setMessage(null), 5000);
      }
    );

    // Reset file input
    event.currentTarget.value = "";
  };

  const handleClear = () => {
    if (!confirm(t(lang, "clearWhitelistConfirm"))) {
      return;
    }
    clearWhitelist();
    onWhitelistUpdate([]);
    setMessage({ type: "success", text: t(lang, "whitelistCleared") });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h4>{t(lang, "whitelistTitle")}</h4>
        <span className="whitelist-count">
          {whitelistedUsers.length} {whitelistedUsers.length === 1 ? t(lang, "userSingular") : t(lang, "userPlural")}
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
          disabled={whitelistedUsers.length === 0}
          title={whitelistedUsers.length === 0 ? "No users" : t(lang, "exportWhitelist")}
        >
          📥 {t(lang, "exportWhitelist")}
        </button>

        <div className="import-section">
          <div className="import-mode">
            <label>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              {t(lang, "mergeWhitelist")}
            </label>
            <label>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              {t(lang, "replaceWhitelist")}
            </label>
          </div>

          <button 
            className="btn btn-import" 
            onClick={handleImportClick}
            title={t(lang, "importWhitelist")}
          >
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
          className="btn btn-clear" 
          onClick={handleClear}
          disabled={whitelistedUsers.length === 0}
          title={t(lang, "clearWhitelist")}
        >
          🗑️ {t(lang, "clearWhitelist")}
        </button>
      </div>

      <div className="whitelist-info">
        <p className="info-text">
          <strong>💡 Tip:</strong> {t(lang, "whitelistTip")}
        </p>
      </div>
    </div>
  );
};
