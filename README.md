
# Instagram unfollower checker.

## **WARNING**: The last update is calling to instagram api to be faster.
if you prefer to use the old way go to this [commit](https://github.com/davidarroyo1234/InstagramUnfollowers/tree/50a0bcbc9fe349b8664a74c0e4477bc974d0352b).

[![Maintenance](https://img.shields.io/maintenance/yes/2021)](https://github.com/davidarroyo1234/InstagramUnfollowers)
### Steps:
1. Copy the code:   
 ```js
function getCookie(a){const b=`; ${document.cookie}`,c=b.split(`; ${a}=`);if(2===c.length)return c.pop().split(";").shift()}function sleep(a){return new Promise(b=>{setTimeout(b,a)})}function afterUrlGenerator(a){return`https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24","after":"${a}"}`}function unfollowUserUrlGenerator(a){return`https://www.instagram.com/web/friendships/${a}/unfollow/`}let followedPeople,csrftoken=getCookie("csrftoken"),ds_user_id=getCookie("ds_user_id"),initialURL=`https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${ds_user_id}","include_reel":"true","fetch_mutual":"false","first":"24"}`,doNext=!0,filteredList=[],getUnfollowCounter=0,scrollCicle=0;startScript();async function startScript(){var a=Math.floor;for(;doNext;){let b;try{b=await fetch(initialURL).then(a=>a.json())}catch(a){continue}followedPeople||(followedPeople=b.data.user.edge_follow.count),doNext=b.data.user.edge_follow.page_info.has_next_page,initialURL=afterUrlGenerator(b.data.user.edge_follow.page_info.end_cursor),getUnfollowCounter+=b.data.user.edge_follow.edges.length,console.log(`%c Progress ${getUnfollowCounter}/${followedPeople}`,"background: #222; color: #bada55;font-size: 35px;"),b.data.user.edge_follow.edges.forEach(a=>{a.node.follows_viewer||(filteredList.push(a.node),console.log(a.node.username))}),await sleep(a(400*Math.random())+1e3),scrollCicle++,6<scrollCicle&&(scrollCicle=0,console.log(`%c Sleeping 10 segs to prevent getting temp blocked`,"background: #222; color: ##FF0000;font-size: 35px;"),await sleep(1e4))}if(console.clear(),console.log(`%c ${filteredList.length} users don't follow you`,"background: #222; color: #bada55;font-size: 25px;"),filteredList.forEach(a=>{console.log(a.username)}),wantUnfollow=confirm("Do you want to unfollow this people we listed?"),wantUnfollow){let b=0;unfollowSleepCounter=0;for(const c of filteredList){try{await fetch(unfollowUserUrlGenerator(c.id),{headers:{"content-type":"application/x-www-form-urlencoded","x-csrftoken":csrftoken},method:"POST",mode:"cors",credentials:"include"})}catch(a){}await sleep(a(2000*Math.random())+4e3),b++,unfollowSleepCounter++,5<=unfollowSleepCounter&&(console.log(`%c Sleeping 5 minutes to prevent getting temp blocked`,"background: #222; color: ##FF0000;font-size: 35px;"),unfollowSleepCounter=0,await sleep(3e5)),console.log(`Unfollowed ${b}/${filteredList.length}`)}console.log(`%c All DONE!`,"background: #222; color: #bada55;font-size: 25px;")}else console.log(`%c All DONE!`,"background: #222; color: #bada55;font-size: 25px;")}
```
 2. Log in into your account and open the developer console or (Ctrl+Shift+J(Windows) || ⌘+⌥+I (Mac os)) and paste the code.  
 3. It will start checking your followers until reach the end, then It'll print it on the console.  
 ![Output after finishing](https://github.com/davidarroyo1234/InstagramUnfollowers/blob/master/Readme/Pixelatedresult.png?raw=true)  
   
 4. Once it finishes printing the users, it will ask you if you want to unfollow them with a Pop-Up.  
 ![Pop up confirmation](https://github.com/davidarroyo1234/InstagramUnfollowers/blob/master/Readme/InstaConfirmation.png?raw=true)  
   
***The more users you have to check, more time it will take***

**_This script has been tested only on Chrome_**

## Legal
Disclaimer: This is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Instagram.

Use it at your own risk!.