import { ServiceDefinition, ServiceHandler, ServiceHandlerProps } from "../../interfaces";
import { findInputElements, populateFormWithNewAddress, init } from "./AddressFormUiHandlers";
import { findDomElement, getStreetLineFormValue } from "../../utils/domUtils";

const initialState = {
	searchInputSelector: null as string | null,
	streetSelector: null as string | null,
	secondarySelector: null as string | null,
	citySelector: null as string | null,
	stateSelector: null as string | null,
	zipcodeSelector: null as string | null,
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

export const addressFormUiService: ServiceDefinition<typeof utils, typeof initialState> = {
	initialState,
	serviceHandlers,
	utils,
};

type addressFormUiServiceHandlerProps = ServiceHandlerProps<typeof utils, typeof initialState>;

export interface addressFormUiServiceHandler extends ServiceHandler<addressFormUiServiceHandlerProps> {
	(props: addressFormUiServiceHandlerProps, customProps?: any): any;
}
