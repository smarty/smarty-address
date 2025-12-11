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

// TODO: Revisit the abstract/basic stateObject interfaces.
export interface AbstractStateObject {
	[index: string]: any;
}

export interface ServiceHandlersObject {
	[name: string]: WrappedServiceHandler;
}
export interface ServicesObject {
	[name: string]: ServiceHandlersObject;
}
export interface ServiceHandler {
	(props: ServiceHandlerProps, customProps?: any): void;
}
export interface WrappedServiceHandler {
	(customProps?: any): void;
}

export interface ServiceHandlerProps {
	state: AbstractStateObject;
	setState: { (name: string, newState: unknown): void };
	services: ServicesObject;
	utils: { [name: string]: (...props: unknown[]) => unknown };
}

export interface AutocompleteDropdownServiceHandler extends ServiceHandler {
	(props: AutocompleteDropdownServiceHandlerProps, customProps?: any): void;
}

export interface AutocompleteDropdownServiceHandlerProps extends ServiceHandlerProps {
	utils: AutocompleteDropdownServiceUtils;
}

export interface ServiceDefinition {
	initialState: AbstractStateObject;
	serviceHandlers: { [name: string]: ServiceHandler };
	utils?: ServiceDefinitionUtils;
}

export interface ServiceDefinitionUtils {
	[name: string]: (...args: unknown[]) => unknown;
}

export interface AutocompleteDropdownServiceUtils extends ServiceDefinitionUtils {
	updateThemeClass: (
		newTheme: string[],
		previousTheme: string[],
		dropdownWrapperElement: HTMLElement,
	) => void;
	getInstanceClassName: (instanceId: number) => string;
	buildAutocompleteDomElements: (instanceClassname: string) => Record<string, HTMLElement>;
}

export interface AutocompleteDropdownServiceDefinition extends ServiceDefinition {
	initialState: {
		theme: string;
		searchInputElement: HTMLInputElement;

		dropdownWrapperElement: HTMLElement;
		dropdownElement: HTMLElement;
		suggestionsElement: HTMLElement;
		poweredBySmartyElement: HTMLElement;

		highlightedSuggestionIndex: number;
		selectedSuggestionIndex: number;
		// TODO: Be more specific with what type of object is expected here (e.g. AddressSuggestion)
		addressSuggestionResults: object[];
		secondaryAddressSuggestionResults: object[];
		customStylesElement: HTMLElement;
	};
	utils: AutocompleteDropdownServiceUtils;
}

export interface ServiceDefinitionMap {
	[name: string]: ServiceDefinition;
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
