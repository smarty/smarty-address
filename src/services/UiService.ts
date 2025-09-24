import {ServiceDefinition} from "../interfaces.ts";
import {
	findInputElements,
	watchSearchInputForChanges,
	updateDropdownSuggestions,
	formatAddressSuggestions,
	buildDomElements,
	notifyDomInitIsComplete,
	setThemeFromConfig,
	updateTheme,
	setCustomStyles,
	handleSelectDropdownItem,
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
		smartyLogoDark: "null",
		smartyLogoLight: "null",
	},
	eventHandlersMap: {
		// TODO: Refactor this to have a 1:1 mapping of events to handlers (for easier "pluginableness" for users)
		SmartyAddress_receivedSmartyAddressConfig: [
			// TODO: This is a race condition. Logos don't load if the events don't fire in this order. Need to fix
			setThemeFromConfig,
			findInputElements,
		],
		UiService_foundInputElements: [
			buildDomElements,
			watchSearchInputForChanges,
			setCustomStyles,
		],
		UiService_builtDomElements: [
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
		UiService_addressSelected: [
			handleSelectDropdownItem,
		],
	},
};
