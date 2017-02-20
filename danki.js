// danki.js

// There are probably some better data structures besides 
// whatever the heck we're using

// Chrome main storage key names
var ACTIVE_DECK_KEY = "ACTIVE_DECKS";
var INACTIVE_DECK_KEY = "INACTIVE_DECKS";
var EMPTY_LIST = [];
var BANNED_DECK_NAMES = [ACTIVE_DECK_KEY, INACTIVE_DECK_KEY, ""];

// Card storage key names 
var FRONT_KEY = "FRONT";
var BACK_KEY = "BACK";
var BUCKET_KEY = "SRS";
var BUCKET_DEFAULT = 1;
var CREATED_KEY = "ADDED";
var NEXT_REVIEW_KEY = "NEXT_REVIEW";

// Other global variables
var SRS_ALGORITHM = srs_Leitner;
var FREQUENCY = 4000;
var NEXT_REVIEW_TIME = 2; // null;
var NEXT_REVIEW_CARD = null;


$(document).ready(function() {
	onloadProcedures();

	$("#addDeckForm").submit(function(event) {
		event.preventDefault();
		addNewDeck();
	});

	$("#addCardForm").submit(function(event) {
		event.preventDefault();
		addNewCard();
	})
});

var checkQueueInterval = setInterval(function() {
	if (!NEXT_REVIEW_TIME) {
		return;
	}
	if (Date.now() > NEXT_REVIEW_TIME) {
		chrome.storage.local.get(null, function (localStoreObj) {
			decks = localStoreObj[ACTIVE_DECK_KEY];

			activeCards = [];
			for(var i=0; i<decks.length; i++) {
				deckName = decks[i];
				activeCards = activeCards.concat(localStoreObj[deckName]);
			}

			expiredCards = activeCards.filter(function(cardObj) { 
				var nextReview = cardObj[NEXT_REVIEW_KEY];
				return typeof(nextReview) == "number" && nextReview < NEXT_REVIEW_TIME;
			});

			// Cards are sorted backwards by expiration date
			expiredCards = expiredCards.sort(function(card1, card2) {
				return card2[NEXT_REVIEW_KEY]-card1[NEXT_REVIEW_KEY];
			});
		});
	}
		/* If next_review_time passed:
			Q <- Search for all cards that have expired; sort by time
			For all cards in Q:
				Check if the time has passed (async issues)
				Display card
				Update the card difficulty and time
			Once Q is empty: 
			Update the next_review_time

		Remember that this interval function will be running independently of __
		Thus, we might get some async issues if user takes more than 10 seconds

		Perhaps introduce a lock when there's currently a card being displayed
	*/

}, FREQUENCY);


chrome.storage.onChanged.addListener(function(changes, namespace) {
	onloadProcedures();
});

function onloadProcedures() {
	updateJSONDisplay();
	updateDeckChoicesHTML();
	updateNextCardInfo();
}

function updateNextCardInfo() {
	// TODO: make sure that NEXT_REVIEW_TIME isn't null
}

function updateDeckChoicesHTML() {
	$("#addCardSelect option").remove();
	chrome.storage.local.get(ACTIVE_DECK_KEY, function(deckNamesObj) {
		deckNames = deckNamesObj[ACTIVE_DECK_KEY];
		$.each(deckNames, function(key, value) {
			$("#addCardSelect").append(new Option(value, value));
		});
	});
}

function addNewDeck() {
	var deckName = $("#addDeckInput").val();
	if(listContainsEl(BANNED_DECK_NAMES, deckName)) {
		console.log("Deck name not permitted:", deckName);
		return;
	}
	pushToStorageList(ACTIVE_DECK_KEY, deckName, function(result) {
		chrome.storage.local.set({[deckName]: []}, function(result) {
			alertUser("Deck successfully created:", deckName);
		});
	});
	$("#addDeckInput").val("");
}

function addNewCard() {
	var front = String($("#addCardFront").val());
	var back = String($("#addCardBack").val());
	var deckName = $("#addCardSelect").val();

	if(front.trim() == "" || back.trim() == "") {
		return;
	}
	var cardToStore = {[FRONT_KEY]: front, 
						[BACK_KEY]: back,
						[BUCKET_KEY]: BUCKET_DEFAULT,
						[NEXT_REVIEW_KEY]: temporaryNextReview(),
						[CREATED_KEY]: Date.now()
	};

	/* TODO: change the NEXT_REVIEW_KEY value */

	pushToStorageList(deckName, cardToStore, function(result) {
		console.log("Card successfully added");
	});
}

function temporaryNextReview() {
	return Math.floor(Math.random()*5)+Math.random();
}

function updateJSONDisplay() {
	chrome.storage.local.get(null, function(localStore) {
		localStore = JSON.stringify(localStore);
		$("#storageDisplayText").html(localStore);
	});
}

function pushToStorageList(key, element, callback) {
	chrome.storage.local.get({[key]: EMPTY_LIST}, function(storageListObj) {
		storageList = storageListObj[key];
		if(listContainsEl(storageList, element)) {
			return;
		}
		storageList.push(element);
		chrome.storage.local.set({[key]: storageList}, function(result) {
			callback(result);
		});
	});
}

function listContainsEl(list, element) {
	return list.indexOf(element) != -1;
}


/* https://en.wikipedia.org/wiki/Leitner_system 
	Using a modified algorithm to not completely reset bucket upon wrong answer */
function srs_Leitner(bucketNum, isCorrect) {
	var minBucket = BUCKET_DEFAULT;
	var maxBucket = 5;
	if (isCorrect) {
		return Math.min(maxBucket, bucketNum+1);
	}
	else {
		var newBucket = Math.floor(bucketNum/2);
		return Math.max(minBucket, newBucket);
	}
}

function srsBucketToTime(bucketNum) {
	noise = 1;

}

/* ------------ DEPRECATED ------------ */



function alertUser(message1, message2) {
	console.log(message1, message2);
}

function DEPRECATED_storeCard(deckName, cardToStore) {
	chrome.storage.local.get({ACTIVE_DECK_KEY: EMPTY_LIST}, function(decksObj) {
		decks = decksObj[ACTIVE_DECK_KEY];

		/* Check if deckName exists as a key */
		validDeckNames = decks.filter(function(elem) {
			return elem == deckName;
		});
		if(validDeckNames.length == 0) {
			alertUser("No deck found called:", deckName);
			return;
		}

		pushToStorageList(deckName, cardToStore, function(result) {
			console.log("Card successfully added");
		});
	});
}

