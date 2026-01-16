import type { ApiService } from "./services/api/ApiService";
import type { AutocompleteDropdownService } from "./services/autocompleteDropdown/AutocompleteDropdownService";
import type { AddressFormUiService } from "./services/addressFormUi/AddressFormUiService";

export interface ApiConfig {
	embeddedKey: string;
	autocompleteApiUrl: string;
	maxResults?: number;
	includeOnlyCities?: string[];
	includeOnlyStates?: string[];
	includeOnlyZipCodes?: string[];
	excludeStates?: string[];
	preferCities?: string[];
	preferStates?: string[];
	preferZipCodes?: string[];
	preferRatio?: number;
	preferGeolocation?: string;
	source?: "postal" | "all";
}

export interface ServiceClassOverrides {
	ApiService?: typeof ApiService;
	AutocompleteDropdownService?: typeof AutocompleteDropdownService;
	AddressFormUiService?: typeof AddressFormUiService;
}

export interface DefaultSmartyAddressConfig extends ApiConfig {
	theme: string[];
}

export interface SmartyAddressConfig extends DefaultSmartyAddressConfig {
	embeddedKey: string;
	searchInputSelector: string;
	streetSelector?: string;
	secondarySelector?: string;
	citySelector?: string;
	stateSelector?: string;
	zipcodeSelector?: string;
	services?: ServiceClassOverrides;
	onAddressSelected?: (address: AddressSuggestion) => void;
	onSuggestionsReceived?: (suggestions: AddressSuggestion[]) => AddressSuggestion[];
	onDropdownOpen?: () => void;
	onDropdownClose?: () => void;
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
