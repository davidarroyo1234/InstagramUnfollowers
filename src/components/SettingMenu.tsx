import React, { useState } from "react";
import { Timings } from "../model/timings";
import { FeatureSettings, LastPostMode } from "../model/last-post";
import { UserNode } from "../model/user";
import { WhitelistManager } from "./WhitelistManager";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  featureSettings: FeatureSettings;
  setFeatureSettings: (settings: FeatureSettings) => void;
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

export const SettingMenu = ({
  setSettingState,
  currentTimings,
  setTimings,
  featureSettings,
  setFeatureSettings,
  whitelistedUsers,
  onWhitelistUpdate,
}: SettingMenuProps) => {
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(currentTimings.timeBetweenSearchCycles);
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(currentTimings.timeToWaitAfterFiveSearchCycles);
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(currentTimings.timeBetweenUnfollows);
  const [timeToWaitAfterFiveUnfollows, setTimeToWaitAfterFiveUnfollows] = useState(currentTimings.timeToWaitAfterFiveUnfollows);
  const [lastPostBadgeEnabled, setLastPostBadgeEnabled] = useState(featureSettings.lastPostBadgeEnabled);
  const [lastPostMode, setLastPostMode] = useState<LastPostMode>(featureSettings.lastPostMode);

  const handleSave = (event: any) => {
    event.preventDefault();
    setTimings({
      timeBetweenSearchCycles,
      timeToWaitAfterFiveSearchCycles,
      timeBetweenUnfollows,
      timeToWaitAfterFiveUnfollows,
    });
    setFeatureSettings({
      lastPostBadgeEnabled,
      lastPostMode,
    });
    setSettingState(false);
  };

  // @ts-ignore
  const handleInputChange = (event: any, setter: (value: number) => void) => {

    const value = Number(event?.target?.value);
    setter(value);
  };

  return (
    <form onSubmit={handleSave}>
      <div className="backdrop">
        <div className="setting-menu">
          {/* Settings Module */}
          <div className="settings-module">
            <div className="module-header">
              <h3>Settings</h3>
            </div>

            <div className="settings-content">
              <div className="row">
                <label className="minimun-width">Default time between search cycles</label>
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
                <label className="minimun-width">Default time to wait after five search cycles</label>
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
                <label className="minimun-width">Default time between unfollows</label>
                <input
                  type="number"
                  id="timeBetweenUnfollow"
                  name="timeBetweenUnfollow"
                  min={1000}
                  max={999999}
                  value={timeBetweenUnfollows}
                  onChange={(e) => handleInputChange(e, setTimeBetweenUnfollows)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="row">
                <label className="minimun-width">Default time to wait after five unfollows</label>
                <input
                  type="number"
                  id="timeAfterFiveUnfollows"
                  name="timeAfterFiveUnfollows"
                  min={70000}
                  max={999999}
                  value={timeToWaitAfterFiveUnfollows}
                  onChange={(e) => handleInputChange(e, setTimeToWaitAfterFiveUnfollows)}
                />
                <label className="margin-between-input-and-label">(ms)</label>
              </div>

              <div className="warning-container">
                <h3 className="warning"><b>WARNING:</b> Modifying these settings can lead to your account being banned.</h3>
                <h3 className="warning">USE IT AT YOUR OWN RISK!!!!</h3>
              </div>

              <div className="row">
                <label className="minimun-width">Show last-post age</label>
                <input
                  type="checkbox"
                  id="lastPostBadgeEnabled"
                  name="lastPostBadgeEnabled"
                  checked={lastPostBadgeEnabled}
                  onChange={(e) => setLastPostBadgeEnabled(e.currentTarget.checked)}
                />
              </div>

              {lastPostBadgeEnabled && (
                <>
                  <div className="row">
                    {(["manual", "auto"] as const).map(mode => (
                      <label key={mode} className="margin-between-input-and-label">
                        <input type="radio" name="lastPostMode" value={mode} checked={lastPostMode === mode} onChange={() => setLastPostMode(mode)} />
                        &nbsp;{mode === "manual" ? "Manual (on click)" : "Auto (visible cards)"}
                      </label>
                    ))}
                  </div>
                  <p className="margin-between-input-and-label">
                    Only fetches when the scan is finished or paused, one account at a time, and caches each result.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <hr className="module-divider" />

          {/* Whitelist Management Module */}
          <div className="whitelist-module">
            <WhitelistManager
              whitelistedUsers={whitelistedUsers}
              onWhitelistUpdate={onWhitelistUpdate}
            />
          </div>

          {/* Action Buttons */}
          <div className="btn-container">
            <button className="btn" type="button" onClick={() => setSettingState(false)}>Cancel</button>
            <button className="btn" type="submit">Save</button>
          </div>
        </div>
      </div>
    </form>
  );
};
