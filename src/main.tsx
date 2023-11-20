import React, { useEffect, useState, ChangeEvent } from 'react';
import { render } from 'react-dom';
import './styles.scss';

import { Node, User } from './model/user';
import { urlGenerator, assertUnreachable, getCookie, sleep, unfollowUserUrlGenerator } from './utils';
import { Toast } from './components/toast';
import { UserCheckIcon } from './components/icons/UserCheckIcon';
import { UserUncheckIcon } from './components/icons/UserUncheckIcon';

const INSTAGRAM_HOSTNAME = 'www.instagram.com';
const UNFOLLOWERS_PER_PAGE = 50;
const WHITELISTED_RESULTS_STORAGE_KEY = 'iu_whitelisted-results';

async function copyListToClipboard(nonFollowersList: readonly Node[]): Promise<void> {
    const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

    let output = '';
    sortedList.forEach(user => {
        output += user.username + '\n';
    });

    await navigator.clipboard.writeText(output);
    alert('List copied to clipboard!');
}

function getMaxPage(nonFollowersList: readonly Node[]): number {
    const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
    return pageCalc < 1 ? 1 : pageCalc;
}

function getCurrentPageUnfollowers(nonFollowersList: readonly Node[], currentPage: number): readonly Node[] {
    const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));
    return sortedList.splice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE);
}

function getUsersForDisplay(
    results: readonly Node[],
    whitelistedResults: readonly Node[],
    currentTab: ScanningTab,
    searchTerm: string,
    filter: ScanningFilter,
): readonly Node[] {
    const users: Node[] = [];
    for (const result of results) {
        const isWhitelisted = whitelistedResults.find(user => user.id === result.id) !== undefined;
        switch (currentTab) {
            case 'non_whitelisted':
                if (isWhitelisted) {
                    continue;
                }
                break;
            case 'whitelisted':
                if (!isWhitelisted) {
                    continue;
                }
                break;
            default:
                assertUnreachable(currentTab);
        }
        if (!filter.showPrivate && result.is_private) {
            continue;
        }
        if (!filter.showVerified && result.is_verified) {
            continue;
        }
        if (!filter.showFollowers && result.follows_viewer) {
            continue;
        }
        if (!filter.showNonFollowers && !result.follows_viewer) {
            continue;
        }
        const userMatchesSearchTerm =
            result.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm !== '' && !userMatchesSearchTerm) {
            continue;
        }
        users.push(result);
    }
    return users;
}

function getUnfollowLogForDisplay(log: readonly UnfollowLogEntry[], searchTerm: string, filter: UnfollowFilter) {
    const entries: UnfollowLogEntry[] = [];
    for (const entry of log) {
        if (!filter.showSucceeded && entry.unfollowedSuccessfully) {
            continue;
        }
        if (!filter.showFailed && !entry.unfollowedSuccessfully) {
            continue;
        }
        const userMatchesSearchTerm = entry.user.username.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm !== '' && !userMatchesSearchTerm) {
            continue;
        }
        entries.push(entry);
    }
    return entries;
}

// pause
let scanningPaused = false;
function pauseScan() {
    scanningPaused = !scanningPaused;
}

type ScanningTab = 'non_whitelisted' | 'whitelisted';

interface ScanningFilter {
    readonly showNonFollowers: boolean;
    readonly showFollowers: boolean;
    readonly showVerified: boolean;
    readonly showPrivate: boolean;
}

interface UnfollowFilter {
    readonly showSucceeded: boolean;
    readonly showFailed: boolean;
}

interface UnfollowLogEntry {
    readonly user: Node;
    readonly unfollowedSuccessfully: boolean;
}

