import {ServiceDefinition} from "../interfaces";
import {
	findInputElements,
	populateFormWithNewAddress,
	init
} from "../eventHandlers/addressFormUiEventHandlers";

export const addressFormUiService: ServiceDefinition = {
	name: "addressFormUiService",
	initialState: {
		searchInputSelector: null,
		streetSelector: null,
		secondarySelector: null,
		citySelector: null,
		stateSelector: null,
		zipcodeSelector: null,

		searchInputElement: null,
		streetLineInputElement: null,
		secondaryInputElement: null,
		cityInputElement: null,
		stateInputElement: null,
		zipcodeInputElement: null,
	},
	eventHandlers: {
		SmartyAddress_receivedSmartyAddressConfig: init,
		AddressFormUiService_updatedConfig: findInputElements,
		AutocompleteUiService_receivedNewAddressForForm: populateFormWithNewAddress,
	},
};
