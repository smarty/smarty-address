import { AddressSuggestion, ApiConfig, ApiErrorResponse } from "../interfaces";
import { APP_VERSION } from "../constants";

// TODO: Dynamically update the version to match `package.json`
const USER_AGENT = `name:smarty-address-plugin,version:${APP_VERSION}`;

export const API_PARAM_MAP = {
	maxResults: "max_results",
	includeOnlyCities: "include_only_cities",
	includeOnlyStates: "include_only_states",
	includeOnlyZipCodes: "include_only_zip_codes",
	excludeStates: "exclude_states",
	preferCities: "prefer_cities",
	preferStates: "prefer_states",
	preferZipCodes: "prefer_zip_codes",
	preferRatio: "prefer_ratio",
	preferGeolocation: "prefer_geolocation",
	source: "source",
} as const;

export type ApiParamKey = keyof typeof API_PARAM_MAP;
export const API_PARAM_KEYS = Object.keys(API_PARAM_MAP) as ApiParamKey[];

const formatSelectedAddress = ({
	street_line,
	secondary,
	entries,
	city,
	state,
	zipcode,
}: AddressSuggestion) => {
	const addressComponents = [street_line, secondary, `(${entries})`, city, state, zipcode];

	return addressComponents.filter(Boolean).join(" ");
};

export const getMatchingResult = (
	primarySuggestions: AddressSuggestion[],
	selectedAddress: AddressSuggestion,
) => {
	const matchingResult = primarySuggestions.find((suggestion) => {
		return (
			suggestion.street_line.trim() === selectedAddress.street_line.trim() &&
			suggestion.secondary?.includes(selectedAddress.secondary?.trim() ?? "")
		);
	});

	return matchingResult;
};

export const getAutocompleteApiResults = async (
	apiConfig: ApiConfig,
	searchString: string,
	selectedAddress: AddressSuggestion | null = null,
	fetchFn: typeof fetch = fetch,
) => {
	try {
		const requestData: Record<string, string> = {
			"auth-id": apiConfig.apiKey,
			"user-agent": USER_AGENT,
			search: searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		API_PARAM_KEYS.forEach((param) => {
			const value = apiConfig[param];
			if (value !== undefined) {
				const apiParamName = API_PARAM_MAP[param];
				requestData[apiParamName] = Array.isArray(value) ? value.join(",") : String(value);
			}
		});

		const params = new URLSearchParams(requestData);
		const response = await fetchFn(`${apiConfig.autocompleteApiUrl}?${params}`);

		if (response.ok) {
			const { suggestions } = (await response.json()) as { suggestions: AddressSuggestion[] };
			return suggestions;
		} else {
			const errorResponse = (await response.json()) as { errors: ApiErrorResponse[] };
			const error = getApiError(response.status, errorResponse);
			console.error(error.message);

			throw new Error(error.name);
		}
	} catch (error) {
		if (error instanceof Error) {
			const knownErrorNames = knownAutocompleteErrors.map((e) => e.name);
			if (knownErrorNames.includes(error.message)) {
				throw error;
			}
		}
		console.error(unknownError.message);
		throw new Error(unknownError.name);
	}
};

export const getApiError = (statusCode: number, errorsResponse: { errors: ApiErrorResponse[] }) => {
	const firstError = errorsResponse.errors[0];

	const matchedError = knownAutocompleteErrors.find((knownError) => {
		const errorIdMatches = !knownError.errorId || knownError.errorId === firstError?.id;
		return knownError.statusCode === statusCode && errorIdMatches;
	});

	return matchedError ?? unknownError;
};

export const unknownError = {
	name: "unknownError",
	statusCode: 0,
	message: "SmartyAddress: an unknown error has occurred.",
};

export const createErrorResponse = (id: number, message: string) => ({
	errors: [{ id, message }],
});

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
