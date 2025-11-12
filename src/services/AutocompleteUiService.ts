import {ServiceDefinition} from "../interfaces";
import {
	handleSelectDropdownItem,
	updateConfig,
	formatAddressSuggestions,
	handleAutocompleteError, setupDom
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
		addressSuggestionResults: [],
		customStylesElement: null,
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: updateConfig,
		AddressFormUiService_foundInputElements: setupDom,
		ApiService_receivedAddressSuggestions: formatAddressSuggestions,
		UiService_addressSelected: handleSelectDropdownItem,
		ApiService_receivedApiErrorFetchingAddressSuggestions: handleAutocompleteError,
	},
};
