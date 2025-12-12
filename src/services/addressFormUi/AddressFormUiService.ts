import { ServiceDefinition, ServiceHandler, ServiceHandlerProps } from "../../interfaces";
import { findInputElements, populateFormWithNewAddress, init } from "./AddressFormUiHandlers";
import { findDomElement, getStreetLineFormValue } from "../../utils/domUtils";

const initialState = {
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
};

const serviceHandlers = {
	init,
	findInputElements,
	populateFormWithNewAddress,
};

const utils = {
	findDomElement,
	getStreetLineFormValue,
};

export const addressFormUiService: ServiceDefinition = {
	initialState,
	serviceHandlers,
	utils,
};

interface addressFormUiServiceHandlerProps extends ServiceHandlerProps {
	utils: typeof utils;
	state: typeof initialState;
}

export interface addressFormUiServiceHandler extends ServiceHandler {
	(props: addressFormUiServiceHandlerProps, customProps?: any): any;
}
