import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { Typename, UserNode } from "./model/user";
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import {
  DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
  DEFAULT_USERS_PER_SEARCH_CYCLE,
  FOLLOWING_PAGE_SAFETY_LIMIT,
  FOLLOW_CHECK_PAGE_SIZE,
  FOLLOWING_LIST_PROGRESS_END,
  CHECKS_BEFORE_LONG_SLEEP,
  INSTAGRAM_ASBD_ID,
  INSTAGRAM_HOSTNAME,
  INSTAGRAM_WEB_APP_ID,
  RATE_LIMIT_COOLDOWN_SECONDS,
} from "./constants/constants";
import {
  assertUnreachable,
  fetchFriendshipsPage,
  FriendshipsPage,
  getCookie,
  getCurrentPageUnfollowers,
  getUsersForDisplay,
  InstagramApiError,
  RawFriendshipUser,
  rawFriendshipUserToUserNode,
  sleep,
  unfollowUserUrlGenerator,
} from "./utils/utils";
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";
import { loadCachedScanResults, loadTimings, loadWhitelist, saveCachedScanResults, saveTimings, saveWhitelist } from "./utils/whitelist-manager";
import { getInitialLanguage, Language, saveLanguage, t } from "./utils/i18n";

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const isLocalPreview = LOCAL_PREVIEW_HOSTS.has(location.hostname);

