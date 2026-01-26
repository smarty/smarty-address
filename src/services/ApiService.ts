import { BaseService } from "./BaseService";
import { AddressSuggestion, ApiConfig, NormalizedSmartyAddressConfig } from "../interfaces";
import { APP_VERSION } from "../constants";

export interface ApiErrorResponse {
	id: number;
	message: string;
}

export interface FetchSuggestionsCallbacks {
	onSuccess: (suggestions: AddressSuggestion[], searchString: string) => void;
	onError: (errorMessage: string) => void;
}

const USER_AGENT = `name:smarty-address-plugin,version:${APP_VERSION}`;

export const API_PARAM_MAP = {
	maxResults: "max_results",
	includeOnlyLocalities: "include_only_cities",
	includeOnlyAdministrativeAreas: "include_only_states",
	includeOnlyPostalCodes: "include_only_zip_codes",
	excludeAdministrativeAreas: "exclude_states",
	preferLocalities: "prefer_cities",
	preferAdministrativeAreas: "prefer_states",
	preferPostalCodes: "prefer_zip_codes",
	preferRatio: "prefer_ratio",
	preferGeolocation: "prefer_geolocation",
	source: "source",
} as const;

export type ApiParamKey = keyof typeof API_PARAM_MAP;
export const API_PARAM_KEYS = Object.keys(API_PARAM_MAP) as ApiParamKey[];

export const unknownError = {
	name: "unknownError",
	statusCode: 0,
	message: "SmartyAddress: an unknown error has occurred.",
};

const knownAutocompleteErrors = [
	{
		name: "authenticationRequired",
		statusCode: 401,
		errorId: 1611079217,
		message: `Smarty was not able to authenticate your embedded key. See https://www.smarty.com/docs/cloud/us-autocomplete-pro-api#pro-http-response-status for details or contact Smarty support.`,
	},
	{
		name: "tooManyRequests_security",
		statusCode: 429,
		errorId: 1730482419,
		message: `The limit for your embedded key has been reached. See https://www.smarty.com/docs/cloud/us-autocomplete-pro-api#pro-http-response-status for details or contact Smarty support.`,
	},
	{
		name: "tooManyRequests_plan",
		statusCode: 429,
		errorId: 1637696258,
		message: `The rate limit for your subscription has been reached. See https://www.smarty.com/docs/cloud/us-autocomplete-pro-api#pro-http-response-status for details or contact Smarty support.`,
	},
];

const formatSelectedAddress = ({
	street_line,
	secondary,
	entries,
	city,
	state,
	zipcode,
}: AddressSuggestion): string => {
	const addressComponents = [street_line, secondary, `(${entries})`, city, state, zipcode];
	return addressComponents.filter(Boolean).join(" ");
};

export class ApiService extends BaseService {
	private embeddedKey: string = "";
	private autocompleteApiUrl: string = "";
	private apiParams: Record<string, unknown> = {};

	init(config: NormalizedSmartyAddressConfig) {
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
		await this.fetchWithCallbacks(callbacks, searchString, async (apiConfig) => {
			return this.getAutocompleteApiResults(apiConfig, searchString);
		});
	}

	async fetchSecondaryAddressSuggestions(
		searchString: string,
		selectedAddress: AddressSuggestion,
		callbacks: FetchSuggestionsCallbacks,
	): Promise<void> {
		await this.fetchWithCallbacks(callbacks, searchString, async (apiConfig) => {
			const primarySuggestions = await this.getAutocompleteApiResults(apiConfig, searchString);
			const newSelectedAddress = this.getMatchingResult(primarySuggestions, selectedAddress);
			return newSelectedAddress
				? await this.getAutocompleteApiResults(apiConfig, searchString, newSelectedAddress)
				: [];
		});
	}

	private async fetchWithCallbacks(
		callbacks: FetchSuggestionsCallbacks,
		searchString: string,
		fetchFn: (apiConfig: ApiConfig) => Promise<AddressSuggestion[]>,
	): Promise<void> {
		try {
			const apiConfig = this.getApiConfig();
			const suggestions = await fetchFn(apiConfig);
			callbacks.onSuccess(suggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			callbacks.onError(errorMessage);
		}
	}

	async getAutocompleteApiResults(
		apiConfig: ApiConfig,
		searchString: string,
		selectedAddress: AddressSuggestion | null = null,
		fetchFn: typeof fetch = fetch,
	): Promise<AddressSuggestion[]> {
		try {
			const requestData = this.buildRequestData(apiConfig, searchString, selectedAddress);
			const params = new URLSearchParams(requestData);
			const response = await fetchFn(`${apiConfig.autocompleteApiUrl}?${params}`);

			return await this.parseResponse(response);
		} catch (error) {
			return this.handleFetchError(error);
		}
	}

	private buildRequestData(
		apiConfig: ApiConfig,
		searchString: string,
		selectedAddress: AddressSuggestion | null,
	): Record<string, string> {
		const requestData: Record<string, string> = {
			"auth-id": apiConfig.embeddedKey,
			"user-agent": USER_AGENT,
			search: searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		API_PARAM_KEYS.forEach((param) => {
			const value = apiConfig[param];
			if (value !== undefined) {
				const apiParamName = API_PARAM_MAP[param];
				requestData[apiParamName] = Array.isArray(value) ? value.join(";") : String(value);
			}
		});

		return requestData;
	}

	private async parseResponse(response: Response): Promise<AddressSuggestion[]> {
		if (response.ok) {
			const { suggestions } = (await response.json()) as { suggestions: AddressSuggestion[] };
			return suggestions;
		}

		const errorResponse = (await response.json()) as { errors: ApiErrorResponse[] };
		const error = this.getApiError(response.status, errorResponse);
		console.error(error.message);
		throw new Error(error.name);
	}

	private handleFetchError(error: unknown): never {
		if (error instanceof Error) {
			const knownErrorNames = knownAutocompleteErrors.map((e) => e.name);
			if (knownErrorNames.includes(error.message)) {
				throw error;
			}
		}
		console.error(unknownError.message);
		throw new Error(unknownError.name);
	}

	getMatchingResult(
		primarySuggestions: AddressSuggestion[],
		selectedAddress: AddressSuggestion,
	): AddressSuggestion | undefined {
		const matchingResult = primarySuggestions.find((suggestion) => {
			return (
				suggestion.street_line.trim() === selectedAddress.street_line.trim() &&
				suggestion.secondary?.includes(selectedAddress.secondary?.trim() ?? "")
			);
		});

		return matchingResult;
	}

	getApiError(
		statusCode: number,
		errorsResponse: { errors: ApiErrorResponse[] },
	): { name: string; statusCode: number; message: string } {
		const firstError = errorsResponse.errors[0];

		const matchedError = knownAutocompleteErrors.find((knownError) => {
			const errorIdMatches = !knownError.errorId || knownError.errorId === firstError?.id;
			return knownError.statusCode === statusCode && errorIdMatches;
		});

		return matchedError ?? unknownError;
	}
}
