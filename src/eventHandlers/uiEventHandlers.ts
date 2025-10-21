import {
	BrowserEventHandler,
	EventHandler,
	UiSuggestionItem
} from "../interfaces.ts";
import {
	createDomElement,
	findDomElement,
	getInstanceClassName,
	scrollToHighlightedSuggestion,
	showElement,
	hideElement,
	getStreetLineFormValue,
	updateDynamicStyles
} from "../utils/uiUtils.ts";
// TODO: Make sure input element updates trigger event bubbling (e.g. for React, and other frameworks)

export const findInputElements:EventHandler = ({event, state, setState}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = event.detail;
	// TODO: default "searchInputSelector" to "streetSelector" (or vice versa)

	setState("streetLineInputElement", streetSelector ? findDomElement(streetSelector) : null);
	setState("secondaryInputElement", secondarySelector ? findDomElement(secondarySelector) : null);
	setState("cityInputElement", citySelector ? findDomElement(citySelector) : null);
	setState("stateInputElement", stateSelector ? findDomElement(stateSelector) : null);
	setState("zipcodeInputElement", zipcodeSelector ? findDomElement(zipcodeSelector) : null);
	setState("searchInputElement", searchInputSelector ? findDomElement(searchInputSelector) : state.streetLineInputElement);

	state.eventDispatcher.dispatch("UiService_foundInputElements");
};

export const watchSearchInputForChanges:EventHandler = ({state, setState}) => {
	const searchInputElement = state.searchInputElement;
	// TODO: Add event listeners for other DOM elements (v2)
	searchInputElement.addEventListener("input", (inputEvent:Event) => {
		handleSearchInputOnChange({event: inputEvent, state, setState});
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// hideElement(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (inputEvent:Event) => {
		handleAutocompleteKeydown({event: inputEvent, state, setState});
		// TODO: Figure out how to prevent 1Password from triggering when arrowing down (or selecting an address via the "enter" key)
		return false;
	});
};

export const handleAutocompleteKeydown:EventHandler = ({event, state, setState}) => {
	const items = state.addressSuggestionResults ?? [];
	const currentIndex = state.highlightedSuggestionIndex;

	// TODO: Only run these actions if the dropdown is open
	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, state, setState, 1);
			break;
		case 'ArrowUp':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, state, setState, -1);
			break;
		case 'Enter':
			event.preventDefault();
			const selectedAddress = items[state.highlightedSuggestionIndex];
			if (selectedAddress) {
				state.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress});
			}
			break;
		case 'Escape':
			event.preventDefault();
			hideElement(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem:EventHandler = ({event, state:uiState, setState}) => {
	const selectedAddress = event.detail.selectedAddress;
	const {street_line, secondary = "", city, state:addressState, zipcode, entries = 0} = selectedAddress.address;
	const searchInputElement = uiState.searchInputElement;

	if (entries > 1) {
		const newSearchTerm = `${street_line} ${secondary}`;
		// TODO: Set selectedAddress to state so subsequent typing by the user doesn't "revert" back out to a broader search
		// TODO: How do users "back out" of the secondary address search?

		searchInputElement.value = newSearchTerm;
		uiState.eventDispatcher.dispatch(
			"UiService_requestedNewAddressSuggestions",
			{
				searchString: newSearchTerm,
				selectedAddress: selectedAddress.address,
			}
		);
	} else {
		setState("selectedAddress", selectedAddress);

		// TODO: If elements aren't inputs, specify innerHtml instead of value
		uiState.streetLineInputElement.value = getStreetLineFormValue(uiState, selectedAddress.address);

		if (uiState.secondaryInputElement) {
			uiState.secondaryInputElement.value = secondary;
		}
		if (uiState.cityInputElement) {
			uiState.cityInputElement.value = city;
		}
		if (uiState.stateInputElement) {
			uiState.stateInputElement.value = addressState;
		}
		if (uiState.zipcodeInputElement) {
			uiState.zipcodeInputElement.value = zipcode;
		}

		// TODO: Add verification so we can get the full zip code
		hideElement(uiState.dropdownElement);
	}
};

export const formatAddressSuggestions:EventHandler = ({event, state:uiState}) => {
	const addressSuggestions = event.detail.suggestions.map((suggestion, index):UiSuggestionItem => {
		const {street_line, secondary = "", city, state, zipcode, entries = 0} = suggestion;
		const suggestionString = `${street_line} ${secondary}, ${city}, ${state} ${zipcode}`;
		const entriesString = entries > 1 ? `${entries} entries` : "";
		const suggestionTextNode = document.createTextNode(suggestionString);
		const entriesTextNode = document.createTextNode(entriesString);
		const addressElement = createDomElement("div", ["smartyAddress__autocompleteAddress"], [suggestionTextNode]);
		const entriesElement = createDomElement("div", ["smartyAddress__suggestionEntries"], [entriesTextNode]);
		const suggestionElement = createDomElement("li", ["smartyAddress__suggestion"], [addressElement, entriesElement]);
		suggestionElement.setAttribute("data-address", JSON.stringify(suggestion));
		suggestionElement.addEventListener("click", () => {
			uiState.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress: uiState.addressSuggestionResults[index]});
		});

		return {
			address: suggestion,
			suggestionElement,
		};
	});
	uiState.eventDispatcher.dispatch("UiService_formattedAddressSuggestions", {addressSuggestions});
};

