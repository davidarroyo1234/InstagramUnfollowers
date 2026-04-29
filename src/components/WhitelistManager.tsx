import React, { useRef, useState } from "react";
import { UserNode } from "../model/user";
import { exportWhitelist, importWhitelist, clearWhitelist, mergeWhitelists } from "../utils/whitelist-manager";

interface WhitelistManagerProps {
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

/**
 * Modul untuk mengelola whitelist (daftar akun yang "dilindungi").
 *
 * Konsep whitelist di tool ini:
 * - Kalau sebuah akun ada di whitelist, kamu bisa memisahkannya ke tab "Whitelist".
 * - Tujuannya agar akun penting (teman/keluarga/klien, dll) tidak ikut berhenti kamu ikuti tanpa sengaja.
 * - Data whitelist disimpan di `localStorage`, jadi tetap ada walau refresh browser.
 */
export const WhitelistManager = ({ whitelistedUsers, onWhitelistUpdate }: WhitelistManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mode import:
  // - "merge": gabungkan dengan whitelist saat ini (duplikasi di-skip)
  // - "replace": timpa whitelist dengan isi file
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = () => {
    exportWhitelist(whitelistedUsers);
    setMessage({ type: "success", text: `Berhasil mengekspor ${whitelistedUsers.length} user` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportClick = () => {
    // Trigger file picker (input type="file" disembunyikan).
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    // Baca dan validasi file JSON, lalu update whitelist sesuai mode import.
    importWhitelist(
      file,
      (importedUsers) => {
        let finalUsers: readonly UserNode[];
        
        if (importMode === "merge") {
          finalUsers = mergeWhitelists(whitelistedUsers, importedUsers);
          const newUsersCount = finalUsers.length - whitelistedUsers.length;
          setMessage({ 
            type: "success", 
            text: `Berhasil digabung! Menambahkan ${newUsersCount} user baru (${importedUsers.length} diimpor, ${importedUsers.length - newUsersCount} duplikat dilewati)` 
          });
        } else {
          finalUsers = importedUsers;
          setMessage({ 
            type: "success", 
            text: `Whitelist diganti dengan ${importedUsers.length} user` 
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

    // Reset input file (agar bisa memilih file yang sama lagi kalau perlu)
    event.currentTarget.value = "";
  };

  const handleClear = () => {
    clearWhitelist();
    onWhitelistUpdate([]);
    setMessage({ type: "success", text: "Whitelist berhasil dikosongkan" });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="whitelist-manager">
      <div className="whitelist-header">
        <h4>Kelola Whitelist</h4>
        <span className="whitelist-count">
          {whitelistedUsers.length} {whitelistedUsers.length === 1 ? "user" : "user"}
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
          title={whitelistedUsers.length === 0 ? "Tidak ada user untuk diekspor" : "Ekspor whitelist ke file JSON"}
        >
          📥 Ekspor Whitelist
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
              Gabungkan (tambah ke yang sudah ada)
            </label>
            <label>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              Ganti (timpa)
            </label>
          </div>

          <button 
            className="btn btn-import" 
            onClick={handleImportClick}
            title="Impor whitelist dari file JSON"
          >
            📤 Impor Whitelist
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
          title={whitelistedUsers.length === 0 ? "Whitelist kosong" : "Hapus semua data whitelist"}
        >
          🗑️ Kosongkan Whitelist
        </button>
      </div>

      <div className="whitelist-info">
        <p className="info-text">
          <strong>💡 Tips:</strong> Ekspor whitelist untuk menyimpan cadangan.
          Nanti kamu bisa impor lagi untuk mengembalikan daftar user.
        </p>
      </div>
    </div>
  );
};
