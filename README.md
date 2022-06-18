# Instagram Unfollowers

[![Maintenance](https://img.shields.io/maintenance/yes/2022)](https://github.com/davidarroyo1234/InstagramUnfollowers)

A nifty tool to see who which users do not follow you back on Instagram.  
<u>Browser-based and requires no downloads or installations!</u>

## **WARNING**
The last update utilizes the Instagram API for better performance.  
if you prefer to use the old version please use this [commit](https://github.com/davidarroyo1234/InstagramUnfollowers/tree/50a0bcbc9fe349b8664a74c0e4477bc974d0352b).

## Usage

### Steps:
 1. Drag the following link to your bookmark bar:

    <button>
    <a style="font-size:1.5em;color:currentColor;cursor:move;" href="javascript:(()=>{&#34;use strict&#34;;const INSTAGRAM_HOSTNAME=&#34;www.instagram.com&#34;;let nonFollowersList=[],userIdsToUnfollow=[];function sleep(n){return new Promise(e=>{setTimeout(e,n)})}function getCookie(e){const n=&#34;; &#34;+document.cookie,t=n.split(`; ${e}=`);if(2===t.length)return t.pop().split(&#34;;&#34;).shift()}function afterUrlGenerator(e){return`https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={&#34;id&#34;:&#34;${getCookie(&#34;ds_user_id&#34;)}&#34;,&#34;include_reel&#34;:&#34;true&#34;,&#34;fetch_mutual&#34;:&#34;false&#34;,&#34;first&#34;:&#34;24&#34;,&#34;after&#34;:&#34;${e}&#34;}`}function unfollowUserUrlGenerator(e){return`https://www.instagram.com/web/friendships/${e}/unfollow/`}function getElementByClass(e){var n=document.querySelector(e);if(null===n)throw new Error(&#34;Unable to find element by class. className: &#34;+e);return n}function getUserById(n){var e=nonFollowersList.find(e=>e.id.toString()===n.toString());return void 0===e&&console.error(&#34;Unable to find user by id. userId: &#34;+n),e}function onToggleUser(){getElementByClass(&#34;.iu_selected-count&#34;).innerHTML=`[${userIdsToUnfollow.length}]`}function renderResults(e){const n=[...e].sort((e,n)=>e.username>n.username?1:-1),t=(getElementByClass(&#34;.iu_toggle-all-checkbox&#34;).disabled=!1,getElementByClass(&#34;.iu_results-container&#34;));let o=t.innerHTML=&#34;&#34;;n.forEach(e=>{var n=e.username.substring(0,1).toUpperCase();o!==n&&(o=n,t.innerHTML+=`<div style=&#39;margin:1rem;padding:1rem;font-size:2em;border-bottom: 1px solid #333;&#39;>${o}</div>`),t.innerHTML+=`<label style=&#39;display:flex;align-items:center;padding:1rem;border-radius:3px;cursor:pointer;&#39;>
            <div style=&#39;display:flex;align-items:center;flex:1;&#39;>
                <img src=${e.profile_pic_url} width=&#39;75px&#39; style=&#39;border-radius:50%;&#39; />&nbsp;&nbsp;&nbsp;&nbsp;
                <span style=&#39;font-size:1.75em;&#39;>${e.username}</span>
                ${e.is_verified?&#34;&nbsp;&nbsp;<div style=&#39;background-color:#49adf4;border-radius:50%;padding:0.2rem 0.3rem;font-size:0.35em;height:fit-content;&#39;>✔</div>&#34;:&#34;&#34;}
            </div>
            <input class=&#39;account-checkbox&#39; type=&#39;checkbox&#39; style=&#39;height:1.1rem;width:1.1rem;&#39; onchange=&#39;toggleUser(${e.id})&#39; />
        </label>`}),getElementByClass(&#34;.iu_main-btn&#34;).remove()}async function run(e){renderResults(nonFollowersList=await getNonFollowersList(e))}function renderOverlay(){let e=!0;document.documentElement.style.backgroundColor=&#34;#222&#34;;const n=document.createElement(&#34;div&#34;),t=(n.setAttribute(&#34;class&#34;,&#34;iu_overlay&#34;),n.setAttribute(&#34;style&#34;,[&#34;background-color:#222&#34;,&#34;color:#fff&#34;,&#34;height:100%&#34;,&#34;font-family:system-ui&#34;].join(&#34;;&#34;)),n.innerHTML=`<header style=&#39;position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:1rem;height:2.5rem;background-color:#333;z-index:1;&#39;>
        <div style=&#39;font-family:monospace;font-size:1.5em;cursor:pointer;&#39; onclick=&#39;location.reload()&#39;>InstagramUnfollowers</div>
        <label style=&#39;display:flex;cursor:pointer;&#39;><input type=&#39;checkbox&#39; class=&#39;iu_include-verified-checkbox&#39; />&nbsp;Include verified</label>
        <div>Non-followers: <span class=&#39;iu_nonfollower-count&#39; /></div>
        <div style=&#39;font-size:1.2em;text-decoration:underline;color:red;cursor:pointer;&#39; onclick=&#39;unfollow()&#39;>Unfollow Selected <span class=&#39;iu_selected-count&#39;>[0]</span></div>
        <input type=&#39;checkbox&#39; class=&#39;iu_toggle-all-checkbox&#39; style=&#39;height:1.1rem;width:1.1rem;&#39; onclick=&#39;toggleAllUsers(this.checked)&#39; disabled />
    </header>
    <button class=&#39;iu_main-btn&#39; style=&#39;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:2em;cursor:pointer;height:160px;width:160px;border-radius:50%;background:transparent;color:currentColor;border:1px solid currentColor;&#39;>RUN</button>
    <div class=&#39;iu_results-container&#39; style=&#39;transform:translateY(75px)&#39;></div>`,document.body.replaceWith(n),getElementByClass(&#34;.iu_main-btn&#34;).addEventListener(&#34;click&#34;,()=>run(e)),getElementByClass(&#34;.iu_include-verified-checkbox&#34;));t.checked=e,t.addEventListener(&#34;change&#34;,()=>e=!e)}async function getNonFollowersList(n=!0){let t=[],o=!0,r=0,l=0,s=-1;let i=`https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={&#34;id&#34;:&#34;${getCookie(&#34;ds_user_id&#34;)}&#34;,&#34;include_reel&#34;:&#34;true&#34;,&#34;fetch_mutual&#34;:&#34;false&#34;,&#34;first&#34;:&#34;24&#34;}`;const a=getElementByClass(&#34;.iu_main-btn&#34;),d=getElementByClass(&#34;.iu_results-container&#34;),c=getElementByClass(&#34;.iu_nonfollower-count&#34;);for(;o;){let e;try{e=await fetch(i).then(e=>e.json())}catch(e){continue}-1===s&&(s=e.data.user.edge_follow.count),o=e.data.user.edge_follow.page_info.has_next_page,i=afterUrlGenerator(e.data.user.edge_follow.page_info.end_cursor),l+=e.data.user.edge_follow.edges.length,e.data.user.edge_follow.edges.forEach(e=>{!n&&e.node.is_verified||e.node.follows_viewer||t.push(e.node)}),a.innerHTML=Math.round(l/s*100)+&#34;%&#34;,d.innerHTML=&#34;&#34;,c.innerHTML=t.length.toString(),await sleep(Math.floor(400*Math.random())+1e3),6<++r&&(r=0,d.innerHTML=&#39;<span style=&#34;margin:1rem;&#34;>Sleeping 10 secs to prevent getting temp blocked...</span>&#39;,await sleep(1e4))}return t}function init(){location.hostname!==INSTAGRAM_HOSTNAME?alert(&#34;Can be used only on Instagram routes&#34;):(document.title=&#34;InstagramUnfollowers&#34;,renderOverlay())}window.toggleUser=n=>{userIdsToUnfollow=-1===userIdsToUnfollow.indexOf(n)?[...userIdsToUnfollow,n]:userIdsToUnfollow.filter(e=>e!==n),onToggleUser()},window.toggleAllUsers=(n=!1)=>{document.querySelectorAll(&#34;input.account-checkbox&#34;).forEach(e=>e.checked=n),userIdsToUnfollow=n?[...nonFollowersList]:[],onToggleUser()},window.unfollow=async()=>{if(confirm(&#34;Are you sure?&#34;)){var e=getCookie(&#34;csrftoken&#34;);if(void 0===e)throw new Error(&#34;csrftoken cookie is undefined&#34;);getElementByClass(&#34;.iu_toggle-all-checkbox&#34;).disabled=!0;const o=getElementByClass(&#34;.iu_results-container&#34;);o.innerHTML=&#34;&#34;;let n=0;for(const r of userIdsToUnfollow){var t=getUserById(r);try{await fetch(unfollowUserUrlGenerator(r),{headers:{&#34;content-type&#34;:&#34;application/x-www-form-urlencoded&#34;,&#34;x-csrftoken&#34;:e},method:&#34;POST&#34;,mode:&#34;cors&#34;,credentials:&#34;include&#34;}),o.innerHTML+=`<div style=&#39;padding:1rem;&#39;>Unfollowed ${t.username} [${n+1}/${userIdsToUnfollow.length}]</div>`}catch(e){console.error(e),o.innerHTML+=`<div style=&#39;padding:1rem;color:red;&#39;>Failed to unfollow ${t.username} [${n+1}/${userIdsToUnfollow.length}]</div>`}window.scrollTo(0,o.scrollHeight),await sleep(Math.floor(2e3*Math.random())+4e3),(n+=1)%5==0&&(o.innerHTML+=&#39;<hr /><div style=&#34;padding:1rem;font-size:1.25em;color:#d7d356;&#34;>Sleeping 5 minutes to prevent getting temp blocked...</div><hr />&#39;,await sleep(3e5))}o.innerHTML+=&#34;<hr /><div style=&#39;padding:1rem;font-size:1.25em;color:#56d756;&#39;>All DONE!</div><hr />&#34;}},init();})();" indicator>InstagramUnfollowers</a>
    </button>

 2. Log into your account and click on the newly added bookmark.  
 3. You will be met with the following interface:  

    <img src="./assets/main.png" alt="main" width="35%" />

 4. Click "RUN" to start scanning for users who do not follow you back.  
 5. Once it finishes printing the users, you will be met with the following screen which will show you the results:  

    <img src="./assets/results.png" alt="main" width="35%" />

 6. If you wish to un-follow any of these users, you can select 1 or more of them via the checkbox next to each user.  

## Notes

***The more users you have to check, more time it will take***

**_This script has been tested only on Chromium-based browsers_**

## DEV

When introducing new changes to `main.js`, make sure to run the "build" command in-order to automatically format, compress, and convert your code.

## Legal

**Disclaimer:** This is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Instagram.

Use it at your own risk!.
