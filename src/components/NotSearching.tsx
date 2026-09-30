import React from 'react';
import { Language, t } from '../utils/i18n';
import { UserNode } from '../model/user';

interface NotSearchingProps {
  onScan?: () => void;
  lang: Language;
  cachedScan?: { readonly results: readonly UserNode[]; readonly timestamp: number } | null;
  onLoadCached?: () => void;
}

export const NotSearching = ({onScan, lang, cachedScan, onLoadCached}: NotSearchingProps) => (
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
        {cachedScan && cachedScan.results.length > 0 && onLoadCached && (
          <button type="button" className="load-cached-scan" onClick={onLoadCached}>
            ⚡ {t(lang, "loadCachedScan", cachedScan.results.length)}
          </button>
        )}
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
        <strong>{cachedScan ? `${cachedScan.results.length}` : "0%"}</strong>
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
