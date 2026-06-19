import React, { useEffect, useMemo, useRef, useState } from "react";
import { State } from "../model/state";
import { CancelRequest, CancelStatus } from "../model/cancel-request";
import { getCookie, sleep } from "../utils/utils";
import {
  buildCancelExportRows,
  cancelFollowRequest,
  checkFriendship,
  copyCancelList,
  exportCancelCSV,
  exportCancelJSON,
  fetchProfile,
  formatDuration,
  formatRequestedAt,
  loadCancelWhitelist,
  monthYearLabel,
  Relationship,
  ResolvedProfile,
  requestFollow,
  saveCancelWhitelist,
} from "../utils/cancel-requests";
import { loadTimings, loadWhitelist } from "../utils/whitelist-manager";
import {
  DEFAULT_CANCELS_BEFORE_PAUSE,
  DEFAULT_TIME_BETWEEN_CANCELS,
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_BURST,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  EST_CANCEL_REQUEST_MS,
  EST_SCAN_REQUEST_MS,
  MIN_BURST_PAUSE,
  MIN_SCAN_DELAY,
  MIN_SCAN_LONG_PAUSE,
  MIN_TIME_BETWEEN_CANCELS,
  PROFILES_BEFORE_SCAN_PAUSE,
  RATE_LIMIT_COOLDOWN,
  SCAN_BATCH_SIZES,
  UNFOLLOWERS_PER_PAGE,
} from "../constants/constants";
import { Logo } from "./icons/Logo";
import { SettingIcon } from "./icons/SettingIcon";
import { UserCheckIcon } from "./icons/UserCheckIcon";
import { UserUncheckIcon } from "./icons/UserUncheckIcon";
import { Toast } from "./Toast";
import { CancelWhitelistManager } from "./CancelWhitelistManager";

interface CancelRequestsProps {
  state: State;
  setState: (state: State) => void;
}

type StatusFilter = "all" | "unverified" | "pending" | "following" | "done" | "failed";
type WhitelistTab = "non_whitelisted" | "whitelisted";

const BATCH_OPTIONS: ReadonlyArray<Readonly<{ value: number; label: string }>> = [
  ...SCAN_BATCH_SIZES.map(size => ({ value: size, label: String(size) })),
  { value: 0, label: "All" },
];