export const setupDynamicStyling:EventHandler = ({state, setState}) => {
	if (!state.customStylesElement) {
		const newStylesElement = document.createElement("style");
		const head  = document.getElementsByTagName('head')[0];
		head.appendChild(newStylesElement);
		setState("customStylesElement", newStylesElement);
	}

	// TODO: Do we need to separate "color" and "position" functionality?
	// TODO: Do we need to setup polling or a mutation observer so we can also recalculate these values when sizes/positions/colors change for other reasons besides scoll/resize?
	updateDynamicStyles(state.customStylesElement, state.searchInputElement, state.instanceId);

	window.addEventListener("scroll", () => {
		updateDynamicStyles(state.customStylesElement, state.searchInputElement, state.instanceId);
	});

	window.addEventListener("resize", () => {
		updateDynamicStyles(state.customStylesElement, state.searchInputElement, state.instanceId);
	});
};

// TODO: Does this really need its own event or can we just merge it with formatAddressSuggestions?
export const updateDropdownSuggestions:EventHandler = ({event, state, setState}) => {
	const addressSuggestions = event.detail.addressSuggestions;
	const suggestionItems = addressSuggestions ?? [];
	const suggestionElements = suggestionItems.map(({suggestionElement}) => suggestionElement);
	setState("addressSuggestionResults", suggestionItems);
	state.suggestionsElement.replaceChildren(...suggestionElements);

	if(suggestionItems.length) {
		highlightNewAddress(suggestionItems, 0, state, setState, 0);
	}

	showElement(state.dropdownElement);
};

// TODO: Compare with the AI-generated plugin to see what we can leverage from it
const handleSearchInputOnChange:BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

// TODO: Split this out into smaller functions
export const buildDomElements:EventHandler = ({state, setState}) => {
	const instanceClass = getInstanceClassName(state.instanceId);
	const smartyLogoDarkElement = createDomElement("img", ["smartyAddress__smartyLogoDark"]);
	const smartyLogoLightElement = createDomElement("img", ["smartyAddress__smartyLogoLight"]);
	const poweredByText = document.createTextNode("Powered by");
	const suggestionsElement = createDomElement("ul", ["smartyAddress__suggestionsElement"]);
	const poweredBySmartyElement = createDomElement("div", ["smartyAddress__poweredBy"], [poweredByText, smartyLogoDarkElement, smartyLogoLightElement]);
	const dropdownElement = createDomElement("div", ["smartyAddress__dropdownElement", "smartyAddress__hidden"], [suggestionsElement, poweredBySmartyElement]);
	const dropdownWrapperElement = createDomElement("div", ["smartyAddress__suggestionsWrapperElement", instanceClass], [dropdownElement]);

	dropdownElement.setAttribute("role", "listbox");
	smartyLogoDarkElement.setAttribute("src", state.smartyLogoDark);
	smartyLogoLightElement.setAttribute("src", state.smartyLogoLight);
	document.body.appendChild(dropdownWrapperElement);

	setState("dropdownWrapperElement", dropdownWrapperElement);
	setState("dropdownElement", dropdownElement);
	setState("suggestionsElement", suggestionsElement);
	setState("poweredBySmartyElement", poweredBySmartyElement);

	state.eventDispatcher.dispatch("UiService_builtDomElements", {dropdownElement});
};

export const notifyDomInitIsComplete:EventHandler = ({state}) => {
	state.eventDispatcher.dispatch("UiService_domReadyForAutocomplete");
};

const updateDropdown = () => {

};

// TODO: Figure out how to simplify the params in this function (e.g. merge indexes, eliminate state/setState params)
// TODO: After this gets cleaned up, it should also be moved into uiUtils.ts
const highlightNewAddress = (items:UiSuggestionItem[], currentIndex:number, state, setState, indexChange:number) => {
	const newIndex = (currentIndex + indexChange + items.length) % items.length;
	setState("highlightedSuggestionIndex", newIndex);

	items.forEach((item, i) => {
		item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
	});

	scrollToHighlightedSuggestion(items[newIndex].suggestionElement, state.suggestionsElement);
};

// e.g. for secondaries
const expandDropdown = () => {

};

const populateForm = () => {

};

const displayError = () => {

};

const displaySuccess = () => {

};

// TODO: Handle config modifications generically instead of having specific handlers for each config element
export const setThemeFromConfig:EventHandler = ({event, state, setState}) => {
	const previousTheme = state.theme;
	setState("theme", event.detail?.theme);
	setState("smartyLogoDark", event.detail?.smartyLogoDark);
	setState("smartyLogoLight", event.detail?.smartyLogoLight);

	if (previousTheme !== state.theme) {
		state.eventDispatcher.dispatch("UiService_receivedNewTheme", {previousTheme});
	}
};

export const updateTheme:EventHandler = ({event, state}) => {
	const previousTheme = event.detail?.previousTheme ?? [];
	const dropdownWrapperElement = state.dropdownWrapperElement;

	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...state.theme);
	}
};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};

export const handleAutocompleteError:EventHandler = ({event, state, setState}) => {
	hideElement(state.dropdownElement);
};
