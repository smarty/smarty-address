import { BaseService } from "../BaseService";
import {
	AddressSuggestion,
	ApiConfig,
	FetchSuggestionsCallbacks,
	SmartyAddressConfig,
} from "../../interfaces";
import { API_PARAM_KEYS } from "../utils/ApiUtilsService";

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
			const suggestions = await this.services.apiUtilsService!.getAutocompleteApiResults(
				apiConfig,
				searchString,
			);
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
			const primarySuggestions = await this.services.apiUtilsService!.getAutocompleteApiResults(
				apiConfig,
				searchString,
			);
			const newSelectedAddress = this.services.apiUtilsService!.getMatchingResult(
				primarySuggestions,
				selectedAddress,
			);
			const suggestions = newSelectedAddress
				? await this.services.apiUtilsService!.getAutocompleteApiResults(
						apiConfig,
						searchString,
						newSelectedAddress,
					)
				: [];

			callbacks.onSuccess(suggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			callbacks.onError(errorMessage);
		}
	}
}
