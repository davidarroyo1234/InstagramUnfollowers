import React, { ChangeEvent, useState } from "react";
import { State } from "../model/state";
import { assertUnreachable, copyListToClipboard, exportToCSV, exportToJSON, getCurrentPageUnfollowers, getUsersForDisplay } from "../utils/utils";
import { SettingMenu } from "./SettingMenu";
import { SettingIcon } from "./icons/SettingIcon";
import { Timings } from "../model/timings";
import { Logo } from "./icons/Logo";
import { UserNode } from "../model/user";
import { Language, t } from "../utils/i18n";

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
  lang: Language;
  onLanguageChange: (lang: Language) => void;
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
  lang,
  onLanguageChange,
}: ToolBarProps) => {

  const [settingMenu, setSettingMenu] = useState(false);

  return (
    <header className="app-header">
      {state.status === "scanning" && state.results.length === 0 && (
        <div className="scan-warning-banner" role="status">
          <span>{t(lang, "scanNoticeBanner")}</span>
        </div>
      )}
      {isActiveProcess && (
        <div
          className="progressbar"
          style={{ '--progress-width': `${state.status !== 'initial' ? state.percentage : 0}%` } as React.CSSProperties}
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
                if (confirm(t(lang, "goBackConfirm"))) {
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
        <div className="toolbar-actions">
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
                    t(lang, "copiedToClipboard")
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
            {t(lang, "copyList")}
          </button>
          <button
            className="copy-list"
            title={t(lang, "exportJson")}
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
            title={t(lang, "exportCsv")}
            onClick={() => {
              if (state.status === "scanning") {
                exportToCSV(getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter));
              }
            }}
            disabled={state.status !== "scanning"}
          >
            CSV
          </button>
          <button
            className="copy-list"
            type="button"
            title={lang === "en" ? t(lang, "switchToSpanish") : t(lang, "switchToEnglish")}
            onClick={() => onLanguageChange(lang === "en" ? "es" : "en")}
            style={{ fontWeight: "bold" }}
          >
            🌐 {lang.toUpperCase()}
          </button>
          <button
            className="icon-button"
            type="button"
            title={t(lang, "settings")}
            onClick={() => { setSettingMenu(true); }}
          >
            <SettingIcon />
          </button>
        </div>
        <div className="toolbar-search">
          <input
            type="text"
            className="search-bar"
            placeholder={t(lang, "searchPlaceholder")}
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
            <label className="select-toggle">
              <input
                title={t(lang, "selectPage")}
                type="checkbox"
                // Avoid allowing selection only while the scan is actively fetching
                disabled={Boolean(state.isScanningActive)}
                checked={
                  (() => {
                    const displayed = getUsersForDisplay(state.results, state.whitelistedResults, state.currentTab, state.searchTerm, state.filter);
                    const pageUsers = getCurrentPageUnfollowers(displayed, state.page);
                    return pageUsers.length > 0 && pageUsers.every(u => state.selectedResults.some(s => s.id === u.id));
                  })()
                }
                className="toggle-all-checkbox"
                onChange={toggleCurrentePageUsers}
              />
              {t(lang, "selectPage")}
            </label>
          )}
          {state.status === "scanning" && (
            <label className="select-toggle">
              <input
                title={t(lang, "selectAll")}
                type="checkbox"
                // Avoid allowing selection only while the scan is actively fetching
                disabled={Boolean(state.isScanningActive)}
                checked={
                  (() => {
                    const displayed = getUsersForDisplay(
                      state.results,
                      state.whitelistedResults,
                      state.currentTab,
                      state.searchTerm,
                      state.filter,
                    );
                    return displayed.length > 0 && displayed.every(u => state.selectedResults.some(s => s.id === u.id));
                  })()
                }
                className="toggle-all-checkbox"
                onChange={toggleAllUsers}
              />
              {t(lang, "selectAll")}
            </label>
          )}
        </div>
      </div>
      {settingMenu && (
        <SettingMenu
          setSettingState={setSettingMenu}
          currentTimings={currentTimings}
          setTimings={setTimings}
          whitelistedUsers={whitelistedUsers}
          onWhitelistUpdate={onWhitelistUpdate}
          lang={lang}
          onLanguageChange={onLanguageChange}
        />
      )}

    </header>
  );
};
