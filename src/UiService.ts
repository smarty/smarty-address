import {EventHandlersObject, AbstractStateObject} from "./interfaces.ts";
import {defineService} from "./utils/services.ts";
import * as uiEventHandlers from "./eventHandlers/uiEventHandlers.ts";

const uiServiceDefaultState = {
	searchInputElement: null,
	streetLineInputElement: null,
	secondaryInputElement: null,
	cityInputElement: null,
	stateInputElement: null,
	zipcodeInputElement: null,
};

const uiServiceInit = (state:AbstractStateObject, eventHandlers:EventHandlersObject) => {
	state.eventDispatcher.addEventListener("SmartyAddress.receivedSmartyAddressConfig", eventHandlers.configureDomElements);
	state.eventDispatcher.addEventListener("ApiServices.receivedAddressSuggestions", eventHandlers.updateAutocompleteResults);
};

export const UiService = defineService(uiEventHandlers, uiServiceDefaultState, uiServiceInit);
