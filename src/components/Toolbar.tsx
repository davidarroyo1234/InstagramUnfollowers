import React, { ChangeEvent, useState } from "react";
import { State } from "../model/state";
import { assertUnreachable, copyListToClipboard, getUsersForDisplay } from "../utils/utils";
import { SettingMenu } from "./SettingMenu";
import { SettingIcon } from "./icons/SettingIcon";
import { Timings } from "../model/timings";
import { Logo } from "./icons/Logo";

interface ToolBarProps {
  isActiveProcess: boolean;
  state: State;
  setState: (state: State) => void;
  scanningPaused: boolean;
  toggleAllUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  toggleCurrentePageUsers: (e: ChangeEvent<HTMLInputElement>) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
}

export const Toolbar = ({
  isActiveProcess,
  state,
  setState,
  scanningPaused,
  toggleAllUsers,
  toggleCurrentePageUsers,
  currentTimings,
  setTimings,
}: ToolBarProps) => {

  const [setingMenu, setSettingMenu] = useState(false);

  return (
    <header className="app-header">
      {isActiveProcess && (
        <progress
          className="progressbar"
          value={state.status !== "initial" ? state.percentage : 0}
          max="100"
        />
      )}
      <div className="app-header-content">
        <div
          className="logo"
          onClick={() => {
            if (isActiveProcess) {
              // Avoid resetting state while active process.
              return;
            }
            switch (state.status) {
              case "initial":
                if (confirm("Go back to Instagram?")) {
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
            <span>Unfollowers</span>
          </div>
        </div>
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
          Copy List
        </button>
        {
          state.status === "initial" && <SettingIcon onClickLogo={() => { setSettingMenu(true); }} />
        }
        <input
          type="text"
          className="search-bar"
          placeholder="Search..."
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
            title="Select all on this page"
            type="checkbox"
            // Avoid allowing to select all before scan completed to avoid confusion
            // regarding what exactly is selected while scanning in progress.
            disabled={
              // if paused, allow to select all even if scan is not completed.
              state.percentage < 100 && !scanningPaused
            }
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
            onClick={toggleCurrentePageUsers}
          />
        )}
        {state.status === "scanning" && (
          <input
            title="Select all"
            type="checkbox"
            // Avoid allowing to select all before scan completed to avoid confusion
            // regarding what exactly is selected while scanning in progress.
            disabled={
              // if paused, allow to select all even if scan is not completed.
              state.percentage < 100 && !scanningPaused
            }
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
            onClick={toggleAllUsers}
          />
        )}
      </div>
      {(setingMenu) &&
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
        ></SettingMenu>
      }

    </header>
  );
};
