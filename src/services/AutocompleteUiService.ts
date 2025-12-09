import {AutocompleteUiServiceDefinition} from "../interfaces";
import {
	handleSelectDropdownItem,
	init,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError, watchSearchInputForChanges, handleAutocompleteKeydown, handleSearchInputOnChange
} from "../eventHandlers/autocompleteUiEventHandlers";

import {
	buildAutocompleteDomElements,
	configureDynamicStyling,
	createSecondarySuggestionElement,
	createSuggestionElement, hideElement, highlightNewAddress, showElement, updateDropdownContents,
	updateDynamicStyles,
	updateThemeClass
} from "../utils/domUtils";
import {getInstanceClassName, getMergedAddressSuggestions} from "../utils/uiUtils";

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
	serviceMethods: {
		init,
		setupDom,
		watchSearchInputForChanges,
		formatAddressSuggestions,
		formatSecondaryAddressSuggestions,
		handleAutocompleteError,
		handleAutocompleteSecondaryError,
		handleSelectDropdownItem,
		handleAutocompleteKeydown,
		handleSearchInputOnChange,
	},
	utils: {
		updateThemeClass,
		getInstanceClassName,
		buildAutocompleteDomElements,
		updateDynamicStyles,
		configureDynamicStyling,
		hideElement,
		showElement,
		getMergedAddressSuggestions,
		highlightNewAddress,
		updateDropdownContents,
		createSecondarySuggestionElement,
		createSuggestionElement,
	},
};
