import {EventHandler} from "../interfaces";
import {getAutocompleteApiResults} from "../utils/apiUtils";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const setConfig: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
	setState("autocompleteApiUrl", event.detail.autocompleteApiUrl);
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	try {
		const suggestions = await getAutocompleteApiResults(event.detail.searchString, state.apiKey, state.autocompleteApiUrl);
		state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions});
	} catch (error) {
		state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingAddressSuggestions", {errorName: error.message});
	}
};

export const fetchSecondaryAddressSuggestions: EventHandler = async ({event, state}) => {
	try {
		const {selectedAddress} = event.detail;
		const suggestions = await getAutocompleteApiResults(event.detail.searchString, state.apiKey, state.autocompleteApiUrl, selectedAddress);
		state.eventDispatcher.dispatch("ApiService_receivedSecondaryAddressSuggestions", {suggestions, selectedAddress});
	} catch (error) {
		state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingSecondaryAddressSuggestions", {errorName: error.message});
	}
};
