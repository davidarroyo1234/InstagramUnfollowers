import { en, TranslationKey } from "../languages/en";
import { es } from "../languages/es";
import { tr } from "../languages/tr";

export type { TranslationKey };

// To add a language: create src/languages/<code>.ts and register it here.
export const LANGUAGES = {
  en: { label: "English", dict: en },
  es: { label: "Español", dict: es },
  tr: { label: "Türkçe", dict: tr },
};

export type Language = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as Language[];

export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGE_STORAGE_KEY = "iu_language";

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGE_CODES.indexOf(value as Language) !== -1;
}

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(saved)) {
      return saved;
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      const browserLanguage = navigator.language.slice(0, 2).toLowerCase();
      if (isLanguage(browserLanguage)) {
        return browserLanguage;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_LANGUAGE;
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function t(lang: Language, key: TranslationKey, ...args: (string | number)[]): string {
  const dict = isLanguage(lang) ? LANGUAGES[lang].dict : en;
  let text: string = dict[key] || en[key] || (key as string);
  for (const arg of args) {
    text = text.replace("%s", String(arg));
  }
  return text;
}
