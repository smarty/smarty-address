import {EventDispatcher} from "./utils/EventDispatcher.ts";

export interface DefaultSmartyAddressConfig {
	services?:ServiceDefinitionMap,
	theme?:string[],
	smartyLogoDark?:string,
	smartyLogoLight?:string,
}

export interface SmartyAddressConfig extends DefaultSmartyAddressConfig{
	embeddedKey:string,
	searchInputSelector:string,
	streetLineSelector?: string,
	secondarySelector?: string,
	citySelector?: string,
	stateSelector?: string,
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

export interface AbstractStateObject {
	[index: string]: any;
}

export interface BasicStateObject extends AbstractStateObject {
	eventDispatcher: EventDispatcher,
}

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
export interface BrowserEventHandlerProps {
	event:Event,
	state:BasicStateObject,
	setState: {(name:string, newState:unknown):void},
}

export interface ServiceDefinition {
	initialState: AbstractStateObject,
	eventHandlersMap: {[eventName: string]: EventHandler[]}
}

export interface ServiceDefinitionMap {[eventName: string]:ServiceDefinition}

export interface UiSuggestionItem {
	address: AddressSuggestion,
	suggestionElement: HTMLElement,
}
