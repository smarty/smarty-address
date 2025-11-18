import {AbstractStateObject, BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces";
import {
	buildAutocompleteDomElements, configureDynamicStyling,
	hideElement,
	highlightNewAddress,
	showElement, updateDynamicStyles, updateThemeClass,
	createSuggestionElement
} from "../utils/domUtils";
import {getInstanceClassName} from "../utils/uiUtils";

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
			"UiService_requestedSecondaryAddressSuggestions",
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

export const formatAddressSuggestions:EventHandler = ({event, state, setState}) => {
	const {suggestions} = event.detail;
	const suggestionItems = suggestions.map((address, index):UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			state.eventDispatcher.dispatch("UiService_addressSelected", {
				selectedAddress: state.addressSuggestionResults[index]
			});
		};

		const suggestionElement = createSuggestionElement(address);
		suggestionElement.addEventListener("click", suggestionOnClickHandler);

		return {
			address,
			suggestionElement,
		};
	});

	setState("addressSuggestionResults", suggestionItems);
	state.suggestionsElement.replaceChildren(...suggestionItems.map(item => item.suggestionElement));

	if (suggestionItems.length) {
		setState("highlightedSuggestionIndex", highlightNewAddress(suggestionItems, 0, state.suggestionsElement, 0));
	}

	showElement(state.dropdownElement);
};

// TODO: Compare with the AI-generated plugin to see what we can leverage from it
const handleSearchInputOnChange:BrowserEventHandler = ({event, state}) => {
	const searchInputValue = (event.target as HTMLInputElement)?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

export const setupDom:EventHandler = ({event, state, setState}) => {
	const instanceClassname = getInstanceClassName(state.instanceId);
	setState("searchInputElement", event.detail.searchInputElement);
	const elements = buildAutocompleteDomElements(instanceClassname);
	const {customStylesElement, dropdownWrapperElement} = elements;

	document.body.appendChild(dropdownWrapperElement);
	document.getElementsByTagName('head')[0].appendChild(customStylesElement);

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	updateThemeClass(state.theme, [], dropdownWrapperElement);
	// TODO: See if we can do this without needing to pass state/setState (or if we must, then trigger an event)
	watchSearchInputForChanges({state, setState, event});

	const dynamicStylingHandler = () => updateDynamicStyles(customStylesElement as HTMLStyleElement, state.searchInputElement, state.instanceId);

	configureDynamicStyling(dynamicStylingHandler);
};

export const updateConfig:EventHandler = ({event, state, setState}) => {
	const previousTheme = state.theme;
	const newTheme = event.detail?.theme;
	setState("theme", newTheme);

	if (previousTheme !== state.theme) {
		updateThemeClass(newTheme, previousTheme, state.dropdownWrapperElement);
	}

	state.eventDispatcher.dispatch("AutocompleteUiService_updatedConfig");
};

export const handleAutocompleteError:EventHandler = ({state}) => {
	hideElement(state.dropdownElement);
};

export const handleAutocompleteSecondaryError:EventHandler = ({state}) => {
	// TODO: Implement better error handling here
	hideElement(state.dropdownElement);
};

