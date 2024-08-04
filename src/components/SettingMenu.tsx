import React from "react";
import { Timings } from "../model/timings";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
}


export const SettingMenu = (
  {
    setSettingState,
    // @ts-ignore
    currentTimings,
    // @ts-ignore
    setTimings,
  }: SettingMenuProps) => {
  return (
    <div className="backdrop">
      <div className="setting-menu">
        <div>
          <h3>Settings</h3>
        </div>

        <div className="row">
          <label className="minimun-width" htmlFor="searchCycles">Default time between search cylcles</label>
          <input type="text" id="searchCycles" name="searchCycles" min={60000} max={999999} />
          <label className="margin-between-input-and-label" htmlFor="searchCycles"> (ms)</label>
        </div>

        <div className="row">
          <label className="minimun-width" htmlFor="searchCycles">Default time to wait after five search cycles</label>
          <input type="text" id="searchCycles" name="searchCycles" min={60000} max={999999} />
          <label className="margin-between-input-and-label" htmlFor="searchCycles"> (ms)</label>
        </div>

        <div className="row">
          <label className="minimun-width" htmlFor="searchCycles">Default time between unfollows</label>
          <input type="text" id="searchCycles" name="searchCycles" min={60000} max={999999} />
          <label className="margin-between-input-and-label" htmlFor="searchCycles"> (ms)</label>
        </div>

        <div className="row">
          <label className="minimun-width" htmlFor="searchCycles">Default time to wait after five unfollows</label>
          <input type="text" id="searchCycles" name="searchCycles" min={60000} max={999999} />
          <label className="margin-between-input-and-label" htmlFor="searchCycles"> (ms)</label>
        </div>

        <div className="btn-container">
          <button className="btn" onClick={() => {
            setSettingState(false);
          }}>Cancel
          </button>
          <button className="btn">Save</button>
        </div>
      </div>
    </div>
  );
};



