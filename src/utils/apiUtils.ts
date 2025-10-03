import {AddressSuggestion, ApiErrorResponse} from "../interfaces.ts";

export const formatSelectedAddress = ({street_line, secondary = "", city, state, zipcode, entries}:AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};

export const getApiErrorName = (statusCode:number, errorsResponse:{ errors: ApiErrorResponse[] }) => {
	const firstError = errorsResponse.errors[0];

	const matchedError = knownAutocompleteErrors.find((knownError) => {
		const errorIdMatches = !knownError.errorId || knownError.errorId === firstError.id;
		return knownError.statusCode === statusCode && errorIdMatches;
	});

	return matchedError?.name ?? "unrecognizedError";
};

const knownAutocompleteErrors = [
	{
		name: "authenticationRequired",
		statusCode: 401,
		errorId: 1611079217,
	},
];
