import { BaseService } from "../BaseService";
import { ApiConfig, SmartyAddressConfig } from "../../interfaces";
import { getAutocompleteApiResults, getMatchingResult, API_PARAM_KEYS } from "../../utils/apiUtils";

export class ApiService extends BaseService {
	private embeddedKey: string = "";
	private autocompleteApiUrl: string = "";
	private apiParams: Record<string, unknown> = {};

	init(config: SmartyAddressConfig) {
		this.embeddedKey = config.embeddedKey;
		this.autocompleteApiUrl = config.autocompleteApiUrl;

		API_PARAM_KEYS.forEach((param) => {
			if (config[param] !== undefined) {
				this.apiParams[param] = config[param];
			}
		});
	}

	getApiConfig(): ApiConfig {
		return {
			embeddedKey: this.embeddedKey,
			autocompleteApiUrl: this.autocompleteApiUrl,
			...this.apiParams,
		} as ApiConfig;
	}

	async fetchAddressSuggestions(searchString: string) {
		try {
			const apiConfig = this.getApiConfig();
			const suggestions = await getAutocompleteApiResults(apiConfig, searchString);
			this.services.autocompleteDropdownService?.formatAddressSuggestions(suggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.services.autocompleteDropdownService?.handleAutocompleteError(errorMessage);
		}
	}

	async fetchSecondaryAddressSuggestions(searchString: string, selectedAddress: any) {
		try {
			const apiConfig = this.getApiConfig();
			const primarySuggestions = await getAutocompleteApiResults(apiConfig, searchString);
			const newSelectedAddress = getMatchingResult(primarySuggestions, selectedAddress);
			const suggestions = newSelectedAddress
				? await getAutocompleteApiResults(apiConfig, searchString, newSelectedAddress)
				: [];

			this.services.autocompleteDropdownService?.formatSecondaryAddressSuggestions(
				suggestions,
				searchString,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.services.autocompleteDropdownService?.handleAutocompleteSecondaryError(errorMessage);
		}
	}
}
