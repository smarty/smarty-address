import {ServiceDefinition} from "../interfaces";
import {
	findInputElements,
	populateFormWithNewAddress,
	init
} from "../eventHandlers/addressFormUiEventHandlers";
import {findDomElement} from "../utils/domUtils";

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
	eventHandlers: {
		AutocompleteUiService_receivedNewAddressForForm: populateFormWithNewAddress,
	},
	serviceMethods: {
		init,
		findInputElements,
	},
	utils: {
		findDomElement,
	},
};
