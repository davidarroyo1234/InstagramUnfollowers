//Followed count number
document.getElementsByClassName("-nal3 ")[2].click();
let followed = parseInt(document.getElementsByClassName("g47SY")[2].innerHTML);
let followedList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
let followedListClone;
let followers;
let followersList;
let followersListClone;
let scroll = setInterval(updateScroll, 200);
let stopCheck = setInterval(function () {
    stopTask(1)
}, 200);

function stopTask(number) {
    if (number === 1) {
        if (followed <= followedList.length) {
            clearInterval(scroll);
            followedList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
            followedListClone = [...followedList];
            sleep(200)
            followersF();
        }
    } else if (number === 2) {

        if (followers <= parseInt(followersList.length)) {
            followersList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
            followersListClone = [...followersList];
            clearInterval(scroll);
            document.getElementsByClassName("wpO6b ")[1].click();
            users();
            clearInterval(stopCheck);
        }
    }

}


function followersF() {
    clearInterval(stopCheck);
    document.getElementsByClassName("-nal3 ")[1].click();
    followers = parseInt(document.getElementsByClassName("g47SY")[1].innerHTML);
    followersList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
    scroll = setInterval(updateScroll, 200);
    stopCheck = setInterval(function () {
        stopTask(2)
    }, 200);
}


//Prints the users who does not follow you back in the console.
function users() {
    let usernames = followersListClone.map(function (x) {
        return x.title
    });

    for (let i = 0; i < followedListClone.length; i++) {
        if (!usernames.includes(followedListClone[i].title)) {
            console.log(followedListClone[i].title);

        }
    }
}

//Refreshes the scroll limit
function updateScroll() {
    let element = document.getElementsByClassName("isgrP")[0];
    element.scrollTop = element.scrollHeight;
    numeroACC = element.scrollTop;
}

function sleep(milliseconds) {
    let start = new Date().getTime();
    for (let i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}