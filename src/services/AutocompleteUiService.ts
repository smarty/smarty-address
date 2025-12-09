import {AutocompleteUiServiceDefinition} from "../interfaces";
import {
	handleSelectDropdownItem,
	init,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError, watchSearchInputForChanges,
} from "../eventHandlers/autocompleteUiEventHandlers";

import {
	buildAutocompleteDomElements,
	configureDynamicStyling, hideElement,
	updateDynamicStyles,
	updateThemeClass
} from "../utils/domUtils";
import {getInstanceClassName} from "../utils/uiUtils";

export const autocompleteUiService: AutocompleteUiServiceDefinition = {
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
	eventHandlers: {},
	serviceMethods: {
		init,
		setupDom,
		watchSearchInputForChanges,
		formatAddressSuggestions,
		formatSecondaryAddressSuggestions,
		handleAutocompleteError,
		handleAutocompleteSecondaryError,
		handleSelectDropdownItem
	},
	utils: {
		updateThemeClass,
		getInstanceClassName,
		buildAutocompleteDomElements,
		updateDynamicStyles,
		configureDynamicStyling,
		hideElement,
	},
};
