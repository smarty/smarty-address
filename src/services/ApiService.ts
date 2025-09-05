import {AbstractStateObject, AddressSuggestion, EventHandler, EventHandlersObject} from "../interfaces.ts";
import {defineService} from "../utils/services.ts";

const apiServiceDefaultState = {
	autocompleteBaseUrl: "https://us-autocomplete-pro.api.smarty.com/lookup",
	apiKey: "",
};

const setApiKey:EventHandler = (event:CustomEvent, state, setState) => {
	setState("apiKey", event.detail.embeddedKey);
};

const fetchAddressSuggestions:EventHandler = async (event: CustomEvent, state) => {
	const regionRestrictions = event.detail.regionRestrictions;
	const search = event.detail.searchString;

	try {
		const params = new URLSearchParams({
			'auth-id': state.apiKey,
			search,
			...(regionRestrictions?.length ? { 'include_only_regions': regionRestrictions.join(',') } : {})
		});

		const response = await fetch(`${state.autocompleteBaseUrl}?${params}`);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		const data = await response.json() as {data:AddressSuggestion[]};

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

const apiEventHandlers = {
	setApiKey,
	fetchAddressSuggestions,
};

const apiServiceInit = (state:AbstractStateObject, eventHandlers:EventHandlersObject) => {
	state.eventDispatcher.addEventListener("SmartyAddress.receivedSmartyAddressConfig", eventHandlers.setApiKey);
	state.eventDispatcher.addEventListener("UiServices.requestedNewAddressSuggestions", eventHandlers.fetchAddressSuggestions);
};

export const ApiService = defineService(apiEventHandlers, apiServiceDefaultState, apiServiceInit);
