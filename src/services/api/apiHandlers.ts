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
		"maxResults",
		"includeOnlyCities",
		"includeOnlyStates",
		"includeOnlyZipCodes",
		"excludeStates",
		"preferCities",
		"preferStates",
		"preferZipCodes",
		"preferRatio",
		"preferGeolocation",
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
		maxResults: state.maxResults,
		includeOnlyCities: state.includeOnlyCities,
		includeOnlyStates: state.includeOnlyStates,
		includeOnlyZipCodes: state.includeOnlyZipCodes,
		excludeStates: state.excludeStates,
		preferCities: state.preferCities,
		preferStates: state.preferStates,
		preferZipCodes: state.preferZipCodes,
		preferRatio: state.preferRatio,
		preferGeolocation: state.preferGeolocation,
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
