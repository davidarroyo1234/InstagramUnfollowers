import React from "react";
import { getUnfollowLogForDisplay } from "../utils/utils";
import { State } from "../model/state";

interface UnfollowingProps {
  state: State;
  handleUnfollowFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;

}

/**
 * Halaman "Unfollowing" (setelah user menekan tombol berhenti mengikuti).
 *
 * Fitur utama:
 * - Menampilkan log hasil berhenti mengikuti (berhasil/gagal).
 * - Filter log (tampilkan yang berhasil/gagal).
 */
export const Unfollowing = (
  {
    state,
    handleUnfollowFilter,
  }: UnfollowingProps) => {

  if (state.status !== "unfollowing") {
    return null;
  }

  return (
    <section className="flex">
      <aside className="app-sidebar">
        <menu className="flex column grow m-clear p-clear">
          <p>Filter</p>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showSucceeded"
              checked={state.filter.showSucceeded}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Berhasil
          </label>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showFailed"
              checked={state.filter.showFailed}
              onChange={handleUnfollowFilter}
            />
            &nbsp;Gagal
          </label>
        </menu>
      </aside>
      <article className="unfollow-log-container">
        {state.unfollowLog.length === state.selectedResults.length && (
          <>
            <hr />
            <div className="fs-large p-medium clr-green">Selesai Semua!</div>
            <hr />
          </>
        )}
        {getUnfollowLogForDisplay(state.unfollowLog, state.searchTerm, state.filter).map(
          (entry, index) =>
            entry.unfollowedSuccessfully ? (
              <div className="p-medium" key={entry.user.id}>
                Berhasil berhenti mengikuti
                <a
                  className="clr-inherit"
                  target="_blank"
                  href={`../${entry.user.username}`}
                  rel="noopener noreferrer"
                >
                  &nbsp;{entry.user.username}
                </a>
                <span className="clr-cyan">
                  &nbsp; [{index + 1}/{state.selectedResults.length}]
                </span>
              </div>
            ) : (
              <div className="p-medium clr-red" key={entry.user.id}>
                Gagal berhenti mengikuti {entry.user.username} [{index + 1}/
                {state.selectedResults.length}]
              </div>
            ),
        )}
      </article>
    </section>
  );
};
