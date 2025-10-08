import {AddressSuggestion, ApiErrorResponse} from "../interfaces.ts";

export const formatSelectedAddress = ({street_line, secondary = "", city, state, zipcode, entries}:AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};

export const getApiError = (statusCode:number, errorsResponse:{ errors: ApiErrorResponse[] }) => {
	const firstError = errorsResponse.errors[0];

	const matchedError = knownAutocompleteErrors.find((knownError) => {
		const errorIdMatches = !knownError.errorId || knownError.errorId === firstError.id;
		return knownError.statusCode === statusCode && errorIdMatches;
	});

	return matchedError ?? unknownError;
};

const unknownError = {
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
		name: "tooManyRequests",
		statusCode: 429,
		errorId: 1730482419,
		message: `The limit for your embedded key has been reached. See https://www.smarty.com/docs/cloud/us-autocomplete-pro-api#pro-http-response-status for details or contact Smarty support.`,
	},
];
