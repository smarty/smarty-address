import {AddressSuggestion, EventHandler} from "../interfaces.ts";

export const setApiKey: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	try {
		const selectedAddress = event.detail.selectedAddress;
		const requestData = {
			'auth-id': state.apiKey,
			search: event.detail.searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		const params = new URLSearchParams(requestData);
		const response = await fetch(`${state.autocompleteBaseUrl}?${params}`);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		const data = await response.json() as { data: AddressSuggestion[] };

		state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions: data.suggestions});
	} catch (error) {
		throw new Error(`Failed to fetch suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

const formatSelectedAddress = ({street_line, secondary = "", city, state, zipcode, entries}:AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};

const verifyAddress = async (address: AddressSuggestion): Promise<AddressSuggestion> => {
	return address;
};