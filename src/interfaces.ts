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
	services?: {},
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

export interface StateObject {
	[index: string]: any;
}

export interface EventHandler {(event:CustomEvent, state?:StateObject, setState?:{(name:string, newState:unknown):void}):void}

