import {ServiceDefinition} from "../interfaces";
import {
	findInputElements,
	populateFormWithNewAddress,
	updateConfig
} from "../eventHandlers/addressFormUiEventHandlers";

export const addressFormUiService: ServiceDefinition = {
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
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: updateConfig,
		AddressFormUiService_updatedConfig: findInputElements,
		AutocompleteUiService_receivedNewAddressForForm: populateFormWithNewAddress,
	},
};
