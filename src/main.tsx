import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { UserNode } from "./model/user";
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import {
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH,
  DEFAULT_UNFOLLOWS_PER_BATCH,
  DEFAULT_USERS_PER_SEARCH_CYCLE,
  INSTAGRAM_HOSTNAME,
} from "./constants/constants";
import {
  assertUnreachable,
  getCurrentPageUnfollowers,
  getMaxPage,
  getUsersForDisplay,
} from "./utils/utils";
import { getPreviewUsers } from "./utils/preview";
import {
  runTwoPhaseScan,
  runUnfollowQueue,
  ToastState,
  toggleSelectedUsersBatch,
} from "./utils/scanner";
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";
import {
  getBlockedUntil,
  loadCachedScanResults,
  loadTimings,
  loadWhitelist,
  saveTimings,
  saveWhitelist,
} from "./utils/whitelist-manager";
import { getInitialLanguage, Language, saveLanguage, t } from "./utils/i18n";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalPreview = LOCAL_PREVIEW_HOSTS.has(location.hostname);

function App() {
  const [state, setState] = useState<State>({
    ...(
      isLocalPreview && new URLSearchParams(location.search).get("preview") === "scanning"
        ? {
          status: "scanning",
          page: 1,
          searchTerm: "",
          currentTab: "non_whitelisted",
          percentage: 100,
          results: getPreviewUsers(),
          selectedResults: getPreviewUsers().slice(0, 3),
          whitelistedResults: getPreviewUsers().slice(10, 12),
          filter: {
            showVerified: true,
            showPrivate: true,
            showWithOutProfilePicture: true,
          },
        } as State
        : { status: "initial" as const }
    ),
  });

  const [toast, setToast] = useState<ToastState>({ show: false });

  const [timings, setTimings] = useState<Timings>(() => {
    const storedTimings = loadTimings();
    return {
      timeBetweenSearchCycles: storedTimings?.timeBetweenSearchCycles ?? DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: storedTimings?.timeToWaitAfterFiveSearchCycles ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: storedTimings?.timeBetweenUnfollows ?? DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterUnfollowBatch: storedTimings?.timeToWaitAfterUnfollowBatch ?? DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH,
      unfollowsPerBatch: storedTimings?.unfollowsPerBatch ?? DEFAULT_UNFOLLOWS_PER_BATCH,
      usersPerSearchCycle: storedTimings?.usersPerSearchCycle ?? DEFAULT_USERS_PER_SEARCH_CYCLE,
    };
  });

  // Save timings whenever they change
  useEffect(() => {
    saveTimings(timings);
  }, [timings]);

  const [cachedScan, setCachedScan] = useState<{ readonly results: readonly UserNode[]; readonly timestamp: number } | null>(() =>
    loadCachedScanResults(),
  );

  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  const langRef = React.useRef(lang);
  langRef.current = lang;

  const timingsRef = React.useRef(timings);
  timingsRef.current = timings;

  const [scanningPaused, setScanningPaused] = useState(false);
  const scanningPausedRef = React.useRef(false);

  const pauseScan = () => {
    setScanningPaused(prev => {
      const next = !prev;
      scanningPausedRef.current = next;
      return next;
    });
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  };

  let isActiveProcess: boolean;
  switch (state.status) {
    case "initial":
      isActiveProcess = false;
      break;
    case "scanning":
      isActiveProcess = Boolean(state.isScanningActive);
      break;
    case "unfollowing":
      isActiveProcess = !state.aborted && state.percentage < 100;
      break;
    default:
      assertUnreachable(state);
  }

  const onLoadCached = () => {
    // Re-read instead of trusting the mount-time snapshot: the account may have
    // been switched in another tab, and the cache is scoped per account.
    const cached = loadCachedScanResults();
    setCachedScan(cached);
    if (!cached || cached.results.length === 0) {
      return;
    }
    const whitelistedResults = loadWhitelist();
    scanningPausedRef.current = false;
    setScanningPaused(false);
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 100,
      isScanningActive: false,
      results: cached.results,
      selectedResults: [],
      whitelistedResults,
      filter: {
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
    setToast({
      show: true,
      text: t(lang, "loadedFromCache", cached.results.length),
    });
  };

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    if (isLocalPreview) {
      const previewUsers = getPreviewUsers();
      setState({
        status: "scanning",
        page: 1,
        searchTerm: "",
        currentTab: "non_whitelisted",
        percentage: 100,
        isScanningActive: false,
        results: previewUsers,
        selectedResults: previewUsers.slice(0, 3),
        whitelistedResults: previewUsers.slice(10, 12),
        filter: {
          showVerified: true,
          showPrivate: true,
          showWithOutProfilePicture: true,
        },
      });
      return;
    }
    const blockedUntil = getBlockedUntil();
    if (blockedUntil > Date.now()) {
      setToast({
        show: true,
        text: t(lang, "rateLimitPause", Math.ceil((blockedUntil - Date.now()) / 1000)),
      });
      return;
    }
    const whitelistedResults = loadWhitelist();
    scanningPausedRef.current = false;
    setScanningPaused(false);
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 0,
      isScanningActive: true,
      results: [],
      selectedResults: [],
      whitelistedResults,
      scanPhase: "followers",
      followersIndexed: 0,
      followingChecked: 0,
      filter: {
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.selectedResults.length > 0) {
      if (!confirm(t(lang, "confirmFilterClear"))) {
        // Force re-render so the checkbox matches state when cancelled.
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      page: 1,
      // Clear selection to avoid leaving hidden filtered-out users queued for unfollowing.
      selectedResults: [],
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const handleUnfollowFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "unfollowing") {
      return;
    }
    setState({
      ...state,
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const toggleUser = (newStatus: boolean, user: UserNode) => {
    if (state.status !== "scanning") {
      return;
    }
    setState({
      ...state,
      selectedResults: newStatus
        ? [...state.selectedResults, user]
        : state.selectedResults.filter(result => result.id !== user.id),
    });
  };

  const toggleAllUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const displayed = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      state.currentTab,
      state.searchTerm,
      state.filter,
    );
    setState({
      ...state,
      selectedResults: toggleSelectedUsersBatch(state.selectedResults, displayed, e.currentTarget.checked),
    });
  };

  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const displayed = getUsersForDisplay(
      state.results,
      state.whitelistedResults,
      state.currentTab,
      state.searchTerm,
      state.filter,
    );
    const pageUsers = getCurrentPageUnfollowers(displayed, Math.min(state.page, getMaxPage(displayed)));
    setState({
      ...state,
      selectedResults: toggleSelectedUsersBatch(state.selectedResults, pageUsers, e.currentTarget.checked),
    });
  };

  const onWhitelistUpdate = (updatedWhitelist: readonly UserNode[]) => {
    saveWhitelist(updatedWhitelist);
    if (state.status === "scanning") {
      setState({
        ...state,
        whitelistedResults: updatedWhitelist,
      });
    }
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isActiveProcess) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      e = e || window.event;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (e) {
        e.returnValue = "Changes you made may not be saved.";
      }
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActiveProcess]);

  useEffect(() => {
    if (state.status !== "scanning" || isLocalPreview || state.percentage === 100) {
      return;
    }
    let cancelled = false;
    runTwoPhaseScan({
      isCancelled: () => cancelled,
      isPaused: () => scanningPausedRef.current,
      getLang: () => langRef.current,
      getTimings: () => timingsRef.current,
      setState,
      setToast,
      setCachedScan,
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "unfollowing" || isLocalPreview) {
      return;
    }
    let cancelled = false;
    runUnfollowQueue({
      selectedResults: state.selectedResults,
      blockedUntil: getBlockedUntil(),
      isCancelled: () => cancelled,
      getLang: () => langRef.current,
      getTimings: () => timingsRef.current,
      setState,
      setToast,
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  let markup: React.JSX.Element;
  switch (state.status) {
    case "initial":
      markup = <NotSearching onScan={onScan} lang={lang} cachedScan={cachedScan} onLoadCached={onLoadCached}></NotSearching>;
      break;

    case "scanning": {
      markup = <Searching
        state={state}
        handleScanFilter={handleScanFilter}
        toggleUser={toggleUser}
        pauseScan={pauseScan}
        setState={setState}
        scanningPaused={scanningPaused}
        UserCheckIcon={UserCheckIcon}
        UserUncheckIcon={UserUncheckIcon}
        lang={lang}
      ></Searching>;
      break;
    }

    case "unfollowing":
      markup = <Unfollowing
        state={state}
        handleUnfollowFilter={handleUnfollowFilter}
        lang={lang}
      ></Unfollowing>;
      break;

    default:
      assertUnreachable(state);
  }

  const showScanWarning = state.status === "scanning" && Boolean(state.isScanningActive);

  return (
    <main id="main" role="main" className={`iu ${showScanWarning ? "has-scan-warning" : ""}`}>
      <section className="overlay">
        <Toolbar
          state={state}
          setState={setState}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
          whitelistedUsers={state.status === "scanning" ? state.whitelistedResults : loadWhitelist()}
          onWhitelistUpdate={onWhitelistUpdate}
          lang={lang}
          onLanguageChange={handleLanguageChange}
        ></Toolbar>

        {markup}

        {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
      </section>
    </main>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME && !isLocalPreview) {
  alert("Can be used only on Instagram routes");
} else {
  document.title = "InstagramUnfollowers";
  document.body.innerHTML = "";
  render(<App />, document.body);
}
