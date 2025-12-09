import {EventDispatcher} from "./utils/EventDispatcher";

export interface DefaultSmartyAddressConfig {
	services:ServiceDefinitionMap,
	theme:string[],
	autocompleteApiUrl:string,
}

export interface SmartyAddressConfig extends DefaultSmartyAddressConfig {
	// TODO: Talk to Jeffrey and Adam about correct naming of fields/properties
	embeddedKey:string,
	searchInputSelector:string,
	streetLineSelector?: string,
	secondarySelector?: string,
	citySelector?: string,
	stateSelector?: string,
	// TODO: Should this be renamed to "postalCodeSelector"?
	zipcodeSelector?: string,
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

export interface BasicStateObject extends AbstractStateObject {
	eventDispatcher: EventDispatcher,
}

export interface ServiceMethodsObject {[name: string]: WrappedServiceMethod}
export interface ServicesObject {[name: string]: ServiceMethodsObject}
export interface EventHandler {(props:EventHandlerProps):void}
export interface ServiceMethod {(props:ServiceMethodProps, customProps?:any):void}
export interface WrappedServiceMethod {(customProps?:any):void}

export interface ServiceMethodProps {
	state:BasicStateObject,
	setState: {(name:string, newState:unknown):void},
	services: ServicesObject,
	utils: {[name: string]: (...props:unknown[])=>unknown},
}

export interface AutocompleteUiServiceMethod extends ServiceMethod {
	(props:AutocompleteUiServiceMethodProps, customProps?:any):void,
}

export interface AutocompleteUiServiceMethodProps extends ServiceMethodProps {
	utils: AutocompleteUiServiceUtils,
}

export interface EventHandlerProps extends ServiceMethodProps {
	event:CustomEvent,
}

export interface BrowserEventHandler {(props:BrowserEventHandlerProps):void}
// TODO: These are the wrong props for this type of event
export interface BrowserEventHandlerProps {
	event:Event,
	state:BasicStateObject,
	setState: {(name:string, newState:unknown):void},
}

export interface ServiceDefinition {
	initialState: AbstractStateObject,
	eventHandlers?: {[eventName: string]: EventHandler},
	serviceMethods: {[eventName: string]: ServiceMethod},
	utils?: ServiceDefinitionUtils,
}

export interface ServiceDefinitionUtils {[eventName: string]: (...args:unknown[])=>unknown}

export interface AutocompleteUiServiceUtils extends ServiceDefinitionUtils {
		updateThemeClass: (newTheme:string[], previousTheme:string[], dropdownWrapperElement:HTMLElement)=>void,
		getInstanceClassName: (instanceId:number)=>string,
		buildAutocompleteDomElements: (instanceClassname:string)=>Record<string, HTMLElement>,
}

export interface AutocompleteUiServiceDefinition extends ServiceDefinition {
	initialState: {
		theme: string,
		searchInputElement: HTMLInputElement,

		dropdownWrapperElement: HTMLElement,
		dropdownElement: HTMLElement,
		suggestionsElement: HTMLElement,
		poweredBySmartyElement: HTMLElement,

		highlightedSuggestionIndex: number,
		selectedSuggestionIndex: number,
		// TODO: Be more specific with what type of object is expected here (e.g. AddressSuggestion)
		addressSuggestionResults: object[],
		secondaryAddressSuggestionResults: object[],
		customStylesElement: HTMLElement,
	},
	utils: AutocompleteUiServiceUtils,
}

export interface ServiceDefinitionMap {[eventName: string]:ServiceDefinition}

export interface UiSuggestionItem {
	address: AddressSuggestion,
	suggestionElement: HTMLElement,
}

export interface RgbaColor {
	red: number,
	green: number,
	blue: number,
	alpha: number,
}

export interface HslColor {
	hue: number,
	saturation: number,
	lightness: number,
	alpha: number,
}
