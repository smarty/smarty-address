import {ServiceDefinition} from "../interfaces";
import {init, fetchAddressSuggestions, fetchSecondaryAddressSuggestions} from "../eventHandlers/apiEventHandlers";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	eventHandlers: {
		UiService_requestedSecondaryAddressSuggestions: fetchSecondaryAddressSuggestions,
	},
	serviceMethods: {
		init,
		fetchAddressSuggestions,
	},
};
