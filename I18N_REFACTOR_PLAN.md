# i18n Refactor Plan

Goal: make adding a language = **one new locale file + one line in a registry**, with the compiler catching missing keys. Then add Turkish.

Each step is small, builds on its own, and should be its own commit. Don't start a step until the previous one builds.

**Verify after every step:**
```
npx tsc --noEmit
npm run build
```
Then open `public/preview.html` (or run the bookmarklet on Instagram) and switch languages to eyeball it.

**ES5 constraint:** `tsconfig.json` targets `es5` with `lib: ["dom", "scripthost", "es2015"]`. That means **no** `Object.entries`, `Object.values`, or `Array.prototype.includes` (ES2016+). Use `Object.keys`, `indexOf`, etc.

---

## Step 1 — Translate the leftover hardcoded strings

Small bug fix, no structural change.

| File | Line | Current text | Fix |
|---|---|---|---|
| `src/components/WhitelistManager.tsx` | 93 | `"All pasted users are already in the whitelist."` | Use existing key: `t(lang, "pastedUsersAlreadyExist")` |
| `src/main.tsx` | 249 | `"Changing filter options will clear selected users"` | New key `filterChangeClearsSelection` |
| `src/main.tsx` | 383, 387 | `"Changes you made may not be saved."` | New key `unsavedChangesWarning` |
| `src/main.tsx` | 787 | `"Can be used only on Instagram routes"` | New key `onlyOnInstagram` |

Notes:
- Line 787 runs **before** the app mounts, so there is no `lang` state yet. Use `t(getInitialLanguage(), "onlyOnInstagram")`.
- Modern browsers ignore custom `beforeunload` text and show their own message. Translating it is harmless, just don't expect to see it.
- Add each new key to both `en` and `es` in `src/utils/i18n.ts`.

Commit: `fix(i18n): translate remaining hardcoded strings`

---

## Step 2 — Make the compiler catch missing translations

Still inside `src/utils/i18n.ts`. Split the big object into separate constants and type the non-English ones against English:

```ts
const en = {
  localAccountAudit: "Local account audit",
  // ...
} as const;

export type TranslationKey = keyof typeof en;

const es: Record<TranslationKey, string> = {
  localAccountAudit: "Auditoría local de cuenta",
  // ...
};

export const translations = { en, es };
```

Test it: temporarily delete one key from `es` → `npx tsc --noEmit` must fail. Put it back.

Commit: `refactor(i18n): type-check translations against English keys`

---

## Step 3 — Move each language into its own file

New files:
```
src/locales/en.ts   → export const en = { ... } as const;
                      export type TranslationKey = keyof typeof en;
src/locales/es.ts   → import { TranslationKey } from "./en";
                      export const es: Record<TranslationKey, string> = { ... };
```

`src/utils/i18n.ts` keeps `t`, `getInitialLanguage`, `saveLanguage` and imports the dictionaries.

**Keep `src/utils/i18n.ts` as the only entry point.** Then none of the 7 files that import it (`main.tsx`, `NotSearching`, `Searching`, `Toolbar`, `SettingMenu`, `WhitelistManager`, `Unfollowing`) need to change. Re-export `TranslationKey` from it if anything uses it.

Commit: `refactor(i18n): split locales into separate files`

---

## Step 4 — Language registry (single source of truth for codes)

Replace the hand-written `Language` union and the hardcoded `"en"`/`"es"` checks in `src/utils/i18n.ts`:

```ts
export const LANGUAGES = {
  en: { label: "English", dict: en },
  es: { label: "Español", dict: es },
};

export type Language = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as Language[];

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGE_CODES.indexOf(value as Language) !== -1;
}
```

Rewrite `getInitialLanguage`:
1. saved value in localStorage → `if (isLanguage(saved)) return saved;`
2. browser language → `const code = navigator.language.slice(0, 2).toLowerCase(); if (isLanguage(code)) return code;`
3. fallback `"en"`

`t()` now uses `LANGUAGES[lang].dict` (with the English fallback kept).

Commit: `refactor(i18n): add language registry`

---

## Step 5 — Build the Settings dropdown from the registry

`src/components/SettingMenu.tsx` lines 76–77 have hand-written `<option>`s. Replace with:

```tsx
{LANGUAGE_CODES.map(code => (
  <option key={code} value={code} style={{ background: "#222" }}>
    {LANGUAGES[code].label} ({code.toUpperCase()})
  </option>
))}
```

Commit: `refactor(i18n): generate language options from registry`

---

## Step 6 — Make the toolbar 🌐 button work for N languages

`src/components/Toolbar.tsx` lines 134–142 toggle `en ↔ es`. Change to cycle through all languages:

```tsx
const nextLang = LANGUAGE_CODES[(LANGUAGE_CODES.indexOf(lang) + 1) % LANGUAGE_CODES.length];
// title={`${t(lang, "language")}: ${LANGUAGES[nextLang].label}`}
// onClick={() => onLanguageChange(nextLang)}
```

Then delete the now-unused keys `switchToSpanish` / `switchToEnglish` from every locale. (`noUnusedLocals` won't catch unused dictionary keys, so grep for them.)

Commit: `refactor(i18n): cycle toolbar language button through all languages`

---

## Step 7 (optional, recommended before Turkish) — Named placeholders

Today `%s` is replaced in order, so a translation can't reorder its arguments. Switch to named placeholders:

```ts
// "Loaded {count} accounts from cache!"
export function t(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  const text: string = LANGUAGES[lang].dict[key] || en[key] || key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
}
```

Keys that use `%s` today (update the string in **every** locale + the call site):

| Key | Suggested name | Call site |
|---|---|---|
| `loadCachedScan` | `{count}` | `NotSearching.tsx` |
| `unfollowCount` | `{count}` | grep `unfollowCount` |
| `pastedUsersAdded` | `{count}` | `WhitelistManager.tsx` |
| `partialScanInterrupted` | `{count}` | `main.tsx` |
| `rateLimitPause` | `{seconds}` | `main.tsx` |
| `sleepingSafety` | `{duration}` | `main.tsx` (2 call sites — one passes seconds, one passes `"Nm"`) |
| `loadedFromCache` | `{count}` | `main.tsx` |

Check that no `%s` is left: grep for `%s` in `src/`.

Commit: `refactor(i18n): use named placeholders`

---

## Step 8 — Add Turkish 🇹🇷

1. Create `src/locales/tr.ts`:
   ```ts
   import { TranslationKey } from "./en";
   export const tr: Record<TranslationKey, string> = { ... };
   ```
   Easiest: copy `es.ts`, then translate every value. The compiler will tell you if you missed or misspelled a key.
2. Register it in `src/utils/i18n.ts`:
   ```ts
   tr: { label: "Türkçe", dict: tr },
   ```
3. Build, switch to TR in Settings and via the 🌐 button, and check that long strings don't break the layout (Turkish words can run long, e.g. buttons in the toolbar).

Commit: `feat(i18n): add Turkish translation`

---

## Out of scope (possible follow-ups)

- **`public/index.html`** (the landing page with the copy button / bookmarklet) is plain English HTML and isn't translated by this system.
- **Plurals** (`userSingular` / `userPlural`) — fine for EN/ES/TR. Only matters for languages with more plural forms; `Intl.PluralRules` would be the fix then.
- **README** — mention the supported languages and how to add one (basically Step 8).
