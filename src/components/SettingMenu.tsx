import React, { useState } from "react";
import { Timings } from "../model/timings";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
}

export const SettingMenu = ({
  setSettingState,
  currentTimings,
  setTimings,
}: SettingMenuProps) => {
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(currentTimings.timeBetweenSearchCycles);
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(currentTimings.timeToWaitAfterFiveSearchCycles);
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(currentTimings.timeBetweenUnfollows);
  const [timeToWaitAfterFiveUnfollows, setTimeToWaitAfterFiveUnfollows] = useState(currentTimings.timeToWaitAfterFiveUnfollows);

  const handleSave = (event: any) => {
    event.preventDefault();
    setTimings({
      timeBetweenSearchCycles,
      timeToWaitAfterFiveSearchCycles,
      timeBetweenUnfollows,
      timeToWaitAfterFiveUnfollows,
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
          <div>
            <h3>Settings</h3>
          </div>

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
          <div>
            <h3 className="warning"><b>WARNING:</b> Modifying these settings can lead to your account being banned.</h3>
            <h3 className="warning">USE IT AT YOUR OWN RISK!!!!</h3>
          </div>
          <div className="btn-container">
            <button className="btn" type="button" onClick={() => setSettingState(false)}>Cancel</button>
            <button className="btn" type="submit">Save</button>
          </div>
        </div>
      </div>
    </form>
  );
};
