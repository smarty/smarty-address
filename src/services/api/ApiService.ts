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

export const apiService: ServiceDefinition<typeof utils, typeof initialState> = {
	initialState,
	serviceHandlers,
	utils,
} as const;

type ApiServiceHandlerProps = ServiceHandlerProps<typeof utils, typeof initialState>;

export interface ApiServiceHandler extends ServiceHandler<ApiServiceHandlerProps> {
	(props: ApiServiceHandlerProps, customProps?: any): any;
}
