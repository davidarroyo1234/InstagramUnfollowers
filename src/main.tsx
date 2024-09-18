import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { User, UserNode } from "./model/user";
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import { DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS, INSTAGRAM_HOSTNAME, WHITELISTED_RESULTS_STORAGE_KEY } from "./constants/constants";
import {
  assertUnreachable,
  getCookie,
  getCurrentPageUnfollowers,
  getUsersForDisplay, sleep, unfollowUserUrlGenerator, urlGenerator,
} from "./utils/utils";
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";

// pause
let scanningPaused = false;

function pauseScan() {
  scanningPaused = !scanningPaused;
}


function App() {
  const [state, setState] = useState<State>({
    status: "initial",
  });

  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
    show: false,
  });

  //TODO FOR NEXT UPDATE SAVE THIS IN STORAGE
  const [timings, setTimings] = useState<Timings>(
    {
      timeBetweenSearchCycles: DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterFiveUnfollows: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
    }
  );


  let isActiveProcess: boolean;
  switch (state.status) {
    case "initial":
      isActiveProcess = false;
      break;
    case "scanning":
    case "unfollowing":
      isActiveProcess = state.percentage < 100;
      break;
    default:
      assertUnreachable(state);
  }

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    const whitelistedResultsFromStorage: string | null = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
    const whitelistedResults: readonly UserNode[] =
      whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 0,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showNonFollowers: true,
        showFollowers: false,
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
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getUsersForDisplay(
          state.results,
          state.whitelistedResults,
          state.currentTab,
          state.searchTerm,
          state.filter,
        ),
      });
    } else {
      setState({
        ...state,
        selectedResults: [],
      });
    }
  };

  // it will work the same as toggleAllUsers, but it will select everyone on the current page.
  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getCurrentPageUnfollowers(
          getUsersForDisplay(
            state.results,
            state.whitelistedResults,
            state.currentTab,
            state.searchTerm,
            state.filter,
          ),
          state.page,
        ),
      });
    } else {
      setState({
        ...state,
        selectedResults: [],
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
    const scan = async () => {
      if (state.status !== "scanning") {
        return;
      }
      const results = [...state.results];
      let scrollCycle = 0;
      let url = urlGenerator();
      let hasNext = true;
      let currentFollowedUsersCount = 0;
      let totalFollowedUsersCount = -1;

      while (hasNext) {
        let receivedData: User;
        try {
          receivedData = (await fetch(url).then(res => res.json())).data.user.edge_follow;
        } catch (e) {
          console.error(e);
          continue;
        }

        if (totalFollowedUsersCount === -1) {
          totalFollowedUsersCount = receivedData.count;
        }

        hasNext = receivedData.page_info.has_next_page;
        url = urlGenerator(receivedData.page_info.end_cursor);
        currentFollowedUsersCount += receivedData.edges.length;
        receivedData.edges.forEach(x => results.push(x.node));

        setState(prevState => {
          if (prevState.status !== "scanning") {
            return prevState;
          }
          const newState: State = {
            ...prevState,
            percentage: Math.floor((currentFollowedUsersCount / totalFollowedUsersCount) * 100),
            results,
          };
          return newState;
        });

        // Pause scanning if user requested so.
        while (scanningPaused) {
          await sleep(1000);
          console.info("Scan paused");
        }

        await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);
        scrollCycle++;
        if (scrollCycle > 6) {
          scrollCycle = 0;
          setToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterFiveSearchCycles / 1000 } seconds to prevent getting temp blocked` });
          await sleep(timings.timeToWaitAfterFiveSearchCycles);
        }
        setToast({ show: false });
      }
      setToast({ show: true, text: "Scanning completed!" });
    };
    scan();
    // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    const unfollow = async () => {
      if (state.status !== "unfollowing") {
        return;
      }

      const csrftoken = getCookie("csrftoken");
      if (csrftoken === null) {
        throw new Error("csrftoken cookie is null");
      }

      let counter = 0;
      for (const user of state.selectedResults) {
        counter += 1;
        const percentage = Math.floor((counter / state.selectedResults.length) * 100);
        try {
          await fetch(unfollowUserUrlGenerator(user.id), {
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "x-csrftoken": csrftoken,
            },
            method: "POST",
            mode: "cors",
            credentials: "include",
          });
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
                  unfollowedSuccessfully: true,
                },
              ],
            };
          });
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
          setToast({ show: true, text: `Sleeping ${timings.timeToWaitAfterFiveUnfollows / 60000 } minutes to prevent getting temp blocked` });
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
      markup = <NotSearching onScan={onScan}></NotSearching>;
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
      ></Searching>;
      break;
    }

    case "unfollowing":
      markup = <Unfollowing
        state={state}
        handleUnfollowFilter={handleUnfollowFilter}
      ></Unfollowing>;
      break;

    default:
      assertUnreachable(state);
  }

  return (
    <main id="main" role="main" className="iu">
      <section className="overlay">
        <Toolbar
          state={state}
          setState={setState}
          scanningPaused={scanningPaused}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
        ></Toolbar>

        {markup}

        {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
      </section>
    </main>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME) {
  alert("Can be used only on Instagram routes");
} else {
  document.title = "InstagramUnfollowers";
  document.body.innerHTML = "";
  render(<App />, document.body);
}
