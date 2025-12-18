import { AddressSuggestion, ApiErrorResponse } from "../interfaces";
import { APP_VERSION } from "../constants";

// TODO: Dynamically update the version to match `package.json`
const USER_AGENT = `name:smarty-address-plugin,version:${APP_VERSION}`;

export const formatSelectedAddress = ({
	street_line,
	secondary = "",
	city,
	state,
	zipcode,
	entries,
}: AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};

export const getAutocompleteApiResults = async (
	searchString: string,
	apiKey: string,
	autocompleteApiUrl: string,
	selectedAddress: AddressSuggestion = null,
) => {
	// TODO: Add support for additional input fields (e.g. max_results, include_only_zip_codes, etc.).
	try {
		const requestData = {
			"auth-id": apiKey,
			"user-agent": USER_AGENT,
			search: searchString,
			selected: selectedAddress ? formatSelectedAddress(selectedAddress) : "",
		};

		const params = new URLSearchParams(requestData);
		const response = await fetch(`${autocompleteApiUrl}?${params}`);

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

export const getTranslatedUsAutocompleteAddress = (address) => {
	const translatedAddress = {
		street: address.streetLine,
		entries: address.entries,
		city: address.city,
		state: address.state,
		zipCode: address.zipcode,
		isEllipsesDisplayed: address.entries > 1,
		entriesText: address.entries > 1 ? `+ ${address.entries} addresses` : "",
	};

	const formattedStreet = address.streetLine ? `${address.streetLine}` : "";
	const formattedSecondary = address.secondary ? ` ${address.secondary}` : "";
	const formattedCity = address.city ? ` ${address.city},` : "";
	const formattedState = address.state ? ` ${address.state}` : "";
	const formattedZipCode = address.zipcode ? ` ${address.zipcode}` : "";
	translatedAddress.fullAddress =
		formattedStreet + formattedSecondary + formattedCity + formattedState + formattedZipCode;
	translatedAddress.secondary = formattedSecondary;
	translatedAddress.selected =
		translatedAddress.street +
		translatedAddress.secondary +
		" (" +
		translatedAddress.entries +
		") " +
		translatedAddress.city +
		formattedState +
		formattedZipCode;

	return translatedAddress;
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
