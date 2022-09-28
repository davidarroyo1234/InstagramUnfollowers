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
        console.error(`Unable to find user by id. userId: ${userId}`);
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
    getElementByClass('.iu_selected-count').innerHTML = `[${userIdsToUnfollow.length}]`;
}

// Some functions needed to be placed on the window.
// This is due to the way the are used in the inlined template here.
// Placing them on the window was the only way to make them work for some reason.
window.toggleUser = userId => {
    if (userIdsToUnfollow.indexOf(userId) === -1) {
        userIdsToUnfollow = [...userIdsToUnfollow, userId];
    } else {
        userIdsToUnfollow = userIdsToUnfollow.filter(id => id !== userId);
    }
    onToggleUser();
};

window.toggleAllUsers = (status = false) => {
    document.querySelectorAll('.iu_account-checkbox').forEach(e => (e.checked = status));
    if (!status) {
        userIdsToUnfollow = [];
    } else {
        userIdsToUnfollow = nonFollowersList.map(user => user.id);
    }
    onToggleUser();
};

function renderResults(resultsList) {
    // Shallow-copy to avoid altering original.
    const sortedList = [...resultsList].sort((a, b) => (a.username > b.username ? 1 : -1));
    getElementByClass('.iu_toggle-all-checkbox').disabled = false;
    const elResultsContainer = getElementByClass('.iu_results-container');
    elResultsContainer.innerHTML = '';
    let currentChar = '';
    sortedList.forEach(user => {
        const isUserSelected = userIdsToUnfollow.indexOf(parseInt(user.id, 10)) !== -1;
        const firstChar = user.username.substring(0, 1).toUpperCase();
        if (currentChar !== firstChar) {
            currentChar = firstChar;
            elResultsContainer.innerHTML += `<div style='margin:1rem;padding:1rem;font-size:2em;border-bottom: 1px solid #333;'>${currentChar}</div>`;
        }
        elResultsContainer.innerHTML += `<label style='display:flex;align-items:center;padding:1rem;border-radius:3px;cursor:pointer;'>
            <div style='display:flex;align-items:center;flex:1;'>
                <img src=${user.profile_pic_url} width='75px' style='border-radius:50%;' />&nbsp;&nbsp;&nbsp;&nbsp;
                <div style='display:flex;flex-direction:column;'>
                    <span style='font-size:1.7em;'>${user.username}</span>
                    <span style='font-size:0.8em;'>${user.full_name}</span>
                </div>
                ${
                    user.is_verified
                        ? `&nbsp;&nbsp;&nbsp;<div style='background-color:#49adf4;border-radius:50%;padding:0.2rem 0.3rem;font-size:0.35em;height:fit-content;'>✔</div>`
                        : ''
                }
                ${
                    user.is_private
                        ? `<div style='display:flex;width:100%;justify-content:space-around;'>
                            <span style='border: 2px solid #51bb42;border-radius:25px;padding:0.5rem;color:#51bb42;font-weight:500;'>Private</span>
                          </div>`
                        : ''
                }
            </div>
            <input
                class='iu_account-checkbox'
                type='checkbox'
                style='height:1.1rem;width:1.1rem;'
                onchange='toggleUser(${user.id})'
                ${isUserSelected ? 'checked' : ''} />
        </label>`;
    });
}

async function run(shouldIncludeVerifiedAccounts) {
    getElementByClass('.iu_main-btn').remove();
    getElementByClass('.iu_include-verified-checkbox').disabled = true;
    nonFollowersList = await getNonFollowersList(shouldIncludeVerifiedAccounts);
    getElementByClass('.ui_copy-list-btn').disabled = false;
}

