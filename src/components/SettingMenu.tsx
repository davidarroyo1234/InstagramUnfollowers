import React from "react";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
}

export const SettingMenu = (
  {
    setSettingState,
  }: SettingMenuProps) => {
  return (
    <div className="backdrop">
      <div className="setting-menu">
        <div>
          <h3>Settings</h3>
        </div>
        <div className="row">
          <div>
            <label htmlFor="sleeptime">Sleeptime</label>
            <input type="text" id="sleeptime" name="sleeptime" min={60000} max={999999} />
            <label htmlFor="sleeptime"> (ms)</label>
          </div>
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



