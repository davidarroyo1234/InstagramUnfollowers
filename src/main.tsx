import React, { useEffect, useState } from 'preact/compat';
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

type State =
    | {
          readonly status: 'initial';
          readonly shouldIncludeVerifiedAccounts: boolean;
      }
    | {
          readonly status: 'scanning';
          readonly page: number;
          readonly percentage: number;
          readonly nonFollowers: readonly Node[];
          readonly selectedUsers: readonly Node[];
          readonly shouldIncludeVerifiedAccounts: boolean;
      }
    | {
          readonly status: 'unfollowing';
          readonly percentage: number;
          readonly nonFollowers: readonly Node[];
          readonly selectedUsers: readonly Node[];
          readonly unfollowLog: ReadonlyArray<{
              readonly user: Node;
              readonly unfollowedSuccessfully: boolean;
          }>;
      };

function App() {
    const [state, setState] = useState<State>({
        status: 'initial',
        shouldIncludeVerifiedAccounts: true,
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
            nonFollowers: [],
            selectedUsers: [],
            shouldIncludeVerifiedAccounts: state.shouldIncludeVerifiedAccounts,
        });
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
                    if (state.percentage === 100) {
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
            let nonFollowers: readonly Node[] = state.nonFollowers;
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

                receivedData.edges.forEach(x => {
                    if (!state.shouldIncludeVerifiedAccounts && x.node.is_verified) {
                        return;
                    }
                    if (!x.node.follows_viewer) {
                        nonFollowers = [...nonFollowers, x.node];
                    }
                });

                setState(prevState => {
                    if (prevState.status !== 'scanning') {
                        return;
                    }
                    const state: State = {
                        ...prevState,
                        percentage: Math.ceil((currentFollowedUsersCount / totalFollowedUsersCount) * 100),
                        nonFollowers,
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
            if (state.selectedUsers.length === 0) {
                alert('Must select at least a single user to unfollow');
                return;
            }
            if (!confirm('Are you sure?')) {
                return;
            }

            let csrftoken = getCookie('csrftoken');
            if (csrftoken === undefined) {
                throw new Error('csrftoken cookie is undefined');
            }

            let counter = 0;
            for (const user of state.selectedUsers) {
                counter += 1;
                const percentage = Math.ceil((counter / state.selectedUsers.length) * 100);
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
                                ...state.unfollowLog,
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
                                ...state.unfollowLog,
                                {
                                    user,
                                    unfollowedSuccessfully: false,
                                },
                            ],
                        };
                    });
                }
                // If unfollowing the last user in the list, no reason to wait.
                if (user === state.selectedUsers[state.selectedUsers.length - 1]) {
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
                <div className='results-container'>
                    {getCurrentPageUnfollowers(state.nonFollowers, state.page).map(user => {
                        const firstLetter = user.username.substring(0, 1).toUpperCase();
                        return (
                            <>
                                {firstLetter !== currentLetter && onNewLetter(firstLetter)}
                                <label className='result-item'>
                                    <div className='flex grow align-center'>
                                        <img className='avatar' alt={user.username} src={user.profile_pic_url} />
                                        &nbsp;&nbsp;&nbsp;&nbsp;
                                        <div className='flex column'>
                                            <a className='fs-xlarge' target='_blank' href={`../${user.username}`}>
                                                {user.username}
                                            </a>
                                            <span className='fs-medium'>{user.full_name}</span>
                                        </div>
                                        {user.is_verified && (
                                            <>
                                                &nbsp;&nbsp;&nbsp;
                                                <div className='verified-badge'>✔</div>
                                            </>
                                        )}
                                        {user.is_private && (
                                            <div className='flex justify-center w-100'>
                                                <span className='private-indicator'>Private</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        className='account-checkbox'
                                        type='checkbox'
                                        checked={state.selectedUsers.indexOf(user) !== -1}
                                        onChange={e => {
                                            if (e.currentTarget.checked) {
                                                setState({
                                                    ...state,
                                                    selectedUsers: [...state.selectedUsers, user],
                                                });
                                            } else {
                                                setState({
                                                    ...state,
                                                    selectedUsers: state.selectedUsers.filter(
                                                        selectedUser => selectedUser !== user,
                                                    ),
                                                });
                                            }
                                        }}
                                    />
                                </label>
                            </>
                        );
                    })}
                </div>
            );
            break;
        }

        case 'unfollowing':
            markup = (
                <div className='unfollow-log-container'>
                    {state.unfollowLog.length === state.selectedUsers.length && (
                        <>
                            <hr />
                            <div class='fs-large p-medium clr-green'>All DONE!</div>
                            <hr />
                        </>
                    )}
                    {state.unfollowLog.map((entry, index) =>
                        entry.unfollowedSuccessfully ? (
                            <div class='p-medium'>
                                Unfollowed
                                <a class='clr-inherit' target='_blank' href={`../${entry.user.username}`}>
                                    &nbsp;{entry.user.username}
                                </a>
                                <span class='clr-cyan'>
                                    &nbsp; [{index + 1}/{state.selectedUsers.length}]
                                </span>
                            </div>
                        ) : (
                            <div class='p-medium clr-red'>
                                Failed to unfollow {entry.user.username} [{index + 1}/{state.selectedUsers.length}]
                            </div>
                        ),
                    )}
                </div>
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
                                    if (state.percentage !== 100) {
                                        // Avoid resetting state while active process.
                                        return;
                                    }
                                    setState({
                                        status: 'initial',
                                        shouldIncludeVerifiedAccounts: true,
                                    });
                            }
                        }}
                    >
                        InstagramUnfollowers
                    </div>
                    {state.status === 'initial' && (
                        <label className='flex align-center'>
                            <input
                                type='checkbox'
                                className='include-verified-checkbox'
                                checked={state.shouldIncludeVerifiedAccounts}
                                onChange={() =>
                                    setState({
                                        ...state,
                                        shouldIncludeVerifiedAccounts: !state.shouldIncludeVerifiedAccounts,
                                    })
                                }
                            />
                            Include verified
                        </label>
                    )}
                    <button
                        className='copy-list'
                        onClick={() => {
                            switch (state.status) {
                                case 'scanning':
                                    return copyListToClipboard(state.nonFollowers);
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
                        onClick={() =>
                            setState(prevState => {
                                if (prevState.status !== 'scanning') {
                                    return;
                                }
                                const state: State = {
                                    ...prevState,
                                    status: 'unfollowing',
                                    percentage: 0,
                                    unfollowLog: [],
                                };
                                return state;
                            })
                        }
                    >
                        {state.status === 'initial' ? (
                            // Spacer to avoid layout shift in parent flex container.
                            <div />
                        ) : (
                            <>UNFOLLOW [{state.selectedUsers.length}]</>
                        )}
                    </button>
                    {state.status === 'scanning' && (
                        <input
                            type='checkbox'
                            // Avoid allowing to select all before scan completed to avoid confusion
                            // regarding what exactly is selected while scanning in progress.
                            disabled={state.percentage !== 100}
                            className='toggle-all-checkbox'
                            onClick={e => {
                                if (e.currentTarget.checked) {
                                    setState({
                                        ...state,
                                        selectedUsers: state.nonFollowers,
                                    });
                                } else {
                                    setState({
                                        ...state,
                                        selectedUsers: [],
                                    });
                                }
                            }}
                        />
                    )}
                </header>

                {markup}

                <footer className='bottom-bar'>
                    <div>Non-followers: {state.status !== 'initial' && state.nonFollowers.length}</div>
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
                                {state.page} / {getMaxPage(state.nonFollowers)}
                            </span>
                            <a
                                onClick={() => {
                                    if (state.page < getMaxPage(state.nonFollowers)) {
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
