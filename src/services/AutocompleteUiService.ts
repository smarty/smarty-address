import {ServiceDefinition} from "../interfaces";
import {
	handleSelectDropdownItem,
	updateConfig,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError,
} from "../eventHandlers/autocompleteUiEventHandlers";

export const autocompleteUiService: ServiceDefinition = {
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
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: updateConfig,
		AddressFormUiService_foundInputElements: setupDom,
		ApiService_receivedAddressSuggestions: formatAddressSuggestions,
		ApiService_receivedSecondaryAddressSuggestions: formatSecondaryAddressSuggestions,
		UiService_addressSelected: handleSelectDropdownItem,
		ApiService_receivedApiErrorFetchingAddressSuggestions: handleAutocompleteError,
		ApiService_receivedApiErrorFetchingSecondaryAddressSuggestions: handleAutocompleteSecondaryError,
	},
};
