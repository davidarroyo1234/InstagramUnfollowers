import React, { useEffect, useState, ChangeEvent } from 'preact/compat';
import { render } from 'preact';
import './styles.scss';

import { Node, User } from './model/user';
import { urlGenerator, assertUnreachable, getCookie, sleep, unfollowUserUrlGenerator } from './utils';

const INSTAGRAM_HOSTNAME: string = 'www.instagram.com';
const UNFOLLOWERS_PER_PAGE: number = 50;

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

function getUsersForDisplay(results: readonly Node[], filter: ScanningFilter): readonly Node[] {
    const users: Node[] = [];
    for (const user of results) {
        if (!filter.showPrivate && user.is_private) {
            continue;
        }
        if (!filter.showVerified && user.is_verified) {
            continue;
        }
        if (!filter.showFollowers && user.follows_viewer) {
            continue;
        }
        if (!filter.showNonFollowers && !user.follows_viewer) {
            continue;
        }
        users.push(user);
    }
    return users;
}

function getUnfollowLogForDisplay(log: readonly UnfollowLogEntry[], filter: UnfollowFilter) {
    const entries: UnfollowLogEntry[] = [];
    for (const entry of log) {
        if (!filter.showSucceeded && entry.unfollowedSuccessfully) {
            continue;
        }
        if (!filter.showFailed && !entry.unfollowedSuccessfully) {
            continue;
        }
        entries.push(entry);
    }
    return entries;
}

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
          readonly percentage: number;
          readonly results: readonly Node[];
          readonly selectedResults: readonly Node[];
          readonly filter: ScanningFilter;
      }
    | {
          readonly status: 'unfollowing';
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

    const onScan = async () => {
        if (state.status !== 'initial') {
            return;
        }
        setState({
            status: 'scanning',
            page: 1,
            percentage: 0,
            results: [],
            selectedResults: [],
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
                selectedResults: getUsersForDisplay(state.results, state.filter),
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
            switch (state.status) {
                case 'initial':
                    return;
                case 'scanning':
                case 'unfollowing':
                    if (state.percentage >= 100) {
                        // When process is complete, no reason to prevent user from leaving.
                        return;
                    }
                    break;
                default:
                    assertUnreachable(state);
            }

            e = e || window.event;

            // For IE and Firefox prior to version 4
            if (e) {
                e.returnValue = 'Changes you made may not be saved.';
            }

            // For Safari
            return 'Changes you made may not be saved.';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [state]);

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
                        return;
                    }
                    const state: State = {
                        ...prevState,
                        percentage: Math.floor((currentFollowedUsersCount / totalFollowedUsersCount) * 100),
                        results,
                    };
                    return state;
                });

                await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
                scrollCycle++;
                if (scrollCycle > 6) {
                    scrollCycle = 0;
                    setToast({ show: true, text: 'Sleeping 10 secs to prevent getting temp blocked' });
                    await sleep(10000);
                }
                setToast({ show: false });
            }
        };
        scan();
    }, [state.status]);

    useEffect(() => {
        const unfollow = async () => {
            if (state.status !== 'unfollowing') {
                return;
            }

            let csrftoken = getCookie('csrftoken');
            if (csrftoken === undefined) {
                throw new Error('csrftoken cookie is undefined');
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
                            return;
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
                            return;
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
            let currentLetter = '';
            const onNewLetter = (firstLetter: string) => {
                currentLetter = firstLetter;
                return <div class='alphabet-character'>{currentLetter}</div>;
            };
            markup = (
                <section className='flex'>
                    <aside className='side-bar'>
                        <p>Filter</p>
                        <menu className='flex column'>
                            <label className='badge'>
                                <input
                                    type='checkbox'
                                    name='showNonFollowers'
                                    checked={state.filter.showNonFollowers}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Non-Followers
                            </label>
                            <label className='badge'>
                                <input
                                    type='checkbox'
                                    name='showFollowers'
                                    checked={state.filter.showFollowers}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Followers
                            </label>
                            <label className='badge'>
                                <input
                                    type='checkbox'
                                    name='showVerified'
                                    checked={state.filter.showVerified}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Verified
                            </label>
                            <label className='badge'>
                                <input
                                    type='checkbox'
                                    name='showPrivate'
                                    checked={state.filter.showPrivate}
                                    onChange={handleScanFilter}
                                />
                                &nbsp;Private
                            </label>
                        </menu>
                    </aside>
                    <article className='results-container'>
                        {getCurrentPageUnfollowers(getUsersForDisplay(state.results, state.filter), state.page).map(
                            user => {
                                const firstLetter = user.username.substring(0, 1).toUpperCase();
                                return (
                                    <>
                                        {firstLetter !== currentLetter && onNewLetter(firstLetter)}
                                        <label className='result-item'>
                                            <div className='flex grow align-center'>
                                                <img
                                                    className='avatar'
                                                    alt={user.username}
                                                    src={user.profile_pic_url}
                                                />
                                                <div className='flex column m-medium'>
                                                    <a
                                                        className='fs-xlarge'
                                                        target='_blank'
                                                        href={`../${user.username}`}
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
                            },
                        )}
                    </article>
                </section>
            );
            break;
        }

        case 'unfollowing':
            markup = (
                <section className='flex'>
                    <aside className='side-bar'>
                        <p>Filter</p>
                        <menu className='flex column'>
                            <label className='badge'>
                                <input
                                    type='checkbox'
                                    name='showSucceeded'
                                    checked={state.filter.showSucceeded}
                                    onChange={handleUnfollowFilter}
                                />
                                &nbsp;Succeeded
                            </label>
                            <label className='badge'>
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
                                <div class='fs-large p-medium clr-green'>All DONE!</div>
                                <hr />
                            </>
                        )}
                        {getUnfollowLogForDisplay(state.unfollowLog, state.filter).map((entry, index) =>
                            entry.unfollowedSuccessfully ? (
                                <div class='p-medium'>
                                    Unfollowed
                                    <a class='clr-inherit' target='_blank' href={`../${entry.user.username}`}>
                                        &nbsp;{entry.user.username}
                                    </a>
                                    <span class='clr-cyan'>
                                        &nbsp; [{index + 1}/{state.selectedResults.length}]
                                    </span>
                                </div>
                            ) : (
                                <div class='p-medium clr-red'>
                                    Failed to unfollow {entry.user.username} [{index + 1}/{state.selectedResults.length}
                                    ]
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
                <header className='top-bar'>
                    <div
                        className='logo'
                        onClick={() => {
                            switch (state.status) {
                                case 'initial':
                                    if (confirm('Go back to Instagram?')) {
                                        location.reload();
                                    }
                                    break;

                                case 'scanning':
                                case 'unfollowing':
                                    if (state.percentage < 100) {
                                        // Avoid resetting state while active process.
                                        return;
                                    }
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
                                    return copyListToClipboard(getUsersForDisplay(state.results, state.filter));
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
                    <button
                        className='fs-large clr-red'
                        onClick={() => {
                            if (!confirm('Are you sure?')) {
                                return;
                            }
                            setState(prevState => {
                                if (prevState.status !== 'scanning') {
                                    return;
                                }
                                if (prevState.selectedResults.length === 0) {
                                    alert('Must select at least a single user to unfollow');
                                    return;
                                }
                                const state: State = {
                                    ...prevState,
                                    status: 'unfollowing',
                                    percentage: 0,
                                    unfollowLog: [],
                                    filter: {
                                        showSucceeded: true,
                                        showFailed: true,
                                    },
                                };
                                return state;
                            });
                        }}
                    >
                        {state.status === 'initial' ? (
                            // Spacer to avoid layout shift in parent flex container.
                            <div />
                        ) : (
                            <>UNFOLLOW [{state.selectedResults.length}]</>
                        )}
                    </button>
                    {state.status === 'scanning' && (
                        <input
                            type='checkbox'
                            // Avoid allowing to select all before scan completed to avoid confusion
                            // regarding what exactly is selected while scanning in progress.
                            disabled={state.percentage < 100}
                            className='toggle-all-checkbox'
                            onClick={toggleAllUsers}
                        />
                    )}
                </header>

                {markup}

                <footer className='bottom-bar'>
                    {state.status !== 'scanning' ? (
                        // Spacer to avoid layout shift in parent flex container.
                        <div />
                    ) : (
                        <div>Displayed: {getUsersForDisplay(state.results, state.filter).length}</div>
                    )}
                    {state.status === 'scanning' && (
                        <div>
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
                                {state.page} / {getMaxPage(getUsersForDisplay(state.results, state.filter))}
                            </span>
                            <a
                                onClick={() => {
                                    if (state.page < getMaxPage(getUsersForDisplay(state.results, state.filter))) {
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
                    )}
                    {(state.status === 'scanning' || state.status === 'unfollowing') && (
                        <div className='progressbar-container'>
                            <div
                                className={state.percentage < 100 ? 'progressbar-bar' : 'progressbar-bar-finished'}
                                style={{ width: `${state.percentage}%` }}
                            />
                            <span className='progressbar-text'>{state.percentage}%</span>
                        </div>
                    )}
                </footer>

                {toast.show && <div className='toast'>{toast.text}</div>}
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
