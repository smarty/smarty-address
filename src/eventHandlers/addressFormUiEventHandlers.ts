import {EventHandler} from "../interfaces";
import {findDomElement, getStreetLineFormValue} from "../utils/domUtils";
// TODO: Make sure input element updates trigger event bubbling (e.g. for React, and other frameworks)

export const updateConfig:EventHandler = ({event, state, setState}) => {
	setState("searchInputSelector", event.detail?.searchInputSelector);
	setState("streetSelector", event.detail?.streetSelector);
	setState("secondarySelector", event.detail?.secondarySelector);
	setState("citySelector", event.detail?.citySelector);
	setState("stateSelector", event.detail?.stateSelector);
	setState("zipcodeSelector", event.detail?.zipcodeSelector);

	state.eventDispatcher.dispatch("AddressFormUiService_updatedConfig");
};

export const findInputElements:EventHandler = ({state, setState}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = state;

	// TODO: Consider finding the DOM elements each time they're needed (instead of caching them)
	setState("streetLineInputElement", findDomElement(streetSelector));
	setState("searchInputElement", findDomElement(searchInputSelector) ?? state.streetLineInputElement);
	setState("secondaryInputElement", findDomElement(secondarySelector));
	setState("cityInputElement", findDomElement(citySelector));
	setState("stateInputElement", findDomElement(stateSelector));
	setState("zipcodeInputElement", findDomElement(zipcodeSelector));

	state.eventDispatcher.dispatch("AddressFormUiService_foundInputElements", {
		searchInputElement: state.searchInputElement,
		streetLineInputElement: state.streetLineInputElement,
		secondaryInputElement: state.secondaryInputElement,
		cityInputElement: state.cityInputElement,
		stateInputElement: state.stateInputElement,
		zipcodeInputElement: state.zipcodeInputElement,
	});
};

export const populateFormWithNewAddress:EventHandler = ({event, state}) => {
	const {selectedAddress} = event.detail;

	// TODO: If elements aren't inputs, specify textContent instead of value
	// TODO: Handle if elements (e.g. state input) are <select> elements
	state.streetLineInputElement.value = getStreetLineFormValue(state, selectedAddress);

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

	// TODO: Consider splitting service and event names into separate strings
	state.eventDispatcher.dispatch("AddressFormUiService_populatedFormWithAddress", {selectedAddress});
};
