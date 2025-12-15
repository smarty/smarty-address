import {
	AbstractStateObject,
	ServiceDefinition,
	ServiceHandler,
	ServiceHandlerMap,
	ServiceHandlerProps,
} from "../../interfaces";
import {
	handleSelectDropdownItem,
	init,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	setupDom,
	handleAutocompleteSecondaryError,
	highlightNewAddress,
	watchSearchInputForChanges,
	handleAutocompleteKeydown,
	handleSearchInputOnChange,
	closeDropdown,
	openDropdown,
} from "./autocompleteDropdownHandlers";

import {
	buildAutocompleteDomElements,
	configureDynamicStyling,
	createSecondarySuggestionElement,
	createSuggestionElement,
	scrollToHighlightedSuggestion,
	hideElement,
	showElement,
	updateDropdownContents,
	updateDynamicStyles,
	updateThemeClass,
} from "../../utils/domUtils";
import { getInstanceClassName, getMergedAddressSuggestions } from "../../utils/uiUtils";

const initialState: AbstractStateObject = {
	theme: null,
	searchInputElement: null,

	dropdownWrapperElement: null,
	dropdownElement: null,
	suggestionsElement: null,
	poweredBySmartyElement: null,

	dropdownIsOpen: false,
	highlightedSuggestionIndex: 0,
	selectedSuggestionIndex: -1,
	addressSuggestionResults: [],
	secondaryAddressSuggestionResults: [],
	customStylesElement: null,
} as const;

const serviceHandlers: ServiceHandlerMap = {
	init,
	setupDom,
	watchSearchInputForChanges,
	formatAddressSuggestions,
	formatSecondaryAddressSuggestions,
	handleAutocompleteError,
	handleAutocompleteSecondaryError,
	highlightNewAddress,
	handleSelectDropdownItem,
	handleAutocompleteKeydown,
	handleSearchInputOnChange,
	closeDropdown,
	openDropdown,
};

const utils = {
	updateThemeClass,
	getInstanceClassName,
	buildAutocompleteDomElements,
	updateDynamicStyles,
	configureDynamicStyling,
	hideElement,
	showElement,
	getMergedAddressSuggestions,
	updateDropdownContents,
	scrollToHighlightedSuggestion,
	createSecondarySuggestionElement,
	createSuggestionElement,
};

export const autocompleteDropdownService: ServiceDefinition = {
	initialState,
	serviceHandlers,
	utils,
} as const;

interface AutocompleteDropdownServiceHandlerProps extends ServiceHandlerProps {
	utils: typeof utils;
	state: typeof initialState;
}

export interface AutocompleteDropdownServiceHandler extends ServiceHandler {
	(props: AutocompleteDropdownServiceHandlerProps, customProps?: any): any;
}
