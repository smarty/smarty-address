export interface DefaultSmartyAddressConfig {
	services: ServiceDefinitionMap;
	theme: string[];
	autocompleteApiUrl: string;
}

export interface SmartyAddressConfig extends DefaultSmartyAddressConfig {
	// TODO: Talk to Jeffrey and Adam about correct naming of fields/properties
	embeddedKey: string;
	searchInputSelector: string;
	streetLineSelector?: string;
	secondarySelector?: string;
	citySelector?: string;
	stateSelector?: string;
	zipcodeSelector?: string;
}

export interface ApiConfig {
	apiKey: string;
	autocompleteApiUrl: string;
}

export interface AddressSuggestion {
	street_line: string;
	secondary?: string;
	city: string;
	state: string;
	zipcode: string;
	country: string;
	entries?: number;
	metadata?: Record<string, any>;
}

export interface StylesObject {
	[selector: string]: {
		[cssVar: string]: string;
	};
}

export interface ApiErrorResponse {
	id: number;
	message: string;
}

export interface AbstractStateObject {
	[index: string]: any;
}

export interface ServiceHandlersObject {
	[name: string]: WrappedServiceHandler;
}
export interface ServicesObject {
	apiService?: ServiceHandlersObject;
	addressFormUiService?: ServiceHandlersObject;
	autocompleteDropdownService?: ServiceHandlersObject;
	[serviceName: string]: ServiceHandlersObject;
}
export interface ServiceHandler<TProps extends ServiceHandlerProps = ServiceHandlerProps> {
	(props: TProps, customProps?: any): any;
}

export interface ServiceHandlerMap {
	[name: string]: ServiceHandler<any>;
}
export interface WrappedServiceHandler {
	(customProps?: any): any;
}

export interface ServiceHandlerProps<TUtils = ServiceDefinitionUtils, TState = AbstractStateObject> {
	state: TState;
	setState: { (name: string, newState: unknown): void };
	services: ServicesObject;
	utils: TUtils;
}

export interface ServiceDefinition<TUtils = ServiceDefinitionUtils, TState = AbstractStateObject> {
	initialState: TState;
	serviceHandlers: ServiceHandlerMap;
	utils?: TUtils;
}

export interface ServiceDefinitionUtils {
	[name: string]: (...args: any[]) => any;
}

export interface ServiceDefinitionMap {
	[name: string]: ServiceDefinition<any, any>;
}

export interface UiSuggestionItem {
	address: AddressSuggestion;
	suggestionElement: HTMLElement;
}

export interface RgbaColor {
	red: number;
	green: number;
	blue: number;
	alpha: number;
}

export interface HslColor {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
}
