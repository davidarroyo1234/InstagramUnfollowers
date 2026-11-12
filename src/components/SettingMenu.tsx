import React, { useState } from "react";
import { Timings } from "../model/timings";
import { UserNode } from "../model/user";
import { WhitelistManager } from "./WhitelistManager";
import {
  DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH,
  DEFAULT_UNFOLLOWS_PER_BATCH,
  DEFAULT_USERS_PER_SEARCH_CYCLE,
} from "../constants/constants";
import { Language, t } from "../utils/i18n";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const SettingMenu = ({
  setSettingState,
  currentTimings,
  setTimings,
  whitelistedUsers,
  onWhitelistUpdate,
  lang,
  onLanguageChange,
}: SettingMenuProps) => {
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(currentTimings.timeBetweenSearchCycles);
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(currentTimings.timeToWaitAfterFiveSearchCycles);
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(currentTimings.timeBetweenUnfollows);
  const [unfollowsPerBatch, setUnfollowsPerBatch] = useState(currentTimings.unfollowsPerBatch ?? DEFAULT_UNFOLLOWS_PER_BATCH);
  const [timeToWaitAfterUnfollowBatch, setTimeToWaitAfterUnfollowBatch] = useState(currentTimings.timeToWaitAfterUnfollowBatch ?? DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH);
  const [usersPerSearchCycle, setUsersPerSearchCycle] = useState(currentTimings.usersPerSearchCycle ?? DEFAULT_USERS_PER_SEARCH_CYCLE);

  const handleSave = (event: any) => {
    event.preventDefault();
    setTimings({
      timeBetweenSearchCycles,
      timeToWaitAfterFiveSearchCycles,
      timeBetweenUnfollows,
      unfollowsPerBatch: Math.max(1, unfollowsPerBatch),
      timeToWaitAfterUnfollowBatch,
      usersPerSearchCycle,
    });
    setSettingState(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: number) => void) => {
    const value = Math.max(0, Number(event.currentTarget.value));
    setter(value);
  };

  return (
    <form onSubmit={handleSave}>
      <div className="backdrop">
        <div className="setting-menu">
          {/* Settings Module */}
          <div className="settings-module">
            <div className="module-header">
              <h3>{t(lang, "settingsTitle")}</h3>
            </div>

            <div className="settings-content">
              <div className="row">
                <label className="minimun-width">{t(lang, "language")}</label>
                <select
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "4px",
                    padding: "4px 8px",
                  }}
                  value={lang}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onLanguageChange(e.currentTarget.value as Language)}
                >
                  <option value="en" style={{ background: "#222" }}>English (EN)</option>
                  <option value="es" style={{ background: "#222" }}>Español (ES)</option>
                </select>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "timeBetweenSearchCycles")}</label>
                <input
                  type="number"
                  id="searchCycles"
                  name="searchCycles"
                  min={500}
                  max={999999}
                  value={timeBetweenSearchCycles}
                  onChange={(e) => handleInputChange(e, setTimeBetweenSearchCycles)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "timeToWaitAfterFiveCycles")}</label>
                <input
                  type="number"
                  id="fiveSearchCycles"
                  name="fiveSearchCycles"
                  min={4000}
                  max={999999}
                  value={timeToWaitAfterFiveSearchCycles}
                  onChange={(e) => handleInputChange(e, setTimeToWaitAfterFiveSearchCycles)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "timeBetweenUnfollows")}</label>
                <input
                  type="number"
                  id="timeBetweenUnfollow"
                  name="timeBetweenUnfollow"
                  min={500}
                  max={999999}
                  value={timeBetweenUnfollows}
                  onChange={(e) => handleInputChange(e, setTimeBetweenUnfollows)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "unfollowsPerBatch")}</label>
                <input
                  type="number"
                  id="unfollowsPerBatch"
                  name="unfollowsPerBatch"
                  min={1}
                  max={500}
                  value={unfollowsPerBatch}
                  onChange={(e) => handleInputChange(e, setUnfollowsPerBatch)}
                />
                <label className="margin-between-input-and-label">(users)</label>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "timeToWaitAfterUnfollowBatch")}</label>
                <input
                  type="number"
                  id="timeAfterUnfollowBatch"
                  name="timeAfterUnfollowBatch"
                  min={1000}
                  max={999999}
                  value={timeToWaitAfterUnfollowBatch}
                  onChange={(e) => handleInputChange(e, setTimeToWaitAfterUnfollowBatch)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="row">
                <label className="minimun-width">{t(lang, "usersPerSearchCycle")}</label>
                <input
                  type="number"
                  id="usersPerSearchCycle"
                  name="usersPerSearchCycle"
                  min={1}
                  max={200}
                  value={usersPerSearchCycle}
                  onChange={(e) => handleInputChange(e, setUsersPerSearchCycle)}
                />
                <label className="margin-between-input-and-label">(users)</label>
              </div>

              <div className="warning-container">
                <h3 className="warning"><b>{t(lang, "warningPrefix")}</b> {t(lang, "settingsWarning1")}</h3>
                <h3 className="warning">{t(lang, "settingsWarning2")}</h3>
              </div>
            </div>
          </div>

          {/* Divider */}
          <hr className="module-divider" />

          {/* Whitelist Management Module */}
          <div className="whitelist-module">
            <WhitelistManager
              whitelistedUsers={whitelistedUsers}
              onWhitelistUpdate={onWhitelistUpdate}
              lang={lang}
            />
          </div>

          {/* Action Buttons */}
          <div className="btn-container">
            <button className="btn" type="button" onClick={() => setSettingState(false)}>
              {t(lang, "cancel")}
            </button>
            <button className="btn" type="submit">
              {t(lang, "save")}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
