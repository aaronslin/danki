// danki.js

// There are probably some better data structures besides 
// whatever the heck we're using

// Chrome main storage key names
var ACTIVE_DECK_KEY = "ACTIVE_DECKS";
var INACTIVE_DECK_KEY = "INACTIVE_DECKS";
var EMPTY_LIST = [];
var BANNED_DECK_NAMES = [ACTIVE_DECK_KEY, INACTIVE_DECK_KEY, ""];
	// You should really concat this with localStoreObj[(IN)ACTIVE_DECK_KEY]

// Card storage key names 
var FRONT_KEY = "FRONT";
var BACK_KEY = "BACK";
var BUCKET_KEY = "BUCKET";
var BUCKET_DEFAULT = 1;
var CREATED_KEY = "ADDED";
var NEXT_REVIEW_KEY = "NEXT_REVIEW";
var DECK_NAME_KEY = "DECK_NAME";

// Other global variables
var SRS_ALGORITHM = srs_Leitner;
var FREQUENCY = 4000;
var NEXT_REVIEW_TIME = 2; // null;
	// Use null to denote that a flashcard is displayed
var CURRENT_CARD = null;
var VALID_FEEDBACK = "145";
var AWAITING_FEEDBACK = false;


$(document).ready(function() {
	onloadProcedures();

	// Top panel functions
	$("#flashcardFront").click(function(event) {
		displayFlashcardBack();
	});

	$(document).keypress(function(press) {
		pressedKey = String.fromCharCode(press.which);
		if (!AWAITING_FEEDBACK) {
			return;
		}
		if (VALID_FEEDBACK.indexOf(pressedKey) != -1) {
			// check that this doesn't conflict with textboxes (BUG)
			finishFlashcard(pressedKey);
		}
	});


	// Bottom panel functions
	$("#addDeckForm").submit(function(event) {
		event.preventDefault();
		addNewDeck();
	});

	$("#addCardForm").submit(function(event) {
		event.preventDefault();
		addNewCard();
	});
});

var checkExpirationInterval = setInterval(function() {
	checkExpiration();
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

		If we update flashcard interface in here and 10 seconds passes, what happens?

		Perhaps introduce a lock when there's currently a card being displayed

		We only want to display a card when either: (1) we just answered a card or 
			(2) NEXT_REVIEW_TIME has passed
	*/

}, FREQUENCY);





// ------------------- TOP PANEL METHODS -------------------

function checkExpiration() {
	if (NEXT_REVIEW_TIME < Date.now()) {
		chrome.storage.local.get(null, function (localStoreObj) {
			nextCard = getNextCardByTime(localStoreObj);
			if (nextCard[NEXT_REVIEW_KEY] > Date.now()) {
				return;
			}
			displayFlashcardFront(nextCard);
		});
	}
}

function displayFlashcardFront(nextCard) {
	if (AWAITING_FEEDBACK) {
		return;
	}
	$("#flashcardFront").removeClass("inactiveCard").addClass("activeCard");
	$("#flashcardBack").removeClass("activeCard").addClass("inactiveCard");
	$("#flashcardSeparator").addClass("disappear");	

	$("#flashcardFront > .flashcardInner").html(nextCard[FRONT_KEY]);
	$("#flashcardBack > .flashcardInner").html(nextCard[BACK_KEY]);
	
	NEXT_REVIEW_TIME = null;
	CURRENT_CARD = nextCard;
}

function displayFlashcardBack() {
	if ($("#flashcardFront").hasClass("activeCard")) {
		$("#flashcardBack").removeClass("inactiveCard").addClass("activeCard");	
		$("#flashcardSeparator").removeClass("disappear");	
	}
	AWAITING_FEEDBACK = true;
}

