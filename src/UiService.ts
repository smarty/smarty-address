import {EventHandlersObject, AbstractStateObject} from "./interfaces.ts";
import {defineService} from "./utils/services.ts";
import {
	configureDomElements,
	configureDomForAutocomplete,
	updateAutocompleteResults,
} from "./eventHandlers/uiEventHandlers.ts";

const uiServiceDefaultState = {
	searchInputElement: null,
	streetLineInputElement: null,
	secondaryInputElement: null,
	cityInputElement: null,
	stateInputElement: null,
	zipcodeInputElement: null,
};

const uiEventHandlers = {
	configureDomElements,
	configureDomForAutocomplete,
	updateAutocompleteResults,
};

const uiServiceInit = (state:AbstractStateObject, eventHandlers:EventHandlersObject) => {
	state.eventDispatcher.addEventListener("SmartyAddress.receivedSmartyAddressConfig", eventHandlers.configureDomElements);
	state.eventDispatcher.addEventListener("UiService.foundDomElements", eventHandlers.configureDomForAutocomplete);
	state.eventDispatcher.addEventListener("ApiServices.receivedAddressSuggestions", eventHandlers.updateAutocompleteResults);
};

export const UiService = defineService(uiEventHandlers, uiServiceDefaultState, uiServiceInit);
