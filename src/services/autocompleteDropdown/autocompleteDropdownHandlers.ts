import { AddressSuggestion, UiSuggestionItem } from "../../interfaces";
import { AutocompleteDropdownServiceHandler } from "./AutocompleteDropdownService";

export const watchSearchInputForChanges: AutocompleteDropdownServiceHandler = ({
	state,
	services,
	utils,
}) => {
	const searchInputElement = utils.findDomElement(state.searchInputSelector) as HTMLInputElement;
	if (!searchInputElement) return;

	utils.configureSearchInputForAutocomplete(searchInputElement);

	const handleSearchInput = services.autocompleteDropdownService?.handleSearchInputOnChange;
	if (handleSearchInput) {
		searchInputElement.addEventListener("input", handleSearchInput);
	}

	// TODO: Re-enable this later, but make sure selecting secondaries still works
	// searchInputElement.addEventListener(
	// 	"focusout",
	// 	services.autocompleteDropdownService.closeDropdown,
	// );

	const handleKeydown = services.autocompleteDropdownService?.handleAutocompleteKeydown;
	if (handleKeydown) {
		searchInputElement.addEventListener("keydown", handleKeydown);
	}
};

export const handleAutocompleteKeydown: AutocompleteDropdownServiceHandler = (
	{ state, services },
	event: KeyboardEvent,
) => {
	const pressedKey = event.key;
	if (state.dropdownIsOpen) {
		const handledKeys: Record<string, () => void> = {
			ArrowDown: () => {
				services.autocompleteDropdownService?.highlightNewAddress?.(1);
			},
			ArrowUp: () => {
				services.autocompleteDropdownService?.highlightNewAddress?.(-1);
			},
			Enter: () => {
				services.autocompleteDropdownService?.handleSelectDropdownItem?.(
					state.highlightedSuggestionIndex,
				);
			},
			Escape: () => {
				services.autocompleteDropdownService?.closeDropdown?.();
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

	items.forEach((item: UiSuggestionItem, i: number) => {
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
	const searchInputElement = utils.findDomElement(state.searchInputSelector) as HTMLInputElement;
	setState("selectedSuggestionIndex", addressIndex);

	if (entries > 1 && searchInputElement) {
		const newSearchTerm = `${street_line} ${secondary}`;
		setState("selectedAddressSearchTerm", newSearchTerm);
		searchInputElement.value = newSearchTerm;
		services.apiService?.fetchSecondaryAddressSuggestions?.({
			searchString: newSearchTerm,
			selectedAddress: selectedAddress.address,
		});
		searchInputElement.focus();
	} else {
		services.addressFormUiService?.populateFormWithNewAddress?.(selectedAddress.address);
		services.autocompleteDropdownService?.closeDropdown?.();
	}
};

export const formatAddressSuggestions: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map(
		(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
			const suggestionOnClickHandler = () => {
				services.autocompleteDropdownService?.handleSelectDropdownItem?.(
					addressIndex + state.selectedSuggestionIndex + 1,
				);
			};

			const suggestionListElements = utils.createSuggestionElement(address);
			const suggestionElement = suggestionListElements["suggestionElement"] as HTMLElement;
			suggestionElement.addEventListener("click", suggestionOnClickHandler);

			return {
				address,
				suggestionElement,
			};
		},
	);

	setState("addressSuggestionResults", suggestionItems);
	setState("secondaryAddressSuggestionResults", []);
	utils.updateDropdownContents(suggestionItems, state.suggestionsElement);

	if (suggestionItems.length) {
		const newIndex = services.autocompleteDropdownService?.highlightNewAddress?.(0);
		if (newIndex !== undefined) {
			setState("highlightedSuggestionIndex", newIndex);
		}
	}

	services.autocompleteDropdownService?.openDropdown?.();
};

export const formatSecondaryAddressSuggestions: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	suggestions,
) => {
	const suggestionItems = suggestions.map(
		(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
			const suggestionOnClickHandler = () => {
				services.autocompleteDropdownService?.handleSelectDropdownItem?.(
					addressIndex + state.selectedSuggestionIndex + 1,
				);
			};

			const suggestionListElements = utils.createSecondarySuggestionElement(address);
			const suggestionElement = suggestionListElements["secondarySuggestionElement"] as HTMLElement;
			suggestionElement.addEventListener("click", suggestionOnClickHandler);

			return {
				address,
				suggestionElement,
			};
		},
	);

	setState("secondaryAddressSuggestionResults", suggestionItems);

	const combinedSuggestionList = utils.getMergedAddressSuggestions(state);
	utils.updateDropdownContents(combinedSuggestionList, state.suggestionsElement);

	if (suggestionItems.length) {
		const newIndex = services.autocompleteDropdownService?.highlightNewAddress?.(0);
		if (newIndex !== undefined) {
			setState("highlightedSuggestionIndex", newIndex);
		}
	}

	services.autocompleteDropdownService?.openDropdown?.();
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
		services.apiService?.[apiMethod]?.({
			searchString: searchInputValue,
			selectedAddress: selectedAddress?.address,
		});
	}
};

export const setupDom: AutocompleteDropdownServiceHandler = async ({
	state,
	setState,
	services,
	utils,
}) => {
	const instanceClassname = utils.getInstanceClassName(state.instanceId);
	const elements = utils.buildAutocompleteDomElements(instanceClassname);
	const { customStylesElement, dropdownWrapperElement } = elements;

	if (dropdownWrapperElement) {
		document.body.appendChild(dropdownWrapperElement);
	}
	const head = document.getElementsByTagName("head")[0];
	if (head && customStylesElement) {
		head.appendChild(customStylesElement);
	}

	Object.keys(elements).forEach((elementKey) => {
		setState(elementKey, elements[elementKey]);
	});

	if (dropdownWrapperElement instanceof HTMLElement) {
		utils.updateThemeClass(state.theme, [], dropdownWrapperElement);
	}

	const searchInputElement = (await utils.findDomElementWithRetry(
		state.searchInputSelector,
		utils.findDomElement,
	)) as HTMLInputElement | null;

	if (searchInputElement) {
		services.autocompleteDropdownService?.watchSearchInputForChanges?.();

		const dynamicStylingHandler = () =>
			utils.updateDynamicStyles(
				customStylesElement as HTMLStyleElement,
				searchInputElement,
				state.instanceId,
			);

		utils.configureDynamicStyling(dynamicStylingHandler);
	} else {
		console.error(
			`Failed to find search input element with selector "${state.searchInputSelector}".`,
		);
	}
};

export const init: AutocompleteDropdownServiceHandler = (
	{ state, setState, services, utils },
	config,
) => {
	const previousTheme = state.theme;
	const newTheme = config?.theme;
	setState("theme", newTheme);

	if (previousTheme !== state.theme) {
		utils.updateThemeClass(newTheme, previousTheme, state.dropdownWrapperElement);
	}

	setState("searchInputSelector", config.searchInputSelector ?? config.streetSelector);

	services.autocompleteDropdownService?.setupDom?.();
};

export const handleAutocompleteError: AutocompleteDropdownServiceHandler = ({ services }) => {
	services.autocompleteDropdownService?.closeDropdown?.();
};

export const handleAutocompleteSecondaryError: AutocompleteDropdownServiceHandler = ({
	services,
}) => {
	// TODO: Implement better error handling here
	services.autocompleteDropdownService?.closeDropdown?.();
};

export const closeDropdown: AutocompleteDropdownServiceHandler = ({ state, utils }) => {
	const searchInputElement = utils.findDomElement(state.searchInputSelector);
	if (searchInputElement) {
		searchInputElement.setAttribute("aria-expanded", "false");
	}
	state.dropdownIsOpen = false;
	utils.hideElement(state.dropdownElement);
};

export const openDropdown: AutocompleteDropdownServiceHandler = ({ state, utils }) => {
	const searchInputElement = utils.findDomElement(state.searchInputSelector);
	if (searchInputElement) {
		searchInputElement.setAttribute("aria-expanded", "true");
	}
	state.dropdownIsOpen = true;
	utils.showElement(state.dropdownElement);
};
