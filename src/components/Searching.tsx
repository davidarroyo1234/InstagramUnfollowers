import React from "react";
import { assertUnreachable, getCurrentPageUnfollowers, getMaxPage, getUsersForDisplay } from "../utils/utils";
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
        <menu className="flex column m-clear p-clear">
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
            &nbsp;Without Profile Picture
          </label>
        </menu>
        <div className="grow">
          <p>Displayed: {usersForDisplay.length}</p>
          <p>Total: {state.results.length}</p>
        </div>
        {/* Scan controls */}
        <div className="controls">
          <button
            className="button-control button-pause"
            onClick={pauseScan}
          >
            {scanningPaused ? "Resume" : "Pause"}
          </button>
        </div>
        <div className="grow t-center">
          <p>Pages</p>
          <a
            onClick={() => {
              if (state.page - 1 > 0) {
                setState({
                  ...state,
                  page: state.page - 1,
                });
              }
            }}
            className="p-medium"
          >
            ❮
          </a>
          <span>
            {state.page}&nbsp;/&nbsp;{getMaxPage(usersForDisplay)}
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
            className="p-medium"
          >
            ❯
          </a>
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
                    onClick={e => {
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
                      <span className="private-indicator">Private</span>
                    </div>
                  )}
                </div>
                <input
                  className="account-checkbox"
                  type="checkbox"
                  checked={state.selectedResults.indexOf(user) !== -1}
                  onChange={e => toggleUser(e.currentTarget.checked, user)}
                />
              </label>
            </>
          );
        })}
      </article>
    </section>
  );
};
