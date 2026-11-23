import React, { useEffect, useMemo, useRef, useState } from "react";
import { State } from "../model/state";
import { CancelRequest, CancelStatus } from "../model/cancel-request";
import { getCookie, sleep } from "../utils/utils";
import {
  buildCancelExportRows,
  cancelFollowRequest,
  copyCancelList,
  exportCancelCSV,
  exportCancelJSON,
  fetchProfile,
  fetchProfilePage,
  formatDuration,
  formatRequestedAt,
  loadCancelWhitelist,
  monthYearLabel,
  Relationship,
  ResolvedProfile,
  requestFollow,
  saveCancelWhitelist,
} from "../utils/cancel-requests";
import { getBlockedUntil, loadTimings, loadWhitelist, setBlockedUntil } from "../utils/whitelist-manager";
import {
  BLOCKED_COOLDOWN_MS,
  DEFAULT_CANCELS_BEFORE_PAUSE,
  DEFAULT_TIME_BETWEEN_CANCELS,
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_BURST,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  EST_SCAN_REQUEST_MS,
  EST_CANCEL_REQUEST_MS,
  MIN_BURST_PAUSE,
  MIN_SCAN_DELAY,
  MIN_SCAN_LONG_PAUSE,
  MIN_TIME_BETWEEN_CANCELS,
  PROFILES_BEFORE_SCAN_PAUSE,
  RATE_LIMIT_COOLDOWN,
  MAX_BLOCK_RETRIES,
  MAX_CONSECUTIVE_BLOCKS,
  SCAN_BATCH_SIZES,
  UNFOLLOWERS_PER_PAGE,
  WITHOUT_PROFILE_PICTURE_URL_IDS,
} from "../constants/constants";
import { Logo } from "./icons/Logo";
import { SettingIcon } from "./icons/SettingIcon";
import { UserCheckIcon } from "./icons/UserCheckIcon";
import { UserUncheckIcon } from "./icons/UserUncheckIcon";
import { Toast } from "./Toast";
import { CancelWhitelistManager } from "./CancelWhitelistManager";
import { Language, t, TranslationKey } from "../utils/i18n";