const STATUS_LABELS: Record<CancelStatus, string> = {
  unverified: "Unverified",
  pending: "Pending",
  following: "Following",
  running: "Working…",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
  accepted: "Resolved",
  ghost: "Not found",
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

// "skipped" is included so un-whitelisting a mid-run skipped account re-enables selection.
const isActionable = (status: CancelStatus): boolean =>
  status === "pending" || status === "unverified" || status === "following" || status === "skipped";

const applyProfile = (r: CancelRequest, p: ResolvedProfile): void => {
  r.id = p.id;
  r.fullName = p.fullName;
  r.profilePicUrl = p.profilePicUrl;
  r.isPrivate = p.isPrivate;
  r.isVerified = p.isVerified;
};

export const CancelRequests = ({ state, setState }: CancelRequestsProps) => {
  if (state.status !== "cancelling") {
    return null;
  }

  const requestsRef = useRef<CancelRequest[]>(state.requests.map(r => ({ ...r })));
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

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const [recyclingGroup, setRecyclingGroup] = useState<string | null>(null);

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
  const busy = active || recyclingGroup !== null;

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
      const el = Date.now() - startTimeRef.current;
      // After the first item extrapolate from measured pace; before that use the up-front prediction.
      let eta: string;
      if (proc > 0 && proc < total) {
        eta = formatDuration((el / proc) * (total - proc));
      } else if (proc === 0 && etaTotalRef.current > 0) {
        eta = formatDuration(Math.max(0, etaTotalRef.current - el));
      } else {
        eta = "…";
      }
      setToast({ show: true, text: `${scanning ? "Scanning" : "Cancelling"}… ${proc}/${total} · ${eta} left`, style: "info" });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, scanning]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!active) {
        return;
      }
      e.returnValue = "Changes you made may not be saved.";
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

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
    switch (statusFilter) {
      case "all": return true;
      case "unverified": return r.status === "unverified";
      case "pending": return r.status === "pending";
      case "following": return r.status === "following";
      case "done": return r.status === "done";
      case "failed": return r.status === "failed";
      default: return true;
    }
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
  [renderTick, whitelist, currentTab, statusFilter, searchTerm]);
  const maxPage = Math.max(1, Math.ceil(displayed.length / UNFOLLOWERS_PER_PAGE));
  const currentPage = Math.min(page, maxPage);
  const pageItems = displayed.slice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE * currentPage);

  const toggleSelect = (target: CancelRequest, checked: boolean) => {
    target.selected = checked;
    forceRender();
  };
  const selectMatching = (predicate: (r: CancelRequest) => boolean) => {
    requests.forEach(r => { if (predicate(r) && !isWhitelisted(r.username)) { r.selected = true; } });
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

  const applyWhitelist = (usernames: readonly string[]) => {
    // Re-merge with the shared unfollowers whitelist so importing/clearing the cancel-specific list
    // does not silently drop protection for accounts protected via the other module.
    const sharedEntries = loadWhitelist().map(u => u.username.toLowerCase());
    const sharedKeys = new Set(sharedEntries);
    const next = new Set([...usernames.map(u => u.toLowerCase()), ...sharedEntries]);
    requests.forEach(r => { if (next.has(r.username.toLowerCase())) { r.selected = false; } });
    setWhitelist(next);
    // Save ONLY cancel-specific entries (like toggleWhitelist); else iucr_whitelist gets polluted
    // with shared entries when a merged list is imported.
    saveCancelWhitelist(Array.from(usernames).filter(u => !sharedKeys.has(u.toLowerCase())));
    forceRender();
  };

  const cancelExportRows = () => buildCancelExportRows(requests, isWhitelisted);
  const onCopy = async () => {
    if (requests.length === 0) { notify("Nothing to copy yet — load a file first", "info"); return; }
    try {
      await copyCancelList(cancelExportRows());
      alert("List copied to clipboard!");
    } catch {
      notify("Could not copy to clipboard", "error");
    }
  };
  const onExportJSON = () => {
    if (requests.length === 0) { notify("Nothing to export yet — load a file first", "info"); return; }
    exportCancelJSON(cancelExportRows());
  };
  const onExportCSV = () => {
    if (requests.length === 0) { notify("Nothing to export yet — load a file first", "info"); return; }
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
      const t = Date.now();
      await sleep(tick);
      elapsed += Date.now() - t;
    }
    if (message) {
      suppressLiveToast.current = false;
    }
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };
  const stop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setPaused(false);
  };

  // Relationship from web_profile_info's FLAT requested_by_viewer/followed_by_viewer fields
  // (friendship_status only as fallback via friendships/show). null on non-429 → caller skips.
  const resolveRelationship = async (r: CancelRequest): Promise<Relationship | "RATE_LIMIT" | "NOT_FOUND"> => {
    const profile = await fetchProfile(r.username);
    if (profile === "RATE_LIMIT") { return "RATE_LIMIT"; }
    if (profile === "NOT_FOUND") { return "NOT_FOUND"; }
    if (profile === null) { return null; } // transient network/server error — skip without marking
    applyProfile(r, profile);
    if (profile.relationship !== null) {
      return profile.relationship;
    }
    const fr = await checkFriendship(r.id!);
    if (fr === "RATE_LIMIT") { return "RATE_LIMIT"; }
    // null (non-429 error) → skip, else a real pending request gets mismarked "resolved/accepted".
    if (fr === null) { return null; }
    return fr === "pending" ? "pending" : fr === "following" ? "following" : "resolved";
  };

  // Scan the next `scanBatchSize` unverified accounts and auto-select actionable non-protected ones.
  const preScan = async () => {
    if (active || recyclingRef.current) {
      if (recyclingRef.current) { notify("Wait for the recycle to finish", "warning"); }
      return;
    }
    const unverified = requests.filter(r => r.status === "unverified");
    const batch = scanBatchSize > 0 ? unverified.slice(0, scanBatchSize) : unverified;
    if (batch.length === 0) {
      notify("No unverified requests left to scan", "info");
      return;
    }

    stoppedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setScanning(true);
    startTimeRef.current = Date.now();
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
      if (rel === "RATE_LIMIT") { await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited"); idx--; continue; }
      if (rel === "NOT_FOUND") { r.status = "ghost"; ghost++; markProgress(idx); continue; }
      if (rel === null) { markProgress(idx); continue; } // transient network error; leave as unverified

      const protectedAcc = isWhitelisted(r.username);
      if (rel === "pending") { r.status = "pending"; r.checked = true; r.selected = !protectedAcc; pending++; }
      else if (rel === "following") { r.status = "following"; r.checked = true; r.selected = !protectedAcc; following++; }
      else { r.status = "accepted"; r.checked = true; r.selected = false; resolved++; }

      markProgress(idx);

      if (idx === batch.length - 1) {
        break;
      }
      await interruptibleSleep(Math.floor(scanDelay * (0.85 + Math.random() * 0.45)));
      // Longer pause every N profiles to avoid a temp block (like the original scan).
      if ((idx + 1) % PROFILES_BEFORE_SCAN_PAUSE === 0) {
        await interruptibleSleep(scanLongPause + Math.random() * 5000, "Sleeping to prevent getting temp blocked");
      }
    }

    const left = requests.filter(r => r.status === "unverified").length;
    if (stoppedRef.current) {
      notify(`Scan stopped — ${pending + following + resolved + ghost} scanned · ${left} left`, "warning");
    } else {
      setPercentage(100);
      const parts = [`${pending} pending`];
      if (following > 0) parts.push(`${following} following`);
      if (resolved > 0) parts.push(`${resolved} resolved`);
      if (ghost > 0) parts.push(`${ghost} not found`);
      if (left > 0) parts.push(`${left} left`);
      notify(`Scan: ${parts.join(" · ")}`, "success");
    }
    } finally {
      setScanning(false);
    }
  };

  const run = async () => {
    if (active || recyclingRef.current) {
      if (recyclingRef.current) { notify("Wait for the recycle to finish", "warning"); }
      return;
    }
    const csrftoken = getCookie("csrftoken");
    if (csrftoken === null) {
      notify("csrftoken cookie not found — are you logged in to Instagram?", "error");
      return;
    }
    const targets = requests.filter(r => r.selected && isActionable(r.status) && !isWhitelisted(r.username));
    if (targets.length === 0) {
      notify("Select at least one account first (scan to find pending/following)", "error");
      return;
    }
    if (!confirm(`Process ${targets.length} selected account(s)? Pending requests are cancelled and accepted ones are unfollowed.`)) {
      return;
    }

    stoppedRef.current = false;
    pausedRef.current = false;
    setRunning(true);
    setPaused(false);
    startTimeRef.current = Date.now();
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
      if (!r.id || rel === null) {
        const resolved = await resolveRelationship(r);
        if (resolved === "RATE_LIMIT") { r.status = priorStatus; await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited"); i--; continue; }
        if (resolved === "NOT_FOUND") { r.status = "ghost"; advanceProgress(); continue; }
        if (resolved === null) { r.status = priorStatus; networkErrors++; advanceProgress(); continue; } // transient network error; skip
        rel = resolved;
      }

      if (rel === "resolved") { r.status = "accepted"; advanceProgress(); continue; }

      // Cancel pending / unfollow accepted via POST /web/friendships/{id}/unfollow/
      // (/api/v1/friendships/destroy/ returns 200 but is a silent no-op).
      const result = await cancelFollowRequest(r.id!, csrftoken);
      if (result === "RATE_LIMIT") { r.status = priorStatus; await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited"); i--; continue; }
      r.status = result ? "done" : "failed";
      if (result) {
        cancelsDone++;
      }

      advanceProgress();

      if (i === targets.length - 1) {
        break;
      }
      await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
      // Burst pause every N successful cancels; guard cancelsDone > 0 so it doesn't fire at 0.
      if (cancelsBeforePause > 0 && cancelsDone > 0 && cancelsDone % cancelsBeforePause === 0) {
        await interruptibleSleep(burstPause, "Cooling down to avoid a temp block");
      }
    }

    setPercentage(100);
    // Recompute from the live list; render-time `counts` are stale after the loop mutations.
    const doneNow = requestsRef.current.filter(r => r.status === "done").length;
    const failedNow = requestsRef.current.filter(r => r.status === "failed").length;
    const errPart = networkErrors > 0 ? ` · ${networkErrors} skipped (network error)` : "";
    notify(
      stoppedRef.current
        ? `Stopped — ${doneNow} done${errPart}`
        : `Done: ${doneNow} processed · ${failedNow} failed${errPart}`,
      stoppedRef.current ? "warning" : "success",
    );
    } finally {
      setRunning(false);
      setPaused(false);
    }
  };

  // Recycle one whitelisted account: cancel the pending request then re-send it via
  // POST /api/v1/friendships/create/ (requestFollow). csrftoken passed in (fetched once by caller).
  const recycleAccount = async (username: string, csrftoken: string): Promise<boolean> => {
    const req = requests.find(r => r.username.toLowerCase() === username.toLowerCase());
    if (!req || !req.id) {
      notify(`${username} not found or not yet scanned`, "error");
      return false;
    }

    try {
      const cancelResult = await cancelFollowRequest(req.id, csrftoken);
      if (cancelResult === "RATE_LIMIT") {
        await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited");
        return false;
      }
      if (!cancelResult) {
        notify(`Failed to cancel ${username}`, "error");
        return false;
      }

      // Interruptible gap between cancel and re-follow so the pair looks human.
      await interruptibleSleep(1500);

      const followResult = await requestFollow(req.id, csrftoken);
      if (followResult === "RATE_LIMIT") {
        // Cancel done but re-follow rate-limited: reset to "unverified" so it can be re-scanned.
        req.status = "unverified";
        req.checked = false;
        forceRender();
        await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited — cancel done, re-follow not sent");
        return false;
      }
      if (!followResult) {
        // Cancel done but re-follow failed: reset to "unverified" so it can be re-scanned.
        req.status = "unverified";
        req.checked = false;
        forceRender();
        notify(`Cancel succeeded but failed to resend to ${username} — marked unverified for re-scan`, "error");
        return false;
      }

      req.status = "unverified";
      req.checked = false;
      req.selected = false;
      forceRender();
      notify(`Recycled ${username}!`, "success");
      return true;
    } catch (e) {
      console.error(e);
      notify("Error", "error");
      return false;
    }
  };

  // Recycle ALL selected pending whitelisted accounts sequentially, respecting the anti-ban pacing.
  const recycleSelected = async () => {
    // Synchronous guard (ref flips immediately, unlike state) against double-click / concurrent run.
    if (recyclingRef.current || active) {
      notify(active ? "Wait for the current operation to finish" : "Already recycling — please wait", "warning");
      return;
    }

    const toRecycle = requests.filter(r => isWhitelisted(r.username) && r.id && r.status === "pending" && r.selected);
    if (toRecycle.length === 0) {
      notify("Select pending accounts first (check the boxes), then click ♻️", "info");
      return;
    }
    if (!confirm(`Recycle ${toRecycle.length} selected pending account(s)?`)) {
      return;
    }
    const csrftoken = getCookie("csrftoken");
    if (!csrftoken) {
      notify("csrftoken cookie not found — are you logged in to Instagram?", "error");
      return;
    }
    recyclingRef.current = true;
    stoppedRef.current = false; // clear any stale stop flag from a previous scan/cancel run
    setRecyclingGroup("__all__");
    let successCount = 0;
    let recyclesDone = 0;
    try {
      for (let i = 0; i < toRecycle.length; i++) {
        if (stoppedRef.current) break;
        const ok = await recycleAccount(toRecycle[i].username, csrftoken);
        if (ok) { successCount++; recyclesDone++; }
        if (i < toRecycle.length - 1) {
          await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
          if (cancelsBeforePause > 0 && recyclesDone > 0 && recyclesDone % cancelsBeforePause === 0) {
            await interruptibleSleep(burstPause, "Cooling down to avoid a temp block");
          }
        }
      }
    } finally {
      recyclingRef.current = false;
      setRecyclingGroup(null);
      notify(`Recycled ${successCount}/${toRecycle.length}`, successCount === toRecycle.length ? "success" : "warning");
    }
  };

  const FILTERS = useMemo<ReadonlyArray<{ key: StatusFilter; label: string; count: number }>>(() => [
    { key: "all", label: "All", count: counts.total },
    { key: "unverified", label: "Unverified", count: counts.unverified },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "following", label: "Following", count: counts.following },
    { key: "done", label: "Done", count: counts.done },
    { key: "failed", label: "Failed", count: counts.failed },
  ], [counts]);

  return (
    <>
      <header className="app-header">
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
              <span className="logo-submodule">Pending Requests</span>
            </div>
          </div>
          <div className="toolbar-actions">
            <button
              className="copy-list"
              title="Copy all usernames to the clipboard"
              onClick={onCopy}
              disabled={active || counts.total === 0}
            >
              Copy
            </button>
            <button
              className="copy-list"
              title="Export the full list (both tabs) to JSON"
              onClick={onExportJSON}
              disabled={active || counts.total === 0}
            >
              JSON
            </button>
            <button
              className="copy-list"
              title="Export the full list (both tabs) to CSV"
              onClick={onExportCSV}
              disabled={active || counts.total === 0}
            >
              CSV
            </button>
            <button
              className="icon-button"
              type="button"
              title="Settings"
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
              placeholder="Search users"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.currentTarget.value); setPage(1); }}
            />
          </div>
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="app-sidebar">
          <div className="sidebar-content">
            <div className="panel-heading">
              <span>{scanning ? "Scanning" : running ? "Cancelling" : "Pending Requests"}</span>
              <strong>{percentage}%</strong>
            </div>

            <menu className="sidebar-filters-grid">
              <p>Show</p>
              {FILTERS.map(f => (
                <label className="badge" key={f.key}>
                  <input
                    type="checkbox"
                    checked={statusFilter === f.key}
                    onChange={() => { setStatusFilter(f.key); setPage(1); }}
                  />
                  &nbsp;{f.label}
                </label>
              ))}
            </menu>

            <div className="cr-scan-controls">
              <p className="cr-section-label">Scan batch</p>
              <div className="cr-batch-grid">
                {BATCH_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    className={`button-secondary ${scanBatchSize === opt.value ? "cr-batch-active" : ""}`}
                    disabled={busy}
                    onClick={() => setScanBatchSize(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                className={scanning ? "cr-scan-button cr-scan-stop" : "cr-scan-button"}
                disabled={running || recyclingGroup !== null}
                onClick={scanning ? stop : preScan}
              >
                {scanning ? "Stop scan" : scanBatchSize > 0 ? `Scan next ${scanBatchSize}` : "Scan all"}
              </button>
            </div>

            <div className="sidebar-buttons-grid">
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => isActionable(r.status))}>
                Select All
              </button>
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => r.status === "pending")}>
                Pending
              </button>
              <button className="button-secondary" disabled={busy} onClick={() => selectMatching(r => r.status === "following")}>
                Following
              </button>
              <button className="button-secondary danger-text" disabled={busy} onClick={clearSelection}>
                Clear
              </button>
            </div>

            <div className="sidebar-stats metric-stack">
              <p><span>Loaded</span><strong>{counts.total}</strong></p>
              <p><span>Pending</span><strong>{counts.pending}</strong></p>
              <p><span>Following</span><strong>{counts.following}</strong></p>
              <p className="whitelist-counter"><span>Whitelisted</span><strong>★ {counts.whitelisted}</strong></p>
              <p><span>Done</span><strong>{counts.done}</strong></p>
            </div>

            <div className="sidebar-footer-controls">
              {active && (
                <button className="button-control button-pause" onClick={togglePause}>
                  {paused ? "Resume" : "Pause"}
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
            onClick={running || recyclingGroup !== null ? stop : run}
            disabled={scanning}
          >
            {running || recyclingGroup !== null ? "Stop" : `Cancel / Unfollow (${selectedCount})`}
          </button>
        </aside>

        <article className="results-container">
          <nav className="tabs-container">
            <button
              type="button"
              className={`tab ${currentTab === "non_whitelisted" ? "tab-active" : ""}`}
              onClick={() => { if (currentTab !== "non_whitelisted") { setCurrentTab("non_whitelisted"); setPage(1); } }}
            >
              Non-Whitelisted
            </button>
            <button
              type="button"
              className={`tab ${currentTab === "whitelisted" ? "tab-active" : ""}`}
              onClick={() => { if (currentTab !== "whitelisted") { setCurrentTab("whitelisted"); setPage(1); } }}
            >
              Whitelisted ({counts.whitelisted})
            </button>
          </nav>

          {currentTab === "whitelisted" && (
            <div className="cr-recycle-bar">
              <button
                type="button"
                className={`cr-recycle-btn${recyclingGroup !== null ? " is-running" : ""}`}
                onClick={recycleSelected}
                disabled={busy}
                title={recyclableSelCount > 0
                  ? `Recycle ${recyclableSelCount} selected pending account(s)`
                  : "Select pending accounts (check the boxes) to recycle them"}
              >
                {recyclingGroup !== null ? "⏳" : "♻️"}
                {recyclableSelCount > 0 && <span className="cr-recycle-count">{recyclableSelCount}</span>}
              </button>
            </div>
          )}

          {(() => {
            // Insert a month/year header whenever the date bucket changes, reusing ".alphabet-character".
            let currentGroup = "";
            const rows: React.ReactNode[] = [];
            for (const req of pageItems) {
              const group = monthYearLabel(req.timestamp);
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
                      title={currentTab === "non_whitelisted" ? "Click photo to whitelist (protect)" : "Click photo to remove from whitelist"}
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
                      <a className="fs-xlarge" target="_blank" href={`/${req.username}`} rel="noreferrer">
                        {req.username}
                      </a>
                      <span className="fs-medium">
                        {(d => [req.fullName, d && `Requested ${d}`].filter(Boolean).join(" · "))(formatRequestedAt(req.timestamp))}
                      </span>
                    </div>
                    {req.isVerified && <div className="verified-badge">✔</div>}
                    {req.isPrivate && <span className="private-indicator">Private</span>}
                    <span className={`cr-status cr-status-${req.status}`}>{STATUS_LABELS[req.status]}</span>
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
              {currentTab === "whitelisted" ? "No whitelisted accounts yet — click a profile photo to protect it." : "No requests match this filter."}
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
                <div className="module-header"><h3>Cancel settings</h3></div>
                <div className="settings-content">
                  <div className="row">
                    <label className="minimun-width">Delay between scanned profiles</label>
                    <input type="number" min={MIN_SCAN_DELAY} max={999999} value={scanDelay} onChange={e => setScanDelay(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">Long pause after {PROFILES_BEFORE_SCAN_PAUSE} scanned profiles</label>
                    <input type="number" min={MIN_SCAN_LONG_PAUSE} max={999999} value={scanLongPause} onChange={e => setScanLongPause(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">Delay between actions</label>
                    <input type="number" min={MIN_TIME_BETWEEN_CANCELS} max={999999} value={timeBetween} onChange={e => setTimeBetween(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                  <div className="row">
                    <label className="minimun-width">Long pause after {cancelsBeforePause} actions</label>
                    <input type="number" min={MIN_BURST_PAUSE} max={999999} value={burstPause} onChange={e => setBurstPause(Number(e.currentTarget.value))} />
                    <label className="margin-between-input-and-label">(ms)</label>
                  </div>
                </div>
                <div className="warning-container">
                  <h3 className="warning"><b>WARNING:</b> Modifying these settings can lead to your account being banned.</h3>
                  <h3 className="warning">Keep the delay at 3000ms+ and work in small batches. USE IT AT YOUR OWN RISK!!!!</h3>
                </div>
              </div>

              <hr className="module-divider" />

              <div className="whitelist-module">
                <CancelWhitelistManager
                  whitelistUsernames={Array.from(whitelist)}
                  requests={requests}
                  onWhitelistUpdate={applyWhitelist}
                />
              </div>

              <div className="btn-container">
                <button className="btn" type="submit">Done</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {toast.show && <Toast show={toast.show} style={toast.style} message={toast.text} onClose={() => setToast({ show: false })} />}
    </>
  );
};
