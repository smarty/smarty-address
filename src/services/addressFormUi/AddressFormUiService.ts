import { ServiceDefinition } from "../../interfaces";
import { findInputElements, populateFormWithNewAddress, init } from "./handlers";
import { findDomElement, getStreetLineFormValue } from "../../utils/domUtils";

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
	serviceHandlers: {
		init,
		findInputElements,
		populateFormWithNewAddress,
	},
	utils: {
		findDomElement,
		getStreetLineFormValue,
	},
};