function finishFlashcard(feedback) {
	var newCard = CURRENT_CARD;
	var newBucket = SRS_ALGORITHM(CURRENT_CARD[BUCKET_KEY], feedback);
	var nextReview = bucketToNextReview(newBucket)
	newCard[BUCKET_KEY] = newBucket;
	newCard[NEXT_REVIEW_KEY] = nextReview;

	var deckName = newCard[DECK_NAME_KEY];

	chrome.storage.local.get(deckName, function(deckObj) {
		deck = deckObj[deckName];
		console.log(deckObj, deckName)
		deck = removeOneFromArraySuchThat(deck, function(card) {
			return card[CREATED_KEY] == newCard[CREATED_KEY] && 
					card[FRONT_KEY] == newCard[FRONT_KEY] &&
					card[BACK_KEY] == newCard[BACK_KEY];
		});
		deck.push(newCard);
		chrome.storage.local.set({[deckName]: deck}, function() {
			console.log("Card successfully updated:", newCard[FRONT_KEY]);
			return;
		});
	});

	AWAITING_FEEDBACK = false;
	CURRENT_CARD = null;

	chrome.storage.local.get(null, function(localStoreObj) {
		nextCard = getNextCardByTime(localStoreObj);
		nextReviewTime = nextCard[NEXT_REVIEW_KEY];
			// Notice that prevents you from seeing the same card twice!
			// To revert, use Math.min(^, nextReview); Don't forget about async.
		if (nextReviewTime < Date.now()) {
			displayFlashcardFront(nextCard);
		} else {
			NEXT_REVIEW_TIME = nextReviewTime;
		}
	});


}

function removeOneFromArraySuchThat(array, criterion) {
	console.log(array)
	for(var i=0; i<array.length; i++) {
		if (criterion(array[i])) {
			array.splice(i,1);
			return array;
		}
	}
	return null;
}

function getNextCardByTime(localStoreObj) {
	activeCards = getActiveCards(localStoreObj);

	return argmin(activeCards, function(card) {
		return card[NEXT_REVIEW_KEY]
	});
}

function getActiveCards(localStoreObj) {
	decks = localStoreObj[ACTIVE_DECK_KEY];
	activeCards = [];
	for(var i=0; i<decks.length; i++) {
		deckName = decks[i];
		activeCards = activeCards.concat(localStoreObj[deckName]);
	}
	return activeCards;
}

function argmin(list, criterion) {
	var minVal = Infinity;
	var minArg = null;
	for(var i=0; i<list.length; i++) {
		newArg = list[i];
		newVal = criterion(newArg);
		if (newVal < minVal) {
			minArg = newArg;
			minVal = newVal;
		}
	}

	return minArg;
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
	onloadProcedures();
});

function onloadProcedures() {
	updateJSONDisplay();
	updateDeckChoicesHTML();
	updateNextCardInfo();
	checkExpiration();
}

function updateNextCardInfo() {
	// TODO: make sure that NEXT_REVIEW_TIME isn't null
}


/* https://en.wikipedia.org/wiki/Leitner_system 
	Using a modified algorithm to not completely reset bucket upon wrong answer */
function srs_Leitner(currBucketNum, feedback) {
	var minBucket = BUCKET_DEFAULT;
	var maxBucket = 5;

	if (feedback==1) {
		var newBucket = Math.floor(currBucketNum/2);
		return Math.max(minBucket, newBucket);
	}
	if (feedback==4) {
		return Math.min(maxBucket, currBucketNum+1);
	}
	else {
		return currBucketNum;
	}
}

function bucketToNextReview(bucketNum) {
	noise = 1;
	return temporaryNextReview();
}





// ------------- BOTTOM PANEL METHODS ----------------

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
						[CREATED_KEY]: Date.now(),
						[DECK_NAME_KEY]: deckName
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


function DEPRECATED_getExpiredCards(localStoreObj) {
	// deprecated!
	decks = localStoreObj[ACTIVE_DECK_KEY];
	activeCards = [];
	for(var i=0; i<decks.length; i++) {
		deckName = decks[i];
		activeCards = activeCards.concat(localStoreObj[deckName]);
	}

	expiredCards = activeCards.filter(function(cardObj) { 
			var nextReview = cardObj[NEXT_REVIEW_KEY];
			return typeof(nextReview) == "number" && nextReview < NEXT_REVIEW_TIME;
		}).sort(function(card1, card2) {
			// Cards are sorted backwards by expiration date
			return card2[NEXT_REVIEW_KEY]-card1[NEXT_REVIEW_KEY];
		});
	return expiredCards;
}

