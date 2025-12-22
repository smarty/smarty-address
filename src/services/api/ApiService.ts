import {
	AbstractStateObject,
	ServiceDefinition,
	ServiceHandler,
	ServiceHandlerMap,
	ServiceHandlerProps,
} from "../../interfaces";
import {
	init,
	fetchAddressSuggestions,
	fetchSecondaryAddressSuggestions,
	getApiConfig,
} from "./apiHandlers";
import { getAutocompleteApiResults, getMatchingResult } from "../../utils/apiUtils";

const initialState: AbstractStateObject = {
	autocompleteApiUrl: "",
	apiKey: "",
} as const;

const serviceHandlers: ServiceHandlerMap = {
	init,
	getApiConfig,
	fetchAddressSuggestions,
	fetchSecondaryAddressSuggestions,
} as const;

const utils = {
	getAutocompleteApiResults,
	getMatchingResult,
} as const;

export const apiService: ServiceDefinition = {
	initialState,
	serviceHandlers,
	utils,
} as const;

interface ApiServiceHandlerProps extends ServiceHandlerProps {
	utils: typeof utils;
	state: typeof initialState;
}

export interface ApiServiceHandler extends ServiceHandler {
	(props: ApiServiceHandlerProps, customProps?: any): any;
}
