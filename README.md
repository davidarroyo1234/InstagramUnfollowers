# 📱 Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/davidarroyo1234/InstagramUnfollowers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Read this in other languages:**

<p>
  <a href="docs/translations/README.es.md"><img src="https://flagcdn.com/w40/es.png" width="32" alt="Español" title="Español"></a>
  <a href="docs/translations/README.tr.md"><img src="https://flagcdn.com/w40/tr.png" width="32" alt="Türkçe" title="Türkçe"></a>
</p>

---

A nifty tool that lets you see who doesn't follow you back on Instagram.  
<u>Browser-based and requires no downloads or installations!</u>

> ⚡ **Live Streaming & Fast Cache:** Accounts now appear dynamically on screen in real time as batches are fetched from Instagram. In addition, completed scans are cached locally so you can reload your audit instantly (0ms) without making unnecessary API calls!

## 🖥️ Desktop Usage

1. Copy the code from: [InstagramUnfollowers Tool](https://davidarroyo1234.github.io/InstagramUnfollowers/)
2. Press the COPY button to copy the code:
   <br/><img src="./assets/copy_code.png" alt="Copy code button" />
3. Go to the Instagram website and log in to your account.
4. Open the developer console:
   - Windows / Linux: `Ctrl + Shift + J`
   - Mac OS: `⌘ + ⌥ + I`
5. Paste the code into the console and press `Enter`. You'll see this interface:
   <br/><img src="./assets/initial.png" alt="Initial screen" />
6. Click **"Run Scan"** to start scanning (or **"⚡ Load previous scan"** to open your saved results instantly).
7. As scanning runs, accounts appear live on screen, and follow-back status updates automatically:
   <br/><img src="./assets/results.png" alt="Results screen" />
8. 🤍 **Whitelist users** by clicking their profile image.
9. 🌐 **Switch language** anytime from the `🌐` language menu in the top bar.
10. 💾 **Manage your whitelist** via Settings:
    - Export: Save your whitelist as a JSON backup file
    - Import: Restore or merge whitelisted users from a file
    - Paste: Bulk-paste usernames directly into your protected whitelist
    - Clear: Remove all users from whitelist
    <br/><img src="./assets/settings_whitelist.png" alt="Settings screen" />
11. ✅ **Select users** to unfollow using the checkboxes.
12. ⚙️ **Customize script timings and language** via the "Settings" button:
    <br/><img src="./assets/settings.png" alt="Settings screen" />

## 📱 Mobile Usage

For Android users who want to use it on mobile:
1. Download the latest version of [Eruda Android Browser](https://github.com/liriliri/eruda-android/releases/)
2. Open Instagram web through the Eruda browser
3. Follow the same steps as desktop (the console will be automatically available when clicking the Eruda icon)

## ✨ Features

- 🔍 **Scan & Detect**: Accurately identifies users who don't follow you back.
- ⚡ **Live Progressive Streaming**: Accounts stream dynamically onto your screen as each batch arrives, eliminating blank waiting screens on large accounts.
- ⚡ **Instant Local Cache (0ms load)**: Re-open and review previously completed audits instantly without re-scraping from scratch.
- 🌐 **Multilingual (EN / ES / TR)**: English, Spanish and Turkish support with instant switching.
- 🛡️ **Anti-Ban & Session Protection**: Uses full Instagram Web headers (`X-ASBD-ID`, `X-CSRFToken`, `XMLHttpRequest`) to prevent forced logouts and suspicious activity flags.
- 🛡️ **Action-Block Guard**: Double-checks unfollow API responses to prevent ghost unfollows; halts the queue automatically if Instagram returns `feedback_required` to protect your account.
- ⏳ **Smart Rate-Limit & Soft-Block Backoff**: Automatically pauses and retries if Instagram returns HTTP 429 or HTTP 400 (`feedback_required`) with exponential cooldowns instead of failing.
- ⚠️ **Wrong-Detect Guard**: Expanded page limits supporting accounts with tens of thousands of followers, with safe lock preventing accidental unfollows if a scan is interrupted.
- 🤍 **Persistent & Bulk Whitelist**: Protect specific accounts with local persistence, JSON export/import, and direct username list pasting.
- ⚙️ **Customizable Timings**: Control request pacing to match your account safety preferences.
- 🎨 **Apple-inspired UI**: Clean, responsive, and minimalist interface.
- 🔒 **100% Client-Side Privacy**: All data is processed locally in your browser. No credentials or data are sent to external servers.

---

## 🛠️ Development

- Node version: Node 16+ / Node 18+ / Node 20+
- Install dependencies: `npm install`
- Build: `npm run build`
- Dev server with auto-reload: `npm run build-dev`

### 🌐 Adding a language

1. Copy `src/languages/en.ts` to `src/languages/<code>.ts` (e.g. `fr.ts`) and translate every value. The build fails if a key is missing.
2. Register it in `LANGUAGES` in `src/utils/i18n.ts`, e.g. `fr: { label: "Français", dict: fr },`
3. Optionally, add a translated README to `docs/translations/README.<code>.md` and link it at the top of this file.

## ⚖️ Legal & License

**Disclaimer:** This tool is not affiliated, associated, authorized, endorsed by, or officially connected with Instagram.

⚠️ **Use at your own risk!**

📜 Licensed under the [MIT License](LICENSE)
