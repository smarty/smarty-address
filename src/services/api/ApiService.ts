import { ServiceDefinition } from "../../interfaces";
import { init, fetchAddressSuggestions, fetchSecondaryAddressSuggestions } from "./apiHandlers";
import { getAutocompleteApiResults } from "../../utils/apiUtils";

export const apiService: ServiceDefinition = {
	initialState: {
		autocompleteApiUrl: "",
		apiKey: "",
	},
	serviceHandlers: {
		init,
		fetchAddressSuggestions,
		fetchSecondaryAddressSuggestions,
	},
	utils: {
		getAutocompleteApiResults,
	},
};
