import { ApiServiceHandler } from "./ApiService";
import { ApiConfig, SmartyAddressConfig } from "../../interfaces";
import { API_PARAM_KEYS } from "../../utils/apiUtils";

export const init: ApiServiceHandler = async ({ setState }, config: SmartyAddressConfig) => {
	setState("embeddedKey", config.embeddedKey);
	setState("autocompleteApiUrl", config.autocompleteApiUrl);

	API_PARAM_KEYS.forEach((param) => {
		if (config[param] !== undefined) {
			setState(param, config[param]);
		}
	});
};

export const getApiConfig: ApiServiceHandler = ({ state }): ApiConfig => {
	const config: ApiConfig = {
		embeddedKey: state.embeddedKey,
		autocompleteApiUrl: state.autocompleteApiUrl,
	};

	API_PARAM_KEYS.forEach((param) => {
		if (state[param] !== undefined) {
			(config as any)[param] = state[param];
		}
	});

	return config;
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
