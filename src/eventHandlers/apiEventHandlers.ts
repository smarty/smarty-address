import {AddressSuggestion, EventHandler} from "../interfaces.ts";
// TODO: Add user-agent string to track source of lookups (see https://smartystreets.slack.com/archives/C096BMWCWJW/p1756307680322609)

export const setApiKey: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.)
	try {
		const selectedAddress = event.detail.selectedAddress;
		const requestData = {
			'auth-id': state.apiKey,
			search: event.detail.searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		const params = new URLSearchParams(requestData);
		const response = await fetch(`${state.autocompleteBaseUrl}?${params}`);

		// TODO: Improve error handling
		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		const data = await response.json() as { data: AddressSuggestion[] };

		state.eventDispatcher.dispatch("ApiService_receivedAddressSuggestions", {suggestions: data.suggestions});
	} catch (error) {
		throw new Error(`Failed to fetch suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

// TODO: Move this to utils
const formatSelectedAddress = ({street_line, secondary = "", city, state, zipcode, entries}:AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};

const verifyAddress = async (address: AddressSuggestion): Promise<AddressSuggestion> => {
	// TODO: Implement address verification
	// This would call the US Street Address API endpoint
	// Also need to handle international addresses
	return address;
};