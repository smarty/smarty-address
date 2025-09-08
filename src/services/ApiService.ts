import {ServiceDefinition} from "../interfaces.ts";
import {setApiKey, fetchAddressSuggestions} from "../eventHandlers/apiEventHandlers.ts";

export const apiServiceDefinition: ServiceDefinition = {
	initialState: {
		autocompleteBaseUrl: "https://us-autocomplete-pro.api.smarty.com/lookup",
		apiKey: "",
	},
	eventHandlersMap: [
		{
			handler: setApiKey,
			events: ["SmartyAddress.receivedSmartyAddressConfig"],
		},
		{
			handler: fetchAddressSuggestions,
			events: ["UiServices.requestedNewAddressSuggestions"],
		},
	]
};
