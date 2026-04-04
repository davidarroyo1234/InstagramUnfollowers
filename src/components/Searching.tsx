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
              &nbsp;Non-Followers
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showFollowers"
                checked={state.filter.showFollowers}
                onChange={handleScanFilter}
              />
              &nbsp;Followers
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showVerified"
                checked={state.filter.showVerified}
                onChange={handleScanFilter}
              />
              &nbsp;Verified
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showPrivate"
                checked={state.filter.showPrivate}
                onChange={handleScanFilter}
              />
              &nbsp;Private
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showWithOutProfilePicture"
                checked={state.filter.showWithOutProfilePicture}
                onChange={handleScanFilter}
              />
              &nbsp;No Pic
            </label>
          </menu>

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
              Verified
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
              Private
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
              No Pic
            </button>
            <button
              className="button-secondary danger-text"
              onClick={() => setState({ ...state, selectedResults: [] })}
            >
              Clear
            </button>
          </div>
          <div className="sidebar-stats">
            <p>Displayed: {usersForDisplay.length}</p>
            <p>Total Scanned: {state.results.length}</p>
            <p className="whitelist-counter">
              <span className="whitelist-badge">★</span> Whitelisted: {state.whitelistedResults.length}
            </p>
          </div>

          {state.percentage === 100 && (
            <div className="sidebar-summary">
              <h4>Scan Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Non-Followers</span>
                  <strong>{state.results.filter(u => !u.follows_viewer).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Verified</span>
                  <strong>{state.results.filter(u => u.is_verified).length}</strong>
                </div>
                <div className="summary-item">
                  <span>Private</span>
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
              {scanningPaused ? "Resume" : "Pause"}
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
        <button
          className="unfollow"
          onClick={() => {
            if (!confirm("Are you sure?")) {
              return;
            }
            //TODO TEMP until types are properly fixed
            // @ts-ignore
            setState(prevState => {
              if (prevState.status !== "scanning") {
                return prevState;
              }
              if (prevState.selectedResults.length === 0) {
                alert("Must select at least a single user to unfollow");
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
          UNFOLLOW ({state.selectedResults.length})
        </button>
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
            Non-Whitelisted
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
            Whitelisted
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
                      // Prevent selecting result when trying to add to whitelist.
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
                      rel="noreferrer"
                    >
                      {user.username}
                    </a>
                    <span className="fs-medium">{user.full_name}</span>
                  </div>
                  {user.is_verified && <div className="verified-badge">✔</div>}
                  {user.is_private && (
                    <div className="flex justify-center w-100">
                      <span className="private-indicator">Private</span>
                    </div>
                  )}
                </div>
                <div className="flex align-center gap-small">
                  <button
                    className={`whitelist-star-button ${state.currentTab === "whitelisted" ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      let whitelistedResults: readonly UserNode[] = [];
                      if (state.whitelistedResults.some(r => r.id === user.id)) {
                        // Remove from whitelist
                        whitelistedResults = state.whitelistedResults.filter(r => r.id !== user.id);
                      } else {
                        // Add to whitelist
                        whitelistedResults = [...state.whitelistedResults, user];
                      }
                      
                      localStorage.setItem(
                        WHITELISTED_RESULTS_STORAGE_KEY,
                        JSON.stringify(whitelistedResults),
                      );
                      setState({ ...state, whitelistedResults });
                    }}
                    title={state.whitelistedResults.some(r => r.id === user.id) ? "Remove from whitelist" : "Add to whitelist"}
                  >
                    ★
                  </button>
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
