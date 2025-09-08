import {EventDispatcher} from "./utils/EventDispatcher.ts";

export interface SmartyAddressConfig {
	embeddedKey:string,
	theme?:string,
	searchInputSelector?:string,
	streetLineSelector?: string,
	secondarySelector?: string,
	citySelector?: string,
	stateSelector?: string,
	zipcodeSelector?: string,
	handleAutocompleteElementOnChange?: string,
	services?:ServiceDefinitionMap,
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
	eventHandlerWrapper: (eventHandler:EventHandler) =>EventHandler,
}

export interface UiStateObject extends BasicStateObject {
	searchInputElement: HTMLInputElement,
	streetLineInputElement: HTMLInputElement | null,
	secondaryInputElement: HTMLInputElement | null,
	cityInputElement: HTMLInputElement | null,
	stateInputElement: HTMLInputElement | null,
	zipcodeInputElement: HTMLInputElement | null,
}

export interface EventHandler {(props:EventHandlerObject):void}

export interface EventHandlerObject {
	event:CustomEvent,
	state:BasicStateObject,
	setState: {(name:string, newState:unknown):void},
}

export interface eventsToHandlersMap {
	handler: EventHandler,
	events: string[],
}

export interface ServiceDefinition {
	initialState: AbstractStateObject,
	eventHandlersMap: eventsToHandlersMap[],
}

export interface ServiceDefinitionMap {[index: string]:ServiceDefinition}
