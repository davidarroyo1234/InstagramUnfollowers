import React from "react";
import { assertUnreachable, getCurrentPageUnfollowers, getMaxPage, getUsersForDisplay, isWithoutProfilePicture } from "../utils/utils";
import { State } from "../model/state";
import { UserNode } from "../model/user";
import { WHITELISTED_RESULTS_STORAGE_KEY } from "../constants/constants";
import { Language, t } from "../utils/i18n";


export interface SearchingProps {
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  pauseScan: () => void;
  handleScanFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleUser: (checked: boolean, user: UserNode) => void;
  UserCheckIcon: React.FC;
  UserUncheckIcon: React.FC;
  lang: Language;
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
  lang,
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

  const handleSelectedWhitelistAction = () => {
    if (state.selectedResults.length === 0) {
      return;
    }

    let whitelistedResults: readonly UserNode[] = [];

    switch (state.currentTab) {
      case "non_whitelisted": {
        const existingIds = new Set(state.whitelistedResults.map(user => user.id));
        const usersToAdd = state.selectedResults.filter(user => !existingIds.has(user.id));
        whitelistedResults = [...state.whitelistedResults, ...usersToAdd];
        break;
      }

      case "whitelisted": {
        const selectedIds = new Set(state.selectedResults.map(user => user.id));
        whitelistedResults = state.whitelistedResults.filter(user => !selectedIds.has(user.id));
        break;
      }

      default:
        assertUnreachable(state.currentTab);
    }

    localStorage.setItem(
      WHITELISTED_RESULTS_STORAGE_KEY,
      JSON.stringify(whitelistedResults),
    );
    setState({
      ...state,
      whitelistedResults,
      selectedResults: [],
    });
  };

  return (
    <section className="workspace-layout">
      <aside className="app-sidebar">
        <div className="sidebar-content">
          <div className="panel-heading">
            <span>{t(lang, "scanner")}</span>
            <strong>{state.percentage}%</strong>
          </div>
          <menu className="sidebar-filters-grid">
            <p>{t(lang, "filters")}</p>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showVerified"
                checked={state.filter.showVerified}
                onChange={handleScanFilter}
              />
              &nbsp;{t(lang, "verified")}
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showPrivate"
                checked={state.filter.showPrivate}
                onChange={handleScanFilter}
              />
              &nbsp;{t(lang, "private")}
            </label>
            <label className="badge m-small">
              <input
                type="checkbox"
                name="showWithOutProfilePicture"
                checked={state.filter.showWithOutProfilePicture}
                onChange={handleScanFilter}
              />
              &nbsp;{t(lang, "noPic")}
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
              {t(lang, "verified")}
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
              {t(lang, "private")}
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
              {t(lang, "noPic")}
            </button>
            <button
              className="button-secondary danger-text"
              onClick={() => setState({ ...state, selectedResults: [] })}
            >
              {t(lang, "clear")}
            </button>
          </div>
          {state.selectedResults.length > 0 && (
            <button
              className="button-secondary sidebar-whitelist-action"
              onClick={handleSelectedWhitelistAction}
            >
              {state.currentTab === "non_whitelisted" ? t(lang, "addToWhitelist") : t(lang, "removeFromWhitelist")} ({state.selectedResults.length})
            </button>
          )}
          <div className="sidebar-stats metric-stack">
            <p><span>{t(lang, "displayed")}</span><strong>{usersForDisplay.length}</strong></p>
            <p><span>{t(lang, "totalScanned")}</span><strong>{state.results.length}</strong></p>
            <p className="whitelist-counter">
              <span>{t(lang, "whitelist")}</span><strong>★ {state.whitelistedResults.length}</strong>
            </p>
          </div>

          {!state.isScanningActive && state.results.length > 0 && (
            <div className="sidebar-summary">
              <h4>{t(lang, "scanSummary")}</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span>{t(lang, "nonFollowers")}</span>
                  <strong>{state.results.filter(u => !u.follows_viewer).length}</strong>
                </div>
                <div className="summary-item">
                  <span>{t(lang, "verified")}</span>
                  <strong>{state.results.filter(u => u.is_verified).length}</strong>
                </div>
                <div className="summary-item">
                  <span>{t(lang, "private")}</span>
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
              {scanningPaused ? t(lang, "resume") : t(lang, "pause")}
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
          disabled={state.scanIncomplete || Boolean(state.isScanningActive) || state.selectedResults.length === 0}
          title={
            state.isScanningActive
              ? t(lang, "scanInProgressWait")
              : state.scanIncomplete
              ? t(lang, "unfollowDisabledPartialScan")
              : undefined
          }
          onClick={() => {
            if (state.scanIncomplete) {
              alert(t(lang, "unfollowDisabledPartialScan"));
              return;
            }
            if (!confirm(t(lang, "unfollowConfirm"))) {
              return;
            }
            //TODO TEMP until types are properly fixed
            // @ts-ignore
            setState(prevState => {
              if (prevState.status !== "scanning") {
                return prevState;
              }
              if (prevState.selectedResults.length === 0) {
                alert(t(lang, "selectAtLeastOneUser"));
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
          {t(lang, "unfollowCount", state.selectedResults.length)}
        </button>
      </aside>
      <article className="results-container">
        {state.scanIncomplete && (
          <div className="scan-warning-banner scan-incomplete-banner" role="alert">
            <span>{t(lang, "partialScanWarning")}</span>
          </div>
        )}
        <nav className="tabs-container">
          <button
            type="button"
            className={`tab ${state.currentTab === "non_whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "non_whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "non_whitelisted",
                page: 1,
              });
            }}
          >
            {t(lang, "nonWhitelistedTab")}
          </button>
          <button
            type="button"
            className={`tab ${state.currentTab === "whitelisted" ? "tab-active" : ""}`}
            onClick={() => {
              if (state.currentTab === "whitelisted") {
                return;
              }
              setState({
                ...state,
                currentTab: "whitelisted",
                page: 1,
              });
            }}
          >
            {t(lang, "whitelistedTab")}
          </button>
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
                      <span className="private-indicator">{t(lang, "private")}</span>
                    </div>
                  )}
                </div>
                <div className="flex align-center gap-small">
                  <input
                    className="account-checkbox"
                    type="checkbox"
                    disabled={Boolean(state.isScanningActive)}
                    checked={state.selectedResults.some(result => result.id === user.id)}
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
