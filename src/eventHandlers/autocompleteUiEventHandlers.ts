import {
	AbstractStateObject,
	AutocompleteUiServiceMethod, BrowserEventHandler, ServicesObject, UiSuggestionItem
} from "../interfaces";
import {
	hideElement,
	highlightNewAddress,
	showElement,
	createSuggestionElement, createSecondarySuggestionElement, updateDropdownContents
} from "../utils/domUtils";
import {getMergedAddressSuggestions} from "../utils/uiUtils";

export const watchSearchInputForChanges:AutocompleteUiServiceMethod = ({state, setState, services}) => {
	const searchInputElement = state.searchInputElement;
	searchInputElement.addEventListener("input", (event:Event) => {
		handleSearchInputOnChange({event, services});
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// hideElement(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (event:KeyboardEvent) => {
		handleAutocompleteKeydown(event.key, state, setState, services);
		// TODO: Figure out how to prevent 1Password from triggering when arrowing down (or selecting an address via the "enter" key). The way to do this is to update the attributes of the input element (e.g. `autocomplete="off"`). See the "test-site" repo for an example.
	});
};

// TODO: Simplify this function so it no longer needs the full state and services objects.
export const handleAutocompleteKeydown = (pressedKey:string, state:AbstractStateObject, setState:Function, services:ServicesObject) => {
	const items = getMergedAddressSuggestions(state);
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
				// TODO: Fix the value that gets passed in here. It's not populating the correct address.
				services.autocompleteUiService.handleSelectDropdownItem(state.selectedSuggestionIndex + 1);
			}
			break;
		case "Escape":
			hideElement(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem:AutocompleteUiServiceMethod = ({state, setState}, addressIndex) => {
	const mergedAddressSuggestions = getMergedAddressSuggestions(state);
	const selectedAddress = mergedAddressSuggestions[addressIndex];
	const {street_line, secondary = "", entries = 0} = selectedAddress.address;
	const searchInputElement = state.searchInputElement;
	setState("selectedSuggestionIndex", addressIndex);

	if (entries > 1) {
		const newSearchTerm = `${street_line} ${secondary}`;
		// TODO: Set selectedAddress to state so subsequent typing by the user doesn't "revert" back out to a broader search
		// TODO: How do users "back out" of the secondary address search? Right now it persists the "selectedAddress" value until the page is refreshed

		searchInputElement.value = newSearchTerm;
		state.eventDispatcher.dispatch(
			"UiService_requestedSecondaryAddressSuggestions",
			{
				searchString: newSearchTerm,
				selectedAddress: selectedAddress.address,
			}
		);
	} else {
		state.eventDispatcher.dispatch("AutocompleteUiService_receivedNewAddressForForm", {selectedAddress: selectedAddress.address});
		hideElement(state.dropdownElement);
	}
};

export const formatAddressSuggestions:AutocompleteUiServiceMethod = ({state, setState, services}, suggestions) => {
	const suggestionItems = suggestions.map((address, addressIndex):UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteUiService.handleSelectDropdownItem(addressIndex + state.selectedSuggestionIndex + 1);
		};

		const suggestionListElements = createSuggestionElement(address);
		const suggestionElement = suggestionListElements["suggestionElement"];
		suggestionElement.addEventListener("click", suggestionOnClickHandler);

		return {
			address,
			suggestionElement,
		};
	});

	setState("addressSuggestionResults", suggestionItems);
	setState("secondaryAddressSuggestionResults", []);
	updateDropdownContents(suggestionItems, state.suggestionsElement);

	if (suggestionItems.length) {
		setState("highlightedSuggestionIndex", highlightNewAddress(suggestionItems, 0, state.suggestionsElement, 0));
	}

	showElement(state.dropdownElement);
};

export const formatSecondaryAddressSuggestions:AutocompleteUiServiceMethod = ({state, setState, services}, suggestions) => {
	const suggestionItems = suggestions.map((address, addressIndex):UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteUiService.handleSelectDropdownItem(addressIndex + state.selectedSuggestionIndex + 1);
		};

		const suggestionListElements = createSecondarySuggestionElement(address);
		const suggestionElement = suggestionListElements["secondarySuggestionElement"];
		suggestionElement.addEventListener("click", suggestionOnClickHandler);

		return {
			address,
			suggestionElement,
		};
	});

	setState("secondaryAddressSuggestionResults", suggestionItems);

	const combinedSuggestionList = getMergedAddressSuggestions(state);
	updateDropdownContents(combinedSuggestionList, state.suggestionsElement);

	if (suggestionItems.length) {
		setState("highlightedSuggestionIndex", highlightNewAddress(combinedSuggestionList, -1, state.suggestionsElement, 0));
	}

	showElement(state.dropdownElement);
};

const handleSearchInputOnChange:BrowserEventHandler = ({event, services}) => {
	const searchInputValue = (event.target as HTMLInputElement)?.value;
	if (searchInputValue.length) {
		services.apiService.fetchAddressSuggestions(searchInputValue);
	}
};

export const setupDom:AutocompleteUiServiceMethod = ({state, setState, services, utils}, addressFormElements) => {
	const instanceClassname = utils.getInstanceClassName(state.instanceId);
	setState("searchInputElement", addressFormElements.searchInputElement);
	const elements = utils.buildAutocompleteDomElements(instanceClassname);
	const {customStylesElement, dropdownWrapperElement} = elements;

	document.body.appendChild(dropdownWrapperElement);
	document.getElementsByTagName('head')[0].appendChild(customStylesElement);

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	utils.updateThemeClass(state.theme, [], dropdownWrapperElement);
	services.autocompleteUiService.watchSearchInputForChanges();

	const dynamicStylingHandler = () => utils.updateDynamicStyles(customStylesElement as HTMLStyleElement, state.searchInputElement, state.instanceId);

	utils.configureDynamicStyling(dynamicStylingHandler);
};

export const init:AutocompleteUiServiceMethod = ({state, setState, utils}, config) => {
	const previousTheme = state.theme;
	const newTheme = config?.theme;
	setState("theme", newTheme);

	if (previousTheme !== state.theme) {
		utils.updateThemeClass(newTheme, previousTheme, state.dropdownWrapperElement);
	}
};

export const handleAutocompleteError:AutocompleteUiServiceMethod = ({state, utils}) => {
	utils.hideElement(state.dropdownElement);
};

export const handleAutocompleteSecondaryError:AutocompleteUiServiceMethod = ({state, utils}) => {
	// TODO: Implement better error handling here
	utils.hideElement(state.dropdownElement);
};

