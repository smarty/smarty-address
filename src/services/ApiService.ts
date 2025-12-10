import {ServiceDefinition} from "../interfaces";
import {init, fetchAddressSuggestions, fetchSecondaryAddressSuggestions} from "../serviceMethods/apiServiceMethods";
import {getAutocompleteApiResults} from "../utils/apiUtils";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	serviceMethods: {
		init,
		fetchAddressSuggestions,
		fetchSecondaryAddressSuggestions,
	},
	utils: {
		getAutocompleteApiResults,
	},
};
