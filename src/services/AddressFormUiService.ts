import { ServiceDefinition } from "../interfaces";
import {
	findInputElements,
	populateFormWithNewAddress,
	init,
} from "../serviceMethods/addressFormUiMethods";
import { findDomElement, getStreetLineFormValue } from "../utils/domUtils";

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
	serviceMethods: {
		init,
		findInputElements,
		populateFormWithNewAddress,
	},
	utils: {
		findDomElement,
		getStreetLineFormValue,
	},
};
