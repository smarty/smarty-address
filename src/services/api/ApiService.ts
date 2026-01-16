import { BaseService } from "../BaseService";
import {
	AddressSuggestion,
	ApiConfig,
	FetchSuggestionsCallbacks,
	SmartyAddressConfig,
} from "../../interfaces";
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

	async fetchAddressSuggestions(
		searchString: string,
		callbacks: FetchSuggestionsCallbacks,
	): Promise<void> {
		try {
			const apiConfig = this.getApiConfig();
			const suggestions = await getAutocompleteApiResults(apiConfig, searchString);
			callbacks.onSuccess(suggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			callbacks.onError(errorMessage);
		}
	}

	async fetchSecondaryAddressSuggestions(
		searchString: string,
		selectedAddress: AddressSuggestion,
		callbacks: FetchSuggestionsCallbacks,
	): Promise<void> {
		try {
			const apiConfig = this.getApiConfig();
			const primarySuggestions = await getAutocompleteApiResults(apiConfig, searchString);
			const newSelectedAddress = getMatchingResult(primarySuggestions, selectedAddress);
			const suggestions = newSelectedAddress
				? await getAutocompleteApiResults(apiConfig, searchString, newSelectedAddress)
				: [];

			callbacks.onSuccess(suggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			callbacks.onError(errorMessage);
		}
	}
}
