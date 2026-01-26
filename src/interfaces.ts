import type { ApiService } from "./services/ApiService";
import type { DropdownService } from "./services/DropdownService";
import type { FormService } from "./services/FormService";
import type { FormatService } from "./services/FormatService";
import type { DomService } from "./services/DomService";
import type { StyleService } from "./services/StyleService";

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
	DropdownService?: typeof DropdownService;
	FormService?: typeof FormService;
	FormatService?: typeof FormatService;
	DomService?: typeof DomService;
	StyleService?: typeof StyleService;
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

export interface FetchSuggestionsCallbacks {
	onSuccess: (suggestions: AddressSuggestion[], searchString: string) => void;
	onError: (errorMessage: string) => void;
}

export interface AbstractStateObject {
	addressSuggestionResults: UiSuggestionItem[];
	secondaryAddressSuggestionResults: UiSuggestionItem[];
	selectedSuggestionIndex: number;
}
