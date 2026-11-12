import React from "react";
import { assertUnreachable, getCurrentPageUnfollowers, getMaxPage, getUsersForDisplay, isWithoutProfilePicture } from "../utils/utils";
import { State } from "../model/state";
import { UserNode } from "../model/user";
import { mergeWhitelists, saveWhitelist } from "../utils/whitelist-manager";
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

  const maxPage = getMaxPage(usersForDisplay);
  const currentPage = Math.min(state.page, maxPage);

  const onNewLetter = (firstLetter: string) => {
    currentLetter = firstLetter;
    return <div className="alphabet-character">{currentLetter}</div>;
  };

  const removeFromWhitelist = (
    list: readonly UserNode[],
    toRemove: readonly UserNode[],
  ): readonly UserNode[] => {
    const removeIds = new Set(toRemove.map(user => user.id));
    const removeUsernames = new Set(toRemove.map(user => user.username.trim().toLowerCase()).filter(Boolean));
    return list.filter(
      user => !removeIds.has(user.id) && !removeUsernames.has(user.username.trim().toLowerCase()),
    );
  };

  const handleSelectedWhitelistAction = () => {
    if (state.selectedResults.length === 0) {
      return;
    }

    let whitelistedResults: readonly UserNode[] = [];

    switch (state.currentTab) {
      case "non_whitelisted": {
        whitelistedResults = mergeWhitelists(state.whitelistedResults, state.selectedResults);
        break;
      }

      case "whitelisted": {
        whitelistedResults = removeFromWhitelist(state.whitelistedResults, state.selectedResults);
        break;
      }

      default:
        assertUnreachable(state.currentTab);
    }

    saveWhitelist(whitelistedResults);
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
              disabled={Boolean(state.isScanningActive)}
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
              disabled={Boolean(state.isScanningActive)}
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
              disabled={Boolean(state.isScanningActive)}
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
              disabled={Boolean(state.isScanningActive)}
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
            {state.isScanningActive && state.scanPhase === "followers" ? (
              <>
                <p><span>{t(lang, "phase")}</span><strong>1 / 2</strong></p>
                <p><span>{t(lang, "indexedFollowers")}</span><strong>{state.followersIndexed ?? 0}</strong></p>
              </>
            ) : (
              <>
                <p><span>{t(lang, "displayed")}</span><strong>{usersForDisplay.length}</strong></p>
                <p><span>{t(lang, "totalScanned")}</span><strong>{state.totalScanned ?? state.results.length}</strong></p>
              </>
            )}
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
              disabled={!state.isScanningActive}
              onClick={pauseScan}
            >
              {scanningPaused ? t(lang, "resume") : t(lang, "pause")}
            </button>
            <div className="sidebar-pagination">
              <div className="pagination-controls">
                <a
                  onClick={() => {
                    if (currentPage - 1 > 0) {
                      setState({
                        ...state,
                        page: currentPage - 1,
                      });
                    }
                  }}
                >
                  ❮
                </a>
                <span>
                  {currentPage}/{maxPage}
                </span>
                <a
                  onClick={() => {
                    if (currentPage < maxPage) {
                      setState({
                        ...state,
                        page: currentPage + 1,
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
        {state.isScanningActive && state.scanPhase === "followers" && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>📥</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "8px", color: "#f8fafc" }}>
              {t(lang, "indexingPhaseTitle")}
            </h3>
            <p style={{ maxWidth: "480px", margin: "0 auto", lineHeight: "1.6", fontSize: "0.95rem" }}>
              {t(lang, "indexingPhaseDesc", state.followersIndexed ?? 0)}
            </p>
          </div>
        )}
        {usersForDisplay.length === 0 && (!state.isScanningActive || state.scanPhase !== "followers") && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
            <p style={{ fontSize: "1rem" }}>{t(lang, "noUsersFound")}</p>
          </div>
        )}
        {getCurrentPageUnfollowers(usersForDisplay, currentPage).map(user => {
          const firstLetter = user.username.substring(0, 1).toUpperCase();
          return (
            <React.Fragment key={user.id}>
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
                          whitelistedResults = mergeWhitelists(state.whitelistedResults, [user]);
                          break;

                        case "whitelisted":
                          whitelistedResults = removeFromWhitelist(state.whitelistedResults, [user]);
                          break;

                        default:
                          assertUnreachable(state.currentTab);
                      }
                      saveWhitelist(whitelistedResults);
                      setState({
                        ...state,
                        whitelistedResults,
                        selectedResults: state.selectedResults.filter(selected => selected.id !== user.id),
                      });
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
            </React.Fragment>
          );
        })}
      </article>
    </section>
  );
};
