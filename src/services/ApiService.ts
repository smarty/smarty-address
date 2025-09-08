import {
	AddressSuggestion,
	EventHandler,
	ServiceDefinition
} from "../interfaces.ts";

const setApiKey: EventHandler = (event: CustomEvent, state, setState) => {
	setState("apiKey", event.detail.embeddedKey);
};

const fetchAddressSuggestions: EventHandler = async (event: CustomEvent, state) => {
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

		state.eventDispatcher.dispatch("ApiServices.receivedAddressSuggestions", {suggestions: data.suggestions});
	} catch (error) {
		throw new Error(`Failed to fetch suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

const FetchSecondarySuggestions = async () => {

};

const verifyAddress = async (address: AddressSuggestion): Promise<AddressSuggestion> => {
	return address;
};

export const apiServiceDefinition: ServiceDefinition = {
	initialState: {
		autocompleteBaseUrl: "https://us-autocomplete-pro.api.smarty.com/lookup",
		apiKey: "",
	},
	eventHandlersMap: [
		{
			handler: setApiKey,
			events: ["SmartyAddress.receivedSmartyAddressConfig"],
		},
		{
			handler: fetchAddressSuggestions,
			events: ["UiServices.requestedNewAddressSuggestions"],
		}
	]
};
