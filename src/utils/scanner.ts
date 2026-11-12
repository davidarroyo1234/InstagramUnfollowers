import {
  BLOCKED_COOLDOWN_MS,
  CHECKS_BEFORE_LONG_SLEEP,
  DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH,
  DEFAULT_UNFOLLOWS_PER_BATCH,
  FOLLOWERS_PAGE_SAFETY_LIMIT,
  FOLLOWING_PAGE_SAFETY_LIMIT,
  RATE_LIMIT_COOLDOWN_SECONDS,
} from "../constants/constants";
import { State } from "../model/state";
import { Timings } from "../model/timings";
import { UserNode } from "../model/user";
import { Language, t, TranslationKey } from "./i18n";
import {
  addFollowerToIndex,
  createFollowerIndex,
  deduplicateUsersById,
  fetchFriendshipsPage,
  FriendshipsListKind,
  FriendshipsPage,
  getCookie,
  InstagramApiError,
  isUserInFollowerIndex,
  RawFriendshipUser,
  rawFriendshipUserToUserNode,
  sleep,
  unfollowUser,
} from "./utils";
import { loadCachedScanResults, saveCachedScanResults, setBlockedUntil } from "./whitelist-manager";

export type ToastState = { readonly show: false } | { readonly show: true; readonly text: string };
type SetStateFn = (updater: State | ((prevState: State) => State)) => void;
type SetToastFn = (toast: ToastState) => void;

/**
 * Adds or removes `batch` users in `selectedResults` without creating duplicate IDs.
 */
export function toggleSelectedUsersBatch(
  selectedResults: readonly UserNode[],
  batch: readonly UserNode[],
  shouldSelect: boolean,
): readonly UserNode[] {
  if (shouldSelect) {
    const currentIds = new Set(selectedResults.map(u => u.id));
    const toAdd = batch.filter(u => !currentIds.has(u.id));
    return [...selectedResults, ...toAdd];
  }
  const batchIds = new Set(batch.map(u => u.id));
  return selectedResults.filter(u => !batchIds.has(u.id));
}

/**
 * Sleeps `totalSeconds` in 1-second ticks while updating a toast message.
 * Stops early and returns false when `shouldStop()` returns true.
 */
export async function waitWithCountdown(
  totalSeconds: number,
  messageKey: TranslationKey,
  getLang: () => Language,
  setToast: SetToastFn,
  shouldStop: () => boolean,
): Promise<boolean> {
  for (let sec = totalSeconds; sec > 0; sec--) {
    if (shouldStop()) {
      return false;
    }
    setToast({
      show: true,
      text: t(getLang(), messageKey, sec),
    });
    await sleep(1000);
  }
  if (!shouldStop()) {
    setToast({ show: false });
  }
  return !shouldStop();
}

function hasSwitchedFromAccount(expectedViewerId: string | null): boolean {
  if (expectedViewerId === null) {
    return false;
  }
  const activeId = getCookie("ds_user_id");
  return activeId !== null && activeId !== expectedViewerId;
}

export interface ScanRunnerDeps {
  readonly isCancelled: () => boolean;
  readonly isPaused: () => boolean;
  readonly getLang: () => Language;
  readonly getTimings: () => Timings;
  readonly setState: SetStateFn;
  readonly setToast: SetToastFn;
  readonly setCachedScan: (cache: { readonly results: readonly UserNode[]; readonly timestamp: number } | null) => void;
}

/**
 * Runs the 2-phase scan: first indexing all viewer followers, then walking
 * the viewer's following list to stream verified non-followers.
 */
