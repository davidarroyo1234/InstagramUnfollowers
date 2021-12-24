function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function afterUrlGenerator(nextCode) {
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

function unfollowUserUrlGenerator(idToUnfollow) {
    return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

let csrftoken = getCookie("csrftoken");
let ds_user_id = getCookie("ds_user_id");
let initialURL = `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`;

let doNext = true;
let followedPeople;
let filteredList = [];
let getUnfollowCounter = 0;
let scrollCicle = 0;

startScript()
async function startScript(){
    while (doNext) {
        let receivedData
        try {
            receivedData = await fetch(initialURL).then(res => res.json());
        } catch (e) {
            continue;
        }

        if (!followedPeople) {
            followedPeople = receivedData.data.user.edge_follow.count;
        }

        doNext = receivedData.data.user.edge_follow.page_info.has_next_page;
        initialURL = afterUrlGenerator(receivedData.data.user.edge_follow.page_info.end_cursor);
        getUnfollowCounter += receivedData.data.user.edge_follow.edges.length;
        console.log(`%c Progress ${getUnfollowCounter}/${followedPeople}`, 'background: #222; color: #bada55;font-size: 35px;');

        receivedData.data.user.edge_follow.edges.forEach(x => {
            if (!x.node.follows_viewer) {
                filteredList.push(x.node);
                console.log(x.node.username);
            }
        })

        await sleep(Math.floor(Math.random() * (1000 - 600)) + 1000);
        scrollCicle++;
        if (scrollCicle > 6){
            scrollCicle = 0;
            console.log(`%c Sleeping 10 segs to prevent getting temp blocked`, 'background: #222; color: ##FF0000;font-size: 35px;');

            await sleep(10000);
        }
    }

    console.clear();

    console.log(`%c ${filteredList.length} users don't follow you`, 'background: #222; color: #bada55;font-size: 25px;');

    filteredList.forEach(x => {
        console.log(x.username);
    });

    wantUnfollow = confirm("Do you want to unfollow this people we listed?");

    if (wantUnfollow) {
        let counter = 0;
        unfollowSleepCounter = 0;
        for (const x of filteredList) {

            try {
                await fetch(unfollowUserUrlGenerator(x.id), {
                    "headers": {
                        "content-type": "application/x-www-form-urlencoded",
                        "x-csrftoken": csrftoken,
                    },
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "include"
                });
            } catch (e) {
            }

            await sleep(Math.floor(Math.random() * (6000 - 4000)) + 4000);
            counter++;
            unfollowSleepCounter++;
            if (unfollowSleepCounter >= 5) {
                console.log(`%c Sleeping 5 minutes to prevent getting temp blocked`, 'background: #222; color: ##FF0000;font-size: 35px;');
                unfollowSleepCounter = 0;
                await sleep(300000)
            }
            console.log(`Unfollowed ${counter}/${filteredList.length}`)
        }
        console.log(`%c All DONE!`, 'background: #222; color: #bada55;font-size: 25px;');
    } else {
        console.log(`%c All DONE!`, 'background: #222; color: #bada55;font-size: 25px;');
    }
}