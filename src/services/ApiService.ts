import {ServiceDefinition} from "../interfaces";
import {init, fetchAddressSuggestions, fetchSecondaryAddressSuggestions} from "../eventHandlers/apiEventHandlers";

export const apiService: ServiceDefinition = {
	name: "apiService",
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	eventHandlers: {
		UiService_requestedNewAddressSuggestions: fetchAddressSuggestions,
		UiService_requestedSecondaryAddressSuggestions: fetchSecondaryAddressSuggestions,
	},
	serviceMethods: {
		init,
	},
};
