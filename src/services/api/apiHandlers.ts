import { ApiServiceHandler } from "./ApiService";
import { AddressSuggestion, ApiConfig } from "../../interfaces";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const init: ApiServiceHandler = async ({ setState }, config) => {
	setState("apiKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);
};

export const getApiConfig: ApiServiceHandler = ({ state }): ApiConfig => {
	return { apiKey: state.apiKey, autocompleteApiUrl: state.autocompleteApiUrl };
};

export const fetchAddressSuggestions: ApiServiceHandler = async (
	{ services, utils },
	{ searchString }: { searchString: string },
) => {
	try {
		const suggestions = await utils.getAutocompleteApiResults(
			services.apiService.getApiConfig(),
			searchString,
		);
		services.autocompleteDropdownService.formatAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteDropdownService.handleAutocompleteError({ errorName: error.message });
	}
};

export const fetchSecondaryAddressSuggestions: ApiServiceHandler = async (
	{ services, utils },
	{ selectedAddress, searchString },
) => {
	const apiConfig = services.apiService.getApiConfig();

	try {
		const primarySuggestions = await utils.getAutocompleteApiResults(apiConfig, searchString);
		const newSelectedAddress = utils.getMatchingResult(primarySuggestions, selectedAddress);
		const suggestions = await utils.getAutocompleteApiResults(
			apiConfig,
			searchString,
			newSelectedAddress,
		);

		services.autocompleteDropdownService.formatSecondaryAddressSuggestions(suggestions);
	} catch (error) {
		services.autocompleteDropdownService.handleAutocompleteSecondaryError({
			errorName: error.message,
		});
	}
};
