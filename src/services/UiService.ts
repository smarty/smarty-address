import {ServiceDefinition} from "../interfaces.ts";
import {
	findInputElements,
	watchSearchInputForChanges,
	updateDropdownSuggestions,
	formatAddressSuggestions,
	createDropdownWrapperElement,
	notifyDomInitIsComplete,
	setThemeFromConfig,
	updateTheme,
	setCustomStyles,
} from "../eventHandlers/uiEventHandlers.ts";
import {themes} from "../themes.ts";

export const uiService: ServiceDefinition = {
	initialState: {
		theme: themes.default,

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
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: [
			findInputElements,
			setThemeFromConfig,
		],
		UiService_foundInputElements: [
			createDropdownWrapperElement,
			watchSearchInputForChanges,
			setCustomStyles,
		],
		UiService_createdEmptyDropdownElement: [
			notifyDomInitIsComplete,
			updateTheme,
		],
		UiService_receivedNewTheme: [
			updateTheme
		],
		ApiService_receivedAddressSuggestions: [
			formatAddressSuggestions,
		],
		UiService_formattedAddressSuggestions: [
			updateDropdownSuggestions,
		],
	},
};