export async function runTwoPhaseScan(deps: ScanRunnerDeps): Promise<void> {
  const { isCancelled, isPaused, getLang, getTimings, setState, setToast, setCachedScan } = deps;

  const viewerId = getCookie("ds_user_id");
  if (viewerId === null) {
    setState(prevState =>
      prevState.status === "scanning" ? { ...prevState, isScanningActive: false } : prevState,
    );
    setToast({ show: true, text: t(getLang(), "scanFailedFollowing") });
    return;
  }

  const shouldAbortRequest = (): boolean => isCancelled() || hasSwitchedFromAccount(viewerId);

  const handleAccountSwitchIfNeeded = (): boolean => {
    if (!hasSwitchedFromAccount(viewerId)) {
      return false;
    }
    setCachedScan(loadCachedScanResults());
    setState({ status: "initial" });
    setToast({ show: true, text: t(getLang(), "scanAccountChanged") });
    return true;
  };

  type PageResult =
    | { readonly ok: true; readonly page: FriendshipsPage }
    | { readonly ok: false; readonly blocked: boolean };

  const fetchPageWithRetry = async (
    kind: FriendshipsListKind,
    maxId?: string,
    count?: number,
  ): Promise<PageResult> => {
    let retries = 0;
    const maxRetries = 3;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (shouldAbortRequest()) {
        return { ok: false, blocked: false };
      }
      try {
        return { ok: true, page: await fetchFriendshipsPage(kind, maxId, count, viewerId) };
      } catch (e: any) {
        const status = e?.status;
        const message = String(e?.message ?? "");
        const isRateLimitOrSoftBlock =
          (e instanceof InstagramApiError || e?.name === "InstagramApiError") &&
          (status === 429 ||
            e?.notJson === true ||
            /feedback_required|checkpoint|rate limit|please wait/i.test(message));
        const isNetworkError = e instanceof TypeError || /fetch|network/i.test(message);
        const isTransient = isRateLimitOrSoftBlock || isNetworkError;

        if (isTransient && retries < maxRetries) {
          retries++;
          const waitSeconds = isRateLimitOrSoftBlock
            ? RATE_LIMIT_COOLDOWN_SECONDS * retries
            : 5 * retries;
          const resumed = await waitWithCountdown(
            waitSeconds,
            "rateLimitPause",
            getLang,
            setToast,
            shouldAbortRequest,
          );
          if (!resumed) {
            return { ok: false, blocked: false };
          }
          continue;
        }
        console.error(`${kind} request failed for ${viewerId}:`, e);
        if (isRateLimitOrSoftBlock) {
          setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
        }
        return { ok: false, blocked: isTransient };
      }
    }
  };

  let requestsSinceLongSleep = 0;
  const paceRequest = async (): Promise<boolean> => {
    while (isPaused()) {
      if (shouldAbortRequest()) {
        return false;
      }
      await sleep(1000);
      console.info("Scan paused");
    }

    if (shouldAbortRequest()) {
      return false;
    }

    const activeTimings = getTimings();
    await sleep(Math.floor(Math.random() * 700) + 300);
    await sleep(
      Math.floor(Math.random() * (activeTimings.timeBetweenSearchCycles - activeTimings.timeBetweenSearchCycles * 0.7)) +
        activeTimings.timeBetweenSearchCycles,
    );

    if (shouldAbortRequest()) {
      return false;
    }

    requestsSinceLongSleep++;
    if (requestsSinceLongSleep >= CHECKS_BEFORE_LONG_SLEEP) {
      requestsSinceLongSleep = 0;
      const longSleepVar = Math.max(
        0,
        activeTimings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000),
      );
      const ok = await waitWithCountdown(
        Math.round(longSleepVar / 1000),
        "sleepingSafety",
        getLang,
        setToast,
        shouldAbortRequest,
      );
      if (!ok) {
        return false;
      }
    } else if (!isCancelled()) {
      setToast({ show: false });
    }
    return !shouldAbortRequest();
  };

  const fetchList = async (
    kind: FriendshipsListKind,
    pageSafetyLimit: number,
    onPageUsers: (pageUsers: readonly RawFriendshipUser[]) => Promise<boolean>,
  ): Promise<boolean> => {
    let maxId: string | undefined;
    let pagesFetched = 0;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (shouldAbortRequest()) {
        return false;
      }
      const result = await fetchPageWithRetry(kind, maxId, getTimings().usersPerSearchCycle);
      if (shouldAbortRequest() || !result.ok) {
        console.error(`Stopping ${kind} scan early.`);
        return false;
      }
      const page = result.page;
      const pageUsers = page.users ?? [];

      if (!(await onPageUsers(pageUsers))) {
        return false;
      }

      const hasMore = Boolean(page.next_max_id) && page.has_more !== false;
      if (!hasMore || pageUsers.length === 0) {
        return true;
      }

      pagesFetched += 1;
      if (pagesFetched >= pageSafetyLimit) {
        console.error(`Stopping ${kind} scan early: hit the safety cap of ${pageSafetyLimit} pages.`);
        return false;
      }
      if (page.next_max_id === maxId) {
        console.error(`Stopping ${kind} scan early: Instagram returned the same page cursor twice.`);
        return false;
      }
      maxId = page.next_max_id;

      if (!(await paceRequest())) {
        return false;
      }
    }
  };

  // Phase 1: Index all viewer followers by ID and normalized lowercase username.
  const followerIndex = createFollowerIndex();
  let followersCount = 0;

  const indexFollowersPage = async (pageUsers: readonly RawFriendshipUser[]): Promise<boolean> => {
    if (isCancelled()) {
      return false;
    }
    for (const user of pageUsers) {
      addFollowerToIndex(followerIndex, user);
      followersCount++;
    }

    const followersProgress = Math.min(49, Math.round(50 * (1 - 1 / (1 + followersCount / 150))));
    setState(prevState =>
      prevState.status === "scanning"
        ? {
            ...prevState,
            percentage: followersProgress,
            totalScanned: followersCount,
            scanPhase: "followers",
            followersIndexed: followersCount,
          }
        : prevState,
    );
    setToast({ show: true, text: t(getLang(), "indexingFollowersProgress", followersCount) });
    return true;
  };

  const followersCompleted = await fetchList("followers", FOLLOWERS_PAGE_SAFETY_LIMIT, indexFollowersPage);
  if (isCancelled() || handleAccountSwitchIfNeeded()) {
    return;
  }

  if (!followersCompleted) {
    // Aborting without partial followers guarantees zero false positives on mutuals.
    setState(prevState =>
      prevState.status === "scanning"
        ? { ...prevState, isScanningActive: false, scanIncomplete: true }
        : prevState,
    );
    setToast({ show: true, text: t(getLang(), "scanFailedFollowers") });
    return;
  }

  setState(prevState =>
    prevState.status === "scanning"
      ? {
          ...prevState,
          percentage: 50,
          scanPhase: "following",
          followersIndexed: followersCount,
        }
      : prevState,
  );

  // Phase 2: Cross-reference followed accounts against the follower index.
  const nonFollowers: UserNode[] = [];
  const seenNonFollowerIds = new Set<string>();
  let checkedCount = 0;

  const checkFollowingPage = async (pageUsers: readonly RawFriendshipUser[]): Promise<boolean> => {
    if (isCancelled()) {
      return false;
    }
    const rawBatch: UserNode[] = [];
    for (const user of pageUsers) {
      if (!isUserInFollowerIndex(followerIndex, user)) {
        rawBatch.push(rawFriendshipUserToUserNode(user, false));
      }
      checkedCount++;
    }

    const newNonFollowersBatch = deduplicateUsersById(rawBatch, seenNonFollowerIds);
    if (newNonFollowersBatch.length > 0) {
      nonFollowers.push(...newNonFollowersBatch);
    }

    const followingProgress = Math.min(99, 50 + Math.round(50 * (1 - 1 / (1 + checkedCount / 150))));
    setState(prevState =>
      prevState.status === "scanning"
        ? {
            ...prevState,
            results: newNonFollowersBatch.length > 0 ? [...prevState.results, ...newNonFollowersBatch] : prevState.results,
            totalScanned: checkedCount,
            percentage: followingProgress,
            scanPhase: "following",
            followingChecked: checkedCount,
          }
        : prevState,
    );
    setToast({ show: true, text: t(getLang(), "scanningFollowingProgress", checkedCount) });
    return true;
  };

  const followingCompleted = await fetchList("following", FOLLOWING_PAGE_SAFETY_LIMIT, checkFollowingPage);
  if (isCancelled() || handleAccountSwitchIfNeeded()) {
    return;
  }

  if (!followingCompleted && checkedCount === 0) {
    setState(prevState =>
      prevState.status === "scanning" ? { ...prevState, isScanningActive: false } : prevState,
    );
    setToast({ show: true, text: t(getLang(), "scanFailedFollowing") });
    return;
  }

  const scanIsComplete = followingCompleted;
  if (scanIsComplete || nonFollowers.length > 0) {
    saveCachedScanResults(nonFollowers, viewerId);
    setCachedScan(getCookie("ds_user_id") === viewerId ? { results: nonFollowers, timestamp: Date.now() } : null);
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
      totalScanned: checkedCount,
      followingChecked: checkedCount,
    };
  });

  setToast({
    show: true,
    text: scanIsComplete
      ? t(getLang(), "scanCompleted")
      : t(getLang(), "partialScanInterrupted", checkedCount),
  });
}

