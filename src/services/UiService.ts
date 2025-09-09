import {ServiceDefinition} from "../interfaces.ts";
import {
	findInputElements,
	watchSearchInputForChanges,
	updateDropdownSuggestions,
	formatAddressSuggestions,
	createDropdownWrapperElement,
	notifyDomInitIsComplete,
	loadStylesheet,
	setThemeFromConfig,
	updateTheme,
} from "../eventHandlers/uiEventHandlers.ts";
import {themes} from "../themes.ts";

export const uiServiceDefinition: ServiceDefinition = {
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
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: [
			findInputElements,
			loadStylesheet,
			setThemeFromConfig,
		],
		UiService_foundInputElements: [
			createDropdownWrapperElement,
			watchSearchInputForChanges,
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
