import React, { useState } from "react";
import { Timings } from "../model/timings";
import { UserNode } from "../model/user";
import { WhitelistManager } from "./WhitelistManager";

interface SettingMenuProps {
  setSettingState: (state: boolean) => void;
  currentTimings: Timings;
  setTimings: (timings: Timings) => void;
  whitelistedUsers: readonly UserNode[];
  onWhitelistUpdate: (users: readonly UserNode[]) => void;
}

export const SettingMenu = ({
  setSettingState,
  currentTimings,
  setTimings,
  whitelistedUsers,
  onWhitelistUpdate,
}: SettingMenuProps) => {
  // Salin timings dari state global ke state lokal form (agar input bisa diedit sebelum disimpan).
  const [timeBetweenSearchCycles, setTimeBetweenSearchCycles] = useState(currentTimings.timeBetweenSearchCycles);
  const [timeToWaitAfterFiveSearchCycles, setTimeToWaitAfterFiveSearchCycles] = useState(currentTimings.timeToWaitAfterFiveSearchCycles);
  const [timeBetweenUnfollows, setTimeBetweenUnfollows] = useState(currentTimings.timeBetweenUnfollows);
  const [timeToWaitAfterFiveUnfollows, setTimeToWaitAfterFiveUnfollows] = useState(currentTimings.timeToWaitAfterFiveUnfollows);

  const handleSave = (event: any) => {
    event.preventDefault();
    // Kirim timings baru ke parent. Parent akan menyimpan ke localStorage via `saveTimings(...)`.
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
          {/* Modul pengaturan timings */}
          <div className="settings-module">
            <div className="module-header">
              <h3>Pengaturan</h3>
            </div>

            <div className="settings-content">
              <div className="row">
                <label className="minimun-width">Jeda default antar siklus pencarian</label>
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
                <label className="minimun-width">Waktu tunggu setelah beberapa siklus pencarian</label>
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
                <label className="minimun-width">Jeda default antar aksi berhenti mengikuti</label>
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
                <label className="minimun-width">Jendela rate-limit berhenti mengikuti (12 aksi per jendela)</label>
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
                <h3 className="warning"><b>PERINGATAN:</b> Mengubah pengaturan ini bisa menyebabkan akun kamu kena pembatasan atau banned.</h3>
                <h3 className="warning">GUNAKAN ATAS RISIKO SENDIRI!!!!</h3>
              </div>
            </div>
          </div>

          {/* Pemisah */}
          <hr className="module-divider" />

          {/* Modul pengelolaan whitelist */}
          <div className="whitelist-module">
            <WhitelistManager
              whitelistedUsers={whitelistedUsers}
              onWhitelistUpdate={onWhitelistUpdate}
            />
          </div>

          {/* Tombol aksi */}
          <div className="btn-container">
            <button className="btn" type="button" onClick={() => setSettingState(false)}>Batal</button>
            <button className="btn" type="submit">Simpan</button>
          </div>
        </div>
      </div>
    </form>
  );
};