export interface UnfollowRunnerDeps {
  readonly selectedResults: readonly UserNode[];
  readonly blockedUntil: number;
  readonly isCancelled: () => boolean;
  readonly getLang: () => Language;
  readonly getTimings: () => Timings;
  readonly setState: SetStateFn;
  readonly setToast: SetToastFn;
}

/**
 * Unfollows `selectedResults` in configurable batches (default: 50 users
 * followed by a 30-second countdown pause), stopping immediately on action
 * blocks or mid-queue account switches.
 */
export async function runUnfollowQueue(deps: UnfollowRunnerDeps): Promise<void> {
  const { selectedResults, blockedUntil, isCancelled, getLang, getTimings, setState, setToast } = deps;

  if (blockedUntil > Date.now()) {
    setToast({
      show: true,
      text: t(getLang(), "rateLimitPause", Math.ceil((blockedUntil - Date.now()) / 1000)),
    });
    setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
    return;
  }

  const startViewerId = getCookie("ds_user_id");
  const csrftoken = getCookie("csrftoken");
  if (csrftoken === null) {
    throw new Error("csrftoken cookie is null");
  }

  const shouldStop = (): boolean => isCancelled() || hasSwitchedFromAccount(startViewerId);

  for (let index = 0; index < selectedResults.length; index++) {
    if (isCancelled()) {
      break;
    }
    if (hasSwitchedFromAccount(startViewerId)) {
      setToast({ show: true, text: t(getLang(), "scanAccountChanged") });
      setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
      break;
    }

    const user = selectedResults[index];
    const counter = index + 1;
    const percentage = Math.round((counter / selectedResults.length) * 100);
    const appendLog = (success: boolean) => {
      setState(prevState =>
        prevState.status === "unfollowing"
          ? {
              ...prevState,
              percentage,
              unfollowLog: [...prevState.unfollowLog, { user, unfollowedSuccessfully: success }],
            }
          : prevState,
      );
    };

    try {
      const result = await unfollowUser(user, csrftoken);
      if (isCancelled()) {
        break;
      }
      const success = result.outcome === "unfollowed";
      const isActionBlocked = result.outcome === "blocked";
      if (!success) {
        console.warn(`Unfollow for ${user.username} not confirmed: ${result.detail}`);
      }
      appendLog(success);

      if (isActionBlocked) {
        setBlockedUntil(Date.now() + BLOCKED_COOLDOWN_MS);
        setToast({ show: true, text: t(getLang(), "actionBlockedWarning") });
        setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
        break;
      }
    } catch (e) {
      console.error(e);
      appendLog(false);
    }

    if (isCancelled() || index === selectedResults.length - 1) {
      break;
    }

    const activeTimings = getTimings();
    const batchSize = Math.max(1, activeTimings.unfollowsPerBatch ?? DEFAULT_UNFOLLOWS_PER_BATCH);
    const batchWaitMs = Math.max(
      0,
      activeTimings.timeToWaitAfterUnfollowBatch ?? DEFAULT_TIME_TO_WAIT_AFTER_UNFOLLOW_BATCH,
    );

    if (counter % batchSize === 0) {
      const ok = await waitWithCountdown(
        Math.round(batchWaitMs / 1000),
        "sleepingSafety",
        getLang,
        setToast,
        shouldStop,
      );
      if (!ok) {
        if (!isCancelled() && hasSwitchedFromAccount(startViewerId)) {
          setToast({ show: true, text: t(getLang(), "scanAccountChanged") });
          setState(prevState => (prevState.status === "unfollowing" ? { ...prevState, aborted: true } : prevState));
        }
        break;
      }
    } else {
      const jitterDelay =
        Math.floor(Math.random() * (activeTimings.timeBetweenUnfollows * 1.2 - activeTimings.timeBetweenUnfollows)) +
        activeTimings.timeBetweenUnfollows;
      await sleep(Math.max(0, jitterDelay));
    }
  }
}
