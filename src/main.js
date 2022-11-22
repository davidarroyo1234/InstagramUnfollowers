'use strict';

const INSTAGRAM_HOSTNAME = 'www.instagram.com';

let nonFollowersList = [];
let userIdsToUnfollow = [];
let isActiveProcess = false;

// Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
// This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
window.addEventListener('beforeunload', e => {
    if (!isActiveProcess) {
        return;
    }
    e = e || window.event;

    // For IE and Firefox prior to version 4
    if (e) {
        e.returnValue = 'Changes you made may not be saved.';
    }

    // For Safari
    return 'Changes you made may not be saved.';
});

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function afterUrlGenerator(nextCode) {
    const ds_user_id = getCookie('ds_user_id');
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

function unfollowUserUrlGenerator(idToUnfollow) {
    return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

function getElementByClass(className) {
    const el = document.querySelector(className);
    if (el === null) {
        throw new Error(`Unable to find element by class: ${className}`);
    }
    return el;
}

function getUserById(userId) {
    const user = nonFollowersList.find(user => {
        return user.id.toString() === userId.toString();
    });
    if (user === undefined) {
        console.error(`Unable to find user by id: ${userId}`);
    }
    return user;
}

function copyListToClipboard() {
    const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

    let output = '';
    sortedList.forEach(user => {
        output += user.username + '\n';
    });

    copyToClipboard(output);
}

async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
    alert('List copied to clipboard!');
}

function onToggleUser() {
    getElementByClass('.selected-user-count').innerHTML = `[${userIdsToUnfollow.length}]`;
}

function toggleUser(userId) {
    if (userIdsToUnfollow.indexOf(userId) === -1) {
        userIdsToUnfollow = [...userIdsToUnfollow, userId];
    } else {
        userIdsToUnfollow = userIdsToUnfollow.filter(id => id !== userId);
    }
    onToggleUser();
}

function toggleAllUsers(status = false) {
    document.querySelectorAll('.account-checkbox').forEach(e => (e.checked = status));
    if (!status) {
        userIdsToUnfollow = [];
    } else {
        userIdsToUnfollow = nonFollowersList.map(user => user.id);
    }
    onToggleUser();
}

function renderResults(resultsList) {
    // Shallow-copy to avoid altering original.
    const sortedList = [...resultsList].sort((a, b) => (a.username > b.username ? 1 : -1));
    getElementByClass('.toggle-all-checkbox').disabled = false;
    const elResultsContainer = getElementByClass('.results-container');
    elResultsContainer.innerHTML = '';
    let currentChar = '';
    sortedList.forEach(user => {
        const isUserSelected = userIdsToUnfollow.indexOf(parseInt(user.id, 10)) !== -1;
        const firstChar = user.username.substring(0, 1).toUpperCase();
        if (currentChar !== firstChar) {
            currentChar = firstChar;
            elResultsContainer.innerHTML += `<div class='alphabet-character'>${currentChar}</div>`;
        }
        elResultsContainer.innerHTML += `<label class='result-item'>
            <div class='flex grow align-center'>
                <img class='avatar' src=${user.profile_pic_url} />&nbsp;&nbsp;&nbsp;&nbsp;
                <div class='flex column'>
                    <a class='fs-xlarge' target='_blank' href='${user.username}'>${user.username}</a>
                    <span class='fs-medium'>${user.full_name}</span>
                </div>
                ${user.is_verified ? `&nbsp;&nbsp;&nbsp;<div class='verified-badge'>✔</div>` : ''}
                ${
                    user.is_private
                        ? `<div class='flex justify-center w-100'>
                            <span class='private-indicator'>Private</span>
                          </div>`
                        : ''
                }
            </div>
            <input
                class='account-checkbox'
                type='checkbox'
                onchange='toggleUser(${user.id})'
                ${isUserSelected ? 'checked' : ''} />
        </label>`;
    });
}

async function run(shouldIncludeVerifiedAccounts) {
    getElementByClass('.run-scan').remove();
    getElementByClass('.include-verified-checkbox').disabled = true;
    nonFollowersList = await getNonFollowersList(shouldIncludeVerifiedAccounts);
    getElementByClass('.copy-list').disabled = false;
}

function renderOverlay() {
    let shouldIncludeVerifiedAccounts = true;
    document.body.innerHTML = `
        <main class='iu'>
            <div class='overlay'>
                <header class='top-bar'>
                    <div class='logo' onclick='location.reload()'>InstagramUnfollowers</div>
                    <label class='flex align-center'>
                        <input type='checkbox' class='include-verified-checkbox' ${
                            shouldIncludeVerifiedAccounts ? 'checked' : ''
                        } /> Include verified
                    </label>
                    <button class='copy-list' onclick='copyListToClipboard()' disabled>COPY LIST</button>
                    <button class='fs-large clr-red' onclick='unfollow()'>UNFOLLOW <span class='selected-user-count'>[0]</span></button>
                    <input type='checkbox' class='toggle-all-checkbox' onclick='toggleAllUsers(this.checked)' disabled />
                </header>

                <button class='run-scan'>RUN</button>
                <div class='results-container'></div>

                <footer class='bottom-bar'>
                    <div>Non-followers: <span class='nonfollower-count' /></div>
                    <div class='sleeping-text'></div>
                    <div class='progressbar-container'>
                        <div class='progressbar-bar'></div>
                        <span class='progressbar-text'>0%</span>
                    </div>
                </footer>
            </div>
        </main>`;
    getElementByClass('.run-scan').addEventListener('click', () => run(shouldIncludeVerifiedAccounts));
    getElementByClass('.include-verified-checkbox').addEventListener(
        'change',
        () => (shouldIncludeVerifiedAccounts = !shouldIncludeVerifiedAccounts),
    );
}

async function getNonFollowersList(shouldIncludeVerifiedAccounts = true) {
    if (isActiveProcess) {
        return;
    }

    let list = [];
    let hasNext = true;
    let scrollCycle = 0;
    let currentFollowedUsersCount = 0;
    let totalFollowedUsersCount = -1;
    isActiveProcess = true;

    const ds_user_id = getCookie('ds_user_id');
    let url = `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;

    const elProgressbarBar = getElementByClass('.progressbar-bar');
    const elProgressbarText = getElementByClass('.progressbar-text');
    const elNonFollowerCount = getElementByClass('.nonfollower-count');
    const elSleepingText = getElementByClass('.sleeping-text');

    while (hasNext) {
        let receivedData;
        try {
            receivedData = await fetch(url).then(res => res.json());
        } catch (e) {
            console.error(e);
            continue;
        }

        if (totalFollowedUsersCount === -1) {
            totalFollowedUsersCount = receivedData.data.user.edge_follow.count;
        }

        hasNext = receivedData.data.user.edge_follow.page_info.has_next_page;
        url = afterUrlGenerator(receivedData.data.user.edge_follow.page_info.end_cursor);
        currentFollowedUsersCount += receivedData.data.user.edge_follow.edges.length;

        receivedData.data.user.edge_follow.edges.forEach(x => {
            if (!shouldIncludeVerifiedAccounts && x.node.is_verified) {
                return;
            }
            if (!x.node.follows_viewer) {
                list.push(x.node);
            }
        });

        const percentage = `${Math.ceil((currentFollowedUsersCount / totalFollowedUsersCount) * 100)}%`;
        elProgressbarText.innerHTML = percentage;
        elProgressbarBar.style.width = percentage;
        elNonFollowerCount.innerHTML = list.length.toString();
        renderResults(list);

        await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
        scrollCycle++;
        if (scrollCycle > 6) {
            scrollCycle = 0;
            elSleepingText.style.display = 'block';
            elSleepingText.innerHTML = 'Sleeping 10 secs to prevent getting temp blocked...';
            await sleep(10000);
        }
        elSleepingText.style.display = 'none';
    }
    elProgressbarBar.style.backgroundColor = '#59A942';
    elProgressbarText.innerHTML = 'DONE';

    isActiveProcess = false;
    return list;
}

async function unfollow() {
    if (isActiveProcess) {
        return;
    }
    if (userIdsToUnfollow.length === 0) {
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
    const elSleepingText = getElementByClass('.sleeping-text');
    const elProgressbarBar = getElementByClass('.progressbar-bar');
    const elProgressbarText = getElementByClass('.progressbar-text');
    getElementByClass('.toggle-all-checkbox').disabled = true;
    const elResultsContainer = getElementByClass('.results-container');
    elResultsContainer.innerHTML = '';

    const scrollToBottom = () => window.scrollTo(0, elResultsContainer.scrollHeight);

    elProgressbarText.innerHTML = '0%';
    elProgressbarBar.style.width = '0%';
    isActiveProcess = true;
    let counter = 0;
    for (const id of userIdsToUnfollow) {
        const user = getUserById(id);
        try {
            await fetch(unfollowUserUrlGenerator(id), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'x-csrftoken': csrftoken,
                },
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
            });
            elResultsContainer.innerHTML += `<div class='p-medium'>Unfollowed
                <a class='clr-inherit' target='_blank' href='${user.username}'> ${user.username}</a>
                <span class='clr-cyan'> [${counter + 1}/${userIdsToUnfollow.length}]</span>
            </div>`;
        } catch (e) {
            console.error(e);
            elResultsContainer.innerHTML += `<div class='p-medium clr-red'>Failed to unfollow ${user.username} [${
                counter + 1
            }/${userIdsToUnfollow.length}]</div>`;
        }
        counter += 1;
        const percentage = `${Math.ceil((counter / userIdsToUnfollow.length) * 100)}%`;
        elProgressbarText.innerHTML = percentage;
        elProgressbarBar.style.width = percentage;
        scrollToBottom();
        // If unfollowing the last user in the list, no reason to wait.
        if (id === userIdsToUnfollow[userIdsToUnfollow.length - 1]) {
            break;
        }
        await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);

        if (counter % 5 === 0) {
            elSleepingText.style.display = 'block';
            elSleepingText.innerHTML = 'Sleeping 5 minutes to prevent getting temp blocked...';
            scrollToBottom();
            await sleep(300000);
        }
        elSleepingText.style.display = 'none';
    }
    elProgressbarBar.style.backgroundColor = '#59A942';
    elProgressbarText.innerHTML = 'DONE';

    isActiveProcess = false;
    elResultsContainer.innerHTML += `<hr /><div class='fs-large p-medium clr-green'>All DONE!</div><hr />`;
    scrollToBottom();
}

function init() {
    if (location.hostname !== INSTAGRAM_HOSTNAME) {
        alert('Can be used only on Instagram routes');
        return;
    }
    document.title = 'InstagramUnfollowers';
    renderOverlay();
}

init();
