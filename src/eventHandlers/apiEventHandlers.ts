import {EventHandler} from "../interfaces";
import {getAutocompleteApiResults} from "../utils/apiUtils";

export const setConfig: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
	setState("autocompleteApiUrl", event.detail.autocompleteApiUrl);
};

export const fetchSecondaryAddressSuggestions: EventHandler = async ({event, state}) => {
	try {
		const suggestions = await getAutocompleteApiResults(event.detail.searchString, state.apiKey, state.autocompleteApiUrl, event.detail.selectedAddress);
		state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions});
	} catch (error) {
		state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingSecondaryAddressSuggestions", {errorName: error.message});
	}
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values
	try {
		const suggestions = await getAutocompleteApiResults(event.detail.searchString, state.apiKey, state.autocompleteApiUrl);
		state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions});
	} catch (error) {
		state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingAddressSuggestions", {errorName: error.message});
	}
};