type State =
    | {
        readonly status: 'initial';
    }
    | {
        readonly status: 'scanning';
        readonly page: number;
        readonly currentTab: ScanningTab;
        readonly searchTerm: string;
        readonly percentage: number;
        readonly results: readonly Node[];
        readonly whitelistedResults: readonly Node[];
        readonly selectedResults: readonly Node[];
        readonly filter: ScanningFilter;
    }
    | {
        readonly status: 'unfollowing';
        readonly searchTerm: string;
        readonly percentage: number;
        readonly selectedResults: readonly Node[];
        readonly unfollowLog: readonly UnfollowLogEntry[];
        readonly filter: UnfollowFilter;
    };

function App() {
    const [state, setState] = useState<State>({
        status: 'initial',
    });
    const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
        show: false,
    });

    let isActiveProcess: boolean;
    switch (state.status) {
        case 'initial':
            isActiveProcess = false;
            break;
        case 'scanning':
        case 'unfollowing':
            isActiveProcess = state.percentage < 100;
            break;
        default:
            assertUnreachable(state);
    }

    const onScan = async () => {
        if (state.status !== 'initial') {
            return;
        }
        const whitelistedResultsFromStorage: string | null = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
        const whitelistedResults: readonly Node[] =
            whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);
        setState({
            status: 'scanning',
            page: 1,
            searchTerm: '',
            currentTab: 'non_whitelisted',
            percentage: 0,
            results: [],
            selectedResults: [],
            whitelistedResults,
            filter: {
                showNonFollowers: true,
                showFollowers: false,
                showVerified: true,
                showPrivate: true,
            },
        });
    };

    const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
        if (state.status !== 'scanning') {
            return;
        }
        if (state.selectedResults.length > 0) {
            if (!confirm('Changing filter options will clear selected users')) {
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
        if (state.status !== 'unfollowing') {
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

    const toggleUser = (newStatus: boolean, user: Node) => {
        if (state.status !== 'scanning') {
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
        if (state.status !== 'scanning') {
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
        if (state.status !== 'scanning') {
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
                e.returnValue = 'Changes you made may not be saved.';
            }

            // For Safari
            return 'Changes you made may not be saved.';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isActiveProcess, state]);

    useEffect(() => {
        const scan = async () => {
            if (state.status !== 'scanning') {
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
                    if (prevState.status !== 'scanning') {
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
                    console.info('Scan paused');
                }

                await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
                scrollCycle++;
                if (scrollCycle > 6) {
                    scrollCycle = 0;
                    setToast({ show: true, text: 'Sleeping 10 secs to prevent getting temp blocked' });
                    await sleep(10000);
                }
                setToast({ show: false });
            }
            setToast({ show: true, text: 'Scanning completed!' });
        };
        scan();
        // Dependency array not entirely legit, but works this way. TODO: Find a way to fix.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status]);

    useEffect(() => {
        const unfollow = async () => {
            if (state.status !== 'unfollowing') {
                return;
            }

            const csrftoken = getCookie('csrftoken');
            if (csrftoken === null) {
                throw new Error('csrftoken cookie is null');
            }

            let counter = 0;
            for (const user of state.selectedResults) {
                counter += 1;
                const percentage = Math.floor((counter / state.selectedResults.length) * 100);
                try {
                    await fetch(unfollowUserUrlGenerator(user.id), {
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded',
                            'x-csrftoken': csrftoken,
                        },
                        method: 'POST',
                        mode: 'cors',
                        credentials: 'include',
                    });
                    setState(prevState => {
                        if (prevState.status !== 'unfollowing') {
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
                        if (prevState.status !== 'unfollowing') {
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
                await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);

                if (counter % 5 === 0) {
                    setToast({ show: true, text: 'Sleeping 5 minutes to prevent getting temp blocked' });
                    await sleep(300000);
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
        case 'initial':
            markup = (
                <button className='run-scan' onClick={onScan}>
                    RUN
                </button>
            );
            break;

        case 'scanning': {
            const usersForDisplay = getUsersForDisplay(
                state.results,
                state.whitelistedResults,
                state.currentTab,
                state.searchTerm,
                state.filter,
            );
            let currentLetter = '';
            const onNewLetter = (firstLetter: string) => {
                currentLetter = firstLetter;
                return <div className='alphabet-character'>{currentLetter}</div>;
            };
            markup = (
                <section className='flex'>
                    <aside className='app-sidebar'>
                        <menu className='flex column m-clear p-clear'>
                            <p>Filter</p>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showNonFollowers'
                                    checked={state.filter.showNonFollowers}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Non-Followers
                            </label>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showFollowers'
                                    checked={state.filter.showFollowers}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Followers
                            </label>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showVerified'
                                    checked={state.filter.showVerified}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Verified
                            </label>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showPrivate'
                                    checked={state.filter.showPrivate}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Private
                            </label>
                        </menu>
                        <div className='grow'>
                            <p>Displayed: {usersForDisplay.length}</p>
                            <p>Total: {state.results.length}</p>
                        </div>
                        {/* Scan controls */}
                        <div className='controls'>
                            <button
                                className='button-control button-pause'
                                onClick={pauseScan}>
                                    {scanningPaused ? 'Resume' : 'Pause'}
                            </button>
                        </div>
                        <div className='grow t-center'>
                            <p>Pages</p>
                            <a
                                onClick={() => {
                                    if (state.page - 1 > 0) {
                                        setState({
                                            ...state,
                                            page: state.page - 1,
                                        });
                                    }
                                }}
                                className='p-medium'
                            >
                                ❮
                            </a>
                            <span>
                                {state.page}
                                &nbsp;/&nbsp;
                                {getMaxPage(usersForDisplay)}
                            </span>
                            <a
                                onClick={() => {
                                    if (state.page < getMaxPage(usersForDisplay)) {
                                        setState({
                                            ...state,
                                            page: state.page + 1,
                                        });
                                    }
                                }}
                                className='p-medium'
                            >
                                ❯
                            </a>
                        </div>
                        <button
                            className='unfollow'
                            onClick={() => {
                                if (!confirm('Are you sure?')) {
                                    return;
                                }
                                setState(prevState => {
                                    if (prevState.status !== 'scanning') {
                                        return prevState;
                                    }
                                    if (prevState.selectedResults.length === 0) {
                                        alert('Must select at least a single user to unfollow');
                                        return prevState;
                                    }
                                    const newState: State = {
                                        ...prevState,
                                        status: 'unfollowing',
                                        percentage: 0,
                                        unfollowLog: [],
                                        filter: {
                                            showSucceeded: true,
                                            showFailed: true,
                                        },
                                    };
                                    return newState;
                                });
                            }}
                        >
                            UNFOLLOW ({state.selectedResults.length})
                        </button>
                    </aside>
                    <article className='results-container'>
                        <nav className='tabs-container'>
                            <div
                                className={`tab ${state.currentTab === 'non_whitelisted' ? 'tab-active' : ''}`}
                                onClick={() => {
                                    if (state.currentTab === 'non_whitelisted') {
                                        return;
                                    }
                                    setState({
                                        ...state,
                                        currentTab: 'non_whitelisted',
                                        selectedResults: [],
                                    });
                                }}
                            >
                                Non-Whitelisted
                            </div>
                            <div
                                className={`tab ${state.currentTab === 'whitelisted' ? 'tab-active' : ''}`}
                                onClick={() => {
                                    if (state.currentTab === 'whitelisted') {
                                        return;
                                    }
                                    setState({
                                        ...state,
                                        currentTab: 'whitelisted',
                                        selectedResults: [],
                                    });
                                }}
                            >
                                Whitelisted
                            </div>
                        </nav>
                        {getCurrentPageUnfollowers(usersForDisplay, state.page).map(user => {
                            const firstLetter = user.username.substring(0, 1).toUpperCase();
                            return (
                                <>
                                    {firstLetter !== currentLetter && onNewLetter(firstLetter)}
                                    <label className='result-item'>
                                        <div className='flex grow align-center'>
                                            <div
                                                className='avatar-container'
                                                onClick={e => {
                                                    // Prevent selecting result when trying to add to whitelist.
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    let whitelistedResults: readonly Node[] = [];
                                                    switch (state.currentTab) {
                                                        case 'non_whitelisted':
                                                            whitelistedResults = [...state.whitelistedResults, user];
                                                            break;

                                                        case 'whitelisted':
                                                            whitelistedResults = state.whitelistedResults.filter(
                                                                result => result.id !== user.id,
                                                            );
                                                            break;

                                                        default:
                                                            assertUnreachable(state.currentTab);
                                                    }
                                                    localStorage.setItem(
                                                        WHITELISTED_RESULTS_STORAGE_KEY,
                                                        JSON.stringify(whitelistedResults),
                                                    );
                                                    setState({ ...state, whitelistedResults });
                                                }}
                                            >
                                                <img
                                                    className='avatar'
                                                    alt={user.username}
                                                    src={user.profile_pic_url}
                                                />
                                                <span className='avatar-icon-overlay-container'>
                                                    {state.currentTab === 'non_whitelisted' ? (
                                                        <UserCheckIcon />
                                                    ) : (
                                                        <UserUncheckIcon />
                                                    )}
                                                </span>
                                            </div>
                                            <div className='flex column m-medium'>
                                                <a
                                                    className='fs-xlarge'
                                                    target='_blank'
                                                    href={`/${user.username}`}
                                                    rel='noreferrer'
                                                >
                                                    {user.username}
                                                </a>
                                                <span className='fs-medium'>{user.full_name}</span>
                                            </div>
                                            {user.is_verified && <div className='verified-badge'>✔</div>}
                                            {user.is_private && (
                                                <div className='flex justify-center w-100'>
                                                    <span className='private-indicator'>Private</span>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            className='account-checkbox'
                                            type='checkbox'
                                            checked={state.selectedResults.indexOf(user) !== -1}
                                            onChange={e => toggleUser(e.currentTarget.checked, user)}
                                        />
                                    </label>
                                </>
                            );
                        })}
                    </article>
                </section>
            );
            break;
        }

        case 'unfollowing':
            markup = (
                <section className='flex'>
                    <aside className='app-sidebar'>
                        <menu className='flex column grow m-clear p-clear'>
                            <p>Filter</p>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showSucceeded'
                                    checked={state.filter.showSucceeded}
                                    onChange={handleUnfollowFilter}
                                />
                                &nbsp;Succeeded
                            </label>
                            <label className='badge m-small'>
                                <input
                                    type='checkbox'
                                    name='showFailed'
                                    checked={state.filter.showFailed}
                                    onChange={handleUnfollowFilter}
                                />
                                &nbsp;Failed
                            </label>
                        </menu>
                    </aside>
                    <article className='unfollow-log-container'>
                        {state.unfollowLog.length === state.selectedResults.length && (
                            <>
                                <hr />
                                <div className='fs-large p-medium clr-green'>All DONE!</div>
                                <hr />
                            </>
                        )}
                        {getUnfollowLogForDisplay(state.unfollowLog, state.searchTerm, state.filter).map(
                            (entry, index) =>
                                entry.unfollowedSuccessfully ? (
                                    <div className='p-medium' key={entry.user.id}>
                                        Unfollowed
                                        <a
                                            className='clr-inherit'
                                            target='_blank'
                                            href={`../${entry.user.username}`}
                                            rel='noreferrer'
                                        >
                                            &nbsp;{entry.user.username}
                                        </a>
                                        <span className='clr-cyan'>
                                            &nbsp; [{index + 1}/{state.selectedResults.length}]
                                        </span>
                                    </div>
                                ) : (
                                    <div className='p-medium clr-red' key={entry.user.id}>
                                        Failed to unfollow {entry.user.username} [{index + 1}/
                                        {state.selectedResults.length}]
                                    </div>
                                ),
                        )}
                    </article>
                </section>
            );
            break;

        default:
            assertUnreachable(state);
    }

    return (
        <main id='main' role='main' className='iu'>
            <section className='overlay'>
                <header className='app-header'>
                    {isActiveProcess && (
                        <progress
                            className='progressbar'
                            value={state.status !== 'initial' ? state.percentage : 0}
                            max='100'
                        />
                    )}
                    <div className='app-header-content'>
                        <div
                            className='logo'
                            onClick={() => {
                                if (isActiveProcess) {
                                    // Avoid resetting state while active process.
                                    return;
                                }
                                switch (state.status) {
                                    case 'initial':
                                        if (confirm('Go back to Instagram?')) {
                                            location.reload();
                                        }
                                        break;

                                    case 'scanning':
                                    case 'unfollowing':
                                        setState({
                                            status: 'initial',
                                        });
                                }
                            }}
                        >
                            InstagramUnfollowers
                        </div>
                        <button
                            className='copy-list'
                            onClick={() => {
                                switch (state.status) {
                                    case 'scanning':
                                        return copyListToClipboard(
                                            getUsersForDisplay(
                                                state.results,
                                                state.whitelistedResults,
                                                state.currentTab,
                                                state.searchTerm,
                                                state.filter,
                                            ),
                                        );
                                    case 'initial':
                                    case 'unfollowing':
                                        return;
                                    default:
                                        assertUnreachable(state);
                                }
                            }}
                            disabled={state.status === 'initial'}
                        >
                            COPY LIST
                        </button>
                        <input
                            type='text'
                            className='search-bar'
                            placeholder='Search...'
                            disabled={state.status === 'initial'}
                            value={state.status === 'initial' ? '' : state.searchTerm}
                            onChange={e => {
                                switch (state.status) {
                                    case 'initial':
                                        return;
                                    case 'scanning':
                                        return setState({
                                            ...state,
                                            searchTerm: e.currentTarget.value,
                                        });
                                    case 'unfollowing':
                                        return setState({
                                            ...state,
                                            searchTerm: e.currentTarget.value,
                                        });
                                    default:
                                        assertUnreachable(state);
                                }
                            }}
                        />
                        {state.status === 'scanning' && (
                            <input
                                title='Select all on this page'
                                type='checkbox'
                                // Avoid allowing to select all before scan completed to avoid confusion
                                // regarding what exactly is selected while scanning in progress.
                                disabled={
                                    // if paused, allow to select all even if scan is not completed.
                                  state.percentage < 100 && !scanningPaused
                                }
                                checked={
                                    state.selectedResults.length ===
                                    getUsersForDisplay(
                                        state.results,
                                        state.whitelistedResults,
                                        state.currentTab,
                                        state.searchTerm,
                                        state.filter,
                                    ).length
                                }
                                className='toggle-all-checkbox'
                                onClick={toggleCurrentePageUsers}
                            />
                        )}
                        {state.status === 'scanning' && (
                            <input
                                title='Select all'
                                type='checkbox'
                                // Avoid allowing to select all before scan completed to avoid confusion
                                // regarding what exactly is selected while scanning in progress.
                                disabled={
                                    // if paused, allow to select all even if scan is not completed.
                                  state.percentage < 100 && !scanningPaused
                                }
                                checked={
                                    state.selectedResults.length ===
                                    getUsersForDisplay(
                                        state.results,
                                        state.whitelistedResults,
                                        state.currentTab,
                                        state.searchTerm,
                                        state.filter,
                                    ).length
                                }
                                className='toggle-all-checkbox'
                                onClick={toggleAllUsers}
                            />
                        )}
                    </div>
                </header>

                {markup}

                {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
            </section>
        </main>
    );
}

if (location.hostname !== INSTAGRAM_HOSTNAME) {
    alert('Can be used only on Instagram routes');
} else {
    document.title = 'InstagramUnfollowers';
    document.body.innerHTML = '';
    render(<App />, document.body);
}
