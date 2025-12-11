import { AutocompleteDropdownServiceDefinition } from "../../interfaces";
import {
	handleSelectDropdownItem,
	init,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError,
	watchSearchInputForChanges,
	handleAutocompleteKeydown,
	handleSearchInputOnChange,
} from "./handlers";

import {
	buildAutocompleteDomElements,
	configureDynamicStyling,
	createSecondarySuggestionElement,
	createSuggestionElement,
	hideElement,
	highlightNewAddress,
	showElement,
	updateDropdownContents,
	updateDynamicStyles,
	updateThemeClass,
} from "../../utils/domUtils";
import { getInstanceClassName, getMergedAddressSuggestions } from "../../utils/uiUtils";

export const autocompleteDropdownService: AutocompleteDropdownServiceDefinition = {
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
	serviceHandlers: {
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
