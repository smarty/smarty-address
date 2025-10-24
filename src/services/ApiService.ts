import {ServiceDefinition} from "../interfaces";
import {setApiKey, fetchAddressSuggestions} from "../eventHandlers/apiEventHandlers";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteBaseUrl: "https://us-autocomplete-pro.api.smarty.com/lookup",
		apiKey: "",
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: [setApiKey],
		UiService_requestedNewAddressSuggestions: [fetchAddressSuggestions],
	},
};
