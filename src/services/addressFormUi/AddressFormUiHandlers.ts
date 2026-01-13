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
	const { findDomElement, setInputValue, getStateValueForInput } = utils;

	const elements = {
		streetLineInputElement: findDomElement(state.streetSelector),
		secondaryInputElement: findDomElement(state.secondarySelector) as HTMLInputElement | null,
		cityInputElement: findDomElement(state.citySelector) as HTMLInputElement | null,
		stateInputElement: findDomElement(state.stateSelector) as HTMLInputElement | null,
		zipcodeInputElement: findDomElement(state.zipcodeSelector) as HTMLInputElement | null,
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
		setInputValue(
			elements.stateInputElement,
			getStateValueForInput(elements.stateInputElement, selectedAddress.state),
		);
	}
	if (elements.zipcodeInputElement) {
		setInputValue(elements.zipcodeInputElement, selectedAddress.zipcode);
	}
};
