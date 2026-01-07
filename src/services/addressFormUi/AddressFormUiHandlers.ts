import { addressFormUiServiceHandler } from "./AddressFormUiService";
// TODO: Make sure input element updates trigger event bubbling (e.g. for React, and other frameworks)

export const init: addressFormUiServiceHandler = ({ setState, services }, config) => {
	setState("searchInputSelector", config?.searchInputSelector);
	setState("streetSelector", config?.streetSelector);
	setState("secondarySelector", config?.secondarySelector);
	setState("citySelector", config?.citySelector);
	setState("stateSelector", config?.stateSelector);
	setState("zipcodeSelector", config?.zipcodeSelector);

	services.addressFormUiService?.findInputElements();
};

export const findInputElements: addressFormUiServiceHandler = ({
	state,
	setState,
	services,
	utils,
}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = state;
	const { findDomElement } = utils;

	// TODO: Consider finding the DOM elements each time they're needed (instead of caching them)
	setState("streetLineInputElement", findDomElement(streetSelector));
	setState(
		"searchInputElement",
		findDomElement(searchInputSelector) ?? state.streetLineInputElement,
	);
	setState("secondaryInputElement", findDomElement(secondarySelector));
	setState("cityInputElement", findDomElement(citySelector));
	setState("stateInputElement", findDomElement(stateSelector));
	setState("zipcodeInputElement", findDomElement(zipcodeSelector));

	services.autocompleteDropdownService?.setupDom({
		searchInputElement: state.searchInputElement,
		streetLineInputElement: state.streetLineInputElement,
		secondaryInputElement: state.secondaryInputElement,
		cityInputElement: state.cityInputElement,
		stateInputElement: state.stateInputElement,
		zipcodeInputElement: state.zipcodeInputElement,
	});
};

export const populateFormWithNewAddress: addressFormUiServiceHandler = (
	{ state, utils },
	selectedAddress,
) => {
	// TODO: If elements aren't inputs, specify textContent instead of value
	// TODO: Handle if elements (e.g. state input) are <select> elements
	state.streetLineInputElement.value = utils.getStreetLineFormValue(state, selectedAddress);

	if (state.secondaryInputElement) {
		state.secondaryInputElement.value = selectedAddress.secondary;
	}
	if (state.cityInputElement) {
		state.cityInputElement.value = selectedAddress.city;
	}
	if (state.stateInputElement) {
		state.stateInputElement.value = selectedAddress.state;
	}
	if (state.zipcodeInputElement) {
		state.zipcodeInputElement.value = selectedAddress.zipcode;
	}
};
