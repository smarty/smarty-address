import {EventHandler, ServiceMethod} from "../interfaces";
import {getAutocompleteApiResults} from "../utils/apiUtils";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const init:ServiceMethod = async ({setState}, config) => {
	setState("apiKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);
};

export const fetchAddressSuggestions: ServiceMethod = async ({state, services}, searchString) => {
	try {
		const suggestions = await getAutocompleteApiResults(searchString, state.apiKey, state.autocompleteApiUrl);
		services.autocompleteUiService.formatAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteUiService.handleAutocompleteError({errorName: error.message});
	}
};

export const fetchSecondaryAddressSuggestions: EventHandler = async ({event, state, services}) => {
	try {
		const {selectedAddress, searchString} = event.detail;
		const suggestions = await getAutocompleteApiResults(searchString, state.apiKey, state.autocompleteApiUrl, selectedAddress);
		services.autocompleteUiService.formatSecondaryAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteUiService.handleAutocompleteSecondaryError({errorName: error.message});
	}
};
