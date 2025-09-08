import {ServiceDefinition} from "../interfaces.ts";
import {
	configureDomElements,
	configureDomForAutocomplete,
	updateAutocompleteResults,
} from "../eventHandlers/uiEventHandlers.ts";

export const uiServiceDefinition: ServiceDefinition = {
	initialState: {
		searchInputElement: null,
		streetLineInputElement: null,
		secondaryInputElement: null,
		cityInputElement: null,
		stateInputElement: null,
		zipcodeInputElement: null,
	},
	eventHandlersMap: [
		{
			handler: configureDomElements,
			events: ["SmartyAddress.receivedSmartyAddressConfig"],
		},
		{
			handler: configureDomForAutocomplete,
			events: ["UiService.foundDomElements"],
		},
		{
			handler: updateAutocompleteResults,
			events: ["ApiServices.receivedAddressSuggestions"],
		},
	],
};
