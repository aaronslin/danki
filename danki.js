// danki.js

// There are probably some better data structures besides 
// whatever the heck we're using

var DECK_NAMES_KEY = "ALLDECKS";
var EMPTY_LIST = [];
var BANNED_DECK_NAMES = [DECK_NAMES_KEY, ""];
var FRONT_KEY = "FRONT";
var BACK_KEY = "BACK";
var SRS_KEY = "SRS";
var SRS_DEFAULT = 1;

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

chrome.storage.onChanged.addListener(function(changes, namespace) {
	onloadProcedures();
});

function onloadProcedures() {
	updateJSONDisplay();
	updateDeckSelection();
}

function updateDeckSelection() {
	$("#addCardSelect option").remove();
	chrome.storage.local.get(DECK_NAMES_KEY, function(deckNamesObj) {
		deckNames = deckNamesObj[DECK_NAMES_KEY];
		console.log(deckNamesObj)
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
	pushToStorageList(DECK_NAMES_KEY, deckName, function(result) {
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
					[SRS_KEY]: SRS_DEFAULT};
	pushToStorageList(deckName, cardToStore, function(result) {
		console.log("Card successfully added");
	});
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
	chrome.storage.local.get({DECK_NAMES_KEY: EMPTY_LIST}, function(decksObj) {
		decks = decksObj[DECK_NAMES_KEY];

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

