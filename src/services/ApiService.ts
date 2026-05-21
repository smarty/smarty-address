import { BaseService } from "./BaseService";
import { AutocompleteSuggestion, ApiConfig, NormalizedSmartyAddressConfig } from "../interfaces";
import { APP_VERSION, US_COUNTRY_CODES } from "../constants";

export interface ApiErrorResponse {
	id?: number;
	name?: string;
	message?: string;
	fields?: string[];
}

export interface FetchAutocompleteSuggestionsCallbacks {
	onSuccess: (suggestions: AutocompleteSuggestion[], searchString: string) => void;
	onError: (errorMessage: string) => void;
}

const USER_AGENT = `name:smarty-address-plugin,version:${APP_VERSION}`;

export const US_API_PARAM_MAP = {
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

export const INTERNATIONAL_API_PARAM_MAP = {
	maxResults: "max_results",
	includeOnlyLocalities: "include_only_locality",
	includeOnlyPostalCodes: "include_only_postal_code",
	preferGeolocation: "geolocation",
} as const;

export const API_PARAM_MAP = US_API_PARAM_MAP;

export type ApiParamKey = keyof typeof US_API_PARAM_MAP;
export const API_PARAM_KEYS = Object.keys(US_API_PARAM_MAP) as ApiParamKey[];

interface InternationalCandidateSummary {
	address_id: string;
	address_text: string;
	entries?: number;
}

interface InternationalCandidateDetail {
	street?: string;
	locality?: string;
	administrative_area?: string;
	administrative_area_short?: string;
	administrative_area_long?: string;
	postal_code?: string;
	country_iso3?: string;
}

type InternationalCandidate = InternationalCandidateSummary & InternationalCandidateDetail;

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
}: AutocompleteSuggestion): string => {
	const addressComponents = [street_line, secondary, `(${entries})`, city, state, zipcode];
	return addressComponents.filter(Boolean).join(" ");
};

export class ApiService extends BaseService {
	private embeddedKey: string = "";
	private autocompleteApiUrl: string = "";
	private internationalAutocompleteApiUrl: string = "";
	private apiParams: Record<string, unknown> = {};
	private staticCountry: string | null = null;
	private countrySelector: string | null = null;

	init(config: NormalizedSmartyAddressConfig) {
		this.embeddedKey = config.embeddedKey;
		this.autocompleteApiUrl = config.autocompleteApiUrl;
		this.internationalAutocompleteApiUrl = config.internationalAutocompleteApiUrl;
		this.staticCountry = config.country?.trim() || null;
		this.countrySelector = config.countrySelector ?? null;

		API_PARAM_KEYS.forEach((param) => {
			if (config[param] !== undefined) {
				this.apiParams[param] = config[param];
			}
		});
	}

	getCountry(): string {
		if (this.countrySelector) {
			const element = this.getService("domService").findDomElement(this.countrySelector) as
				| HTMLInputElement
				| HTMLSelectElement
				| null;
			const fromSelector = element?.value?.trim();
			if (fromSelector) return fromSelector;
		}
		return this.staticCountry ?? "USA";
	}

	isInternational(country: string = this.getCountry()): boolean {
		if (!country) return false;
		return !US_COUNTRY_CODES.includes(country.toUpperCase());
	}

	getApiConfig(): ApiConfig {
		return {
			embeddedKey: this.embeddedKey,
			autocompleteApiUrl: this.autocompleteApiUrl,
			internationalAutocompleteApiUrl: this.internationalAutocompleteApiUrl,
			country: this.getCountry(),
			...this.apiParams,
		} as ApiConfig;
	}

	async fetchAutocompleteSuggestions(
		searchString: string,
		callbacks: FetchAutocompleteSuggestionsCallbacks,
	): Promise<void> {
		await this.fetchWithCallbacks(callbacks, searchString, async (apiConfig) => {
			return this.fetchAutocompleteResults(apiConfig, searchString);
		});
	}

	async fetchSecondaryAutocompleteSuggestions(
		searchString: string,
		selectedAddress: AutocompleteSuggestion,
		callbacks: FetchAutocompleteSuggestionsCallbacks,
	): Promise<void> {
		await this.fetchWithCallbacks(callbacks, searchString, async (apiConfig) => {
			if (this.isInternational(apiConfig.country ?? "")) {
				return this.fetchInternationalAddressDetail(apiConfig, selectedAddress);
			}

			const primaryAutocompleteSuggestions = await this.fetchAutocompleteResults(
				apiConfig,
				searchString,
			);
			const newSelectedAddress = this.getMatchingResult(
				primaryAutocompleteSuggestions,
				selectedAddress,
			);
			return newSelectedAddress
				? await this.fetchAutocompleteResults(apiConfig, searchString, newSelectedAddress)
				: [];
		});
	}

	private async fetchWithCallbacks(
		callbacks: FetchAutocompleteSuggestionsCallbacks,
		searchString: string,
		fetchFn: (apiConfig: ApiConfig) => Promise<AutocompleteSuggestion[]>,
	): Promise<void> {
		try {
			const apiConfig = this.getApiConfig();
			const autocompleteSuggestions = await fetchFn(apiConfig);
			callbacks.onSuccess(autocompleteSuggestions, searchString);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			callbacks.onError(errorMessage);
		}
	}

