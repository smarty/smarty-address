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
	configureSearchInputForAutocomplete,
	findDomElement,
} from "../../utils/domUtils";
import { getInstanceClassName, getMergedAddressSuggestions } from "../../utils/uiUtils";

const initialState: AbstractStateObject = {
	theme: null,
	searchInputSelector: null,

	dropdownWrapperElement: null,
	dropdownElement: null,
	suggestionsElement: null,
	poweredBySmartyElement: null,

	selectedAddressSearchTerm: "",
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
	configureSearchInputForAutocomplete,
	findDomElement,
};

export const autocompleteDropdownService: ServiceDefinition<typeof utils, typeof initialState> = {
	initialState,
	serviceHandlers,
	utils,
} as const;

type AutocompleteDropdownServiceHandlerProps = ServiceHandlerProps<typeof utils, typeof initialState>;

export interface AutocompleteDropdownServiceHandler extends ServiceHandler<AutocompleteDropdownServiceHandlerProps> {
	(props: AutocompleteDropdownServiceHandlerProps, customProps?: any): any;
}
