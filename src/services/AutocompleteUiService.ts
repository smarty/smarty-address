import {ServiceDefinition} from "../interfaces";
import {
	handleSelectDropdownItem,
	init,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError,
} from "../eventHandlers/autocompleteUiEventHandlers";

import {updateThemeClass} from "../utils/domUtils";

export const autocompleteUiService: ServiceDefinition = {
	name: "autocompleteUiService",
	initialState: {
		theme: null,
		searchInputElement: null,

		dropdownWrapperElement: null,
		dropdownElement: null,
		suggestionsElement: null,
		poweredBySmartyElement: null,

		highlightedSuggestionIndex: 0,
		selectedSuggestionIndex: -1,
		addressSuggestionResults: [],
		secondaryAddressSuggestionResults: [],
		customStylesElement: null,
	},
	eventHandlers: {
		AddressFormUiService_foundInputElements: setupDom,
		ApiService_receivedAddressSuggestions: formatAddressSuggestions,
		ApiService_receivedSecondaryAddressSuggestions: formatSecondaryAddressSuggestions,
		UiService_addressSelected: handleSelectDropdownItem,
		ApiService_receivedApiErrorFetchingAddressSuggestions: handleAutocompleteError,
		ApiService_receivedApiErrorFetchingSecondaryAddressSuggestions: handleAutocompleteSecondaryError,
	},
	serviceMethods: {
		init,
	},
	utils: {
		updateThemeClass,
	},
};
