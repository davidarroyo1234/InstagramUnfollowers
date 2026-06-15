import React, { useEffect, useRef, useState } from "react";
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

const avatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0f172a,1f2937,312e81&fontFamily=Verdana`;

// Accounts we can act on: pending requests (cancel) and accepted ones we now follow (unfollow).
const isActionable = (status: CancelStatus): boolean =>
  status === "pending" || status === "unverified" || status === "following";

// Copy resolved profile info onto a request (for display + cancellation).
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

  // Working, mutable copy of the parsed requests. Mutated in place by the worker
  // loops; `forceRender` triggers re-renders after mutations.
  const requestsRef = useRef<CancelRequest[]>(state.requests.map(r => ({ ...r })));
  const [, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick(v => v + 1);

  // Control flags for the async loops (kept in refs to avoid stale closures).
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  // While true, the per-second live-ETA toast is suppressed so a countdown (cooldown / long pause)
  // stays visible instead.
  const suppressLiveToast = useRef(false);

  // Mirrored UI state.
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [percentage, setPercentage] = useState(0);

  // Progress tracking for the live ETA (refs so the interval reads fresh values).
  // Shared by scan and cancel — only one runs at a time.
  const startTimeRef = useRef(0);
  const processedRef = useRef(0);
  const totalTargetsRef = useRef(0);
  // Predicted total duration (ms) computed up front from the configured delays + pauses, so the
  // ETA is a stable global estimate that counts DOWN (instead of a volatile per-item recompute).
  const etaTotalRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentTab, setCurrentTab] = useState<WhitelistTab>("non_whitelisted");
  const [page, setPage] = useState(1);
  const [scanBatchSize, setScanBatchSize] = useState<number>(SCAN_BATCH_SIZES[0]);

  // Whitelist of protected usernames (lowercased). Seeded from the cancel-specific list and the
  // shared unfollowers whitelist, so accounts you protect anywhere are never auto-selected/cancelled.
  const [whitelist, setWhitelist] = useState<Set<string>>(() =>
    new Set<string>([...loadCancelWhitelist(), ...loadWhitelist().map(u => u.username.toLowerCase())]),
  );
  const isWhitelisted = (username: string) => whitelist.has(username.toLowerCase());

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string; readonly style: "info" | "success" | "error" | "warning" }>({ show: false });
  const notify = (text: string, style: "info" | "success" | "error" | "warning" = "info") => setToast({ show: true, text, style });

  // Timing / anti-ban settings.
  // Scan timings default to the original program's search-cycle constants (and any value the
  // user saved in the main Settings panel), so the scan throttles like the original scan.
  const initialTimings = loadTimings();
  const [showSettings, setShowSettings] = useState(false);
  const [scanDelay, setScanDelay] = useState(initialTimings?.timeBetweenSearchCycles ?? DEFAULT_TIME_BETWEEN_SEARCH_CYCLES);
  const [scanLongPause, setScanLongPause] = useState(initialTimings?.timeToWaitAfterFiveSearchCycles ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES);
  const [timeBetween, setTimeBetween] = useState(DEFAULT_TIME_BETWEEN_CANCELS);
  const [burstPause, setBurstPause] = useState(DEFAULT_TIME_TO_WAIT_AFTER_BURST);
  const [verifyBeforeCancel, setVerifyBeforeCancel] = useState(true);
  // Kept fixed (not exposed as settings) so the panel stays close to the original's small set.
  // The "long pause" kicks in after this many actions; there is no daily cap by default.
  const cancelsBeforePause = DEFAULT_CANCELS_BEFORE_PAUSE;
  const dailyLimit = 0;

  const active = running || scanning;

  // Refresh the live ETA roughly once per second while scanning or cancelling, and surface it as a
  // floating toast (e.g. "Cancelling… 12/40 · ETA 2m 10s"), like the cooldown countdown.
  useEffect(() => {
    if (!active) {
      return;
    }
    const tick = () => {
      forceRender();
      if (suppressLiveToast.current) {
        return;
      }
      const proc = processedRef.current;
      const total = totalTargetsRef.current;
      const el = Date.now() - startTimeRef.current;
      const eta = etaTotalRef.current > 0 ? formatDuration(Math.max(0, etaTotalRef.current - el)) : "…";
      setToast({ show: true, text: `${scanning ? "Scanning" : "Cancelling"}… ${proc}/${total} · ${eta} left`, style: "info" });
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, scanning]);

  // Warn before leaving the tab during an active process.
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
  const countBy = (predicate: (r: CancelRequest) => boolean) => requests.filter(predicate).length;
  const counts = {
    total: requests.length,
    unverified: countBy(r => r.status === "unverified"),
    pending: countBy(r => r.status === "pending"),
    following: countBy(r => r.status === "following"),
    done: countBy(r => r.status === "done"),
    failed: countBy(r => r.status === "failed"),
    whitelisted: countBy(r => isWhitelisted(r.username)),
  };
  const selectedCount = countBy(r => !!r.selected && isActionable(r.status) && !isWhitelisted(r.username));

  const matchesFilter = (r: CancelRequest): boolean => {
    switch (statusFilter) {
      case "all": return true;
      case "unverified": return r.status === "unverified";
      case "pending": return r.status === "pending";
      case "following": return r.status === "following";
      case "done": return r.status === "done";
      case "failed": return r.status === "failed";
    }
  };
  const inTab = (r: CancelRequest): boolean =>
    currentTab === "whitelisted" ? isWhitelisted(r.username) : !isWhitelisted(r.username);
  // Sort by request date (newest first) so the list reads chronologically and groups by month/year,
  // mirroring how the original groups alphabetically by first letter.
  const displayed = requests
    .filter(r => inTab(r) && matchesFilter(r) && (searchTerm === "" || r.username.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const maxPage = Math.max(1, Math.ceil(displayed.length / UNFOLLOWERS_PER_PAGE));
  const currentPage = Math.min(page, maxPage);
  const pageItems = displayed.slice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE * currentPage);

  // Live ETA values for the sidebar (used by both scan and cancel).
  // ETA is a predicted-total countdown (decreasing), computed once when the process starts.
  const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
  const processed = processedRef.current;
  const etaRemainingMs = Math.max(0, etaTotalRef.current - elapsed);
  const etaText = active && etaTotalRef.current > 0 ? formatDuration(etaRemainingMs) : "—";

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

  // Toggle whitelist membership for an account (click its photo, like the original tool).
  // Whitelisted accounts move to the "Whitelisted" tab and are never cancelled.
  const toggleWhitelist = (username: string) => {
    const key = username.toLowerCase();
    const next = new Set(whitelist);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      const r = requests.find(x => x.username.toLowerCase() === key);
      if (r) { r.selected = false; } // protecting an account removes it from the selection
    }
    setWhitelist(next);
    saveCancelWhitelist(Array.from(next));
    forceRender();
  };

  // Replace the whole cancel whitelist (used by the Whitelist Management import / clear).
  const applyWhitelist = (usernames: readonly string[]) => {
    const next = new Set(usernames.map(u => u.toLowerCase()));
    requests.forEach(r => { if (next.has(r.username.toLowerCase())) { r.selected = false; } });
    setWhitelist(next);
    saveCancelWhitelist(Array.from(next));
    forceRender();
  };

  // Build the export rows for the WHOLE loaded list (both tabs). Each row carries a `whitelisted`
  // flag + status + requested_at so a later re-import can tell the two tabs apart and restore state.
  const cancelExportRows = () => buildCancelExportRows(requests, u => isWhitelisted(u));
  const onCopy = async () => {
    if (requests.length === 0) { notify("Nothing to copy yet — load a file first", "info"); return; }
    try {
      await copyCancelList(cancelExportRows());
      alert("List copied to clipboard!"); // native modal, like the original Copy button
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
    if (active) {
      return;
    }
    setState({ status: "initial" });
  };

  // Sleep that stays responsive to pause/stop and shows an optional countdown toast.
  const interruptibleSleep = async (ms: number, message?: string) => {
    if (message) {
      suppressLiveToast.current = true;
    }
    const end = Date.now() + ms;
    while (Date.now() < end && !stoppedRef.current) {
      while (pausedRef.current && !stoppedRef.current) {
        await sleep(250);
      }
      if (stoppedRef.current) {
        break;
      }
      if (message) {
        notify(`${message} (${Math.ceil((end - Date.now()) / 1000)}s)`, "warning");
      }
      await sleep(Math.min(500, end - Date.now()));
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

  // Resolve the relationship for an account, falling back to the friendships/show endpoint
  // when web_profile_info did not include friendship_status. Returns the relationship,
  // or "RATE_LIMIT"/"NOT_FOUND" to be handled by the caller.
  const resolveRelationship = async (r: CancelRequest): Promise<Relationship | "RATE_LIMIT" | "NOT_FOUND"> => {
    const profile = await fetchProfile(r.username);
    if (profile === "RATE_LIMIT") { return "RATE_LIMIT"; }
    if (profile === "NOT_FOUND" || profile === null) { return "NOT_FOUND"; }
    applyProfile(r, profile);
    if (profile.relationship !== null) {
      return profile.relationship;
    }
    const fr = await checkFriendship(r.id!);
    if (fr === "RATE_LIMIT") { return "RATE_LIMIT"; }
    return fr === "pending" ? "pending" : fr === "following" ? "following" : "resolved";
  };

  // Scan: resolve each account (loading its picture + relationship) and mark which are still
  // pending (cancel) or accepted/following (unfollow). Actionable, non-protected ones are auto-selected.
  // Scans the next `scanBatchSize` unverified accounts (or all when "All" is selected).
  const preScan = async () => {
    if (active) {
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
    // Predict the whole scan duration up front (requests + inter-profile delays + long pauses),
    // so the ETA is a stable global countdown rather than a per-item estimate.
    const scanLongPauses = Math.floor(Math.max(0, batch.length - 1) / PROFILES_BEFORE_SCAN_PAUSE);
    etaTotalRef.current =
      batch.length * EST_SCAN_REQUEST_MS +
      Math.max(0, batch.length - 1) * scanDelay * 1.075 +
      scanLongPauses * (scanLongPause + 2500);
    setPercentage(0);

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

      const protectedAcc = isWhitelisted(r.username);
      if (rel === "pending") { r.status = "pending"; r.checked = true; r.selected = !protectedAcc; pending++; }
      else if (rel === "following") { r.status = "following"; r.checked = true; r.selected = !protectedAcc; following++; }
      else { r.status = "accepted"; r.checked = true; r.selected = false; resolved++; }

      markProgress(idx);

      if (idx === batch.length - 1) {
        break;
      }
      // Small human-like delay between profiles (uses the configured scan delay).
      await interruptibleSleep(Math.floor(scanDelay * (0.85 + Math.random() * 0.45)));
      // Longer pause every N profiles to avoid a temp block (like the original scan).
      if ((idx + 1) % PROFILES_BEFORE_SCAN_PAUSE === 0) {
        await interruptibleSleep(scanLongPause + Math.random() * 5000, "Sleeping to prevent getting temp blocked");
      }
    }

    setScanning(false);
    setPercentage(100);
    const left = requests.filter(r => r.status === "unverified").length;
    notify(
      `Scan done: ${pending} pending · ${following} following · ${resolved} resolved · ${ghost} not found${left > 0 ? ` · ${left} not scanned yet` : ""}`,
      "success",
    );
  };

  // Main loop: cancel pending requests and unfollow accepted ones, for the selected accounts.
  const run = async () => {
    if (active) {
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
    // Predict the whole run duration up front (requests + delays + burst pauses) for a stable,
    // decreasing ETA. Verification adds a second request per account.
    const estReq = verifyBeforeCancel ? EST_CANCEL_REQUEST_MS * 2 : EST_CANCEL_REQUEST_MS;
    const cancelBursts = cancelsBeforePause > 0 ? Math.floor(Math.max(0, targets.length - 1) / cancelsBeforePause) : 0;
    etaTotalRef.current =
      targets.length * estReq +
      Math.max(0, targets.length - 1) * timeBetween * 1.0 +
      cancelBursts * burstPause;
    setPercentage(0);

    let dailyDone = 0;
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
      if (dailyLimit > 0 && dailyDone >= dailyLimit) {
        notify(`Daily limit of ${dailyLimit} reached`, "warning");
        break;
      }
      const r = targets[i];
      if (!isActionable(r.status)) {
        continue;
      }
      if (isWhitelisted(r.username)) {
        r.status = "skipped";
        forceRender();
        continue;
      }
      const priorStatus = r.status; // "pending" | "following" | "unverified"
      r.status = "running";
      forceRender();

      // Determine the current relationship. Trust the scan result unless re-verification is on.
      let rel: Relationship = priorStatus === "pending" ? "pending" : priorStatus === "following" ? "following" : null;
      if (!r.id || verifyBeforeCancel || rel === null) {
        const resolved = await resolveRelationship(r);
        if (resolved === "RATE_LIMIT") { r.status = priorStatus; await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited"); i--; continue; }
        if (resolved === "NOT_FOUND") { r.status = "ghost"; forceRender(); continue; }
        rel = resolved;
      }

      if (rel === "resolved") { r.status = "accepted"; forceRender(); continue; }

      // Cancel the pending request / unfollow the accepted account (same web endpoint).
      const result = await cancelFollowRequest(r.id!, csrftoken);
      if (result === "RATE_LIMIT") { r.status = priorStatus; await interruptibleSleep(RATE_LIMIT_COOLDOWN, "Rate limited"); i--; continue; }
      r.status = result ? "done" : "failed";
      if (result) {
        dailyDone++;
      }

      processedRef.current += 1;
      setPercentage(Math.round((processedRef.current / totalTargetsRef.current) * 100));
      forceRender();

      // No need to wait after the final item.
      if (i === targets.length - 1) {
        break;
      }
      // Jittered delay between actions.
      await interruptibleSleep(Math.floor(timeBetween * (0.85 + Math.random() * 0.3)));
      // Longer burst pause every N actions.
      if (cancelsBeforePause > 0 && processedRef.current % cancelsBeforePause === 0) {
        await interruptibleSleep(burstPause, "Cooling down to avoid a temp block");
      }
    }

    setRunning(false);
    setPaused(false);
    setPercentage(100);
    // Recompute from the live list (the render-time `counts` are stale after the loop mutations).
    const doneNow = requestsRef.current.filter(r => r.status === "done").length;
    const failedNow = requestsRef.current.filter(r => r.status === "failed").length;
    notify(
      stoppedRef.current ? `Stopped — ${doneNow} done` : `Done: ${doneNow} processed · ${failedNow} failed`,
      stoppedRef.current ? "warning" : "success",
    );
  };

  const FILTERS: ReadonlyArray<{ key: StatusFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: counts.total },
    { key: "unverified", label: "Unverified", count: counts.unverified },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "following", label: "Following", count: counts.following },
    { key: "done", label: "Done", count: counts.done },
    { key: "failed", label: "Failed", count: counts.failed },
  ];

  const batchOptions: ReadonlyArray<{ value: number; label: string }> = [
    ...SCAN_BATCH_SIZES.map(size => ({ value: size, label: String(size) })),
    { value: 0, label: "All" },
  ];

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
              <span>Cancel</span>
              <span>Requests</span>
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
              onClick={() => setShowSettings(true)}
              disabled={active}
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
              <span>{scanning ? "Scanning" : running ? "Cancelling" : "Cancel Requests"}</span>
              <strong>{percentage}%</strong>
            </div>

            <menu className="sidebar-filters-grid">
              <p>Show</p>
              {FILTERS.map(f => (
                <label className="badge m-small" key={f.key}>
                  <input
                    type="radio"
                    name="cr-status-filter"
                    checked={statusFilter === f.key}
                    onChange={() => { setStatusFilter(f.key); setPage(1); }}
                  />
                  &nbsp;{f.label} ({f.count})
                </label>
              ))}
            </menu>

            <div className="cr-scan-controls">
              <p className="cr-section-label">Scan batch</p>
              <div className="cr-batch-grid">
                {batchOptions.map(opt => (
                  <button
                    key={opt.label}
                    className={`button-secondary ${scanBatchSize === opt.value ? "cr-batch-active" : ""}`}
                    disabled={active}
                    onClick={() => setScanBatchSize(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                className={scanning ? "cr-scan-button cr-scan-stop" : "cr-scan-button"}
                disabled={running}
                onClick={scanning ? stop : preScan}
              >
                {scanning ? "Stop scan" : scanBatchSize > 0 ? `Scan next ${scanBatchSize}` : "Scan all"}
              </button>
            </div>

            <div className="sidebar-buttons-grid">
              <button className="button-secondary" disabled={active} onClick={() => selectMatching(r => isActionable(r.status))}>
                Select All
              </button>
              <button className="button-secondary" disabled={active} onClick={() => selectMatching(r => r.status === "pending")}>
                Pending
              </button>
              <button className="button-secondary" disabled={active} onClick={() => selectMatching(r => r.status === "following")}>
                Following
              </button>
              <button className="button-secondary danger-text" disabled={active} onClick={clearSelection}>
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

            <div className="metric-stack cr-eta">
              <p><span>ETA</span><strong>{etaText}</strong></p>
              <p><span>Progress</span><strong>{processed}/{totalTargetsRef.current}</strong></p>
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
            onClick={running ? stop : run}
            disabled={scanning}
          >
            {running ? "Stop" : `Cancel / Unfollow (${selectedCount})`}
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

          {(() => {
            // Render the page rows, inserting a month/year header whenever the date bucket changes
            // (e.g. "January 2026"), reusing the original ".alphabet-character" divider styling.
            let currentGroup = "";
            const rows: React.ReactNode[] = [];
            for (const req of pageItems) {
              const group = monthYearLabel(req.timestamp);
              if (group !== currentGroup) {
                currentGroup = group;
                rows.push(<div className="alphabet-character" key={`group-${group}`}>{group}</div>);
              }
              rows.push(
                <label className="result-item" key={req.username}>
                  <div className="flex grow align-center">
                    <div
                      className="avatar-container"
                      title={currentTab === "non_whitelisted" ? "Click photo to whitelist (protect)" : "Click photo to remove from whitelist"}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWhitelist(req.username); }}
                    >
                      <img
                        className="avatar"
                        alt={req.username}
                        src={req.profilePicUrl || avatarUrl(req.username)}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = avatarUrl(req.username); }}
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
                        {[req.fullName, formatRequestedAt(req.timestamp) && `Requested ${formatRequestedAt(req.timestamp)}`].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    {req.isVerified && <div className="verified-badge">✔</div>}
                    {req.isPrivate && <span className="private-indicator">Private</span>}
                    <span className={`cr-status cr-status-${req.status}`}>{STATUS_LABELS[req.status]}</span>
                  </div>
                  <div className="flex align-center gap-small">
                    <input
                      className="account-checkbox"
                      type="checkbox"
                      disabled={active || !isActionable(req.status) || isWhitelisted(req.username)}
                      checked={!!req.selected && !isWhitelisted(req.username)}
                      onChange={e => toggleSelect(req, e.currentTarget.checked)}
                    />
                  </div>
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
        <div className="backdrop" onClick={() => setShowSettings(false)}>
          <div className="setting-menu" onClick={e => e.stopPropagation()}>
            <div className="settings-module">
              <div className="module-header"><h3>Cancel settings</h3></div>
              <div className="settings-content">
                <div className="row">
                  <label className="minimun-width">Delay between scanned profiles</label>
                  <input type="number" min={500} max={999999} value={scanDelay} onChange={e => setScanDelay(Number(e.currentTarget.value))} />
                  <label className="margin-between-input-and-label">(ms)</label>
                </div>
                <div className="row">
                  <label className="minimun-width">Long pause after {PROFILES_BEFORE_SCAN_PAUSE} scanned profiles</label>
                  <input type="number" min={4000} max={999999} value={scanLongPause} onChange={e => setScanLongPause(Number(e.currentTarget.value))} />
                  <label className="margin-between-input-and-label">(ms)</label>
                </div>
                <div className="row">
                  <label className="minimun-width">Delay between actions</label>
                  <input type="number" min={1000} max={999999} value={timeBetween} onChange={e => setTimeBetween(Number(e.currentTarget.value))} />
                  <label className="margin-between-input-and-label">(ms)</label>
                </div>
                <div className="row">
                  <label className="minimun-width">Long pause after {cancelsBeforePause} actions</label>
                  <input type="number" min={30000} max={999999} value={burstPause} onChange={e => setBurstPause(Number(e.currentTarget.value))} />
                  <label className="margin-between-input-and-label">(ms)</label>
                </div>
                <div className="row">
                  <label className="minimun-width">Verify each account before acting</label>
                  <input type="checkbox" checked={verifyBeforeCancel} onChange={e => setVerifyBeforeCancel(e.currentTarget.checked)} />
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
              <button className="btn" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <Toast show={toast.show} style={toast.style} message={toast.text} onClose={() => setToast({ show: false })} />}
    </>
  );
};
