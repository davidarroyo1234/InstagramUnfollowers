import React from 'react';

interface SettingMenuProps {

}

export const SettingMenu = ({}: SettingMenuProps) => {
  return (
    <div className="backdrop">
      <div className="setting-menu">
          <div className="col-12">
            <h3>Settings</h3>
          </div>
        <div className="row">
          <div className="col-12">
            <label htmlFor="sleeptime">Sleeptime</label>
            <input type="text" id="sleeptime" name="sleeptime" min={60000} max={999999} />
            <label htmlFor="sleeptime"> (ms)</label>
          </div>
        </div>
        <div className="btn-container">
          <button className="btn">Cancel</button>
          <button className="btn">Save</button>
        </div>
      </div>
    </div>
  );
};



