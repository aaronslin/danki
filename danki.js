// danki.js

// There are probably some better data structures besides 
// whatever the heck we're using

// When creating a new deck, check that "decks" isn't allowed


$(document).ready(function() {
	onloadProcedures();

	$("#addDeckForm").submit(function(event) {
		event.preventDefault();
		var bannedDeckNames = ["decks"];
		var deckName = $("#addDeckInput").val();
		if(listContainsEl(bannedDeckNames, deckName)) {
			console.log("Deck name not permitted:", deckName);
			return;
		}
		chrome.storage.local.set({[deckName]: []}, function(result) {
			alertUser("Deck successfully created:", deckName);
		});
	});
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
	updateJSONDisplay();
});

function onloadProcedures() {
	updateJSONDisplay();
}

function updateJSONDisplay() {
	chrome.storage.local.get(null, function(localStore) {
		localStore = JSON.stringify(localStore);
		$("#storageDisplayText").html(localStore);
	});
}

function storeCard(deckName, cardToStore) {
	var ifNoDeckFound = [];
	chrome.storage.local.get({"decks": ifNoDeckFound}, function(decks) {
		alertUser("decks", decks);

		/* Check if deckName exists as a key */
		validDeckNames = decks.filter(function(elem) {
			return elem == deckName;
		});
		if(validDeckNames.length == 0) {
			alertUser("No deck found called:", deckName);
			return;
		}

		chrome.storage.local.get({[deckName]: []}, function(deck) {
			deck.push(cardToStore);
			chrome.storage.local.set({[deckName]: deck}, function(result) {
				alertUser("Deck successfully updated:", deck);
			});
		});
	});
}

function listContainsEl(list, element) {
	return list.indexOf(element) != -1;
}

function alertUser(message1, message2) {
	console.log(message1, message2);
}

