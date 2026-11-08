import React, { useEffect, useRef, useState } from "react";
import { Language, LANGUAGE_CODES, LANGUAGES, t } from "../utils/i18n";

interface LanguageMenuProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageMenu = ({ lang, onLanguageChange }: LanguageMenuProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the menu or pressing Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (code: Language) => {
    onLanguageChange(code);
    setOpen(false);
  };

  return (
    <div className="language-menu" ref={containerRef}>
      <button
        className="copy-list language-menu-trigger"
        type="button"
        title={t(lang, "language")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        🌐 {lang.toUpperCase()}
        <span className="language-menu-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="language-menu-list">
          {LANGUAGE_CODES.map(code => (
            <button
              key={code}
              type="button"
              className={`language-menu-item${code === lang ? " active" : ""}`}
              aria-current={code === lang}
              onClick={() => select(code)}
            >
              <span>{LANGUAGES[code].label}</span>
              <span className="language-menu-code">{code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