	async fetchAutocompleteResults(
		apiConfig: ApiConfig,
		searchString: string,
		selectedAddress: AutocompleteSuggestion | null = null,
		fetchFn: typeof fetch = fetch,
	): Promise<AutocompleteSuggestion[]> {
		try {
			const country = apiConfig.country ?? "";
			if (this.isInternational(country)) {
				return await this.fetchInternationalAutocompleteResults(
					apiConfig,
					searchString,
					country,
					fetchFn,
				);
			}

			const requestData = this.buildUsRequestData(apiConfig, searchString, selectedAddress);
			const params = new URLSearchParams(requestData);
			const response = await fetchFn(`${apiConfig.autocompleteApiUrl}?${params}`);

			return await this.parseResponse<AutocompleteSuggestion>(response, "suggestions");
		} catch (error) {
			return this.handleFetchError(error);
		}
	}

	async fetchInternationalAddressDetail(
		apiConfig: ApiConfig,
		selectedAddress: AutocompleteSuggestion,
		fetchFn: typeof fetch = fetch,
	): Promise<AutocompleteSuggestion[]> {
		if (!selectedAddress.address_id) return [selectedAddress];

		try {
			const country = (apiConfig.country ?? "").toUpperCase();
			const requestData = this.buildInternationalRequestData(apiConfig, "", country);
			const params = new URLSearchParams(requestData);
			const url = `${apiConfig.internationalAutocompleteApiUrl}/${encodeURIComponent(selectedAddress.address_id)}?${params}`;
			const response = await fetchFn(url);
			return await this.fetchAndNormalizeInternational(response, country);
		} catch (error) {
			return this.handleFetchError(error);
		}
	}

	private async fetchInternationalAutocompleteResults(
		apiConfig: ApiConfig,
		searchString: string,
		country: string,
		fetchFn: typeof fetch,
	): Promise<AutocompleteSuggestion[]> {
		const upperCountry = country.toUpperCase();
		const requestData = this.buildInternationalRequestData(apiConfig, searchString, upperCountry);
		const params = new URLSearchParams(requestData);
		const response = await fetchFn(`${apiConfig.internationalAutocompleteApiUrl}?${params}`);
		return this.fetchAndNormalizeInternational(response, upperCountry);
	}

	private async fetchAndNormalizeInternational(
		response: Response,
		upperCountry: string,
	): Promise<AutocompleteSuggestion[]> {
		const candidates = await this.parseResponse<InternationalCandidate>(response, "candidates");
		return candidates.map((candidate) =>
			this.normalizeInternationalCandidate(candidate, upperCountry),
		);
	}

	private buildUsRequestData(
		apiConfig: ApiConfig,
		searchString: string,
		selectedAddress: AutocompleteSuggestion | null,
	): Record<string, string> {
		const requestData: Record<string, string> = {
			"auth-id": apiConfig.embeddedKey,
			"user-agent": USER_AGENT,
			search: searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		this.addMappedParams(requestData, apiConfig, US_API_PARAM_MAP, ";");
		return requestData;
	}

	private buildInternationalRequestData(
		apiConfig: ApiConfig,
		searchString: string,
		country: string,
	): Record<string, string> {
		const requestData: Record<string, string> = {
			key: apiConfig.embeddedKey,
			country: country.toUpperCase(),
		};

		if (searchString) {
			requestData.search = searchString.slice(0, 32);
		}

		this.addMappedParams(requestData, apiConfig, INTERNATIONAL_API_PARAM_MAP, ",");
		return requestData;
	}

	private addMappedParams(
		requestData: Record<string, string>,
		apiConfig: ApiConfig,
		paramMap: Record<string, string>,
		arraySeparator: string,
	): void {
		Object.entries(paramMap).forEach(([configKey, apiParamName]) => {
			const value = apiConfig[configKey as keyof ApiConfig];
			if (value === undefined) return;
			requestData[apiParamName] = Array.isArray(value) ? value.join(arraySeparator) : String(value);
		});
	}

	private normalizeInternationalCandidate(
		candidate: InternationalCandidate,
		fallbackCountry: string,
	): AutocompleteSuggestion {
		const suggestion: AutocompleteSuggestion = {
			street_line: candidate.street ?? candidate.address_text ?? "",
			city: candidate.locality ?? "",
			state: candidate.administrative_area_short ?? candidate.administrative_area ?? "",
			zipcode: candidate.postal_code ?? "",
			country: candidate.country_iso3 ?? fallbackCountry,
			entries: candidate.entries ?? 0,
		};

		if (candidate.address_id) {
			suggestion.address_id = candidate.address_id;
		}
		if (candidate.administrative_area_long) {
			suggestion.metadata = { administrative_area_long: candidate.administrative_area_long };
		}

		return suggestion;
	}

	private async parseResponse<T>(response: Response, dataKey: string): Promise<T[]> {
		if (response.ok) {
			const data = (await response.json()) as Record<string, T[] | null | undefined>;
			return data[dataKey] ?? [];
		}

		const errorResponse = (await response.json().catch(() => ({ errors: [] }))) as {
			errors: ApiErrorResponse[];
		};
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
		primaryAutocompleteSuggestions: AutocompleteSuggestion[],
		selectedAddress: AutocompleteSuggestion,
	): AutocompleteSuggestion | undefined {
		return primaryAutocompleteSuggestions.find((autocompleteSuggestion) => {
			return (
				autocompleteSuggestion.street_line.trim() === selectedAddress.street_line.trim() &&
				autocompleteSuggestion.city === selectedAddress.city &&
				autocompleteSuggestion.state === selectedAddress.state &&
				autocompleteSuggestion.secondary?.includes(selectedAddress.secondary?.trim() ?? "")
			);
		});
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

		if (matchedError) {
			return matchedError;
		}

		if (firstError?.message) {
			return {
				name: firstError.name ?? "apiError",
				statusCode,
				message: `SmartyAddress: ${firstError.message}`,
			};
		}

		return unknownError;
	}
}
