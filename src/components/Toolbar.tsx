import React, { ChangeEvent, useState } from "react";
import { State } from "../model/state";
import { assertUnreachable, copyListToClipboard, exportToCSV, exportToJSON, getCurrentPageUnfollowers, getUsersForDisplay } from "../utils/utils";
import { SettingMenu } from "./SettingMenu";
import { SettingIcon } from "./icons/SettingIcon";
import { Timings } from "../model/timings";
import { Logo } from "./icons/Logo";
import { UserNode } from "../model/user";

interface ToolBarProps {
  isActiveProcess: boolean;
  state: State;
  setState: (state: State) => void;
  toggleAllUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleCurrentePageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

export const Toolbar = ({
  isActiveProcess,
  state,
  setState,
  toggleAllUsers,
  toggleCurrentePageUsers,
  currentTimings,
  setTimings,
  whitelistedUsers,
  onWhitelistUpdate,
}: ToolBarProps) => {

  // Menu pengaturan (timings + whitelist). Dibuka hanya saat status masih "initial".
  const [setingMenu, setSettingMenu] = useState(false);

  return (
    <header className="app-header">
      {/* Progress bar atas: muncul saat proses scan/berhenti mengikuti berjalan. */}
      {isActiveProcess && (
        <div 
          className="progressbar" 
          style={{ '--progress-width': `${state.status !== 'initial' ? state.percentage : 0}%` } as React.CSSProperties}
        />
      )}
      <div className="app-header-content">
        {/* Logo + judul. Klik untuk reset UI (kalau proses tidak sedang berjalan). */}
        <div
          className="logo"
          onClick={() => {
            if (isActiveProcess) {
              // Hindari reset state saat proses masih berjalan.
              return;
            }
            switch (state.status) {
              case "initial":
                if (confirm("Kembali ke Instagram?")) {
                  location.reload();
                }
                break;

              case "scanning":
              case "unfollowing":
                setState({
                  status: "initial",
                });
            }
          }}
        >
          <Logo />
          <div className="logo-text">
            <span>Instagram</span>
            <span>Tidak Follow Balik</span>
          </div>
        </div>
        {/* Salin daftar username (sesuai filter/tab/search) ke clipboard. */}
        <button
          className="copy-list"
          onClick={() => {
            switch (state.status) {
              case "scanning":
                return copyListToClipboard(
                  getUsersForDisplay(
                    state.results,
                    state.whitelistedResults,
                    state.currentTab,
                    state.searchTerm,
                    state.filter,
                  ),
                );
              case "initial":
              case "unfollowing":
                return;
              default:
                assertUnreachable(state);
            }
          }}
          disabled={state.status === "initial"}
        >
          Salin Daftar
        </button>
        {/* Ekspor hasil yang tampil ke file JSON/CSV. */}
        <button
          className="copy-list"
          title="Ekspor ke JSON"
          onClick={() => {
            if (state.status === "scanning") {
              exportToJSON(getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter));
            }
          }}
          disabled={state.status !== "scanning"}
        >
          JSON
        </button>
        <button
          className="copy-list"
          title="Ekspor ke CSV"
          onClick={() => {
            if (state.status === "scanning") {
              exportToCSV(getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter));
            }
          }}
          disabled={state.status !== "scanning"}
        >
          CSV
        </button>
        {
          // Ikon settings hanya muncul di layar awal.
          state.status === "initial" && <SettingIcon onClickLogo={() => { setSettingMenu(true); }} />
        }
        <input
          type="text"
          className="search-bar"
          placeholder="Cari..."
          disabled={state.status === "initial"}
          value={state.status === "initial" ? "" : state.searchTerm}
          onChange={e => {
            switch (state.status) {
              case "initial":
                return;
              case "scanning":
                return setState({
                  ...state,
                  searchTerm: e.currentTarget.value,
                });
              case "unfollowing":
                return setState({
                  ...state,
                  searchTerm: e.currentTarget.value,
                });
              default:
                assertUnreachable(state);
            }
          }}
        />
        {state.status === "scanning" && (
          <input
            title="Pilih semua di halaman ini"
            type="checkbox"
            // Jangan izinkan "pilih semua" sebelum scan selesai, agar tidak membingungkan
            // (karena daftar masih bertambah saat proses scan berjalan).
            disabled={state.percentage < 100}
            checked={
              (() => {
                const displayed = getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter);
                const pageUsers = getCurrentPageUnfollowers(displayed, state.page);
                // Pastikan halaman tidak kosong dan semua user di halaman ini memang terpilih.
                return pageUsers.length > 0 && pageUsers.every(u => state.selectedResults.some(s => s.id === u.id));
              })()
            }
            className="toggle-all-checkbox"
            // Gunakan onChange untuk checkbox controlled React.
            onChange={toggleCurrentePageUsers}
          />
        )}
        {state.status === "scanning" && (
          <input
            title="Pilih semua"
            type="checkbox"
            // Jangan izinkan "pilih semua" sebelum scan selesai, agar tidak membingungkan.
            disabled={state.percentage < 100}
            checked={
              state.selectedResults.length ===
              getUsersForDisplay(
                state.results,
                state.whitelistedResults,
                state.currentTab,
                state.searchTerm,
                state.filter,
              ).length
            }
            className="toggle-all-checkbox"
            // Gunakan onChange untuk checkbox controlled React.
            onChange={toggleAllUsers}
          />
        )}
      </div>
      {(setingMenu) &&
        // Komponen settings: mengatur delay + whitelist (disimpan di localStorage).
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
          whitelistedUsers={whitelistedUsers}
          onWhitelistUpdate={onWhitelistUpdate}
        ></SettingMenu>
      }

    </header>
  );
};
