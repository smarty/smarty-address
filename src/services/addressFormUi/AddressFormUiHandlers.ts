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

export const findInputElements: addressFormUiServiceHandler = ({ state, utils }) => {
	const {
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = state;
	const { findDomElement } = utils;

	const streetLineInputElement = findDomElement(streetSelector);
	const secondaryInputElement = findDomElement(secondarySelector);
	const cityInputElement = findDomElement(citySelector);
	const stateInputElement = findDomElement(stateSelector);
	const zipcodeInputElement = findDomElement(zipcodeSelector);

	return {
		streetLineInputElement,
		secondaryInputElement,
		cityInputElement,
		stateInputElement,
		zipcodeInputElement,
	};
};

export const populateFormWithNewAddress: addressFormUiServiceHandler = (
	{ utils, services },
	selectedAddress,
) => {
	// TODO: If elements aren't inputs, specify textContent instead of value
	// TODO: Handle if elements (e.g. state input) are <select> elements
	const elements = services.addressFormUiService?.findInputElements?.();
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
