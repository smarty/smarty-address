import {ServiceDefinition} from "../interfaces.ts";
import {
	findInputElements,
	watchSearchInputForChanges,
	updateDropdownSuggestions,
	formatAddressSuggestions,
	createDropdownWrapperElement,
	notifyDomInitIsComplete,
	loadStylesheet,
} from "../eventHandlers/uiEventHandlers.ts";

export const uiServiceDefinition: ServiceDefinition = {
	initialState: {
		searchInputElement: null,
		streetLineInputElement: null,
		secondaryInputElement: null,
		cityInputElement: null,
		stateInputElement: null,
		zipcodeInputElement: null,

		dropdownElement: null,
		dropdownWrapperElement: null,
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: [
			findInputElements,
			loadStylesheet,
		],
		UiService_foundInputElements: [
			createDropdownWrapperElement,
			watchSearchInputForChanges,
		],
		UiService_createdEmptyDropdownElement: [
			notifyDomInitIsComplete,
		],
		ApiService_receivedAddressSuggestions: [
			formatAddressSuggestions,
		],
		UiService_formattedAddressSuggestions: [
			updateDropdownSuggestions,
		],
	},
};
