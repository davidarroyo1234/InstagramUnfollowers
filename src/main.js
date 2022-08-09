'use strict';

const INSTAGRAM_HOSTNAME = 'www.instagram.com';

let nonFollowersList = [];
let userIdsToUnfollow = [];

function sleep(ms) {
    return new Promise((resolve) => {
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
        throw new Error(`Unable to find element by class. className: ${className}`);
    }
    return el;
}

function getUserById(userId) {
    const user = nonFollowersList.find((user) => {
        return user.id.toString() === userId.toString();
    });
    if (user === undefined) {
        console.error(`Unable to find user by id. userId: ${userId}`);
    }
    return user;
}

function onToggleUser() {
    getElementByClass('.iu_selected-count').innerHTML = `[${userIdsToUnfollow.length}]`;
}

// Some functions needed to be placed on the window.
// This is due to the way the are used in the inlined template here.
// Placing them on the window was the only way to make them work for some reason.
window.toggleUser = (userId) => {
    if (userIdsToUnfollow.indexOf(userId) === -1) {
        userIdsToUnfollow = [...userIdsToUnfollow, userId];
    } else {
        userIdsToUnfollow = userIdsToUnfollow.filter((id) => id !== userId);
    }
    onToggleUser();
};

window.toggleAllUsers = (status = false) => {
    document.querySelectorAll('input.account-checkbox').forEach((e) => (e.checked = status));
    if (!status) {
        userIdsToUnfollow = [];
    } else {
        userIdsToUnfollow = [...nonFollowersList];
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
    sortedList.forEach((user) => {
        const firstChar = user.username.substring(0, 1).toUpperCase();
        if (currentChar !== firstChar) {
            currentChar = firstChar;
            elResultsContainer.innerHTML += `<div style='margin:1rem;padding:1rem;font-size:2em;border-bottom: 1px solid #333;'>${currentChar}</div>`;
        }
        elResultsContainer.innerHTML += `<label style='display:flex;align-items:center;padding:1rem;border-radius:3px;cursor:pointer;'>
            <div style='display:flex;align-items:center;flex:1;'>
                <img src=${user.profile_pic_url} width='75px' style='border-radius:50%;' />&nbsp;&nbsp;&nbsp;&nbsp;
                <span style='font-size:1.75em;'>${user.username}</span>
                ${
                    user.is_verified
                        ? `&nbsp;&nbsp;<div style='background-color:#49adf4;border-radius:50%;padding:0.2rem 0.3rem;font-size:0.35em;height:fit-content;'>✔</div>`
                        : ''
                }
            </div>
            <input class='account-checkbox' type='checkbox' style='height:1.1rem;width:1.1rem;' onchange='toggleUser(${
                user.id
            })' />
        </label>`;
    });
    getElementByClass('.iu_main-btn').remove();
}

async function run(shouldIncludeVerifiedAccounts) {
    nonFollowersList = await getNonFollowersList(shouldIncludeVerifiedAccounts);
    renderResults(nonFollowersList);
}

function renderOverlay() {
    let shouldIncludeVerifiedAccounts = true;
    document.documentElement.style.backgroundColor = '#222';
    const el = document.createElement('div');
    el.setAttribute('class', 'iu_overlay');
    el.setAttribute('style', ['background-color:#222', 'color:#fff', 'height:100%', 'font-family:system-ui'].join(';'));
    el.innerHTML = `<header style='position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:1rem;height:2.5rem;background-color:#333;z-index:1;'>
        <div style='font-family:monospace;font-size:1.5em;cursor:pointer;' onclick='location.reload()'>InstagramUnfollowers</div>
        <label style='display:flex;cursor:pointer;'><input type='checkbox' class='iu_include-verified-checkbox' />&nbsp;Include verified</label>
        <div>Non-followers: <span class='iu_nonfollower-count' /></div>
        <div style='font-size:1.2em;text-decoration:underline;color:red;cursor:pointer;' onclick='unfollow()'>Unfollow Selected <span class='iu_selected-count'>[0]</span></div>
        <input type='checkbox' class='iu_toggle-all-checkbox' style='height:1.1rem;width:1.1rem;' onclick='toggleAllUsers(this.checked)' disabled />
    </header>
    <button class='iu_main-btn' style='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:2em;cursor:pointer;height:160px;width:160px;border-radius:50%;background:transparent;color:currentColor;border:1px solid currentColor;'>RUN</button>
    <div class='iu_results-container' style='transform:translateY(75px)'></div>`;
    document.body.replaceWith(el);

    // Assigned here separately instead of inline due to variables and functions not being recognized when used as bookmarklet.
    getElementByClass('.iu_main-btn').addEventListener('click', () => run(shouldIncludeVerifiedAccounts));
    const elShouldIncludeVerified = getElementByClass('.iu_include-verified-checkbox');
    elShouldIncludeVerified.checked = shouldIncludeVerifiedAccounts;
    elShouldIncludeVerified.addEventListener(
        'change',
        () => (shouldIncludeVerifiedAccounts = !shouldIncludeVerifiedAccounts)
    );
}

async function getNonFollowersList(shouldIncludeVerifiedAccounts = true) {
    let list = [];
    let hasNext = true;
    let scrollCycle = 0;
    let currentFollowedUsersCount = 0;
    let totalFollowedUsersCount = -1;

    const ds_user_id = getCookie('ds_user_id');
    let url = `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;

    const elMainBtn = getElementByClass('.iu_main-btn');
    const elResultsContainer = getElementByClass('.iu_results-container');
    const elNonFollowerCount = getElementByClass('.iu_nonfollower-count');

    while (hasNext) {
        let receivedData;
        try {
            receivedData = await fetch(url).then((res) => res.json());
        } catch (e) {
            continue;
        }

        if (totalFollowedUsersCount === -1) {
            totalFollowedUsersCount = receivedData.data.user.edge_follow.count;
        }

        hasNext = receivedData.data.user.edge_follow.page_info.has_next_page;
        url = afterUrlGenerator(receivedData.data.user.edge_follow.page_info.end_cursor);
        currentFollowedUsersCount += receivedData.data.user.edge_follow.edges.length;

        receivedData.data.user.edge_follow.edges.forEach((x) => {
            if (!shouldIncludeVerifiedAccounts && x.node.is_verified) {
                return;
            }
            if (!x.node.follows_viewer) {
                list.push(x.node);
            }
        });

        elMainBtn.innerHTML = `${Math.round((currentFollowedUsersCount / totalFollowedUsersCount) * 100)}%`;
        elResultsContainer.innerHTML = '';
        elNonFollowerCount.innerHTML = list.length.toString();

        await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
        scrollCycle++;
        if (scrollCycle > 6) {
            scrollCycle = 0;
            elResultsContainer.innerHTML =
                '<span style="margin:1rem;">Sleeping 10 secs to prevent getting temp blocked...</span>';
            await sleep(10000);
        }
    }

    return list;
}

window.unfollow = async () => {
    if (!confirm('Are you sure?')) {
        return;
    }

    let csrftoken = getCookie('csrftoken');
    if (csrftoken === undefined) {
        throw new Error('csrftoken cookie is undefined');
    }

    getElementByClass('.iu_toggle-all-checkbox').disabled = true;
    const elResultsContainer = getElementByClass('.iu_results-container');
    elResultsContainer.innerHTML = '';

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
            elResultsContainer.innerHTML += `<div style='padding:1rem;'>Unfollowed ${user.username} [${counter + 1}/${
                userIdsToUnfollow.length
            }]</div>`;
        } catch (e) {
            console.error(e);
            elResultsContainer.innerHTML += `<div style='padding:1rem;color:red;'>Failed to unfollow ${
                user.username
            } [${counter + 1}/${userIdsToUnfollow.length}]</div>`;
        }
        window.scrollTo(0, elResultsContainer.scrollHeight);

        await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);
        counter += 1;
        if (counter % 5 === 0) {
            elResultsContainer.innerHTML +=
                '<hr /><div style="padding:1rem;font-size:1.25em;color:#d7d356;">Sleeping 5 minutes to prevent getting temp blocked...</div><hr />';
            await sleep(300000);
        }
    }

    elResultsContainer.innerHTML += `<hr /><div style='padding:1rem;font-size:1.25em;color:#56d756;'>All DONE!</div><hr />`;
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