const _avatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0f172a,1f2937,312e81&fontFamily=Verdana`;

const _createPreviewUser = (
  id: string,
  username: string,
  fullName: string,
  options: { readonly isPrivate?: boolean; readonly isVerified?: boolean; readonly followsViewer?: boolean } = {},
): UserNode => ({
  id,
  username,
  full_name: fullName,
  profile_pic_url: _avatarUrl(username),
  is_private: options.isPrivate ?? false,
  is_verified: options.isVerified ?? false,
  followed_by_viewer: true,
  follows_viewer: options.followsViewer ?? false,
  requested_by_viewer: false,
  reel: {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: _avatarUrl(username),
      username,
    },
  },
});

const _getPreviewUsers = (): readonly UserNode[] => [
  _createPreviewUser("1", "alina.frames", "Alina Moreno", { isVerified: true }),
  _createPreviewUser("2", "brassandbone", "Theo Walsh", { isPrivate: true }),
  _createPreviewUser("3", "citrus.archive", "Mara Kim", { followsViewer: true }),
  _createPreviewUser("4", "dawnledger", "Jon Bell", { isPrivate: true }),
  _createPreviewUser("5", "elias.market", "Elias Noor", { isVerified: true }),
  _createPreviewUser("6", "fieldnotes.studio", "Nadia Reyes"),
  _createPreviewUser("7", "glint.supply", "Remy Park", { followsViewer: true }),
  _createPreviewUser("8", "harbor.sequence", "Ivy Chen", { isPrivate: true }),
  _createPreviewUser("9", "inkline.daily", "Sofia Grant"),
  _createPreviewUser("10", "juniper.signal", "Cal Reed", { isVerified: true }),
  _createPreviewUser("11", "keystone.labs", "Mina Torres"),
  _createPreviewUser("12", "lowlight.club", "Owen Voss", { isPrivate: true }),
];

// pause
let scanningPaused = false;

function pauseScan() {
  scanningPaused = !scanningPaused;
}


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
          results: _getPreviewUsers(),
          selectedResults: _getPreviewUsers().slice(0, 3),
          whitelistedResults: _getPreviewUsers().slice(10, 12),
          filter: {
            showVerified: true,
            showPrivate: true,
            showWithOutProfilePicture: true,
          },
        } as State
        : { status: "initial" as const }
    ),
  });

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
    show: false,
  });

  const [timings, setTimings] = useState<Timings>(() => {
    const storedTimings = loadTimings();
    return {
      timeBetweenSearchCycles: storedTimings?.timeBetweenSearchCycles ?? DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: storedTimings?.timeToWaitAfterFiveSearchCycles ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: storedTimings?.timeBetweenUnfollows ?? DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterFiveUnfollows: storedTimings?.timeToWaitAfterFiveUnfollows ?? DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
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
      isActiveProcess = state.percentage < 100;
      break;
    default:
      assertUnreachable(state);
  }

  const onLoadCached = () => {
    if (!cachedScan || cachedScan.results.length === 0) {
      return;
    }
    const whitelistedResults = loadWhitelist();
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 100,
      isScanningActive: false,
      results: cachedScan.results,
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
      text: t(lang, "loadedFromCache", cachedScan.results.length),
    });
  };

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    if (isLocalPreview) {
      const previewUsers = _getPreviewUsers();
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
    const whitelistedResults = loadWhitelist();
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
      if (!confirm("Changing filter options will clear selected users")) {
        // Force re-render. Bit of a hack but had an issue where the checkbox state was still
        // changing in the UI even even when not confirming. So updating the state fixes this
        // by synchronizing the checkboxes with the filter statuses in the state.
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      // Make sure to clear selected results when changing filter options. This is to avoid having
      // users selected in the unfollow queue but not visible in the UI, which would be confusing.
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
    if (newStatus) {
      setState({
        ...state,
        selectedResults: [...state.selectedResults, user],
      });
    } else {
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
      });
    }
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
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = displayed.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const displayedIds = new Set(displayed.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !displayedIds.has(u.id)),
      });
    }
  };

  // it will work the same as toggleAllUsers, but it will select everyone on the current page.
  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    const pageUsers = getCurrentPageUnfollowers(
      getUsersForDisplay(
        state.results,
        state.whitelistedResults,
        state.currentTab,
        state.searchTerm,
        state.filter,
      ),
      state.page,
    );
    if (e.currentTarget.checked) {
      const currentIds = new Set(state.selectedResults.map(u => u.id));
      const toAdd = pageUsers.filter(u => !currentIds.has(u.id));
      setState({
        ...state,
        selectedResults: [...state.selectedResults, ...toAdd],
      });
    } else {
      const pageUserIds = new Set(pageUsers.map(u => u.id));
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(u => !pageUserIds.has(u.id)),
      });
    }
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
      // Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
      // This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
      if (!isActiveProcess) {
        return;
      }

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      e = e || window.event;

      // `e` Might be undefined in older browsers, so silence linter for this one.
      // For IE and Firefox prior to version 4
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (e) {
        e.returnValue = "Changes you made may not be saved.";
      }

      // For Safari
      return "Changes you made may not be saved.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActiveProcess, state]);

  useEffect(() => {
    // The following endpoint doesn't expose a total count up front, so while
    // loading the viewer's own following list we can't compute an exact
    // percentage. This gives a smooth, ever-increasing estimate within that
    // phase's share of the progress bar without ever overselling 100%.
    const estimatePhaseProgress = (usersFetchedSoFar: number): number =>
      100 * (1 - 1 / (1 + usersFetchedSoFar / 150));

    // Fetches one page, retrying with backoff on rate limits / network errors.
    // `blocked` is true when retries were exhausted for such a transient error
    // (the scan should stop); false means a different, non-retryable error
    // (e.g. 404 / unavailable account), which callers may choose to skip.
    type PageResult =
      | { readonly ok: true; readonly page: FriendshipsPage }
      | { readonly ok: false; readonly blocked: boolean };

    const fetchPageWithRetry = async (maxId?: string, count?: number, userId?: string): Promise<PageResult> => {
      let retries = 0;
      const maxRetries = 3;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        try {
          return { ok: true, page: await fetchFriendshipsPage("following", maxId, count, userId) };
        } catch (e: any) {
          const status = e?.status;
          const message = String(e?.message ?? "");
          const isRateLimitOrSoftBlock =
            (e instanceof InstagramApiError || e?.name === "InstagramApiError") &&
            (status === 429 || /feedback_required|checkpoint|rate limit|please wait/i.test(message));
          const isNetworkError = e instanceof TypeError || /fetch|network/i.test(message);
          const isTransient = isRateLimitOrSoftBlock || isNetworkError;

          if (isTransient && retries < maxRetries) {
            retries++;
            const waitSeconds = isRateLimitOrSoftBlock
              ? RATE_LIMIT_COOLDOWN_SECONDS * retries
              : 5 * retries;
            for (let sec = waitSeconds; sec > 0; sec--) {
              setToast({
                show: true,
                text: t(lang, "rateLimitPause", sec),
              });
              await sleep(1000);
            }
            setToast({ show: false });
            continue;
          }
          console.error(`Following request failed${userId ? ` for ${userId}` : ""}:`, e);
          return { ok: false, blocked: isTransient };
        }
      }
    };

    // Fetches every page of the viewer's own following list and reports
    // progress within [progressRangeStart, progressRangeEnd].
    const fetchList = async (
      pageSafetyLimit: number,
      progressRangeStart: number,
      progressRangeEnd: number,
      onPageUsers: (pageUsers: readonly RawFriendshipUser[]) => void,
    ): Promise<boolean> => {
      const kind = "following";
      let maxId: string | undefined;
      let pagesFetched = 0;
      let scrollCycle = 0;
      let totalUsersFetched = 0;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const result = await fetchPageWithRetry(maxId, timings.usersPerSearchCycle);
        if (!result.ok) {
          console.error(`Stopping ${kind} scan early.`);
          return false;
        }
        const page = result.page;

        const pageUsers = page.users ?? [];
        totalUsersFetched += pageUsers.length;
        onPageUsers(pageUsers);

        setState(prevState => {
          if (prevState.status !== "scanning") {
            return prevState;
          }
          const rangeSize = progressRangeEnd - progressRangeStart;
          return {
            ...prevState,
            percentage: Math.round(progressRangeStart + estimatePhaseProgress(totalUsersFetched) * (rangeSize / 100)),
          };
        });

        const hasMore = Boolean(page.next_max_id) && page.has_more !== false;
        if (!hasMore || pageUsers.length === 0) {
          break;
        }

        pagesFetched += 1;
        if (pagesFetched >= pageSafetyLimit) {
          console.error(`Stopping ${kind} scan early: hit the safety cap of ${pageSafetyLimit} pages with ${totalUsersFetched} users fetched.`);
          return false;
        }
        maxId = page.next_max_id;

        // Pause scanning if user requested so.
        while (scanningPaused) {
          await sleep(1000);
          console.info("Scan paused");
        }

        // Human-like behavior: Micro-pause between fetching chunks
        const microPause = Math.floor(Math.random() * 1500) + 500; // 500ms - 2000ms
        await sleep(microPause);

        // Standard delay between cycles
        await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);

        scrollCycle++;
        if (scrollCycle > 6) {
          scrollCycle = 0;
          // Variable long sleep to avoid patterns
          const longSleepVar = Math.max(
            0,
            timings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000), // +/- 5 seconds
          );
          setToast({
            show: true,
            text: t(lang, "sleepingSafety", Math.round(longSleepVar / 1000)),
          });
          await sleep(longSleepVar);
        }
        setToast({ show: false });
      }

      setState(prevState => {
        if (prevState.status !== "scanning") {
          return prevState;
        }
        return {
          ...prevState,
          percentage: progressRangeEnd,
        };
      });

      return true;
    };

    const scan = async () => {
      if (state.status !== "scanning" || isLocalPreview) {
        return;
      }
      if (state.percentage === 100) {
        return;
      }

      const viewerId = getCookie("ds_user_id");
      if (viewerId === null) {
        setState(prevState =>
          prevState.status === "scanning" ? { ...prevState, isScanningActive: false } : prevState,
        );
        setToast({ show: true, text: t(lang, "scanFailedFollowing") });
        return;
      }

      // 1. Load the list of accounts you follow. Nothing is shown yet: an
      // account only appears in the results once we've verified it doesn't
      // follow you back.
      const followingUsers: RawFriendshipUser[] = [];
      const followingCompleted = await fetchList(
        FOLLOWING_PAGE_SAFETY_LIMIT,
        0,
        FOLLOWING_LIST_PROGRESS_END,
        pageUsers => {
          followingUsers.push(...pageUsers);
        },
      );

      if (!followingCompleted && followingUsers.length === 0) {
        setState(prevState =>
          prevState.status === "scanning" ? { ...prevState, isScanningActive: false } : prevState,
        );
        setToast({
          show: true,
          text: t(lang, "scanFailedFollowing"),
        });
        return;
      }

      // 2. For each followed account, read the first page of *their* following
      // list. Instagram puts the logged-in viewer at the top of it when the
      // account follows the viewer, so if we show up there they follow us
      // back; otherwise we assume they don't and list them as a non-follower.
      const nonFollowers: UserNode[] = [];
      let checkedCount = 0;
      let interrupted = false;
      let checksSinceLongSleep = 0;
      const totalToCheck = followingUsers.length;

      for (const user of followingUsers) {
        // Pause scanning if user requested so.
        while (scanningPaused) {
          await sleep(1000);
          console.info("Scan paused");
        }

        const userId = String(user.pk_id ?? user.pk);
        const result = await fetchPageWithRetry(undefined, FOLLOW_CHECK_PAGE_SIZE, userId);
        if (!result.ok && result.blocked) {
          interrupted = true;
          break;
        }

        if (result.ok) {
          const followsViewer = (result.page.users ?? []).some(
            candidate => String(candidate.pk_id ?? candidate.pk) === viewerId,
          );
          if (!followsViewer) {
            const node = rawFriendshipUserToUserNode(user, false);
            nonFollowers.push(node);
            setState(prevState =>
              prevState.status === "scanning"
                ? { ...prevState, results: [...prevState.results, node] }
                : prevState,
            );
          }
        }
        // A non-retryable failure for one account (e.g. unavailable profile)
        // leaves it unverified, so it's skipped rather than listed.

        checkedCount++;
        setState(prevState =>
          prevState.status === "scanning"
            ? {
              ...prevState,
              percentage: Math.round(
                FOLLOWING_LIST_PROGRESS_END +
                (checkedCount / totalToCheck) * (100 - FOLLOWING_LIST_PROGRESS_END),
              ),
            }
            : prevState,
        );

        if (checkedCount >= totalToCheck) {
          break;
        }

        // Human-like pacing between checks.
        await sleep(Math.floor(Math.random() * 700) + 300);
        await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);

        checksSinceLongSleep++;
        if (checksSinceLongSleep >= CHECKS_BEFORE_LONG_SLEEP) {
          checksSinceLongSleep = 0;
          const longSleepVar = Math.max(
            0,
            timings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000), // +/- 5 seconds
          );
          setToast({
            show: true,
            text: t(lang, "sleepingSafety", Math.round(longSleepVar / 1000)),
          });
          await sleep(longSleepVar);
        }
        setToast({ show: false });
      }

      const scanIsComplete = followingCompleted && !interrupted;

      if (scanIsComplete || nonFollowers.length > 0) {
        saveCachedScanResults(nonFollowers);
        setCachedScan({ results: nonFollowers, timestamp: Date.now() });
      }

      setState(prevState => {
        if (prevState.status !== "scanning") {
          return prevState;
        }
        return {
          ...prevState,
          percentage: 100,
          scanIncomplete: !scanIsComplete,
          isScanningActive: false,
          results: nonFollowers,
        };
      });

      setToast({
        show: true,
        text: scanIsComplete
          ? t(lang, "scanCompleted")
          : t(lang, "partialScanInterrupted", checkedCount, totalToCheck),
      });
    };
    scan();
    // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    const unfollow = async () => {
      if (state.status !== "unfollowing" || isLocalPreview) {
        return;
      }

      const csrftoken = getCookie("csrftoken");
      if (csrftoken === null) {
        throw new Error("csrftoken cookie is null");
      }

      let counter = 0;
      for (const user of state.selectedResults) {
        counter += 1;
        // Fix: Changed from Math.floor to Math.round to ensure progress reaches 100%
        // Math.floor would leave progress at 99% when near completion
        const percentage = Math.round((counter / state.selectedResults.length) * 100);
        try {
          const res = await fetch(unfollowUserUrlGenerator(user.id), {
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "x-csrftoken": csrftoken,
              "x-ig-app-id": INSTAGRAM_WEB_APP_ID,
              "x-asbd-id": INSTAGRAM_ASBD_ID,
              "x-requested-with": "XMLHttpRequest",
            },
            method: "POST",
            credentials: "same-origin",
          });
          const data = (await res.json().catch(() => null)) as any;
          const isActionBlocked =
            res.status === 429 ||
            data?.status === "fail" ||
            data?.spam === true ||
            /feedback_required|checkpoint|action_blocked/i.test(data?.message ?? "");

          const success = res.ok && data?.status !== "fail" && !isActionBlocked;
          if (!success) {
            console.warn(`Unfollow for ${user.username} failed (HTTP ${res.status}):`, data);
          }
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: success,
                },
              ],
            };
          });

          if (isActionBlocked) {
            setToast({
              show: true,
              text: t(lang, "actionBlockedWarning"),
            });
            break;
          }
        } catch (e) {
          console.error(e);
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: false,
                },
              ],
            };
          });
        }
        // If unfollowing the last user in the list, no reason to wait.
        if (user === state.selectedResults[state.selectedResults.length - 1]) {
          break;
        }
        await sleep(Math.floor(Math.random() * (timings.timeBetweenUnfollows * 1.2 - timings.timeBetweenUnfollows)) + timings.timeBetweenUnfollows);

        if (counter % 5 === 0) {
          setToast({
            show: true,
            text: t(lang, "sleepingSafety", `${Math.round(timings.timeToWaitAfterFiveUnfollows / 60000)}m`),
          });
          await sleep(timings.timeToWaitAfterFiveUnfollows);
        }
        setToast({ show: false });
      }
    };
    unfollow();
    // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
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

  const showScanWarning = state.status === "scanning" && state.results.length === 0;

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