function renderOverlay() {
    let shouldIncludeVerifiedAccounts = true;
    document.documentElement.style.backgroundColor = '#222';
    const el = document.createElement('div');
    el.setAttribute('class', 'iu_overlay');
    el.setAttribute('style', ['background-color:#222', 'color:#fff', 'height:100%', 'font-family:system-ui'].join(';'));
    el.innerHTML = `<header style='position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:1rem;height:2.5rem;background-color:#333;z-index:1;'>
        <div style='font-family:monospace;font-size:1.5em;cursor:pointer;' onclick='location.reload()'>InstagramUnfollowers</div>
        <button class='ui_copy-list-btn' style='background:none;color:white;border: 1px solid white;border-radius:15px;padding:0.5em;cursor:pointer' onclick='copyListToClipboard()' disabled>Copy List to Clipboard</button>
        <label style='display:flex;cursor:pointer;'><input type='checkbox' class='iu_include-verified-checkbox' />&nbsp;Include verified</label>
        <div class='iu_progressbar-container' style='display:none;width:120px;height:30px;border-radius:5px;position:relative;border:1px solid #7b7777;'>
            <div class='iu_progressbar-bar' style='width:0;height:100%;background-color:#7b7777;'></div>
            <label class='iu_progressbar-text' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'>0%</label>
        </div>
        <div>Non-followers: <span class='iu_nonfollower-count' /></div>
        <div style='font-size:1.2em;text-decoration:underline;color:red;cursor:pointer;' onclick='unfollow()'>Unfollow Selected <span class='iu_selected-count'>[0]</span></div>
        <input type='checkbox' class='iu_toggle-all-checkbox' style='height:1.1rem;width:1.1rem;' onclick='toggleAllUsers(this.checked)' disabled />
    </header>
    <div class='iu_sleeping-container' style='position: fixed; bottom: 0; left: 0px; right: 0px; display: none; padding: 1rem; background-color: #000; z-index: 1;color: yellow; font-weight:bold'></div>
    <button class='iu_main-btn' style='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:2em;cursor:pointer;height:160px;width:160px;border-radius:50%;background:transparent;color:currentColor;border:1px solid currentColor;'>RUN</button>
    <div class='iu_results-container' style='transform:translateY(75px)'></div>`;
    document.body.replaceChildren(el);

    // Assigned here separately instead of inline due to variables and functions not being recognized when used as bookmarklet.
    getElementByClass('.iu_main-btn').addEventListener('click', () => run(shouldIncludeVerifiedAccounts));
    const elShouldIncludeVerified = getElementByClass('.iu_include-verified-checkbox');
    elShouldIncludeVerified.checked = shouldIncludeVerifiedAccounts;
    elShouldIncludeVerified.addEventListener(
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

    getElementByClass('.iu_progressbar-container').style.display = 'block';
    const elProgressbarBar = getElementByClass('.iu_progressbar-bar');
    const elProgressbarText = getElementByClass('.iu_progressbar-text');
    const elNonFollowerCount = getElementByClass('.iu_nonfollower-count');
    const elSleepingContainer = getElementByClass('.iu_sleeping-container');

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
            elSleepingContainer.style.display = 'block';
            elSleepingContainer.innerHTML = 'Sleeping 10 secs to prevent getting temp blocked...';
            await sleep(10000);
        }
        elSleepingContainer.style.display = 'none';
    }
    elProgressbarBar.style.backgroundColor = '#59A942';
    elProgressbarText.innerHTML = 'DONE';

    isActiveProcess = false;
    return list;
}

window.unfollow = async () => {
    if (isActiveProcess) {
        return;
    }
    if (!confirm('Are you sure?')) {
        return;
    }

    let csrftoken = getCookie('csrftoken');
    if (csrftoken === undefined) {
        throw new Error('csrftoken cookie is undefined');
    }
    const elSleepingContainer = getElementByClass('.iu_sleeping-container');
    getElementByClass('.iu_toggle-all-checkbox').disabled = true;
    const elResultsContainer = getElementByClass('.iu_results-container');
    elResultsContainer.innerHTML = '';

    const scrollToBottom = () => window.scrollTo(0, elResultsContainer.scrollHeight);

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
            elResultsContainer.innerHTML += `<div style='padding:1rem;'>Unfollowed
                <a style='color:inherit' target='_blank' href='${INSTAGRAM_HOSTNAME}/${user.username}/'> ${
                user.username
            }</a>
                <span style='color:#00ffff'> [${counter + 1}/${userIdsToUnfollow.length}]</span>
            </div>`;
        } catch (e) {
            console.error(e);
            elResultsContainer.innerHTML += `<div style='padding:1rem;color:red;'>Failed to unfollow ${
                user.username
            } [${counter + 1}/${userIdsToUnfollow.length}]</div>`;
        }
        scrollToBottom();
        await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);

        counter += 1;
        // If unfollowing the last user in the list, no reason to wait 5 minutes.
        if (id === userIdsToUnfollow[userIdsToUnfollow.length - 1]) {
            break;
        }
        if (counter % 5 === 0) {
            elSleepingContainer.style.display = 'block';
            elSleepingContainer.innerHTML = 'Sleeping 5 minutes to prevent getting temp blocked...';
            scrollToBottom();
            await sleep(300000);
        }
        elSleepingContainer.style.display = 'none';
    }

    isActiveProcess = false;
    elResultsContainer.innerHTML += `<hr /><div style='padding:1rem;font-size:1.25em;color:#56d756;'>All DONE!</div><hr />`;
    scrollToBottom();
};

function init() {
    if (location.hostname !== INSTAGRAM_HOSTNAME) {
        alert('Can be used only on Instagram routes');
        return;
    }
    document.title = 'InstagramUnfollowers';
    renderOverlay();
}

init();
