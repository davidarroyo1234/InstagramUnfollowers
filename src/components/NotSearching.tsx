import React from 'react';
import { Language, t } from '../utils/i18n';

interface NotSearchingProps {
  onScan?: () => void;
  lang: Language;
}

export const NotSearching = ({onScan, lang}: NotSearchingProps) => (
  <section className="launch-screen">
    <div className="launch-copy">
      <span className="eyebrow">{t(lang, "localAccountAudit")}</span>
      <h1>{t(lang, "launchTitle")}</h1>
      <p>
        {t(lang, "launchDescription")}
      </p>
      <div className="launch-actions">
        <button className="run-scan" onClick={onScan}>
          {t(lang, "runScan")}
        </button>
        <span className="launch-note">{t(lang, "runsInBrowserOnly")}</span>
      </div>
    </div>
    <div className="launch-panel" aria-hidden="true">
      <div className="scan-orbit">
        <span />
        <span />
        <span />
      </div>
      <div className="signal-card primary">
        <span>{t(lang, "ready")}</span>
        <strong>0%</strong>
      </div>
      <div className="signal-card">
        <span>{t(lang, "protected")}</span>
        <strong>{t(lang, "whitelist")}</strong>
      </div>
      <div className="signal-card accent">
        <span>{t(lang, "review")}</span>
        <strong>{t(lang, "selectFirst")}</strong>
      </div>
    </div>
  </section>
);
