import {AddressSuggestion, ApiErrorResponse, EventHandler} from "../interfaces";
import {formatSelectedAddress, getApiError, unknownError} from "../utils/apiUtils";

// TODO: Dynamically update the version to match `package.json`
const USER_AGENT = "name:smarty-address-plugin,version:0.1.0";

export const setApiKey: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values
	try {
		const selectedAddress = event.detail.selectedAddress;
		const requestData = {
			"auth-id": state.apiKey,
			"user-agent": USER_AGENT,
			search: event.detail.searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		const params = new URLSearchParams(requestData);
		const response = await fetch(`${state.autocompleteBaseUrl}?${params}`);

		if (response.ok) {
			const {suggestions} = await response.json() as { suggestions: AddressSuggestion[] };
			state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions});
		} else {
			const errorResponse = await response.json() as { errors: ApiErrorResponse[] };
			const error = getApiError(response.status, errorResponse);
			// TODO: Figure out if we want to add styling to the console messages
			console.log(error.message);

			state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingAddressSuggestions", {
				errorName: error.name,
			});
		}
	} catch (error) {
		console.log(unknownError.message);
		state.eventDispatcher.dispatch("ApiService_receivedApiErrorFetchingAddressSuggestions", {errorName: unknownError.name});
	}
};

const verifyAddress = async (address: AddressSuggestion): Promise<AddressSuggestion> => {
	// TODO: Implement address verification
	// This would call the US Street Address API endpoint
	// Also need to handle international addresses
	return address;
};
