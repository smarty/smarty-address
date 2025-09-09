import {AddressSuggestion, EventHandler} from "../interfaces.ts";

export const setApiKey: EventHandler = ({event, setState}) => {
	setState("apiKey", event.detail.embeddedKey);
};

export const fetchAddressSuggestions: EventHandler = async ({event, state}) => {
	const regionRestrictions = event.detail.regionRestrictions;
	const search = event.detail.searchString;

	try {
		const params = new URLSearchParams({
			'auth-id': state.apiKey,
			search,
			...(regionRestrictions?.length ? {'include_only_regions': regionRestrictions.join(',')} : {})
		});

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

const FetchSecondarySuggestions = async () => {

};

const verifyAddress = async (address: AddressSuggestion): Promise<AddressSuggestion> => {
	return address;
};