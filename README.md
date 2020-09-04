# Instagram unfollower checker.


### Steps:
 1. Go to the profile you want to check. (Must be public or following them if its private.)
 2. Copy the code: ```document.getElementsByClassName("-nal3 ")[2].click();let followedListClone,followers,followersList,followersListClone,followed=followEDcount(2),followedList=document.getElementsByClassName("FPmhX notranslate  _0imsa "),scroll=setInterval(updateScroll,200),stopCheck=setInterval(function(){stopTask(1)},200);function stopTask(e){1===e?followed<=followedList.length&&(clearInterval(scroll),followedList=document.getElementsByClassName("FPmhX notranslate  _0imsa "),followedListClone=[...followedList],sleep(200),followersF()):2===e&&followers<=parseInt(followersList.length)&&(followersList=document.getElementsByClassName("FPmhX notranslate  _0imsa "),followersListClone=[...followersList],clearInterval(scroll),document.getElementsByClassName("wpO6b ")[1].click(),users(),clearInterval(stopCheck))}function followersF(){clearInterval(stopCheck),document.getElementsByClassName("-nal3 ")[1].click(),followers=followEDcount(1),followersList=document.getElementsByClassName("FPmhX notranslate  _0imsa "),scroll=setInterval(updateScroll,200),stopCheck=setInterval(function(){stopTask(2)},200)}function users(){let e=followersListClone.map(function(e){return e.title});for(let l=0;l<followedListClone.length;l++)e.includes(followedListClone[l].title)||console.log(followedListClone[l].title)}function updateScroll(){let e=document.getElementsByClassName("isgrP")[0];e.scrollTop=e.scrollHeight}function sleep(e){let l=(new Date).getTime();for(let t=0;t<1e7&&!((new Date).getTime()-l>e);t++);}function followEDcount(e){return""===document.getElementsByClassName("g47SY")[e].title?parseInt(document.getElementsByClassName("g47SY")[e].innerText.toString().replace(",","")):parseInt(document.getElementsByClassName("g47SY")[e].title.toString().replace(",",""))}```
 3. Go to the profile tab and open the developer console or Ctrl+Shift+J and paste the code.
 4. It will start scrolling your followers until reach the end, then It'll print it on the console.
 ![Output after finishing](https://github.com/davidarroyo1234/InstagramUnfollowers/blob/master/Readme/Pixelated%20result.png?raw=true)
 

***The more users you have to check, more time it will take***

To-Do
 - [x] Showing unfollowers in the console.
 - [ ] Option to automatically unfollow them.
