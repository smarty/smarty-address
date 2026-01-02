import { AddressSuggestion, ApiConfig, ApiErrorResponse } from "../interfaces";
import { APP_VERSION } from "../constants";

// TODO: Dynamically update the version to match `package.json`
const USER_AGENT = `name:smarty-address-plugin,version:${APP_VERSION}`;

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
			suggestion.secondary.includes(selectedAddress.secondary.trim())
		);
	});

	return matchingResult;
};

export const getAutocompleteApiResults = async (
	apiConfig: ApiConfig,
	searchString: string,
	selectedAddress: AddressSuggestion = null,
	fetchFn: typeof fetch = fetch,
) => {
	try {
		const requestData = {
			"auth-id": apiConfig.apiKey,
			"user-agent": USER_AGENT,
			search: searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

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
		console.error(unknownError.message);
		throw new Error(unknownError.name);
	}
};

export const getApiError = (statusCode: number, errorsResponse: { errors: ApiErrorResponse[] }) => {
	const firstError = errorsResponse.errors[0];

	const matchedError = knownAutocompleteErrors.find((knownError) => {
		const errorIdMatches = !knownError.errorId || knownError.errorId === firstError.id;
		return knownError.statusCode === statusCode && errorIdMatches;
	});

	return matchedError ?? unknownError;
};

export const unknownError = {
	name: "unknownError",
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
