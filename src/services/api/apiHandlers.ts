import { ApiServiceHandler } from "./ApiService";
import { ApiConfig, SmartyAddressConfig } from "../../interfaces";
// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.). These would likely be set as "config" values

export const init: ApiServiceHandler = async (
	{ setState },
	config: SmartyAddressConfig,
) => {
	setState("apiKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);

	const optionalParams = [
		"max_results",
		"include_only_cities",
		"include_only_states",
		"include_only_zip_codes",
		"exclude_states",
		"prefer_cities",
		"prefer_states",
		"prefer_zip_codes",
		"prefer_ratio",
		"prefer_geolocation",
		"source",
	] as const;

	optionalParams.forEach((param) => {
		if (config[param] !== undefined) {
			setState(param, config[param]);
		}
	});
};

export const getApiConfig: ApiServiceHandler = ({ state }): ApiConfig => {
	return {
		apiKey: state.apiKey,
		autocompleteApiUrl: state.autocompleteApiUrl,
		max_results: state.max_results,
		include_only_cities: state.include_only_cities,
		include_only_states: state.include_only_states,
		include_only_zip_codes: state.include_only_zip_codes,
		exclude_states: state.exclude_states,
		prefer_cities: state.prefer_cities,
		prefer_states: state.prefer_states,
		prefer_zip_codes: state.prefer_zip_codes,
		prefer_ratio: state.prefer_ratio,
		prefer_geolocation: state.prefer_geolocation,
		source: state.source,
	};
};

export const fetchAddressSuggestions: ApiServiceHandler = async (
	{ services, utils },
	{ searchString }: { searchString: string },
) => {
	try {
		const apiConfig = services.apiService?.getApiConfig?.();
		const suggestions = await utils.getAutocompleteApiResults(apiConfig, searchString);
		services.autocompleteDropdownService?.formatAddressSuggestions?.(suggestions);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		services.autocompleteDropdownService?.handleAutocompleteError?.({ errorName: errorMessage });
	}
};

export const fetchSecondaryAddressSuggestions: ApiServiceHandler = async (
	{ services, utils },
	{ searchString, selectedAddress },
) => {
	try {
		const apiConfig = services.apiService?.getApiConfig?.();
		const primarySuggestions = await utils.getAutocompleteApiResults(apiConfig, searchString);
		const newSelectedAddress = utils.getMatchingResult(primarySuggestions, selectedAddress);
		const suggestions = newSelectedAddress
			? await utils.getAutocompleteApiResults(apiConfig, searchString, newSelectedAddress)
			: [];

		services.autocompleteDropdownService?.formatSecondaryAddressSuggestions?.(suggestions);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		services.autocompleteDropdownService?.handleAutocompleteSecondaryError?.({
			errorName: errorMessage,
		});
	}
};
