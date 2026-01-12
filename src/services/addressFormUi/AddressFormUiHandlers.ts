import { addressFormUiServiceHandler } from "./AddressFormUiService";
// TODO: Make sure input element updates trigger event bubbling (e.g. for React, and other frameworks)

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
	const { findDomElement } = utils;

	const elements = {
		streetLineInputElement: findDomElement(state.streetSelector),
		secondaryInputElement: findDomElement(state.secondarySelector),
		cityInputElement: findDomElement(state.citySelector),
		stateInputElement: findDomElement(state.stateSelector),
		zipcodeInputElement: findDomElement(state.zipcodeSelector),
	};

	if (!elements?.streetLineInputElement) return;

	elements.streetLineInputElement.value = utils.getStreetLineFormValue(elements, selectedAddress);

	if (elements.secondaryInputElement) {
		elements.secondaryInputElement.value = selectedAddress.secondary ?? "";
	}
	if (elements.cityInputElement) {
		elements.cityInputElement.value = selectedAddress.city;
	}
	if (elements.stateInputElement) {
		elements.stateInputElement.value = selectedAddress.state;
	}
	if (elements.zipcodeInputElement) {
		elements.zipcodeInputElement.value = selectedAddress.zipcode;
	}
};
