import {ServiceDefinition} from "../interfaces.ts";
import {setApiKey, fetchAddressSuggestions} from "../eventHandlers/apiEventHandlers.ts";

export const apiServiceDefinition: ServiceDefinition = {
	initialState: {
		autocompleteBaseUrl: "https://us-autocomplete-pro.api.smarty.com/lookup",
		apiKey: "",
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: [setApiKey],
		UiService_requestedNewAddressSuggestions: [fetchAddressSuggestions],
	},
};
