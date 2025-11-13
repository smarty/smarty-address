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

export interface AbstractStateObject {
	[index: string]: any;
}

export interface BasicStateObject extends AbstractStateObject {
	eventDispatcher: EventDispatcher,
}

// TODO: Figure out the "state" typing for specific services
export interface UiStateObject extends BasicStateObject {
	searchInputElement: HTMLInputElement,
	streetLineInputElement: HTMLInputElement | null,
	secondaryInputElement: HTMLInputElement | null,
	cityInputElement: HTMLInputElement | null,
	stateInputElement: HTMLInputElement | null,
	zipcodeInputElement: HTMLInputElement | null,
}

export interface EventHandler {(props:EventHandlerProps):void}

export interface EventHandlerProps {
	event:CustomEvent,
	state:BasicStateObject,
	setState: {(name:string, newState:unknown):void},
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
	eventHandlersMap: {[eventName: string]: EventHandler}
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
