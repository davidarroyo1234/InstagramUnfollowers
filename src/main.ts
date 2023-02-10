"use strict";

import { Node, User } from "./model/user";
import "./styles.scss";

const INSTAGRAM_HOSTNAME: string = "www.instagram.com";
const UNFOLLOWERS_PER_PAGE: number = 50;
let nonFollowersList: Node[] = [];
let FollowersList: string[] = [];
let userIdsToUnfollow: number[] = [];
let isActiveProcess: boolean = false;
let currentPage: number = 1;
let downloadOptionSelected = false;
let prepareWithNewLine = false;

// Prompt user if he tries to leave while in the middle of a process (searching / unfollowing / etc..)
// This is especially good for avoiding accidental tab closing which would result in a frustrating experience.
window.addEventListener("beforeunload", e => {
  if (!isActiveProcess) {
    return;
  }
  e = e || window.event;

  // For IE and Firefox prior to version 4
  if (e) {
    e.returnValue = "Changes you made may not be saved.";
  }

  // For Safari
  return "Changes you made may not be saved.";
});

function sleep(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

const ds_user_id = getCookie("ds_user_id");
function afterUrlGenerator(nextCode: string, downloadAllFollowersList: boolean = false): string {
  //const ds_user_id = getCookie("ds_user_id");
  if(!downloadAllFollowersList) {
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
  }
  else {
    return `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
  }
  
}

function unfollowUserUrlGenerator(idToUnfollow: number): string {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

function getElementByClass(className: string): HTMLElement {
  const el = document.querySelector(className) as HTMLElement;
  if (el === null) {
    throw new Error(`Unable to find element by class: ${className}`);
  }
  return el;
}

function getUserById(userId: number): Node {

  const user = nonFollowersList.find(user => {
    return user.id.toString() === userId.toString();
  });
  if (user === undefined) {
    console.error(`Unable to find user by id: ${userId}`);
  }
  return user;
}

//TODO MOVE TO EVENT LISTENER
// @ts-ignore
global.copyListToClipboard = async function copyListToClipboard(): Promise<void> {
  let output = "";
  if (!downloadOptionSelected) {
    const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));

    sortedList.forEach(user => {
      output += user.username + "\n";
    });
  }
  else {
    if (prepareWithNewLine) {
      FollowersList.forEach(str => {
        output += str + "\n";
      });
    }
    else {
      output = JSON.stringify(FollowersList);
    }
    
  }

  

  await copyToClipboard(output);
};

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  alert("List copied to clipboard!");
}

function onToggleUser(): void {
  getElementByClass(".selected-user-count").innerHTML = `[${userIdsToUnfollow.length}]`;
}

//TODO MOVE TO EVENT LISTENER
// @ts-ignore
global.toggleUser = function toggleUser(userId: number): void {
  if (userIdsToUnfollow.indexOf(userId) === -1) {
    userIdsToUnfollow = [...userIdsToUnfollow, userId];
  } else {
    userIdsToUnfollow = userIdsToUnfollow.filter(id => id !== userId);
  }
  onToggleUser();
};
//TODO MOVE TO EVENT LISTENER
// @ts-ignore
global.toggleAllUsers = function toggleAllUsers(status: boolean): void {
  (document.querySelectorAll(".account-checkbox") as NodeListOf<HTMLInputElement>).forEach(e => (e.checked = status));
  if (!status) {
    userIdsToUnfollow = [];
  } else {
    userIdsToUnfollow = nonFollowersList.map(user => parseInt(user.id, 10));
  }
  onToggleUser();
};

function refreshPagination(): void {
  document.getElementById("current-page").innerHTML = String(currentPage);
  document.getElementById("last-page").innerHTML = String(getMaxPage());
}

function renderResults(): void {
  refreshPagination();
  // Shallow-copy to avoid altering original.
  (getElementByClass(".toggle-all-checkbox") as HTMLInputElement).disabled = false;
  const elResultsContainer = getElementByClass(".results-container");
  elResultsContainer.innerHTML = "";
  let currentChar = "";

  getCurrentPageUnfollowers().forEach(user => {
    const isUserSelected = userIdsToUnfollow.indexOf(parseInt(user.id, 10)) !== -1;
    const firstChar = user.username.substring(0, 1).toUpperCase();
    if (currentChar !== firstChar) {
      currentChar = firstChar;
      elResultsContainer.innerHTML += `<div class="alphabet-character">${currentChar}</div>`;
    }
    elResultsContainer.innerHTML += `<label class="result-item">
            <div class="flex grow align-center">
                <img class="avatar" alt="" src="${user.profile_pic_url}" />&nbsp;&nbsp;&nbsp;&nbsp;
                <div class="flex column">
                    <a class="fs-xlarge" target="_blank" href="../${user.username}">${user.username}</a>
                    <span class="fs-medium">${user.full_name}</span>
                </div>
                ${user.is_verified ? `&nbsp;&nbsp;&nbsp;<div class="verified-badge">✔</div>` : ""}
                ${
      user.is_private
        ? `<div class="flex justify-center w-100">
                            <span class="private-indicator">Private</span>
                          </div>`
        : ""
    }
            </div>
            <input
                class="account-checkbox"
                type="checkbox"
                onchange="toggleUser(${user.id})"
                ${isUserSelected ? "checked" : ""} />
        </label>`;
  });
}

async function run(shouldIncludeVerifiedAccounts: boolean, downloadAllFollowersList: boolean = false): Promise<void> {
  if (!downloadAllFollowersList) {
    document.getElementById("run-scan").remove(); document.getElementById("run-download-followers").remove();
  }

  document.getElementById("prepare-as-array-txt").remove(); document.getElementById("prepare-with-new-line").remove();
  (getElementByClass(".include-verified-checkbox") as HTMLButtonElement).disabled = true;
  downloadOptionSelected = downloadAllFollowersList;
  await getNonFollowersList(shouldIncludeVerifiedAccounts, downloadAllFollowersList);
  (getElementByClass(".copy-list") as HTMLButtonElement).disabled = false;
}

function renderOverlay(): void {
  let shouldIncludeVerifiedAccounts = true;
  document.body.innerHTML = `
        <main class="iu">
            <div class="overlay">
                <header class="top-bar">
                    <div class="logo" onclick="location.reload()">InstagramUnfollowers</div>
                    <label class="flex align-center">
                        <input type="checkbox" class="include-verified-checkbox" ${
    shouldIncludeVerifiedAccounts ? "checked" : ""
  } /> Include verified
                    </label>
                    <button class="copy-list" onclick="copyListToClipboard()" disabled>COPY LIST</button>
                    <button class="fs-large clr-red unfollow-button" onclick="unfollow()">UNFOLLOW <span class="selected-user-count">[0]</span></button>
                    <input type="checkbox" class="toggle-all-checkbox" onclick="toggleAllUsers(this.checked)" disabled />
                </header>

                <button class="left-big-button" id="run-scan">SHOW UNFOLLOWERS</button>
                <button class="right-big-button" id="run-download-followers">DOWNLOAD ALL FOLLOWERS LIST</button>
                <button class="left-big-button d-none" id="prepare-as-array-txt">AS ARRAY</button>
                <button class="right-big-button d-none" id="prepare-with-new-line">EVERY USER NEW LINE</button>
                <p id="please-wait-for-download">Fetching followers...</p>
                <div class="results-container"></div>

                <footer class="bottom-bar">
                    <div><span id="nonfollower-info-title">Non-followers:</span> <span class="nonfollower-count" /></div>
                    <div>
                        <a onclick="previousPage()" class="p-medium">❮</a>
                        <span id="current-page">1</span>&nbsp;/&nbsp;<span id="last-page">1</span>
                        <a onclick="nextPage()" class="p-medium">❯</a>
                    </div>
                    <div class="progressbar-container">
                        <div class="progressbar-bar"></div>
                        <span class="progressbar-text">0%</span>
                    </div>
                </footer>
            </div>
            <div class="toast toast-hidden"></div>
        </main>`;
  document.getElementById("run-scan").addEventListener("click", () => run(shouldIncludeVerifiedAccounts));
  document.getElementById("run-download-followers").addEventListener("click", () => {document.getElementById("nonfollower-info-title").innerText = "Followers:"; document.getElementById("run-scan").remove(); document.getElementById("run-download-followers").remove(); document.getElementById("prepare-as-array-txt").classList.remove("d-none"); document.getElementById("prepare-with-new-line").classList.remove("d-none");});
  document.getElementById("prepare-as-array-txt").addEventListener("click", () => run(shouldIncludeVerifiedAccounts, true));
  document.getElementById("prepare-with-new-line").addEventListener("click", () => {prepareWithNewLine = true; run(shouldIncludeVerifiedAccounts, true);});
  getElementByClass(".include-verified-checkbox").addEventListener(
    "change",
    () => (shouldIncludeVerifiedAccounts = !shouldIncludeVerifiedAccounts)
  );
}


async function getNonFollowersList(shouldIncludeVerifiedAccounts = true, downloadAllFollowersList: boolean = false): Promise<void> {
  if (isActiveProcess) {
    return;
  }

  let list: Node[] = [];
  let downloadusernameslist: string[] = [];
  let hasNext = true;
  let scrollCycle = 0;
  let currentFollowedUsersCount = 0;
  let totalFollowedUsersCount = -1;
  isActiveProcess = true;

  let url = null;
  if (!downloadAllFollowersList) {
    url = `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
  }
  else {
    document.getElementById("please-wait-for-download").style.opacity = "1"; 
    url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;
  }

  const elProgressbarBar = getElementByClass(".progressbar-bar");
  const elProgressbarText = getElementByClass(".progressbar-text");
  const elNonFollowerCount = getElementByClass(".nonfollower-count");
  const elToast = getElementByClass(".toast");


  while (hasNext) {
    let receivedData: User;
    try {
      receivedData = (await fetch(url).then(res => res.json())).data.user[downloadAllFollowersList ? "edge_followed_by" : "edge_follow"];
    } catch (e) {
      console.log("Unfortunately an error occurred:");
      console.error(e);
      continue;
    }

    if (totalFollowedUsersCount === -1) {
      totalFollowedUsersCount = receivedData.count;
    }

    hasNext = receivedData.page_info.has_next_page;
    url = afterUrlGenerator(receivedData.page_info.end_cursor, downloadAllFollowersList);
    currentFollowedUsersCount += receivedData.edges.length;


    receivedData.edges.forEach(x => {
      if (!downloadAllFollowersList) {
        if (!shouldIncludeVerifiedAccounts && x.node.is_verified) {
          return;
        }
        if (!x.node.follows_viewer) {
          list.push(x.node);
        }

      }
      else {
        downloadusernameslist.push(x.node.username);
      }

    });

    

    const percentage = `${Math.ceil((currentFollowedUsersCount / totalFollowedUsersCount) * 100)}%`;
    elProgressbarText.innerHTML = percentage;
    elProgressbarBar.style.width = percentage;
    elNonFollowerCount.innerHTML = downloadAllFollowersList ? downloadusernameslist.length.toString() : list.length.toString();
    
    if (!downloadAllFollowersList) {
      nonFollowersList = list;
      renderResults();
    }
    

    await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
    scrollCycle++;
    if (scrollCycle > 6) {
      scrollCycle = 0;
      elToast.classList.remove("toast-hidden");
      elToast.innerHTML = "Sleeping 10 secs to prevent getting temp blocked...";
      await sleep(10000);
    }
    elToast.classList.add("toast-hidden");
  }
  elProgressbarBar.style.backgroundColor = "#59A942";
  elProgressbarText.innerHTML = "DONE";

  if (downloadAllFollowersList) {
    FollowersList = downloadusernameslist;
    document.getElementById("please-wait-for-download").innerText = "Please wait for download to start.";

    if (prepareWithNewLine) {
      let downloadthis = "";
      downloadusernameslist.forEach(str => {
        downloadthis += str + "\n";
      });
      downloadTextFile(downloadthis, 'followers.txt');
    }
    else {
      downloadTextFile(JSON.stringify(downloadusernameslist), 'followers.txt');
    }


  }
  

  isActiveProcess = false;
}

//TODO MOVE TO EVENT LISTENER
// @ts-ignore
global.unfollow = async function(): Promise<void> {
  if (isActiveProcess) {
    return;
  }
  if (userIdsToUnfollow.length === 0) {
    alert("Must select at least a single user to unfollow");
    return;
  }
  if (!confirm("Are you sure?")) {
    return;
  }

  let csrftoken = getCookie("csrftoken");
  if (csrftoken === undefined) {
    throw new Error("csrftoken cookie is undefined");
  }
  const elToast = getElementByClass(".toast");
  const elProgressbarBar = getElementByClass(".progressbar-bar");
  const elProgressbarText = getElementByClass(".progressbar-text");
  (getElementByClass(".toggle-all-checkbox") as HTMLInputElement).disabled = true;
  const elResultsContainer = getElementByClass(".results-container");
  elResultsContainer.innerHTML = "";

  const scrollToBottom = () => window.scrollTo(0, elResultsContainer.scrollHeight);

  elProgressbarText.innerHTML = "0%";
  elProgressbarBar.style.width = "0%";
  isActiveProcess = true;
  let counter = 0;
  for (const id of userIdsToUnfollow) {
    const user = getUserById(id);
    try {
      await fetch(unfollowUserUrlGenerator(id), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-csrftoken": csrftoken
        },
        method: "POST",
        mode: "cors",
        credentials: "include"
      });
      elResultsContainer.innerHTML += `<div class="p-medium">Unfollowed
                <a class="clr-inherit" target="_blank" href="../${user.username}"> ${user.username}</a>
                <span class="clr-cyan"> [${counter + 1}/${userIdsToUnfollow.length}]</span>
            </div>`;
    } catch (e) {
      console.error(e);
      elResultsContainer.innerHTML += `<div class="p-medium clr-red">Failed to unfollow ${user.username} [${
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
      elToast.classList.remove("toast-hidden");
      elToast.innerHTML = "Sleeping 5 minutes to prevent getting temp blocked...";
      scrollToBottom();
      await sleep(300000);
    }
    elToast.classList.add("toast-hidden");
  }
  elProgressbarBar.style.backgroundColor = "#59A942";
  elProgressbarText.innerHTML = "DONE";

  isActiveProcess = false;
  elResultsContainer.innerHTML += `<hr /><div class="fs-large p-medium clr-green">All DONE!</div><hr />`;
  scrollToBottom();
};

function init(): void {
  if (location.hostname !== INSTAGRAM_HOSTNAME) {
    alert("Can be used only on Instagram routes");
    return;
  }
  document.title = "InstagramUnfollowers";
  renderOverlay();
}

function getMaxPage(): number {
  const pageCalc = Math.ceil(nonFollowersList.length / UNFOLLOWERS_PER_PAGE);
  return pageCalc < 1 ? 1 : pageCalc;
}
// @ts-ignore
global.nextPage = function nextPage(): void {
  if (currentPage < getMaxPage()) {
    currentPage++;
    renderResults();
  }
}

function getCurrentPageUnfollowers(): Node[] {
  const sortedList = [...nonFollowersList].sort((a, b) => (a.username > b.username ? 1 : -1));
  return sortedList.splice(UNFOLLOWERS_PER_PAGE * (currentPage - 1), UNFOLLOWERS_PER_PAGE);
}

// @ts-ignore
global.previousPage = function previousPage(): void {
  if (currentPage - 1 > 0) {
    currentPage--;
    renderResults();
  }
}

//Download a text file
function downloadTextFile(text: string, name: string) {
  let a = document.createElement('a');
  let type = name.split(".").pop();
  a.href = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
  a.download = name;
  a.click();
}



init();
