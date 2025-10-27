import {
	BrowserEventHandler,
	EventHandler,
	UiSuggestionItem
} from "../interfaces";
import {
	createDomElement,
	findDomElement,
	getInstanceClassName,
	scrollToHighlightedSuggestion,
	showElement,
	hideElement,
	getStreetLineFormValue,
	updateDynamicStyles,
	buildDomElements
} from "../utils/uiUtils";
// TODO: Make sure input element updates trigger event bubbling (e.g. for React, and other frameworks)

export const findInputElements:EventHandler = ({state, setState}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = state;

	// TODO: Consider finding the DOM elements each time they're needed (instead of caching them)
	setState("streetLineInputElement", findDomElement(streetSelector));
	setState("secondaryInputElement", findDomElement(secondarySelector));
	setState("cityInputElement", findDomElement(citySelector));
	setState("stateInputElement", findDomElement(stateSelector));
	setState("zipcodeInputElement", findDomElement(zipcodeSelector));
	setState("searchInputElement", findDomElement(searchInputSelector) ?? state.streetLineInputElement);

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
		highlightNewAddress(suggestionItems, 0, uiState, setState, 0);
	}

	showElement(uiState.dropdownElement);
};

export const configureDynamicStyling:EventHandler = ({state}) => {
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


// TODO: Compare with the AI-generated plugin to see what we can leverage from it
const handleSearchInputOnChange:BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

export const setupDom:EventHandler = ({state, setState}) => {
	const instanceClassname = getInstanceClassName(state.instanceId);
	const elements = buildDomElements(instanceClassname, state.smartyLogoDark, state.smartyLogoLight);

	document.body.appendChild(elements.dropdownWrapperElement);
	document.getElementsByTagName('head')[0].appendChild(elements.customStylesElement);

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	updateTheme(state.theme, [], state.dropdownWrapperElement);

	watchSearchInputForChanges({state, setState});
	configureDynamicStyling({state, setState});
};

export const notifyDomInitIsComplete:EventHandler = ({state}) => {
	state.eventDispatcher.dispatch("UiService_domReadyForAutocomplete");
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

export const updateConfig:EventHandler = ({event, state, setState}) => {
	const previousTheme = state.theme;
	const newTheme = event.detail?.theme;
	setState("theme", newTheme);
	setState("smartyLogoDark", event.detail?.smartyLogoDark);
	setState("smartyLogoLight", event.detail?.smartyLogoLight);
	setState("searchInputSelector", event.detail?.searchInputSelector);
	setState("streetSelector", event.detail?.streetSelector);
	setState("secondarySelector", event.detail?.secondarySelector);
	setState("citySelector", event.detail?.citySelector);
	setState("stateSelector", event.detail?.stateSelector);
	setState("zipcodeSelector", event.detail?.zipcodeSelector);

	if (previousTheme !== state.theme) {
		updateTheme(newTheme, previousTheme, state.dropdownWrapperElement);
	}

	state.eventDispatcher.dispatch("SmartyAddress_updatedConfig");
};

export const updateTheme = (newTheme:string[], previousTheme:string[] = [], dropdownWrapperElement:HTMLElement) => {
	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...newTheme);
	}
};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};

export const handleAutocompleteError:EventHandler = ({state}) => {
	hideElement(state.dropdownElement);
};
