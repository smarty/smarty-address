import { ServiceHandler } from "../../interfaces";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const init: ServiceHandler = async ({ setState }, config) => {
	setState("apiKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);
};

export const fetchAddressSuggestions: ServiceHandler = async (
	{ state, services, utils },
	searchString,
) => {
	try {
		const suggestions = await utils.getAutocompleteApiResults(
			searchString,
			state.apiKey,
			state.autocompleteApiUrl,
		);
		services.autocompleteUiService.formatAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteUiService.handleAutocompleteError({ errorName: error.message });
	}
};

export const fetchSecondaryAddressSuggestions: ServiceHandler = async (
	{ state, services, utils },
	{ selectedAddress, searchString },
) => {
	try {
		const suggestions = await utils.getAutocompleteApiResults(
			searchString,
			state.apiKey,
			state.autocompleteApiUrl,
			selectedAddress,
		);
		services.autocompleteUiService.formatSecondaryAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteUiService.handleAutocompleteSecondaryError({ errorName: error.message });
	}
};
