import { AutocompleteUiServiceMethod, UiSuggestionItem } from "../interfaces";

export const watchSearchInputForChanges: AutocompleteUiServiceMethod = ({ state, services }) => {
	const searchInputElement = state.searchInputElement;
	searchInputElement.addEventListener("input", (event: Event) => {
		services.autocompleteUiService.handleSearchInputOnChange(event);
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// utils.hideElement(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (event: KeyboardEvent) => {
		services.autocompleteUiService.handleAutocompleteKeydown(event.key);
		// TODO: Figure out how to prevent 1Password from triggering when arrowing down (or selecting an address via the "enter" key). The way to do this is to update the attributes of the input element (e.g. `autocomplete="off"`). See the "test-site" repo for an example.
	});
};

// TODO: Simplify this function so it no longer needs the full state and services objects.
export const handleAutocompleteKeydown: AutocompleteUiServiceMethod = (
	{ state, setState, services, utils },
	pressedKey: string,
) => {
	const items = utils.getMergedAddressSuggestions(state);
	const currentIndex = state.highlightedSuggestionIndex;
	const handleHighlightChange = (indexChange: number) => {
		const newHighlightIndex = utils.highlightNewAddress(
			items,
			currentIndex,
			state.suggestionsElement,
			indexChange,
		);
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
			utils.hideElement(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem: AutocompleteUiServiceMethod = (
	{ state, setState, services, utils },
	addressIndex,
) => {
	const mergedAddressSuggestions = utils.getMergedAddressSuggestions(state);
	const selectedAddress = mergedAddressSuggestions[addressIndex];
	const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
	const searchInputElement = state.searchInputElement;
	setState("selectedSuggestionIndex", addressIndex);

	if (entries > 1) {
		const newSearchTerm = `${street_line} ${secondary}`;
		// TODO: Set selectedAddress to state so subsequent typing by the user doesn't "revert" back out to a broader search
		// TODO: How do users "back out" of the secondary address search? Right now it persists the "selectedAddress" value until the page is refreshed

		searchInputElement.value = newSearchTerm;
		services.apiService.fetchSecondaryAddressSuggestions({
			searchString: newSearchTerm,
			selectedAddress: selectedAddress.address,
		});
	} else {
		services.addressFormUiService.populateFormWithNewAddress(selectedAddress.address);
		utils.hideElement(state.dropdownElement);
	}
};

export const formatAddressSuggestions: AutocompleteUiServiceMethod = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map((address, addressIndex): UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteUiService.handleSelectDropdownItem(
				addressIndex + state.selectedSuggestionIndex + 1,
			);
		};

		const suggestionListElements = utils.createSuggestionElement(address);
		const suggestionElement = suggestionListElements["suggestionElement"];
		suggestionElement.addEventListener("click", suggestionOnClickHandler);

		return {
			address,
			suggestionElement,
		};
	});

	setState("addressSuggestionResults", suggestionItems);
	setState("secondaryAddressSuggestionResults", []);
	utils.updateDropdownContents(suggestionItems, state.suggestionsElement);

	if (suggestionItems.length) {
		setState(
			"highlightedSuggestionIndex",
			utils.highlightNewAddress(suggestionItems, 0, state.suggestionsElement, 0),
		);
	}

	utils.showElement(state.dropdownElement);
};

export const formatSecondaryAddressSuggestions: AutocompleteUiServiceMethod = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map((address, addressIndex): UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteUiService.handleSelectDropdownItem(
				addressIndex + state.selectedSuggestionIndex + 1,
			);
		};

		const suggestionListElements = utils.createSecondarySuggestionElement(address);
		const suggestionElement = suggestionListElements["secondarySuggestionElement"];
		suggestionElement.addEventListener("click", suggestionOnClickHandler);

		return {
			address,
			suggestionElement,
		};
	});

	setState("secondaryAddressSuggestionResults", suggestionItems);

	const combinedSuggestionList = utils.getMergedAddressSuggestions(state);
	utils.updateDropdownContents(combinedSuggestionList, state.suggestionsElement);

	if (suggestionItems.length) {
		setState(
			"highlightedSuggestionIndex",
			utils.highlightNewAddress(combinedSuggestionList, -1, state.suggestionsElement, 0),
		);
	}

	utils.showElement(state.dropdownElement);
};

export const handleSearchInputOnChange: AutocompleteUiServiceMethod = ({ services }, event) => {
	const searchInputValue = (event.target as HTMLInputElement)?.value;
	if (searchInputValue.length) {
		services.apiService.fetchAddressSuggestions(searchInputValue);
	}
};

export const setupDom: AutocompleteUiServiceMethod = (
	{ state, setState, services, utils },
	addressFormElements,
) => {
	const instanceClassname = utils.getInstanceClassName(state.instanceId);
	setState("searchInputElement", addressFormElements.searchInputElement);
	const elements = utils.buildAutocompleteDomElements(instanceClassname);
	const { customStylesElement, dropdownWrapperElement } = elements;

	document.body.appendChild(dropdownWrapperElement);
	document.getElementsByTagName("head")[0].appendChild(customStylesElement);

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	utils.updateThemeClass(state.theme, [], dropdownWrapperElement);
	services.autocompleteUiService.watchSearchInputForChanges();

	const dynamicStylingHandler = () =>
		utils.updateDynamicStyles(
			customStylesElement as HTMLStyleElement,
			state.searchInputElement,
			state.instanceId,
		);

	utils.configureDynamicStyling(dynamicStylingHandler);
};

export const init: AutocompleteUiServiceMethod = ({ state, setState, utils }, config) => {
	const previousTheme = state.theme;
	const newTheme = config?.theme;
	setState("theme", newTheme);

	if (previousTheme !== state.theme) {
		utils.updateThemeClass(newTheme, previousTheme, state.dropdownWrapperElement);
	}
};

export const handleAutocompleteError: AutocompleteUiServiceMethod = ({ state, utils }) => {
	utils.hideElement(state.dropdownElement);
};

export const handleAutocompleteSecondaryError: AutocompleteUiServiceMethod = ({ state, utils }) => {
	// TODO: Implement better error handling here
	utils.hideElement(state.dropdownElement);
};
