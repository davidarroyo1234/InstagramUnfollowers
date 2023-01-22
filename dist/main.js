'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __generator =
    (this && this.__generator) ||
    function (thisArg, body) {
        var _ = {
                label: 0,
                sent: function () {
                    if (t[0] & 1) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: [],
            },
            f,
            y,
            t,
            g;
        return (
            (g = { next: verb(0), throw: verb(1), return: verb(2) }),
            typeof Symbol === 'function' &&
                (g[Symbol.iterator] = function () {
                    return this;
                }),
            g
        );
        function verb(n) {
            return function (v) {
                return step([n, v]);
            };
        }
        function step(op) {
            if (f) throw new TypeError('Generator is already executing.');
            while ((g && ((g = 0), op[0] && (_ = 0)), _))
                try {
                    if (
                        ((f = 1),
                        y &&
                            (t =
                                op[0] & 2
                                    ? y['return']
                                    : op[0]
                                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                                    : y.next) &&
                            !(t = t.call(y, op[1])).done)
                    )
                        return t;
                    if (((y = 0), t)) op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (
                                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                                (op[0] === 6 || op[0] === 2)
                            ) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2]) _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                } catch (e) {
                    op = [6, e];
                    y = 0;
                } finally {
                    f = t = 0;
                }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
var __spreadArray =
    (this && this.__spreadArray) ||
    function (to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
var INSTAGRAM_HOSTNAME = 'www.instagram.com';
var UNFOLLOWERS_PER_PAGE = 3;
var nonFollowersList = [];
var userIdsToUnfollow = [];
var isActiveProcess = false;
var currentPage = 1;
// Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
// This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
window.addEventListener('beforeunload', function (e) {
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
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}
function getCookie(name) {
    var value = '; '.concat(document.cookie);
    var parts = value.split('; '.concat(name, '='));
    if (parts.length === 2) return parts.pop().split(';').shift();
}
function afterUrlGenerator(nextCode) {
    var ds_user_id = getCookie('ds_user_id');
    return 'https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"'
        .concat(ds_user_id, '","include_reel":"true","fetch_mutual":"false","first":"24","after":"')
        .concat(nextCode, '"}');
}
function unfollowUserUrlGenerator(idToUnfollow) {
    return 'https://www.instagram.com/web/friendships/'.concat(idToUnfollow, '/unfollow/');
}
function getElementByClass(className) {
    var el = document.querySelector(className);
    if (el === null) {
        throw new Error('Unable to find element by class: '.concat(className));
    }
    return el;
}
function getUserById(userId) {
    // @ts-ignore
    var user = nonFollowersList.find(function (user) {
        return user.id.toString() === userId.toString();
    });
    if (user === undefined) {
        console.error('Unable to find user by id: '.concat(userId));
    }
    return user;
}
function copyListToClipboard() {
    var sortedList = __spreadArray([], nonFollowersList, true).sort(function (a, b) {
        return a.username > b.username ? 1 : -1;
    });
    var output = '';
    sortedList.forEach(function (user) {
        output += user.username + '\n';
    });
    copyToClipboard(output);
}
function copyToClipboard(text) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    return [4 /*yield*/, navigator.clipboard.writeText(text)];
                case 1:
                    _a.sent();
                    alert('List copied to clipboard!');
                    return [2 /*return*/];
            }
        });
    });
}
function onToggleUser() {
    getElementByClass('.selected-user-count').innerHTML = '['.concat(userIdsToUnfollow.length, ']');
}
function toggleUser(userId) {
    if (userIdsToUnfollow.indexOf(userId) === -1) {
        userIdsToUnfollow = __spreadArray(__spreadArray([], userIdsToUnfollow, true), [userId], false);
    } else {
        userIdsToUnfollow = userIdsToUnfollow.filter(function (id) {
            return id !== userId;
        });
    }
    onToggleUser();
}
function toggleAllUsers(status) {
    if (status === void 0) {
        status = false;
    }
    // @ts-ignore
    document.querySelectorAll('.account-checkbox').forEach(function (e) {
        return (e.checked = status);
    });
    if (!status) {
        userIdsToUnfollow = [];
    } else {
        userIdsToUnfollow = nonFollowersList.map(function (user) {
            return parseInt(user.id, 10);
        });
    }
    onToggleUser();
}
function refreshPagination() {
    // @ts-ignore
    document.getElementById('current-page').innerHTML = currentPage;
    // @ts-ignore
    document.getElementById('last-page').innerHTML = getMaxPage();
}
function renderResults() {
    refreshPagination();
    // Shallow-copy to avoid altering original.
    getElementByClass('.toggle-all-checkbox').disabled = false;
    var elResultsContainer = getElementByClass('.results-container');
    elResultsContainer.innerHTML = '';
    var currentChar = '';
    getCurrentPageUnfollowers().forEach(function (user) {
        var isUserSelected = userIdsToUnfollow.indexOf(parseInt(user.id, 10)) !== -1;
        var firstChar = user.username.substring(0, 1).toUpperCase();
        if (currentChar !== firstChar) {
            currentChar = firstChar;
            elResultsContainer.innerHTML += "<div class='alphabet-character'>".concat(currentChar, '</div>');
        }
        elResultsContainer.innerHTML +=
            "<label class='result-item'>\n            <div class='flex grow align-center'>\n                <img class='avatar' alt=\"\" src="
                .concat(
                    user.profile_pic_url,
                    " />&nbsp;&nbsp;&nbsp;&nbsp;\n                <div class='flex column'>\n                    <a class='fs-xlarge' target='_blank' href='../",
                )
                .concat(user.username, "'>")
                .concat(user.username, "</a>\n                    <span class='fs-medium'>")
                .concat(user.full_name, '</span>\n                </div>\n                ')
                .concat(
                    user.is_verified ? "&nbsp;&nbsp;&nbsp;<div class='verified-badge'>\u2714</div>" : '',
                    '\n                ',
                )
                .concat(
                    user.is_private
                        ? "<div class='flex justify-center w-100'>\n                            <span class='private-indicator'>Private</span>\n                          </div>"
                        : '',
                    "\n            </div>\n            <input\n                class='account-checkbox'\n                type='checkbox'\n                onchange='toggleUser(",
                )
                .concat(user.id, ")'\n                ")
                .concat(isUserSelected ? 'checked' : '', ' />\n        </label>');
    });
}
function run(shouldIncludeVerifiedAccounts) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    getElementByClass('.run-scan').remove();
                    getElementByClass('.include-verified-checkbox').disabled = true;
                    return [4 /*yield*/, getNonFollowersList(shouldIncludeVerifiedAccounts)];
                case 1:
                    _a.sent();
                    getElementByClass('.copy-list').disabled = false;
                    return [2 /*return*/];
            }
        });
    });
}
function renderOverlay() {
    var shouldIncludeVerifiedAccounts = true;
    document.body.innerHTML =
        "\n        <main class='iu'>\n            <div class='overlay'>\n                <header class='top-bar'>\n                    <div class='logo' onclick='location.reload()'>InstagramUnfollowers</div>\n                    <label class='flex align-center'>\n                        <input type='checkbox' class='include-verified-checkbox' ".concat(
            shouldIncludeVerifiedAccounts ? 'checked' : '',
            " /> Include verified\n                    </label>\n                    <button class='copy-list' onclick='copyListToClipboard()' disabled>COPY LIST</button>\n                    <button class='fs-large clr-red' onclick='unfollow()'>UNFOLLOW <span class='selected-user-count'>[0]</span></button>\n                    <input type='checkbox' class='toggle-all-checkbox' onclick='toggleAllUsers(this.checked)' disabled />\n                </header>\n\n                <button class='run-scan'>RUN</button>\n                <div class='results-container'></div>\n\n                <footer class='bottom-bar'>\n                    <div>Non-followers: <span class='nonfollower-count' /></div>\n                    <div>\n                        <a onclick='previousPage()' class='p-medium'>\u276E</a>\n                        <span id='current-page'>1</span>&nbsp;/&nbsp;<span id='last-page'>1</span>\n                        <a onclick='nextPage()' class='p-medium'>\u276F</a>\n                    </div>\n                    <div class='progressbar-container'>\n                        <div class='progressbar-bar'></div>\n                        <span class='progressbar-text'>0%</span>\n                    </div>\n                </footer>\n            </div>\n            <div class='toast toast-hidden'></div>\n        </main>",
        );
    getElementByClass('.run-scan').addEventListener('click', function () {
        return run(shouldIncludeVerifiedAccounts);
    });
    getElementByClass('.include-verified-checkbox').addEventListener('change', function () {
        return (shouldIncludeVerifiedAccounts = !shouldIncludeVerifiedAccounts);
    });
}
function getNonFollowersList(shouldIncludeVerifiedAccounts) {
    if (shouldIncludeVerifiedAccounts === void 0) {
        shouldIncludeVerifiedAccounts = true;
    }
    return __awaiter(this, void 0, void 0, function () {
        var list,
            hasNext,
            scrollCycle,
            currentFollowedUsersCount,
            totalFollowedUsersCount,
            ds_user_id,
            url,
            elProgressbarBar,
            elProgressbarText,
            elNonFollowerCount,
            elToast,
            receivedData,
            e_1,
            percentage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isActiveProcess) {
                        return [2 /*return*/];
                    }
                    list = [];
                    hasNext = true;
                    scrollCycle = 0;
                    currentFollowedUsersCount = 0;
                    totalFollowedUsersCount = -1;
                    isActiveProcess = true;
                    ds_user_id = getCookie('ds_user_id');
                    url =
                        'https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"'.concat(
                            ds_user_id,
                            '","include_reel":"true","fetch_mutual":"false","first":"24"}',
                        );
                    elProgressbarBar = getElementByClass('.progressbar-bar');
                    elProgressbarText = getElementByClass('.progressbar-text');
                    elNonFollowerCount = getElementByClass('.nonfollower-count');
                    elToast = getElementByClass('.toast');
                    _a.label = 1;
                case 1:
                    if (!hasNext) return [3 /*break*/, 9];
                    receivedData = void 0;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [
                        4 /*yield*/,
                        fetch(url).then(function (res) {
                            return res.json();
                        }),
                    ];
                case 3:
                    receivedData = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.error(e_1);
                    return [3 /*break*/, 1];
                case 5:
                    if (totalFollowedUsersCount === -1) {
                        totalFollowedUsersCount = receivedData.data.user.edge_follow.count;
                    }
                    hasNext = receivedData.data.user.edge_follow.page_info.has_next_page;
                    url = afterUrlGenerator(receivedData.data.user.edge_follow.page_info.end_cursor);
                    currentFollowedUsersCount += receivedData.data.user.edge_follow.edges.length;
                    receivedData.data.user.edge_follow.edges.forEach(function (x) {
                        if (!shouldIncludeVerifiedAccounts && x.node.is_verified) {
                            return;
                        }
                        if (!x.node.follows_viewer) {
                            list.push(x.node);
                        }
                    });
                    percentage = ''.concat(Math.ceil((currentFollowedUsersCount / totalFollowedUsersCount) * 100), '%');
                    elProgressbarText.innerHTML = percentage;
                    elProgressbarBar.style.width = percentage;
                    elNonFollowerCount.innerHTML = list.length.toString();
                    nonFollowersList = list;
                    renderResults();
                    return [4 /*yield*/, sleep(Math.floor(Math.random() * (1000 - 600)) + 1000)];
                case 6:
                    _a.sent();
                    scrollCycle++;
                    if (!(scrollCycle > 6)) return [3 /*break*/, 8];
                    scrollCycle = 0;
                    elToast.classList.remove('toast-hidden');
                    elToast.innerHTML = 'Sleeping 10 secs to prevent getting temp blocked...';
                    return [4 /*yield*/, sleep(10000)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    elToast.classList.add('toast-hidden');
                    return [3 /*break*/, 1];
                case 9:
                    elProgressbarBar.style.backgroundColor = '#59A942';
                    elProgressbarText.innerHTML = 'DONE';
                    isActiveProcess = false;
                    return [2 /*return*/, list];
            }
        });
    });
}
function unfollow() {
    return __awaiter(this, void 0, void 0, function () {
        var csrftoken,
            elToast,
            elProgressbarBar,
            elProgressbarText,
            elResultsContainer,
            scrollToBottom,
            counter,
            _i,
            userIdsToUnfollow_1,
            id,
            user,
            e_2,
            percentage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isActiveProcess) {
                        return [2 /*return*/];
                    }
                    if (userIdsToUnfollow.length === 0) {
                        alert('Must select at least a single user to unfollow');
                        return [2 /*return*/];
                    }
                    if (!confirm('Are you sure?')) {
                        return [2 /*return*/];
                    }
                    csrftoken = getCookie('csrftoken');
                    if (csrftoken === undefined) {
                        throw new Error('csrftoken cookie is undefined');
                    }
                    elToast = getElementByClass('.toast');
                    elProgressbarBar = getElementByClass('.progressbar-bar');
                    elProgressbarText = getElementByClass('.progressbar-text');
                    getElementByClass('.toggle-all-checkbox').disabled = true;
                    elResultsContainer = getElementByClass('.results-container');
                    elResultsContainer.innerHTML = '';
                    scrollToBottom = function () {
                        return window.scrollTo(0, elResultsContainer.scrollHeight);
                    };
                    elProgressbarText.innerHTML = '0%';
                    elProgressbarBar.style.width = '0%';
                    isActiveProcess = true;
                    counter = 0;
                    (_i = 0), (userIdsToUnfollow_1 = userIdsToUnfollow);
                    _a.label = 1;
                case 1:
                    if (!(_i < userIdsToUnfollow_1.length)) return [3 /*break*/, 10];
                    id = userIdsToUnfollow_1[_i];
                    user = getUserById(id);
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [
                        4 /*yield*/,
                        fetch(unfollowUserUrlGenerator(id), {
                            headers: {
                                'content-type': 'application/x-www-form-urlencoded',
                                'x-csrftoken': csrftoken,
                            },
                            method: 'POST',
                            mode: 'cors',
                            credentials: 'include',
                        }),
                    ];
                case 3:
                    _a.sent();
                    elResultsContainer.innerHTML +=
                        "<div class='p-medium'>Unfollowed\n                <a class='clr-inherit' target='_blank' href='../"
                            .concat(user.username, "'> ")
                            .concat(user.username, "</a>\n                <span class='clr-cyan'> [")
                            .concat(counter + 1, '/')
                            .concat(userIdsToUnfollow.length, ']</span>\n            </div>');
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _a.sent();
                    console.error(e_2);
                    elResultsContainer.innerHTML += "<div class='p-medium clr-red'>Failed to unfollow "
                        .concat(user.username, ' [')
                        .concat(counter + 1, '/')
                        .concat(userIdsToUnfollow.length, ']</div>');
                    return [3 /*break*/, 5];
                case 5:
                    counter += 1;
                    percentage = ''.concat(Math.ceil((counter / userIdsToUnfollow.length) * 100), '%');
                    elProgressbarText.innerHTML = percentage;
                    elProgressbarBar.style.width = percentage;
                    scrollToBottom();
                    // If unfollowing the last user in the list, no reason to wait.
                    if (id === userIdsToUnfollow[userIdsToUnfollow.length - 1]) {
                        return [3 /*break*/, 10];
                    }
                    return [4 /*yield*/, sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000)];
                case 6:
                    _a.sent();
                    if (!(counter % 5 === 0)) return [3 /*break*/, 8];
                    elToast.classList.remove('toast-hidden');
                    elToast.innerHTML = 'Sleeping 5 minutes to prevent getting temp blocked...';
                    scrollToBottom();
                    return [4 /*yield*/, sleep(300000)];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    elToast.classList.add('toast-hidden');
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 1];
                case 10:
                    elProgressbarBar.style.backgroundColor = '#59A942';
                    elProgressbarText.innerHTML = 'DONE';
                    isActiveProcess = false;
                    elResultsContainer.innerHTML +=
                        "<hr /><div class='fs-large p-medium clr-green'>All DONE!</div><hr />";
                    scrollToBottom();
                    return [2 /*return*/];
            }
        });
    });
}
function init() {
    if (location.hostname !== INSTAGRAM_HOSTNAME) {
        alert('Can be used only on Instagram routes');
        return;
    }
    document.title = 'InstagramUnfollowers';
    renderOverlay();
}
function getMaxPage() {
    var pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
    return pageCalc < 1 ? 1 : pageCalc;
}
function nextPage() {
    if (currentPage < getMaxPage()) {
        currentPage++;
        renderResults();
    }
}
function getCurrentPageUnfollowers() {
    var sortedList = __spreadArray([], nonFollowersList, true).sort(function (a, b) {
        return a.username > b.username ? 1 : -1;
    });
    return sortedList.splice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE);
}
function previousPage() {
    if (currentPage - 1 > 0) {
        currentPage--;
        renderResults();
    }
}
init();
//# sourceMappingURL=main.js.map
