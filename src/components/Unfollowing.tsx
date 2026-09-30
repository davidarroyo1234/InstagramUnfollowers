import React from "react";
import { getUnfollowLogForDisplay } from "../utils/utils";
import { State } from "../model/state";
import { Language, t } from "../utils/i18n";

interface UnfollowingProps {
  state: State;
  handleUnfollowFilter: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lang: Language;
}

export const Unfollowing = (
  {
    state,
    handleUnfollowFilter,
    lang,
  }: UnfollowingProps) => {

  if (state.status !== "unfollowing") {
    return null;
  }

  return (
    <section className="workspace-layout">
      <aside className="app-sidebar">
        <div className="panel-heading">
          <span>{t(lang, "unfollowQueue")}</span>
          <strong>{state.percentage}%</strong>
        </div>
        <menu className="flex column grow m-clear p-clear">
          <p>{t(lang, "filters")}</p>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showSucceeded"
              checked={state.filter.showSucceeded}
              onChange={handleUnfollowFilter}
            />
            &nbsp;{t(lang, "succeeded")}
          </label>
          <label className="badge m-small">
            <input
              type="checkbox"
              name="showFailed"
              checked={state.filter.showFailed}
              onChange={handleUnfollowFilter}
            />
            &nbsp;{t(lang, "failed")}
          </label>
        </menu>
      </aside>
      <article className="unfollow-log-container">
        {state.unfollowLog.length === state.selectedResults.length && (
          <>
            <hr />
            <div className="fs-large p-medium clr-green">{t(lang, "allDone")}</div>
            <hr />
          </>
        )}
        {getUnfollowLogForDisplay(state.unfollowLog, state.searchTerm, state.filter).map(
          (entry, index) =>
            entry.unfollowedSuccessfully ? (
              <div className="p-medium" key={entry.user.id}>
                {t(lang, "unfollowed")}
                <a
                  className="clr-inherit"
                  target="_blank"
                  href={`../${entry.user.username}`}
                  rel="noreferrer"
                >
                  &nbsp;{entry.user.username}
                </a>
                <span className="clr-cyan">
                  &nbsp; [{index + 1}/{state.selectedResults.length}]
                </span>
              </div>
            ) : (
              <div className="p-medium clr-red" key={entry.user.id}>
                {t(lang, "failedToUnfollow")} {entry.user.username} [{index + 1}/
                {state.selectedResults.length}]
              </div>
            ),
        )}
      </article>
    </section>
  );
};
