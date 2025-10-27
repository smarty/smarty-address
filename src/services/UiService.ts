import {ServiceDefinition} from "../interfaces";
import {
	formatAddressSuggestions,
	notifyDomInitIsComplete,
	handleSelectDropdownItem,
	handleAutocompleteError,
	updateConfig,
	findInputElements, setupDom,
} from "../eventHandlers/uiEventHandlers";
import {themes} from "../themes";

export const uiService: ServiceDefinition = {
	initialState: {
		theme: themes.default,

		searchInputSelector: null,
		streetSelector: null,
		secondarySelector: null,
		citySelector: null,
		stateSelector: null,
		zipcodeSelector: null,

		searchInputElement: null,
		streetLineInputElement: null,
		secondaryInputElement: null,
		cityInputElement: null,
		stateInputElement: null,
		zipcodeInputElement: null,

		dropdownWrapperElement: null,
		dropdownElement: null,
		suggestionsElement: null,
		poweredBySmartyElement: null,

		highlightedSuggestionIndex: 0,
		addressSuggestionResults: [],
		customStylesElement: null,
		smartyLogoDark: "null",
		smartyLogoLight: "null",
	},
	eventHandlersMap: {
		// TODO: Refactor this to have a 1:1 mapping of events to handlers (for easier "pluginableness" for users)
		SmartyAddress_receivedSmartyAddressConfig: [
			updateConfig,
		],
		SmartyAddress_updatedConfig: [
			findInputElements,
		],
		UiService_foundInputElements: [
			setupDom,
		],
		UiService_builtDomElements: [
			notifyDomInitIsComplete,
		],
		ApiService_receivedAddressSuggestions: [
			formatAddressSuggestions,
		],
		UiService_addressSelected: [
			handleSelectDropdownItem,
		],
		ApiService_receivedApiErrorFetchingAddressSuggestions: [
			handleAutocompleteError,
		],
	},
};
