import { UiSuggestionItem } from "../../interfaces";
import { AutocompleteDropdownServiceHandler } from "./AutocompleteDropdownService";

export const watchSearchInputForChanges: AutocompleteDropdownServiceHandler = ({
	state,
	services,
}) => {
	const searchInputElement = state.searchInputElement;
	searchInputElement.setAttribute("autocomplete", "smarty");
	searchInputElement.setAttribute("aria-autocomplete", "list");
	searchInputElement.setAttribute("role", "combobox");
	searchInputElement.setAttribute("aria-expanded", "true");

	searchInputElement.addEventListener("input", (event: Event) => {
		services.autocompleteDropdownService.handleSearchInputOnChange(event);
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// services.autocompleteDropdownService.closeDropdown();
	});

	searchInputElement.addEventListener("keydown", (event: KeyboardEvent) => {
		services.autocompleteDropdownService.handleAutocompleteKeydown({
			pressedKey: event.key,
			event,
		});
	});
};

// TODO: Simplify this function so it no longer needs the full state and services objects.
export const handleAutocompleteKeydown: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	{ pressedKey, event }: { pressedKey: string; event: KeyboardEvent },
) => {
	const items = utils.getMergedAddressSuggestions(state);
	const handleHighlightChange = (indexChange: number) => {
		const newHighlightIndex = utils.highlightNewAddress(
			items,
			state.highlightedSuggestionIndex,
			state.suggestionsElement,
			indexChange,
		);
		setState("highlightedSuggestionIndex", newHighlightIndex);
	};

	// TODO: Only run these actions if the dropdown is open
	switch (pressedKey) {
		case "ArrowDown":
			handleHighlightChange(1);
			event.preventDefault();
			break;
		case "ArrowUp":
			handleHighlightChange(-1);
			event.preventDefault();
			break;
		case "Enter":
			const selectedAddress = items[state.highlightedSuggestionIndex];
			if (selectedAddress) {
				// TODO: Fix the value that gets passed in here. It's not populating the correct address.
				services.autocompleteDropdownService.handleSelectDropdownItem(
					state.highlightedSuggestionIndex,
				);
			}
			event.preventDefault();
			break;
		case "Escape":
			services.autocompleteDropdownService.closeDropdown();
			event.preventDefault();
			break;
	}
};

export const handleSelectDropdownItem: AutocompleteDropdownServiceHandler = (
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
		services.autocompleteDropdownService.closeDropdown();
	}
};

export const formatAddressSuggestions: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map((address, addressIndex): UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteDropdownService.handleSelectDropdownItem(
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

	services.autocompleteDropdownService.openDropdown();
};

export const formatSecondaryAddressSuggestions: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map((address, addressIndex): UiSuggestionItem => {
		const suggestionOnClickHandler = () => {
			services.autocompleteDropdownService.handleSelectDropdownItem(
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

	services.autocompleteDropdownService.openDropdown();
};

export const handleSearchInputOnChange: AutocompleteDropdownServiceHandler = (
	{ services },
	event,
) => {
	const searchInputValue = (event.target as HTMLInputElement)?.value;
	if (searchInputValue.length) {
		services.apiService.fetchAddressSuggestions(searchInputValue);
	}
};

export const setupDom: AutocompleteDropdownServiceHandler = (
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
	services.autocompleteDropdownService.watchSearchInputForChanges();

	const dynamicStylingHandler = () =>
		utils.updateDynamicStyles(
			customStylesElement as HTMLStyleElement,
			state.searchInputElement,
			state.instanceId,
		);

	utils.configureDynamicStyling(dynamicStylingHandler);
};

export const init: AutocompleteDropdownServiceHandler = ({ state, setState, utils }, config) => {
	const previousTheme = state.theme;
	const newTheme = config?.theme;
	setState("theme", newTheme);

	if (previousTheme !== state.theme) {
		utils.updateThemeClass(newTheme, previousTheme, state.dropdownWrapperElement);
	}
};

export const handleAutocompleteError: AutocompleteDropdownServiceHandler = ({ services }) => {
	services.autocompleteDropdownService.closeDropdown();
};

export const handleAutocompleteSecondaryError: AutocompleteDropdownServiceHandler = ({
	services,
}) => {
	// TODO: Implement better error handling here
	services.autocompleteDropdownService.closeDropdown();
};

export const closeDropdown: AutocompleteDropdownServiceHandler = ({ state, utils }) => {
	state.searchInputElement.setAttribute("aria-expanded", "false");
	state.dropdownIsOpen = false;
	utils.hideElement(state.dropdownElement);
};

export const openDropdown: AutocompleteDropdownServiceHandler = ({ state, utils }) => {
	state.searchInputElement.setAttribute("aria-expanded", "true");
	state.dropdownIsOpen = true;
	utils.showElement(state.dropdownElement);
};
