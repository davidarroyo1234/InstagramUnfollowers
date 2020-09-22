//Followed count number
//open followed people
document.getElementsByClassName("-nal3 ")[2].click();

//take number of followed people
let followed = followEDcount(2);
//take the first part of the followed list
let followedList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
let followedListClone;
let followers;
let followersList;
let followersListClone;
// starts updating scroll
let scroll = setInterval(updateScroll, 1000);
//starts checking if it is over.
let stopCheck = setInterval(function () {
    stopTask(1);
}, 1000);

/**
 * Checks if the loop needs to stop. Restarts if it is not over yet.
 * @param  {Number} number  "1" checks if the followedList is in same length as following title. 
 *							"2" checks if the followersList is in same length as follower title.
 *
 */
function stopTask(number) {
    if (number === 1) {
		console.log("Verifying: " + parseInt(followedList.length) +"/" + followed +" followed people.");
        if (followed <= parseInt(followedList.length) || followed - 1 <= parseInt(followedList.length)) {
            clearInterval(scroll);
			console.log(" All donne. Starting to look for who follow you...");
            followedList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
            followedListClone = [...followedList];
            followersF();
        }
    } else if (number === 2) {
		console.log("Verifying: " + parseInt(followersList.length) +"/" + followers +" people who follow you.");
        if (followers <= parseInt(followersList.length) || followers - 1 <= parseInt(followersList.length)) {
            followersList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
            followersListClone = [...followersList];
            clearInterval(scroll);
			console.log(" All donne. Starting to look for who follow you back...");
            users(1);
			clearInterval(stopCheck);
			document.getElementsByClassName("-nal3 ")[2].click();
			sleep(3000);
			wantUnfollow = confirm("Do you want to unfollow this people we listed?");
			if(wantUnfollow) users(2); else console.log("Thank You! All finished :)");
			document.getElementsByClassName("wpO6b ")[1].click();
        }
    }
}

/**
 * Stops old check in followed and starts checking followers.
 */
function followersF() {
    clearInterval(stopCheck);
    document.getElementsByClassName("-nal3 ")[1].click();
    followers = followEDcount(1);
    followersList = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
    scroll = setInterval(updateScroll, 1000);
    stopCheck = setInterval(function () {
        stopTask(2);
    }, 1000);
}


/**
 * Prints the users who does not follow you back in the console.
 * @param {Number} option "1" for printing users.
				   option "2" for gradual unfollowing users.
 */
function users (option) {
    let usernames = followersListClone.map(function (x) {
        return x.title;
    });
	if (option == 1) {
		for (let i = 0; i < followedListClone.length; i++) {
			if (!usernames.includes(followedListClone[i].title)) {
				console.log(followedListClone[i].title);
			}
		}
	} else if(option == 2){
		let counterStop = 0;
		for (let i = 0; i < followedListClone.length; i++) {
			if (!usernames.includes(followedListClone[i].title)) {
				if (counterStop <= 30) {
					console.log("Securing navigation before starting new unfollow: ");
					sleepRandTime(5, 10);
					unfollowUser(followedListClone[i].title);
					counterStop++;
					console.log(counterStop + " unfollows.");
				} else {
					console.log(counterStop + " unfollows. Need to sleep... Sleeping for 5 min");
					// sleeping for 5 min
					sleep(300*1000);
					console.log("Restarting cicle.");
					counterStop = 0;
					sleep(2000);
					unfollowUser(followedListClone[i].title);
					counterStop++;
					console.log(counterStop + " unfollows!");
				}
			}
		}
	}
}

/**
 * Unfollow a user.
 * @param  {String} user user id from instagram.
 */

function unfollowUser(user) {
	console.log("Unfollowing user: @" + user + ".");
	//enter inside followed list
	let listOfFollowed = document.getElementsByClassName("pbNvD  fPMEg     HYpXt")[0];
	let clickFollowed = document.getElementsByClassName("-nal3 ")[2];
	if (!listOfFollowed) {
		clickFollowed.click();
	}
	// locate user into classes "FPmhX notranslate  _0imsa "
	let userPlace = document.getElementsByClassName("FPmhX notranslate  _0imsa ");
	// locate button into calsses "sqdOP  L3NKy    _8A5w5    "
	let buttonsOfDoc = document.getElementsByClassName("sqdOP  L3NKy    _8A5w5    ");
	let confirmButton = document.getElementsByClassName("aOOlW -Cab_   ");
	for (let i = 0; i < userPlace.length; i++) {
		let nowUser = userPlace[i].title.toString().replace(/[,|.]/,"");
		//console.log(nowUser + " === " + user);
		if(nowUser == user) {
			// select right button and click it
			buttonsOfDoc[i + 1].click();
			// Confirm unfollow
			confirmButton[0].click();
			sleepRandom (8,30);
			break;
		}
	}
	
}

/**
 * Refreshes the scroll limit by updating div class element that holds the list and the scroll.
 */
function updateScroll() {
	//gets the div class element that holds the list and the scroll.
    let element = document.getElementsByClassName("isgrP")[0];
    element.scrollTop = element.scrollHeight;
}

/**
 * Sleep the code for the seconds choosen in milliseconds.
 * @param  {Number} milliseconds Number in milliseconds to sleep the code for a while.
 */
function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}
/**
 * Stop code random between secsMin and secsMax defined.
 * @param {Number} secs Time limit in seconds that will be sorted randomly.
 */
function sleepRandom (secsMin, secsMax) {
	if(secsMin < secsMax) {
		let sleepRandTime = Math.round( (Math.random()*secsMax));
		if(sleepRandTime <= secsMin) sleepRandTime = secsMin;
		console.log("Sleeping for "+msToTime(sleepRandTime*1000)+".");
		sleep(sleepRandTime*1000);
	} else {
		throw "Secs Min, cant be higher then secsMax"; 
	}
}
/**
 * Translate miliseconds to seconds.
 * @param {Number} miliseconds Time in miliseconds
 */
function msToTime(miliseconds) {
	let s = miliseconds;
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  //return hrs + ':' + mins + ':' + secs + '.' + ms;
  return secs + ' secs';
}

/**
 * Takes the number of followed people title or follower title (1 for follower, 2 for followed)
 * @param  {Number} num Choose 1 to return follower number or 2 for followed
 * @return {Number} Returns the number of following or followed.
 */
function followEDcount(num) {
    if (document.getElementsByClassName("g47SY")[num].title==="") {
        return parseInt(document.getElementsByClassName("g47SY")[num].innerText.toString().replace(/[,|.]/,""));
    }
    else {
        return parseInt(document.getElementsByClassName("g47SY")[num].title.toString().replace(/[,|.]/,""));
    }
}