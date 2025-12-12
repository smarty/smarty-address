import {
	AbstractStateObject,
	ServiceDefinition,
	ServiceHandler,
	ServiceHandlerMap,
	ServiceHandlerProps,
} from "../../interfaces";
import { init, fetchAddressSuggestions, fetchSecondaryAddressSuggestions } from "./apiHandlers";
import { getAutocompleteApiResults } from "../../utils/apiUtils";

const initialState: AbstractStateObject = {
	autocompleteApiUrl: "",
	apiKey: "",
} as const;

const serviceHandlers: ServiceHandlerMap = {
	init,
	fetchAddressSuggestions,
	fetchSecondaryAddressSuggestions,
} as const;

const utils = {
	getAutocompleteApiResults,
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
