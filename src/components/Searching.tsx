import React from "react";
import { assertUnreachable, getCurrentPageUnfollowers, getMaxPage, getUsersForDisplay, isWithoutProfilePicture } from "../utils/utils";
import { State } from "../model/state";
import { UserNode } from "../model/user";
import { WHITELISTED_RESULTS_STORAGE_KEY } from "../constants/constants";


export interface SearchingProps {
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  pauseScan: () => void;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUser: (checked: boolean, user: UserNode) => void;
  UserCheckIcon: React.FC;
  UserUncheckIcon: React.FC;
}

/**
 * Halaman "Scanning" (setelah tombol MULAI ditekan).
 *
 * Fitur utama di layar ini:
 * - Filter hasil (non-followers, followers, verified, private, tanpa foto).
 * - Pilih user untuk antrian berhenti mengikuti (checkbox).
 * - Whitelist: user yang di-whitelist tidak akan tampil di tab non-whitelist, dan bisa kamu lindungi dari berhenti mengikuti.
 * - Pagination supaya daftar tidak terlalu panjang.
 * - Tombol berhenti mengikuti: bisa proses yang dipilih, atau semua yang sedang ditampilkan (sesuai filter & tab).
 */
export const Searching = ({
  state,
  setState,
  scanningPaused,
  pauseScan,
  handleScanFilter,
  toggleUser,
  UserCheckIcon,
  UserUncheckIcon,
}: SearchingProps) => {
  if (state.status !== "scanning") {
    return null;
  }

  const usersForDisplay = getUsersForDisplay(
    state.results,
    state.whitelistedResults,
    state.currentTab,
    state.searchTerm,
    state.filter,
  );
  let currentLetter = "";

  const onNewLetter = (firstLetter: string) => {
    currentLetter = firstLetter;
    return <div className="alphabet-character">{currentLetter}</div>;
  };

  return (
    <section className="flex">
      <aside className="app-sidebar">
        <div className="sidebar-content">
          <menu className="sidebar-filters-grid">
            <p>Filter</p>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showNonFollowers"
                checked={state.filter.showNonFollowers}
                onChange={handleScanFilter}
              />
              &nbsp;Tidak Follow Balik
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showFollowers"
                checked={state.filter.showFollowers}
                onChange={handleScanFilter}
              />
              &nbsp;Mengikuti Kamu (Saling Follow)
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showVerified"
                checked={state.filter.showVerified}
                onChange={handleScanFilter}
              />
              &nbsp;Terverifikasi
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showPrivate"
                checked={state.filter.showPrivate}
                onChange={handleScanFilter}
              />
              &nbsp;Privat
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showWithOutProfilePicture"
                checked={state.filter.showWithOutProfilePicture}
                onChange={handleScanFilter}
              />
              &nbsp;Tanpa Foto
            </label>
          </menu>

          {/* Tombol cepat untuk memilih user berdasarkan kategori tertentu (sesuai yang sedang ditampilkan). */}
          <div className="sidebar-buttons-grid">
            <button
              className="button-secondary"
              onClick={() => {
                const verifiedUsers = usersForDisplay.filter(u => u.is_verified);
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = verifiedUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              Pilih Terverifikasi
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                const privateUsers = usersForDisplay.filter(u => u.is_private);
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = privateUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              Pilih Privat
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                const noPicUsers = usersForDisplay.filter(u => isWithoutProfilePicture(u));
                const currentIds = new Set(state.selectedResults.map(u => u.id));
                const toAdd = noPicUsers.filter(u => !currentIds.has(u.id));
                setState({ ...state, selectedResults: [...state.selectedResults, ...toAdd] });
              }}
            >
              Pilih Tanpa Foto
            </button>
            <button
              className="button-secondary danger-text"
              onClick={() => setState({ ...state, selectedResults: [] })}
            >
              Kosongkan Pilihan
            </button>
          </div>
          <div className="sidebar-stats">
            <p>Ditampilkan: {usersForDisplay.length}</p>
            <p>Total Dipindai: {state.results.length}</p>
            <p className="whitelist-counter">
              <span className="whitelist-badge">★</span> Whitelist: {state.whitelistedResults.length}
            </p>
          </div>

          {state.percentage === 100 && (
            <div className="sidebar-summary">
              <h4>Ringkasan Pemindaian</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Tidak Follow Balik</span>
                  <strong>{state.results.filter(u => !u.follows_viewer).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Terverifikasi</span>
                  <strong>{state.results.filter(u => u.is_verified).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Privat</span>
                  <strong>{state.results.filter(u => u.is_private).length}</strong>
                </div>
              </div>
            </div>
          )}
          <div className="sidebar-footer-controls">
            <button
              className="button-control button-pause"
              onClick={pauseScan}
            >
              {scanningPaused ? "Lanjutkan" : "Jeda"}
            </button>
            <div className="sidebar-pagination">
              <div className="pagination-controls">
                <a
                  onClick={() => {
                    if (state.page - 1 > 0) {
                      setState({
                        ...state,
                        page: state.page - 1,
                      });
                    }
                  }}
                >
                  ❮
                </a>
                <span>
                  {state.page}/{getMaxPage(usersForDisplay)}
                </span>
                <a
                  onClick={() => {
                    if (state.page < getMaxPage(usersForDisplay)) {
                      setState({
                        ...state,
                        page: state.page + 1,
                      });
                    }
                  }}
                >
                  ❯
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="unfollow-actions">
          {/* Berhenti mengikuti semua user yang sedang ditampilkan (sesuai tab + filter + pencarian). */}
          <button
            className="unfollow"
            disabled={state.percentage < 100 || usersForDisplay.length === 0}
            onClick={() => {
              const tabLabel = state.currentTab === "whitelisted" ? "WHITELIST" : "BUKAN WHITELIST";
              if (!confirm(`Yakin ingin berhenti mengikuti SEMUA user yang ditampilkan di tab ${tabLabel} (${usersForDisplay.length} user)?`)) {
                return;
              }
              if (state.currentTab === "whitelisted") {
                if (!confirm("PERINGATAN: Kamu sedang berada di tab WHITELIST. Ini akan berhenti mengikuti user yang kamu whitelist. Lanjutkan?")) {
                  return;
                }
              }
              // TODO: sementara sampai typing State dirapikan
              // @ts-ignore
              setState(prevState => {
                if (prevState.status !== "scanning") {
                  return prevState;
                }
                const allDisplayedUsers = getUsersForDisplay(
                  prevState.results,
                  prevState.whitelistedResults,
                  prevState.currentTab,
                  prevState.searchTerm,
                  prevState.filter,
                );
                if (allDisplayedUsers.length === 0) {
                  alert("Tidak ada user untuk berhenti diikuti dengan filter saat ini.");
                  return prevState;
                }
                const newState: State = {
                  ...prevState,
                  status: "unfollowing",
                  percentage: 0,
                  selectedResults: allDisplayedUsers,
                  unfollowLog: [],
                  filter: {
                    showSucceeded: true,
                    showFailed: true,
                  },
                };
                return newState;
              });
            }}
          >
            BERHENTI MENGIKUTI SEMUA ({usersForDisplay.length})
          </button>
          {/* Berhenti mengikuti hanya user yang kamu centang (selectedResults). */}
          <button
            className="unfollow"
            onClick={() => {
              if (!confirm("Yakin ingin mulai berhenti mengikuti?")) {
                return;
              }
              // TODO: sementara sampai typing State dirapikan
              // @ts-ignore
              setState(prevState => {
                if (prevState.status !== "scanning") {
                  return prevState;
                }
                if (prevState.selectedResults.length === 0) {
                  alert("Pilih minimal 1 user untuk berhenti diikuti.");
                  return prevState;
                }
                const newState: State = {
                  ...prevState,
                  status: "unfollowing",
                  percentage: 0,
                  unfollowLog: [],
                  filter: {
                    showSucceeded: true,
                    showFailed: true,
                  },
                };
                return newState;
              });
            }}
          >
            BERHENTI MENGIKUTI DIPILIH ({state.selectedResults.length})
          </button>
        </div>
      </aside>
      <article className="results-container">
        <nav className="tabs-container">
          <div
            className={`tab ${state.currentTab === "non_whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "non_whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "non_whitelisted",
                selectedResults: [],
              });
            }}
          >
            Bukan Whitelist
          </div>
          <div
            className={`tab ${state.currentTab === "whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "whitelisted",
                selectedResults: [],
              });
            }}
          >
            Whitelist
          </div>
        </nav>
        {getCurrentPageUnfollowers(usersForDisplay, state.page).map(user => {
          const firstLetter = user.username.substring(0, 1).toUpperCase();
          return (
            <>
              {firstLetter !== currentLetter && onNewLetter(firstLetter)}
              <label className="result-item">
                <div className="flex grow align-center">
                  <div
                    className="avatar-container"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      // Cegah item terpilih saat user berniat menambah/menghapus whitelist via klik avatar.
                      e.preventDefault();
                      e.stopPropagation();
                      let whitelistedResults: readonly UserNode[] = [];
                      switch (state.currentTab) {
                        case "non_whitelisted":
                          whitelistedResults = [...state.whitelistedResults, user];
                          break;

                        case "whitelisted":
                          whitelistedResults = state.whitelistedResults.filter(
                            result => result.id !== user.id,
                          );
                          break;

                        default:
                          assertUnreachable(state.currentTab);
                      }
                      localStorage.setItem(
                        WHITELISTED_RESULTS_STORAGE_KEY,
                        JSON.stringify(whitelistedResults),
                      );
                      setState({ ...state, whitelistedResults });
                    }}
                  >
                    <img
                      className="avatar"
                      alt={user.username}
                      src={user.profile_pic_url}
                    />
                    <div className="avatar-preview">
                      <img src={user.profile_pic_url.replace("s150x150/", "s320x320/")} alt={user.username} />
                    </div>
                    <span className="avatar-icon-overlay-container">
                      {state.currentTab === "non_whitelisted" ? (
                        <UserCheckIcon />
                      ) : (
                        <UserUncheckIcon />
                      )}
                    </span>
                  </div>
                  <div className="flex column m-medium">
                    <a
                      className="fs-xlarge"
                      target="_blank"
                      href={`/${user.username}`}
                      rel="noopener noreferrer"
                    >
                      {user.username}
                    </a>
                    <span className="fs-medium">{user.full_name}</span>
                  </div>
                  {user.is_verified && <div className="verified-badge">✔</div>}
                  {user.is_private && (
                    <div className="flex justify-center w-100">
                      <span className="private-indicator">Privat</span>
                    </div>
                  )}
                </div>
                <div className="flex align-center gap-small">
                  {/* Tombol bintang: tambah/hapus user ke whitelist. */}
                  <button
                    className={`whitelist-star-button ${state.currentTab === "whitelisted" ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      let whitelistedResults: readonly UserNode[] = [];
                      if (state.whitelistedResults.some(r => r.id === user.id)) {
                        // Hapus dari whitelist
                        whitelistedResults = state.whitelistedResults.filter(r => r.id !== user.id);
                      } else {
                        // Tambahkan ke whitelist
                        whitelistedResults = [...state.whitelistedResults, user];
                      }
                      
                      localStorage.setItem(
                        WHITELISTED_RESULTS_STORAGE_KEY,
                        JSON.stringify(whitelistedResults),
                      );
                      setState({ ...state, whitelistedResults });
                    }}
                    title={state.whitelistedResults.some(r => r.id === user.id) ? "Hapus dari whitelist" : "Tambahkan ke whitelist"}
                  >
                    ★
                  </button>
                  {/* Checkbox untuk memasukkan user ke antrian berhenti mengikuti. */}
                  <input
                    className="account-checkbox"
                    type="checkbox"
                    checked={state.selectedResults.indexOf(user) !== -1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleUser(e.currentTarget.checked, user)}
                  />
                </div>
              </label>
            </>
          );
        })}
      </article>
    </section>
  );
};
