import {ServiceDefinition} from "../interfaces";
import {setConfig, fetchAddressSuggestions} from "../eventHandlers/apiEventHandlers";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	eventHandlersMap: {
		SmartyAddress_receivedSmartyAddressConfig: setConfig,
		UiService_requestedNewAddressSuggestions: fetchAddressSuggestions,
	},
};
