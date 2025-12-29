import { UiSuggestionItem } from "../../interfaces";
import { AutocompleteDropdownServiceHandler } from "./AutocompleteDropdownService";

export const watchSearchInputForChanges: AutocompleteDropdownServiceHandler = ({
	state,
	services,
	utils,
}) => {
	const searchInputElement = state.searchInputElement;
	utils.configureSearchInputForAutocomplete(searchInputElement);

	searchInputElement.addEventListener(
		"input",
		services.autocompleteDropdownService.handleSearchInputOnChange,
	);

	// TODO: Re-enable this later, but make sure selecting secondaries still works
	// searchInputElement.addEventListener(
	// 	"focusout",
	// 	services.autocompleteDropdownService.closeDropdown,
	// );

	searchInputElement.addEventListener(
		"keydown",
		services.autocompleteDropdownService.handleAutocompleteKeydown,
	);
};

export const handleAutocompleteKeydown: AutocompleteDropdownServiceHandler = (
	{ state, services },
	event: KeyboardEvent,
) => {
	const pressedKey = event.key;
	if (state.dropdownIsOpen) {
		const handledKeys = {
			ArrowDown: () => {
				services.autocompleteDropdownService.highlightNewAddress(1);
			},
			ArrowUp: () => {
				services.autocompleteDropdownService.highlightNewAddress(-1);
			},
			Enter: () => {
				services.autocompleteDropdownService.handleSelectDropdownItem(
					state.highlightedSuggestionIndex,
				);
			},
			Escape: () => {
				services.autocompleteDropdownService.closeDropdown();
			},
		};

		if (handledKeys[pressedKey]) {
			handledKeys[pressedKey]();
			event.preventDefault();
		}
	}
};

export const highlightNewAddress: AutocompleteDropdownServiceHandler = (
	{ state, setState, utils },
	indexChange: number,
) => {
	const items = utils.getMergedAddressSuggestions(state);
	const currentIndex = state.highlightedSuggestionIndex;
	const newIndex = (currentIndex + indexChange + items.length) % items.length;

	items.forEach((item, i) => {
		item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
	});

	utils.scrollToHighlightedSuggestion(items[newIndex].suggestionElement, state.suggestionsElement);
	setState("highlightedSuggestionIndex", newIndex);

	return newIndex;
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
		setState("selectedAddressSearchTerm", newSearchTerm);

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
			services.autocompleteDropdownService.highlightNewAddress(0),
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
			services.autocompleteDropdownService.highlightNewAddress(0),
		);
	}

	services.autocompleteDropdownService.openDropdown();
};

export const handleSearchInputOnChange: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	event,
) => {
	const searchInputValue = (event.target as HTMLInputElement)?.value;

	if (!searchInputValue.startsWith(state.selectedAddressSearchTerm)) {
		setState("selectedSuggestionIndex", -1);
	}

	const { selectedSuggestionIndex } = state;

	const mergedAddressSuggestions = utils.getMergedAddressSuggestions(state);
	const selectedAddress = mergedAddressSuggestions[selectedSuggestionIndex];

	const apiMethod =
		selectedSuggestionIndex > -1 ? "fetchSecondaryAddressSuggestions" : "fetchAddressSuggestions";

	if (searchInputValue.length) {
		services.apiService[apiMethod]({
			searchString: searchInputValue,
			selectedAddress: selectedAddress?.address,
		});
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
