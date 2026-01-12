import { addressFormUiServiceHandler } from "./AddressFormUiService";

export const init: addressFormUiServiceHandler = ({ setState }, config) => {
	setState("searchInputSelector", config?.searchInputSelector);
	setState("streetSelector", config?.streetSelector);
	setState("secondarySelector", config?.secondarySelector);
	setState("citySelector", config?.citySelector);
	setState("stateSelector", config?.stateSelector);
	setState("zipcodeSelector", config?.zipcodeSelector);
};

export const populateFormWithNewAddress: addressFormUiServiceHandler = (
	{ utils, state },
	selectedAddress,
) => {
	// TODO: If elements aren't inputs (e.g. <div>, <p>, etc.), specify textContent instead of value
	// TODO: Handle if elements (e.g. state input) are <select> elements
	// TODO: Handle if elements are textareas
	const { findDomElement, setInputValue } = utils;

	const elements = {
		streetLineInputElement: findDomElement(state.streetSelector),
		secondaryInputElement: findDomElement(state.secondarySelector),
		cityInputElement: findDomElement(state.citySelector),
		stateInputElement: findDomElement(state.stateSelector),
		zipcodeInputElement: findDomElement(state.zipcodeSelector),
	};

	if (!elements?.streetLineInputElement) return;

	setInputValue(
		elements.streetLineInputElement,
		utils.getStreetLineFormValue(elements, selectedAddress),
	);

	if (elements.secondaryInputElement) {
		setInputValue(elements.secondaryInputElement, selectedAddress.secondary ?? "");
	}
	if (elements.cityInputElement) {
		setInputValue(elements.cityInputElement, selectedAddress.city);
	}
	if (elements.stateInputElement) {
		setInputValue(elements.stateInputElement, selectedAddress.state);
	}
	if (elements.zipcodeInputElement) {
		setInputValue(elements.zipcodeInputElement, selectedAddress.zipcode);
	}
};
