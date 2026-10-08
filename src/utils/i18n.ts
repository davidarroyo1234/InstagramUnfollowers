import { en, TranslationKey } from "../locales/en";
import { es } from "../locales/es";

export type { TranslationKey };

export type Language = "en" | "es";

export const LANGUAGE_STORAGE_KEY = "iu_language";

export const translations = { en, es };

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      return saved;
    }
    if (typeof navigator !== "undefined" && navigator.language && navigator.language.toLowerCase().startsWith("es")) {
      return "es";
    }
  } catch {
    // fallback
  }
  return "en";
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function t(lang: Language, key: TranslationKey, ...args: (string | number)[]): string {
  const dict = translations[lang] || translations.en;
  let text: string = dict[key] || translations.en[key] || (key as string);
  for (const arg of args) {
    text = text.replace("%s", String(arg));
  }
  return text;
}
