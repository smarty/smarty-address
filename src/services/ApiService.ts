import {ServiceDefinition} from "../interfaces";
import {setConfig, fetchAddressSuggestions, fetchSecondaryAddressSuggestions} from "../eventHandlers/apiEventHandlers";

export const apiService: ServiceDefinition = {
	name: "ApiService",
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	eventHandlers: {
		SmartyAddress_receivedSmartyAddressConfig: setConfig,
		UiService_requestedNewAddressSuggestions: fetchAddressSuggestions,
		UiService_requestedSecondaryAddressSuggestions: fetchSecondaryAddressSuggestions,
	},
};
