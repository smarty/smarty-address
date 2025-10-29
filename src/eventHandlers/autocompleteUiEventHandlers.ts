import {AbstractStateObject, BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces.ts";
import {
	buildAutocompleteDomElements, configureDynamicStyling,
	createDomElement,
	hideElement,
	highlightNewAddress,
	showElement, updateDynamicStyles, updateTheme
} from "../utils/domUtils.ts";
import {getInstanceClassName} from "../utils/uiUtils.ts";

export const watchSearchInputForChanges:EventHandler = ({state, setState}) => {
	const searchInputElement = state.searchInputElement;
	// TODO: Add event listeners for other DOM elements (v2)
	searchInputElement.addEventListener("input", (event:Event) => {
		handleSearchInputOnChange({event, state, setState});
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// hideElement(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (event:KeyboardEvent) => {
		handleAutocompleteKeydown(event.key, state, setState);
		// TODO: Figure out how to prevent 1Password from triggering when arrowing down (or selecting an address via the "enter" key). The way to do this is to update the attributes of the input element (e.g. `autocomplete="off"`). See the "test-site" repo for an example.
	});
};

export const handleAutocompleteKeydown = (pressedKey:string, state:AbstractStateObject, setState:Function) => {
	const items = state.addressSuggestionResults ?? [];
	const currentIndex = state.highlightedSuggestionIndex;
	const handleHighlightChange = (indexChange:number) => {
		const newHighlightIndex = highlightNewAddress(items, currentIndex, state.suggestionsElement, indexChange);
		setState("highlightedSuggestionIndex", newHighlightIndex);
	};

	// TODO: Only run these actions if the dropdown is open
	switch (pressedKey) {
		case "ArrowDown":
			handleHighlightChange(1);
			break;
		case "ArrowUp":
			handleHighlightChange(-1);
			break;
		case "Enter":
			const selectedAddress = items[state.highlightedSuggestionIndex];
			if (selectedAddress) {
				state.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress});
			}
			break;
		case "Escape":
			hideElement(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem:EventHandler = ({event, state:uiState}) => {
	const selectedAddress = event.detail.selectedAddress;
	const {street_line, secondary = "", entries = 0} = selectedAddress.address;
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
		uiState.eventDispatcher.dispatch("AutocompleteUiService_receivedNewAddressForForm", {selectedAddress: selectedAddress.address});
		hideElement(uiState.dropdownElement);
	}
};

export const formatAddressSuggestions:EventHandler = ({event, state:uiState, setState}) => {
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
		// TODO: Find a better way to accomplish this
		suggestionElement.addEventListener("click", () => {
			uiState.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress: uiState.addressSuggestionResults[index]});
		});

		return {
			address: suggestion,
			suggestionElement,
		};
	});

	const suggestionItems = addressSuggestions ?? [];
	const suggestionElements = suggestionItems.map(({suggestionElement}) => suggestionElement);
	setState("addressSuggestionResults", suggestionItems);
	uiState.suggestionsElement.replaceChildren(...suggestionElements);

	if(suggestionItems.length) {
		setState("highlightedSuggestionIndex", highlightNewAddress(suggestionItems, 0, uiState.suggestionsElement, 0));
	}

	showElement(uiState.dropdownElement);
};

// TODO: Compare with the AI-generated plugin to see what we can leverage from it
const handleSearchInputOnChange:BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

export const setupDom:EventHandler = ({event, state, setState}) => {
	const instanceClassname = getInstanceClassName(state.instanceId);
	setState("searchInputElement", event.detail.searchInputElement);
	const elements = buildAutocompleteDomElements(instanceClassname, state.smartyLogoDark, state.smartyLogoLight);
	const customStylesElement = elements.customStylesElement;

	document.body.appendChild(elements.dropdownWrapperElement);
	document.getElementsByTagName('head')[0].appendChild(customStylesElement);

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	updateTheme(state.theme, [], state.dropdownWrapperElement);
	// TODO: See if we can do this without needing to pass state/setState (or if we must, then trigger an event)
	watchSearchInputForChanges({state, setState});

	const dynamicStylingHandler = () => updateDynamicStyles(customStylesElement, state.searchInputElement, state.instanceId);

	configureDynamicStyling(dynamicStylingHandler);
};

export const updateConfig:EventHandler = ({event, state, setState}) => {
	const previousTheme = state.theme;
	const newTheme = event.detail?.theme;
	setState("theme", newTheme);
	setState("smartyLogoDark", event.detail?.smartyLogoDark);
	setState("smartyLogoLight", event.detail?.smartyLogoLight);

	if (previousTheme !== state.theme) {
		updateTheme(newTheme, previousTheme, state.dropdownWrapperElement);
	}

	state.eventDispatcher.dispatch("AutocompleteUiService_updatedConfig");
};

export const handleAutocompleteError:EventHandler = ({state}) => {
	hideElement(state.dropdownElement);
};