interface CancelRequestsProps {
  state: State;
  setState: (state: State) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

// Same filters as the unfollowers results, minus "private": a request only stays pending on a private account.
type AccountFilter = { readonly showVerified: boolean; readonly showWithOutProfilePicture: boolean };
type WhitelistTab = "non_whitelisted" | "whitelisted";

// value 0 = "All" (label translated at render time).

const BATCH_OPTIONS: ReadonlyArray<number> = [...SCAN_BATCH_SIZES, 0];

const STATUS_LABELS: Record<CancelStatus, TranslationKey> = {
  unverified: "crStatusUnverified",
  pending: "crStatusPending",
  following: "crStatusFollowing",
  running: "crStatusRunning",
  done: "crStatusDone",
  failed: "crStatusFailed",
  skipped: "crStatusSkipped",
  accepted: "crStatusResolved",
  ghost: "crStatusNotFound",
};

// CSP-safe avatar: inline SVG data: URL so nothing loads from an external image service.
const placeholderAvatar = (seed: string): string => {
  const initials = (seed || "?").trim().slice(0, 2).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">` +
    `<rect width="100" height="100" rx="12" fill="#25231f"/>` +
    `<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="Avenir Next,Trebuchet MS,sans-serif" font-size="42" font-weight="700" fill="#e0a33a">${initials}</text>` +
    `</svg>`;
  // encodeURIComponent (not btoa) so non-ASCII usernames don't break the data URL.
  return "data:image/svg+xml," + encodeURIComponent(svg);
};

// "skipped" is included so un-whitelisting a mid-run skipped account re-enables selection;
// "failed" so a failed account can be retried (it is re-resolved before acting).
const isActionable = (status: CancelStatus): boolean =>
  status === "pending" || status === "unverified" || status === "following" || status === "skipped" || status === "failed";

const applyProfile = (r: CancelRequest, p: ResolvedProfile): void => {
  r.id = p.id;
  r.fullName = p.fullName;
  r.profilePicUrl = p.profilePicUrl;
  r.isPrivate = p.isPrivate;
  r.isVerified = p.isVerified;
};

export const CancelRequests = ({ state, setState, lang, onLanguageChange }: CancelRequestsProps) => {
  // The parent only mounts this in the "cancelling" state; the guard return sits after all hooks.
  const requestsRef = useRef<CancelRequest[]>(state.status === "cancelling" ? state.requests.map(r => ({ ...r })) : []);
  const [renderTick, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick(v => v + 1);

  // Loop control flags in refs to avoid stale closures.
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  // While true, the per-second live-ETA toast is suppressed so a countdown stays visible.
  const suppressLiveToast = useRef(false);
  // Synchronous lock for the recycle flow (state updates are async and can race on double-click).
  const recyclingRef = useRef(false);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [percentage, setPercentage] = useState(0);

  // ETA progress in refs so the interval reads fresh values; shared by scan/cancel.
  const startTimeRef = useRef(0);
  const processedRef = useRef(0);
  const totalTargetsRef = useRef(0);
  // Total duration (ms) predicted up front, so the ETA counts DOWN instead of recomputing per item.
  const etaTotalRef = useRef(0);
  // Time spent paused, so the countdown freezes instead of running on while nothing happens.
  const pausedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  // Why a run was aborted (session lost / Instagram refusing), so the generic "Stopped" toast doesn't hide it.
  const abortReasonRef = useRef<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<AccountFilter>({ showVerified: true, showWithOutProfilePicture: true });
  const [currentTab, setCurrentTab] = useState<WhitelistTab>("non_whitelisted");
  const [page, setPage] = useState(1);
  const [scanBatchSize, setScanBatchSize] = useState<number>(SCAN_BATCH_SIZES[0]);

  const [whitelist, setWhitelist] = useState<Set<string>>(() =>
    new Set<string>([...loadCancelWhitelist(), ...loadWhitelist().map(u => u.username.toLowerCase())]),
  );
  // Ref kept in sync so async loops read the latest whitelist (avoids stale-closure bugs mid-run).
  const whitelistRef = useRef(whitelist);
  whitelistRef.current = whitelist;
  const isWhitelisted = (username: string) => whitelistRef.current.has(username.toLowerCase());

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string; readonly style: "info" | "success" | "error" | "warning" }>({ show: false });
  const notify = (text: string, style: "info" | "success" | "error" | "warning" = "info") => setToast({ show: true, text, style });

  useEffect(() => {
    if (!toast.show) return;
    const timeout = setTimeout(() => setToast({ show: false }), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const [recycling, setRecycling] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [scanDelay, setScanDelay] = useState(() => Math.max(MIN_SCAN_DELAY, loadTimings()?.timeBetweenSearchCycles ?? DEFAULT_TIME_BETWEEN_SEARCH_CYCLES));
  const [scanLongPause, setScanLongPause] = useState(() => Math.max(MIN_SCAN_LONG_PAUSE, loadTimings()?.timeToWaitAfterFiveSearchCycles ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES));
  const [timeBetween, setTimeBetween] = useState(DEFAULT_TIME_BETWEEN_CANCELS);
  const [burstPause, setBurstPause] = useState(DEFAULT_TIME_TO_WAIT_AFTER_BURST);
  const cancelsBeforePause = DEFAULT_CANCELS_BEFORE_PAUSE;

  // Closing the panel without saving restores this snapshot (like the original).
  const settingsSnapshot = useRef({ scanDelay, scanLongPause, timeBetween, burstPause });
  const openSettings = () => {
    settingsSnapshot.current = { scanDelay, scanLongPause, timeBetween, burstPause };
    setShowSettings(true);
  };
  const closeSettings = () => {
    const snap = settingsSnapshot.current;
    setScanDelay(Math.max(MIN_SCAN_DELAY, snap.scanDelay));
    setScanLongPause(Math.max(MIN_SCAN_LONG_PAUSE, snap.scanLongPause));
    setTimeBetween(Math.max(MIN_TIME_BETWEEN_CANCELS, snap.timeBetween));
    setBurstPause(Math.max(MIN_BURST_PAUSE, snap.burstPause));
    setShowSettings(false);
  };

  const active = running || scanning;
  // `busy` also covers the recycle flow (recycleSelected doesn't set running/scanning).
  const busy = active || recycling;

  useEffect(() => {
    if (!active) {
      return;
    }
    const tick = () => {
      if (suppressLiveToast.current) {
        return;
      }
      const proc = processedRef.current;
      const total = totalTargetsRef.current;
      // The run is over: leave the final summary toast on screen.
      if (proc >= total) {
        return;
      }
      const now = Date.now();
      const el = now - startTimeRef.current - pausedMsRef.current - (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
      // Count down the up-front prediction, which already includes the waits and pauses between
      // items (the measured pace right after an item leaves those out and runs far too low). Only
      // when the run is slower than predicted does the measured pace take over.
      const predicted = etaTotalRef.current - el;
      let eta: string;
      if (predicted > 0) {
        eta = formatDuration(predicted);
      } else if (proc > 0) {
        eta = formatDuration((el / proc) * (total - proc));
      } else {
        eta = "…";
      }
      setToast({ show: true, text: t(lang, scanning ? "crLiveScanning" : "crLiveCancelling", proc, total, eta), style: "info" });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, scanning, lang]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!active) {
        return;
      }
      const msg = t(lang, "crUnsavedChanges");
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active, lang]);

  const requests = requestsRef.current;
  // Memoized on renderTick + whitelist so the O(n) pass doesn't re-run on every ETA toast tick.
  const counts = useMemo(() => requests.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "unverified") acc.unverified++;
      else if (r.status === "pending") acc.pending++;
      else if (r.status === "following") acc.following++;
      else if (r.status === "done") acc.done++;
      else if (r.status === "failed") acc.failed++;
      if (isWhitelisted(r.username)) acc.whitelisted++;
      return acc;
    },
    { total: 0, unverified: 0, pending: 0, following: 0, done: 0, failed: 0, whitelisted: 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [renderTick, whitelist]);
  const selectedCount = useMemo(
    () => requests.filter(r => !!r.selected && isActionable(r.status) && !isWhitelisted(r.username)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [renderTick, whitelist]);

  const recyclableSelCount = useMemo(
    () => requests.filter(r => isWhitelisted(r.username) && !!r.id && r.status === "pending" && !!r.selected).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [renderTick, whitelist]);

  const matchesFilter = (r: CancelRequest): boolean => {
    if (!filter.showVerified && r.isVerified) return false;
    // Only scanned accounts count as "no picture": unscanned ones simply haven't loaded it yet.
    const noPicture = r.status !== "unverified" &&
      (!r.profilePicUrl || WITHOUT_PROFILE_PICTURE_URL_IDS.some(id => r.profilePicUrl!.includes(id)));
    return filter.showWithOutProfilePicture || !noPicture;
  };
  const inTab = (r: CancelRequest): boolean => {
    const isWl = isWhitelisted(r.username);
    if (currentTab === "whitelisted") {
      // Show ALL whitelisted accounts so the counter stays in sync and any can be un-whitelisted.
      return isWl;
    }
    return !isWl;
  };
  // Sort by request date (newest first), grouped by month/year (the original groups A–Z instead).
  const displayed = useMemo(() => requests
    .filter(r => inTab(r) && matchesFilter(r) && (searchTerm === "" || r.username.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [renderTick, whitelist, currentTab, filter, searchTerm]);
  const maxPage = Math.max(1, Math.ceil(displayed.length / UNFOLLOWERS_PER_PAGE));
  const currentPage = Math.min(page, maxPage);
  const pageItems = displayed.slice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE * currentPage);

  // Header toggles (like the unfollowers Toolbar): scanned accounts that can be acted on and aren't
  // protected. Unscanned ones are picked by hand, so "select all" never grabs the whole file at once.
  const canSelect = (r: CancelRequest) => r.status !== "unverified" && isActionable(r.status) && !isWhitelisted(r.username);
  const pageSelectable = pageItems.filter(canSelect);
  const allSelectable = displayed.filter(canSelect);
  const setSelected = (list: readonly CancelRequest[], checked: boolean) => {
    list.forEach(r => { r.selected = checked; });
    forceRender();
  };

  const toggleSelect = (target: CancelRequest, checked: boolean) => {
    target.selected = checked;
    forceRender();
  };
  const selectMatching = (predicate: (r: CancelRequest) => boolean) => {
    displayed.forEach(r => { if (predicate(r) && canSelect(r)) { r.selected = true; } });
    forceRender();
  };
  const clearSelection = () => {
    requests.forEach(r => { r.selected = false; });
    forceRender();
  };

  // Whitelisted accounts move to the "Whitelisted" tab and are never cancelled.
  const toggleWhitelist = (username: string) => {
    const key = username.toLowerCase();
    const next = new Set(whitelist);
    const r = requests.find(x => x.username.toLowerCase() === key);
    if (next.has(key)) {
      next.delete(key);
      // Clear selection on un-protect, else an account selected in the Whitelisted tab silently
      // lands in the cancel list the moment it leaves the whitelist.
      if (r) { r.selected = false; }
    } else {
      next.add(key);
      if (r) { r.selected = false; }
    }
    setWhitelist(next);
    const sharedKeys = new Set(loadWhitelist().map(u => u.username.toLowerCase()));
    saveCancelWhitelist(Array.from(next).filter(u => !sharedKeys.has(u)));
    forceRender();
  };
  // Bulk version for the accounts selected in the current tab, like the unfollowers sidebar.
  const selectedInTab = displayed.filter(r => r.selected && isActionable(r.status));
  const whitelistSelected = () => {
    const next = new Set(whitelist);
    for (const r of selectedInTab) {
      const key = r.username.toLowerCase();
      if (currentTab === "whitelisted") { next.delete(key); } else { next.add(key); }
      r.selected = false;
    }
    setWhitelist(next);
    const sharedKeys = new Set(loadWhitelist().map(u => u.username.toLowerCase()));
    saveCancelWhitelist(Array.from(next).filter(u => !sharedKeys.has(u)));
    forceRender();
  };

  const applyWhitelist = (usernames: readonly string[]) => {
    // Re-merge with the shared unfollowers whitelist so importing/clearing the cancel-specific list
    // does not silently drop protection for accounts protected via the other module.
    const sharedEntries = loadWhitelist().map(u => u.username.toLowerCase());
    const sharedKeys = new Set(sharedEntries);
    const next = new Set([...usernames.map(u => u.toLowerCase()), ...sharedEntries]);
    // Unselect every account whose protection changes, in either direction (see toggleWhitelist).
    const prev = whitelistRef.current;
    requests.forEach(r => { const k = r.username.toLowerCase(); if (next.has(k) !== prev.has(k)) { r.selected = false; } });
    setWhitelist(next);
    // Save ONLY cancel-specific entries (like toggleWhitelist); else iucr_whitelist gets polluted
    // with shared entries when a merged list is imported.
    saveCancelWhitelist(Array.from(usernames).filter(u => !sharedKeys.has(u.toLowerCase())));
    forceRender();
  };

  const cancelExportRows = () => buildCancelExportRows(requests, isWhitelisted);
  const onCopy = async () => {
    if (requests.length === 0) { notify(t(lang, "crNothingToCopy"), "info"); return; }
    try {
      await copyCancelList(cancelExportRows());
      alert(t(lang, "copiedToClipboard"));
    } catch {
      notify(t(lang, "crCopyFailed"), "error");
    }
  };
  const onExportJSON = () => {
    if (requests.length === 0) { notify(t(lang, "crNothingToExport"), "info"); return; }
    exportCancelJSON(cancelExportRows());
  };
  const onExportCSV = () => {
    if (requests.length === 0) { notify(t(lang, "crNothingToExport"), "info"); return; }
    exportCancelCSV(cancelExportRows());
  };

  const goBack = () => {
    if (active || recyclingRef.current) {
      return;
    }
    setState({ status: "initial" });
  };

  const interruptibleSleep = async (ms: number, message?: string) => {
    if (message) {
      suppressLiveToast.current = true;
    }
    // Count only non-paused time so pausing freezes the countdown instead of consuming it.
    let elapsed = 0;
    while (elapsed < ms && !stoppedRef.current) {
      while (pausedRef.current && !stoppedRef.current) {
        await sleep(250);
      }
      if (stoppedRef.current) {
        break;
      }
      const remaining = ms - elapsed;
      if (message) {
        notify(`${message} (${Math.ceil(remaining / 1000)}s)`, "warning");
      }
      const tick = Math.max(1, Math.min(500, remaining));
      const t0 = Date.now();
      await sleep(tick);
      elapsed += Date.now() - t0;
    }
    if (message) {
      suppressLiveToast.current = false;
    }
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    if (pausedRef.current) {
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current !== null) {
      pausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPaused(pausedRef.current);
  };
  const stop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setPaused(false);
  };

  // Bounded block recovery: a growing cooldown per attempt on the same account, a cap on attempts,
  // and a hard stop once several accounts in a row are refused (a structural problem, not a block).
  const blockAttempts = useRef(new Map<string, number>());
  const consecutiveBlocks = useRef(0);
  const noteSuccess = () => { consecutiveBlocks.current = 0; };
  const abortWith = (reason: string) => {
    abortReasonRef.current = reason;
    notify(reason, "error");
    stop();
  };
  const authAbort = () => abortWith(t(lang, "crSessionExpired"));
  // Same persisted cooldown the unfollow queue uses (iu_blocked_until): a block in either flow pauses both.
  const markBlocked = () => setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
  const refuseWhileBlocked = (): boolean => {
    const blockedUntil = getBlockedUntil();
    if (blockedUntil <= Date.now()) {
      return false;
    }
    notify(t(lang, "crBlockedWait", Math.ceil((blockedUntil - Date.now()) / 60000)), "warning");
    return true;
  };
  // Returns true when the caller should retry the same account, false when it should give up on it.
  // Only accounts given up on count towards the consecutive limit; a success resets it.
  const backOff = async (username: string): Promise<boolean> => {
    const attempt = (blockAttempts.current.get(username) ?? 0) + 1;
    blockAttempts.current.set(username, attempt);
    if (attempt > MAX_BLOCK_RETRIES) {
      consecutiveBlocks.current += 1;
      if (consecutiveBlocks.current >= MAX_CONSECUTIVE_BLOCKS) {
        markBlocked();
        abortWith(t(lang, "crKeepsRefusing"));
      }
      return false;
    }
    await interruptibleSleep(RATE_LIMIT_COOLDOWN * attempt, t(lang, "crCooldownRetry", attempt, MAX_BLOCK_RETRIES));
    return !stoppedRef.current;
  };

  // Following-list search, then profile page (id) + friendships/show. null: Instagram didn't confirm.
  // notFollowed: the scan already found the account missing from your following list, so only its
  // profile page is read (for the id); a request the page cannot confirm is still worth cancelling.
  const resolveRelationship = async (r: CancelRequest, notFollowed = false): Promise<Relationship | "RATE_LIMIT" | "AUTH" | "NOT_FOUND"> => {
    let profile;
    try {
      profile = notFollowed ? await fetchProfilePage(r.username) : await fetchProfile(r.username);
    } catch (e) {
      console.error(e);
      profile = null;
    }
    if (profile === "RATE_LIMIT" || profile === "AUTH") { return profile; }
    if (profile === "NOT_FOUND") { return "NOT_FOUND"; }
    if (profile === null) { return null; } // transient network/server error — skip without marking
    applyProfile(r, profile);
    if (profile.relationship !== null) {
      return profile.relationship;
    }
    return notFollowed ? "pending" : null;
  };

  // Scan the next `scanBatchSize` unverified accounts (read-only; the user picks what to cancel afterwards).
  const preScan = async () => {
    if (active || recyclingRef.current) {
      if (recyclingRef.current) { notify(t(lang, "crWaitRecycle"), "warning"); }
      return;
    }
    if (refuseWhileBlocked()) {
      return;
    }
    // Accounts not attempted yet go first, so ones left unresolved don't block every next batch.
    const unverified = requests.filter(r => r.status === "unverified");
    const fresh = unverified.filter(r => !r.checked);
    const pool = fresh.length > 0 ? fresh : unverified;
    const batch = scanBatchSize > 0 ? pool.slice(0, scanBatchSize) : pool;
    if (batch.length === 0) {
      notify(t(lang, "crNoUnverifiedLeft"), "info");
      return;
    }

    stoppedRef.current = false;
    pausedRef.current = false;
    abortReasonRef.current = null;
    blockAttempts.current.clear();
    setPaused(false);
    setScanning(true);
    startTimeRef.current = Date.now();
    pausedMsRef.current = 0;
    pausedAtRef.current = null;
    processedRef.current = 0;
    totalTargetsRef.current = batch.length;
    // Predict the whole scan duration up front so the ETA is a stable global countdown.
    const scanLongPauses = Math.floor(Math.max(0, batch.length - 1) / PROFILES_BEFORE_SCAN_PAUSE);
    etaTotalRef.current =
      batch.length * EST_SCAN_REQUEST_MS +
      Math.max(0, batch.length - 1) * scanDelay * 1.075 +
      scanLongPauses * (scanLongPause + 2500);
    setPercentage(0);

    try {
    const markProgress = (idx: number) => {
      processedRef.current = idx + 1;
      setPercentage(Math.round(((idx + 1) / batch.length) * 100));
      forceRender();
    };

    consecutiveBlocks.current = 0;
    let pending = 0;
    let following = 0;
    let resolved = 0;
    let ghost = 0;

    for (let idx = 0; idx < batch.length; idx++) {
      if (stoppedRef.current) {
        break;
      }
      while (pausedRef.current && !stoppedRef.current) {
        await sleep(250);
      }
      if (stoppedRef.current) {
        break;
      }
      const r = batch[idx];

      const rel = await resolveRelationship(r);
      r.checked = true; // attempted: the next batch moves on to accounts not tried yet
      if (rel === "AUTH") { authAbort(); break; }
      if (rel === "RATE_LIMIT") {
        if (await backOff(r.username)) {
          idx--;
        } else {
          markProgress(idx); // give up: stays unverified
          if (idx < batch.length - 1) {
            await interruptibleSleep(Math.floor(scanDelay * (0.85 + Math.random() * 0.45)));
          }
        }
        continue;
      }
      // NOT_FOUND / null still cost a request, so they fall through to the pacing sleep below.
      if (rel === "NOT_FOUND") { r.status = "ghost"; r.selected = false; ghost++; }
      else if (rel !== null) { // null: Instagram did not confirm the relationship; stays unverified
        noteSuccess();
        // The scan only reads: it selects nothing and keeps what you picked (a resolved request drops out).
        if (rel === "pending") { r.status = "pending"; r.checked = true; pending++; }
        else if (rel === "following") { r.status = "following"; r.checked = true; following++; }
        else { r.status = "accepted"; r.checked = true; r.selected = false; resolved++; }
      }

      markProgress(idx);

      if (idx === batch.length - 1) {
        break;
      }
      await interruptibleSleep(Math.floor(scanDelay * (0.85 + Math.random() * 0.45)));
      // Longer pause every N profiles to avoid a temp block (like the original scan).
      if ((idx + 1) % PROFILES_BEFORE_SCAN_PAUSE === 0) {
        await interruptibleSleep(scanLongPause + Math.random() * 5000, t(lang, "crSleepingTempBlock"));
      }
    }

    const left = requests.filter(r => r.status === "unverified").length;
    if (stoppedRef.current) {
      const stoppedMsg = t(lang, "crScanStopped", pending + following + resolved + ghost, left);
      if (abortReasonRef.current) {
        notify(`${abortReasonRef.current} · ${stoppedMsg}`, "error");
      } else {
        notify(stoppedMsg, "warning");
      }
    } else {
      setPercentage(100);
      const parts = [t(lang, "crPartPending", pending)];
      if (following > 0) parts.push(t(lang, "crPartFollowing", following));
      if (resolved > 0) parts.push(t(lang, "crPartResolved", resolved));
      if (ghost > 0) parts.push(t(lang, "crPartNotFound", ghost));
      if (left > 0) parts.push(t(lang, "crPartLeft", left));
      notify(t(lang, "crScanResult", parts.join(" · ")), "success");
    }
    } finally {
      // Clear the pause flag too: if the last item finished while paused, a stale pausedRef
      // would freeze the next recycle (which has no Pause/Resume button).
      pausedRef.current = false;
      setPaused(false);
      setScanning(false);
    }
  };

  const run = async () => {
    if (active || recyclingRef.current) {
      if (recyclingRef.current) { notify(t(lang, "crWaitRecycle"), "warning"); }
      return;
    }
    if (refuseWhileBlocked()) {
      return;
    }
    const csrftoken = getCookie("csrftoken");
    if (csrftoken === null) {
      notify(t(lang, "crCsrfMissing"), "error");
      return;
    }
    const targets = requests.filter(r => r.selected && isActionable(r.status) && !isWhitelisted(r.username));
    if (targets.length === 0) {
      notify(t(lang, "crSelectAccountFirst"), "error");
      return;
    }
    if (!confirm(t(lang, "crProcessConfirm", targets.length))) {
      return;
    }

    stoppedRef.current = false;
    pausedRef.current = false;
    abortReasonRef.current = null;
    blockAttempts.current.clear();
    setRunning(true);
    setPaused(false);
    startTimeRef.current = Date.now();
    pausedMsRef.current = 0;
    pausedAtRef.current = null;
    processedRef.current = 0;
    totalTargetsRef.current = targets.length;
    const estReq = EST_CANCEL_REQUEST_MS;
    const cancelBursts = cancelsBeforePause > 0 ? Math.floor(Math.max(0, targets.length - 1) / cancelsBeforePause) : 0;
    etaTotalRef.current =
      targets.length * estReq +
      Math.max(0, targets.length - 1) * timeBetween * 1.0 +
      cancelBursts * burstPause;
    setPercentage(0);

    try {
    const advanceProgress = () => {
      processedRef.current += 1;
      setPercentage(Math.round((processedRef.current / totalTargetsRef.current) * 100));
      forceRender();
    };

    consecutiveBlocks.current = 0;
    let cancelsDone = 0; // actual cancel/unfollow calls, for burst-pause pacing
    let networkErrors = 0;
    for (let i = 0; i < targets.length; i++) {
      if (stoppedRef.current) {
        break;
      }
      while (pausedRef.current && !stoppedRef.current) {
        await sleep(300);
      }
      if (stoppedRef.current) {
        break;
      }
      const r = targets[i];
      if (!isActionable(r.status)) {
        continue;
      }
      if (isWhitelisted(r.username)) {
        r.status = "skipped";
        advanceProgress();
        continue;
      }
      const priorStatus = r.status;
      r.status = "running";
      forceRender();

      // Only never-scanned ("unverified") accounts are resolved here, to get the id + relationship.
      let rel: Relationship = priorStatus === "pending" ? "pending" : priorStatus === "following" ? "following" : null;
      // A lookup that ends the item early still cost a request, so keep the normal pacing gap.
      const paceAfterLookup = async () => {
        if (i < targets.length - 1) {
          await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
        }
      };
      // Retries exhausted. A Stop during the cooldown leaves the account as it was (nothing was attempted).
      const giveUp = async () => {
        if (stoppedRef.current) {
          r.status = priorStatus;
          forceRender();
          return;
        }
        r.status = "failed";
        r.selected = false;
        advanceProgress();
        await paceAfterLookup();
      };
      if (!r.id || rel === null) {
        // An id without a confirmed relationship means the scan already ruled out "following" and read the
        // profile page: the request may still exist, so the cancel is attempted (it changes nothing otherwise).
        const resolved = await resolveRelationship(r, priorStatus === "unverified" && !!r.id);
        if (resolved === "AUTH") { r.status = priorStatus; authAbort(); break; }
        if (resolved === "RATE_LIMIT") {
          r.status = priorStatus;
          if (await backOff(r.username)) { i--; } else { await giveUp(); }
          continue;
        }
        if (resolved === "NOT_FOUND") { r.status = "ghost"; r.selected = false; advanceProgress(); await paceAfterLookup(); continue; }
        if (resolved === null) { r.status = priorStatus; networkErrors++; advanceProgress(); await paceAfterLookup(); continue; } // transient network error; skip
        noteSuccess();
        rel = resolved;
      }

      if (rel === "resolved") { r.status = "accepted"; r.selected = false; advanceProgress(); await paceAfterLookup(); continue; }

      // Cancel pending / unfollow accepted: the same destroy call as the web client's buttons.
      const result = await cancelFollowRequest(r.id!, r.username, csrftoken);
      if (result === "AUTH") { r.status = priorStatus; authAbort(); break; }
      if (result === "RATE_LIMIT") {
        r.status = priorStatus;
        if (await backOff(r.username)) { i--; } else { await giveUp(); }
        continue;
      }
      r.status = result ? "done" : "failed";
      r.selected = false; // processed: a failed one is not retried by the next run unless picked again
      if (result) {
        cancelsDone++;
        noteSuccess();
      }

      advanceProgress();

      if (i === targets.length - 1) {
        break;
      }
      await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
      // Burst pause every N successful cancels; guard cancelsDone > 0 so it doesn't fire at 0.
      if (cancelsBeforePause > 0 && cancelsDone > 0 && cancelsDone % cancelsBeforePause === 0) {
        await interruptibleSleep(burstPause, t(lang, "crCoolingDown"));
      }
    }

    setPercentage(100);
    // Recompute from the live list; render-time `counts` are stale after the loop mutations.
    const doneNow = targets.filter(r => r.status === "done").length;
    const failedNow = targets.filter(r => r.status === "failed").length;
    const errPart = networkErrors > 0 ? t(lang, "crNetworkSkipped", networkErrors) : "";
    if (stoppedRef.current && abortReasonRef.current) {
      notify(`${abortReasonRef.current} · ${t(lang, "crStoppedDone", doneNow, errPart)}`, "error");
    } else {
      notify(
        stoppedRef.current
          ? t(lang, "crStoppedDone", doneNow, errPart)
          : t(lang, "crDoneSummary", doneNow, failedNow, errPart),
        stoppedRef.current ? "warning" : "success",
      );
    }
    } finally {
      pausedRef.current = false;
      setRunning(false);
      setPaused(false);
    }
  };

  // Recycle one whitelisted account: cancel the pending request then re-send it via
  // POST /api/v1/friendships/create/ (requestFollow). csrftoken passed in (fetched once by caller).
  // Returns "abort" when the whole recycle must stop: carrying on while Instagram refuses would
  // cancel more protected requests without being able to send them again.
  const recycleAccount = async (username: string, csrftoken: string): Promise<boolean | "abort"> => {
    const req = requests.find(r => r.username.toLowerCase() === username.toLowerCase());
    if (!req || !req.id) {
      notify(t(lang, "crNotScanned", username), "error");
      return false;
    }

    try {
      const cancelResult = await cancelFollowRequest(req.id, req.username, csrftoken);
      if (cancelResult === "AUTH") {
        authAbort();
        return "abort";
      }
      if (cancelResult === "RATE_LIMIT") {
        markBlocked();
        abortWith(`${t(lang, "crRecycleRefused", username)} · ${t(lang, "crRecycleAborted")}`);
        return "abort";
      }
      if (!cancelResult) {
        // The cancel may have gone through without a confirmation: re-scan instead of trusting "pending".
        req.status = "unverified";
        req.checked = false;
        forceRender();
        notify(t(lang, "crCancelFailed", username), "error");
        return false;
      }

      // Interruptible gap between cancel and re-follow so the pair looks human.
      await interruptibleSleep(1500);

      const followResult = await requestFollow(req.id, csrftoken);
      if (followResult !== true) {
        // Cancel done but re-follow refused/failed: reset to "unverified" so it can be re-scanned,
        // and stop so no more protected requests are cancelled.
        req.status = "unverified";
        req.checked = false;
        forceRender();
        if (followResult === "AUTH") {
          authAbort();
        } else {
          if (followResult === "RATE_LIMIT") {
            markBlocked();
          }
          const key = followResult === "RATE_LIMIT" ? "crRefollowRefused" : "crRefollowFailed";
          abortWith(`${t(lang, key, username)} · ${t(lang, "crRecycleAborted")}`);
        }
        return "abort";
      }

      req.status = "unverified";
      req.checked = false;
      req.selected = false;
      forceRender();
      notify(t(lang, "crRecycled", username), "success");
      return true;
    } catch (e) {
      console.error(e);
      notify(t(lang, "crError"), "error");
      return false;
    }
  };

  // Recycle ALL selected pending whitelisted accounts sequentially, respecting the anti-ban pacing.
  const recycleSelected = async () => {
    // Synchronous guard (ref flips immediately, unlike state) against double-click / concurrent run.
    if (recyclingRef.current || active) {
      notify(t(lang, active ? "crWaitCurrentOp" : "crAlreadyRecycling"), "warning");
      return;
    }

    if (refuseWhileBlocked()) {
      return;
    }
    const toRecycle = requests.filter(r => isWhitelisted(r.username) && r.id && r.status === "pending" && r.selected);
    if (toRecycle.length === 0) {
      notify(t(lang, "crSelectPendingToRecycle"), "info");
      return;
    }
    if (!confirm(t(lang, "crRecycleConfirm", toRecycle.length))) {
      return;
    }
    const csrftoken = getCookie("csrftoken");
    if (!csrftoken) {
      notify(t(lang, "crCsrfMissing"), "error");
      return;
    }
    recyclingRef.current = true;
    stoppedRef.current = false; // clear any stale stop flag from a previous scan/cancel run
    pausedRef.current = false; // no Pause/Resume button during recycle, so a stale pause would hang it
    abortReasonRef.current = null;
    setRecycling(true);
    let successCount = 0;
    let recyclesDone = 0;
    try {
      for (let i = 0; i < toRecycle.length; i++) {
        if (stoppedRef.current) break;
        const ok = await recycleAccount(toRecycle[i].username, csrftoken);
        if (ok === "abort") { stop(); break; }
        if (ok) { successCount++; recyclesDone++; }
        if (i < toRecycle.length - 1) {
          await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
          if (cancelsBeforePause > 0 && recyclesDone > 0 && recyclesDone % cancelsBeforePause === 0) {
            await interruptibleSleep(burstPause, t(lang, "crCoolingDown"));
          }
        }
      }
    } finally {
      recyclingRef.current = false;
      setRecycling(false);
      const countMsg = t(lang, "crRecycledCount", successCount, toRecycle.length);
      if (abortReasonRef.current) {
        notify(`${abortReasonRef.current} · ${countMsg}`, "error");
      } else {
        notify(countMsg, successCount === toRecycle.length ? "success" : "warning");
      }
    }
  };

  if (state.status !== "cancelling") {
    return null;
  }

  return (
    <>
      {/* Same header as the unfollowers Toolbar: live-scan banner, progress bar, actions, language and selection toggles. */}
      <header className={scanning ? "app-header cr-has-banner" : "app-header"}>
        {scanning && (
          <div className="scan-warning-banner" role="status">
            <span>{t(lang, "scanNoticeBanner")}</span>
          </div>
        )}
        {active && (
          <div
            className="progressbar"
            style={{ "--progress-width": `${percentage}%` } as React.CSSProperties}
          />
        )}
        <div className="app-header-content">
          <div className="logo" onClick={goBack}>
            <Logo />
            <div className="logo-text">
              <span>Instagram</span>
              <span>Unfollowers</span>
              <span className="logo-submodule">{t(lang, "crPendingRequests")}</span>
            </div>
          </div>
          <div className="toolbar-actions">
            <button
              className="copy-list"
              title={t(lang, "crCopyTitle")}
              onClick={onCopy}
              disabled={active || counts.total === 0}
            >
              {t(lang, "copyList")}
            </button>
            <button
              className="copy-list"
              title={t(lang, "crExportJsonTitle")}
              onClick={onExportJSON}
              disabled={active || counts.total === 0}
            >
              JSON
            </button>
            <button
              className="copy-list"
              title={t(lang, "crExportCsvTitle")}
              onClick={onExportCSV}
              disabled={active || counts.total === 0}
            >
              CSV
            </button>
            <button
              className="copy-list"
              type="button"
              title={lang === "en" ? t(lang, "switchToSpanish") : t(lang, "switchToEnglish")}
              onClick={() => onLanguageChange(lang === "en" ? "es" : "en")}
              style={{ fontWeight: "bold" }}
            >
              🌐 {lang.toUpperCase()}
            </button>
            <button
              className="icon-button"
              type="button"
              title={t(lang, "settings")}
              onClick={openSettings}
              disabled={busy}
            >
              <SettingIcon />
            </button>
          </div>
          <div className="toolbar-search">
            <input
              type="text"
              className="search-bar"
              placeholder={t(lang, "searchPlaceholder")}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.currentTarget.value); setPage(1); }}
            />
            <label className="select-toggle">
              <input
                title={t(lang, "selectPage")}
                type="checkbox"
                className="toggle-all-checkbox"
                disabled={busy}
                checked={pageSelectable.length > 0 && pageSelectable.every(r => r.selected)}
                onChange={e => setSelected(pageSelectable, e.currentTarget.checked)}
              />
              {t(lang, "selectPage")}
            </label>
            <label className="select-toggle">
              <input
                title={t(lang, "selectAll")}
                type="checkbox"
                className="toggle-all-checkbox"
                disabled={busy}
                checked={allSelectable.length > 0 && allSelectable.every(r => r.selected)}
                onChange={e => setSelected(allSelectable, e.currentTarget.checked)}
              />
              {t(lang, "selectAll")}
            </label>
          </div>
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="app-sidebar">
          <div className="sidebar-content">
            <div className="panel-heading">
              <span>{t(lang, scanning ? "crScanning" : running ? "crCancelling" : "crPendingRequests")}</span>
              <strong>{percentage}%</strong>
            </div>

            <menu className="sidebar-filters-grid">
              <p>{t(lang, "filters")}</p>
              {([["showVerified", "verified"], ["showWithOutProfilePicture", "noPic"]] as const).map(([key, label]) => (
                <label className="badge m-small" key={key}>
                  <input
                    type="checkbox"
                    name={key}
                    checked={filter[key]}
                    onChange={e => {
                      const checked = e.currentTarget.checked;
                      if (requests.some(r => r.selected)) {
                        if (!confirm(t(lang, "crFilterClearsSelection"))) {
                          forceRender(); // keep the checkbox in sync with the unchanged filter
                          return;
                        }
                        clearSelection();
                      }
                      setFilter(f => ({ ...f, [key]: checked }));
                      setPage(1);
                    }}
                  />
                  &nbsp;{t(lang, label)}
                </label>
              ))}
            </menu>

            <div className="cr-scan-controls">
              <p className="cr-section-label">{t(lang, "crScanBatch")}</p>
              <div className="cr-batch-grid">
                {BATCH_OPTIONS.map(value => (
                  <button
                    key={value}
                    className={`button-secondary ${scanBatchSize === value ? "cr-batch-active" : ""}`}
                    disabled={busy}
                    onClick={() => setScanBatchSize(value)}
                  >
                    {value > 0 ? String(value) : t(lang, "crAll")}
                  </button>
                ))}
              </div>
              <button
                className={scanning ? "cr-scan-button cr-scan-stop" : "cr-scan-button"}
                disabled={running || recycling}
                onClick={scanning ? stop : preScan}
              >
                {scanning ? t(lang, "crStopScan") : scanBatchSize > 0 ? t(lang, "crScanNext", scanBatchSize) : t(lang, "crScanAll")}
              </button>
            </div>

            <div className="sidebar-buttons-grid">
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => r.status === "pending")}>
                {t(lang, "crStatusPending")}
              </button>
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => r.status === "following")}>
                {t(lang, "crStatusFollowing")}
              </button>
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => r.isVerified === true)}>
                {t(lang, "verified")}
              </button>
              <button className="button-secondary danger-text" disabled={busy} onClick={clearSelection}>
                {t(lang, "clear")}
              </button>
            </div>
            {selectedInTab.length > 0 && (
              <button className="button-secondary sidebar-whitelist-action" disabled={busy} onClick={whitelistSelected}>
                {currentTab === "whitelisted" ? t(lang, "removeFromWhitelist") : t(lang, "addToWhitelist")} ({selectedInTab.length})
              </button>
            )}

            <div className="sidebar-stats metric-stack">
              <p><span>{t(lang, "crLoaded")}</span><strong>{counts.total}</strong></p>
              <p><span>{t(lang, "crStatusPending")}</span><strong>{counts.pending}</strong></p>
              <p><span>{t(lang, "crStatusFollowing")}</span><strong>{counts.following}</strong></p>
              <p className="whitelist-counter"><span>{t(lang, "whitelistedTab")}</span><strong>★ {counts.whitelisted}</strong></p>
              <p><span>{t(lang, "crStatusDone")}</span><strong>{counts.done}</strong></p>
            </div>

            <div className="sidebar-footer-controls">
              {active && (
                <button className="button-control button-pause" onClick={togglePause}>
                  {t(lang, paused ? "resume" : "pause")}
                </button>
              )}
              <div className="sidebar-pagination">
                <div className="pagination-controls">
                  <a onClick={() => { if (currentPage > 1) { setPage(currentPage - 1); } }}>❮</a>
                  <span>{currentPage}/{maxPage}</span>
                  <a onClick={() => { if (currentPage < maxPage) { setPage(currentPage + 1); } }}>❯</a>
                </div>
              </div>
            </div>
          </div>

          <button
            className="unfollow"
            onClick={running || recycling ? stop : run}
            disabled={scanning}
          >
            {running || recycling ? t(lang, "crStop") : t(lang, "crCancelUnfollow", selectedCount)}
          </button>
        </aside>

        <article className="results-container">
          <nav className="tabs-container">
            <button
              type="button"
              className={`tab ${currentTab === "non_whitelisted" ? "tab-active" : ""}`}
              onClick={() => { if (currentTab !== "non_whitelisted") { setCurrentTab("non_whitelisted"); setPage(1); } }}
            >
              {t(lang, "nonWhitelistedTab")}
            </button>
            <button
              type="button"
              className={`tab ${currentTab === "whitelisted" ? "tab-active" : ""}`}
              onClick={() => { if (currentTab !== "whitelisted") { setCurrentTab("whitelisted"); setPage(1); } }}
            >
              {t(lang, "whitelistedTab")} ({counts.whitelisted})
            </button>
          </nav>

          {currentTab === "whitelisted" && (
            <div className="cr-recycle-bar">
              <button
                type="button"
                className={`cr-recycle-btn${recycling ? " is-running" : ""}`}
                onClick={recycleSelected}
                disabled={busy}
                title={recyclableSelCount > 0
                  ? t(lang, "crRecycleTitle", recyclableSelCount)
                  : t(lang, "crRecycleHint")}
              >
                {recycling ? "⏳" : "♻️"}
                {recyclableSelCount > 0 && <span className="cr-recycle-count">{recyclableSelCount}</span>}
              </button>
            </div>
          )}

          {(() => {
            // Insert a month/year header whenever the date bucket changes, reusing ".alphabet-character".
            let currentGroup = "";
            const rows: React.ReactNode[] = [];
            for (const req of pageItems) {
              const group = monthYearLabel(req.timestamp, lang);
              if (group !== currentGroup) {
                currentGroup = group;
                rows.push(
                  <div className="alphabet-character" key={`group-${group}`}>
                    {group}
                  </div>
                );
              }
              rows.push(
                <label className="result-item" key={req.username}>
                  <div className="flex grow align-center">
                    <div
                      className="avatar-container"
                      title={t(lang, currentTab === "non_whitelisted" ? "crClickToWhitelist" : "crClickToUnwhitelist")}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); if (!busy) { toggleWhitelist(req.username); } }}
                    >
                      <img
                        className="avatar"
                        alt={req.username}
                        src={req.profilePicUrl || placeholderAvatar(req.username)}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = placeholderAvatar(req.username); }}
                      />
                      <span className="avatar-icon-overlay-container">
                        {currentTab === "non_whitelisted" ? <UserCheckIcon /> : <UserUncheckIcon />}
                      </span>
                    </div>
                    <div className="flex column m-medium">
                      <a className="fs-xlarge" target="_blank" href={`/${encodeURIComponent(req.username)}`} rel="noreferrer">
                        {req.username}
                      </a>
                      <span className="fs-medium">
                        {(d => [req.fullName, d && t(lang, "crRequested", d)].filter(Boolean).join(" · "))(formatRequestedAt(req.timestamp))}
                      </span>
                    </div>
                    {req.isVerified && <div className="verified-badge">✔</div>}
                    <span className={`cr-status cr-status-${req.status}`}>{t(lang, STATUS_LABELS[req.status])}</span>
                  </div>
                  <input
                    className="account-checkbox"
                    type="checkbox"
                    disabled={busy || !isActionable(req.status)}
                    checked={!!req.selected}
                    onChange={e => toggleSelect(req, e.currentTarget.checked)}
                  />
                </label>,
              );
            }
            return rows;
          })()}
          {displayed.length === 0 && (
            <p className="cr-empty">
              {t(lang, currentTab === "whitelisted" ? "crNoWhitelistedYet" : "crNoRequestsMatch")}
            </p>
          )}
        </article>
      </section>

      {showSettings && (
        <form onSubmit={e => {
        e.preventDefault();
        setScanDelay(v => Math.max(MIN_SCAN_DELAY, v));
        setScanLongPause(v => Math.max(MIN_SCAN_LONG_PAUSE, v));
        setTimeBetween(v => Math.max(MIN_TIME_BETWEEN_CANCELS, v));
        setBurstPause(v => Math.max(MIN_BURST_PAUSE, v));
        setShowSettings(false);
      }}>
          <div className="backdrop" onClick={closeSettings}>
            <div className="setting-menu" onClick={e => e.stopPropagation()}>
              <div className="settings-module">
                <div className="module-header"><h3>{t(lang, "crCancelSettings")}</h3></div>
                <div className="settings-content">
                  <div className="row">
                    <label className="minimun-width">{t(lang, "crDelayScanned")}</label>
                    <input type="number" min={MIN_SCAN_DELAY} max={999999} value={scanDelay} onChange={e => setScanDelay(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">{t(lang, "crLongPauseScanned", PROFILES_BEFORE_SCAN_PAUSE)}</label>
                    <input type="number" min={MIN_SCAN_LONG_PAUSE} max={999999} value={scanLongPause} onChange={e => setScanLongPause(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">{t(lang, "crDelayActions")}</label>
                    <input type="number" min={MIN_TIME_BETWEEN_CANCELS} max={999999} value={timeBetween} onChange={e => setTimeBetween(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">{t(lang, "crLongPauseActions", cancelsBeforePause)}</label>
                    <input type="number" min={MIN_BURST_PAUSE} max={999999} value={burstPause} onChange={e => setBurstPause(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                </div>
                <div className="warning-container">
                  <h3 className="warning"><b>{t(lang, "warningPrefix")}</b> {t(lang, "crSettingsWarning1")}</h3>
                  <h3 className="warning">{t(lang, "crSettingsWarning2")}</h3>
                </div>
              </div>

              <hr className="module-divider" />

              <div className="whitelist-module">
                <CancelWhitelistManager
                  whitelistUsernames={Array.from(whitelist)}
                  requests={requests}
                  onWhitelistUpdate={applyWhitelist}
                  lang={lang}
                />
              </div>

              <div className="btn-container">
                <button className="btn" type="submit">{t(lang, "crDoneButton")}</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {toast.show && <Toast show={toast.show} style={toast.style} message={toast.text} onClose={() => setToast({ show: false })} />}
    </>
  );
};
