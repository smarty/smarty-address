import {ServiceDefinition} from "../interfaces";
import {setApiKey, fetchAddressSuggestions} from "../eventHandlers/apiEventHandlers";
import {AUTOCOMPLETE_BASE_API_URL} from "../constants.ts";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteBaseUrl: AUTOCOMPLETE_BASE_API_URL,
		apiKey: "",
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: setApiKey,
		UiService_requestedNewAddressSuggestions: fetchAddressSuggestions,
	},
};
