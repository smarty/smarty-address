import { ApiServiceHandler } from "./ApiService";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const init: ApiServiceHandler = async ({ setState }, config) => {
	setState("apiKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);
};

export const fetchAddressSuggestions: ApiServiceHandler = async (
	{ state, services, utils },
	searchString: string,
) => {
	try {
		const suggestions = await utils.getAutocompleteApiResults(
			searchString,
			state.apiKey,
			state.autocompleteApiUrl,
		);
		services.autocompleteDropdownService.formatAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteDropdownService.handleAutocompleteError({ errorName: error.message });
	}
};

export const fetchSecondaryAddressSuggestions: ApiServiceHandler = async (
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
		services.autocompleteDropdownService.formatSecondaryAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteDropdownService.handleAutocompleteSecondaryError({
			errorName: error.message,
		});
	}
};
