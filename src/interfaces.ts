import type { ApiService } from "./services/ApiService";
import type { ColorService } from "./services/ColorService";
import type { DropdownService } from "./services/DropdownService";
import type { DropdownStateService } from "./services/DropdownStateService";
import type { FormService } from "./services/FormService";
import type { FormatService } from "./services/FormatService";
import type { DomService } from "./services/DomService";
import type { KeyboardNavigationService } from "./services/KeyboardNavigationService";
import type { StyleService } from "./services/StyleService";

export interface ApiConfig {
	embeddedKey: string;
	autocompleteApiUrl: string;
	maxResults?: number;

	includeOnlyLocalities?: string[];
	includeOnlyAdministrativeAreas?: string[];
	includeOnlyPostalCodes?: string[];
	excludeAdministrativeAreas?: string[];
	preferLocalities?: string[];
	preferAdministrativeAreas?: string[];
	preferPostalCodes?: string[];
	preferRatio?: number;
	preferGeolocation?: string;
	source?: "postal" | "all";
}

export interface ServiceClassOverrides {
	ApiService?: typeof ApiService;
	ColorService?: typeof ColorService;
	DropdownService?: typeof DropdownService;
	DropdownStateService?: typeof DropdownStateService;
	FormService?: typeof FormService;
	FormatService?: typeof FormatService;
	DomService?: typeof DomService;
	KeyboardNavigationService?: typeof KeyboardNavigationService;
	StyleService?: typeof StyleService;
}

export interface DefaultSmartyAddressConfig extends ApiConfig {
	theme: string[];
}

export interface SmartyAddressConfig extends Omit<DefaultSmartyAddressConfig, "theme" | "autocompleteApiUrl"> {
	embeddedKey: string;
	streetSelector: string;
	theme?: string[];
	autocompleteApiUrl?: string;

	searchInputSelector?: string;
	secondarySelector?: string;
	localitySelector?: string;
	administrativeAreaSelector?: string;
	postalCodeSelector?: string;

	citySelector?: string;
	stateSelector?: string;
	zipcodeSelector?: string;
	regionSelector?: string;
	provinceSelector?: string;
	postcodeSelector?: string;
	zipSelector?: string;

	includeOnlyCities?: string[];
	includeOnlyStates?: string[];
	includeOnlyZipCodes?: string[];
	excludeStates?: string[];
	preferCities?: string[];
	preferStates?: string[];
	preferZipCodes?: string[];

	/** @internal For testing only - bypasses isTrusted check on events */
	_testMode?: boolean;

	services?: ServiceClassOverrides;
	onAddressSelected?: (address: AutocompleteSuggestion) => void;
	onAutocompleteSuggestionsReceived?: (
		suggestions: AutocompleteSuggestion[],
	) => AutocompleteSuggestion[];
	onDropdownOpen?: () => void;
	onDropdownClose?: () => void;
}

export interface NormalizedSmartyAddressConfig extends DefaultSmartyAddressConfig {
	embeddedKey: string;
	streetSelector: string;

	searchInputSelector?: string;
	secondarySelector?: string;
	localitySelector?: string;
	administrativeAreaSelector?: string;
	postalCodeSelector?: string;

	/** @internal For testing only - bypasses isTrusted check on events */
	_testMode?: boolean;

	services?: ServiceClassOverrides;
	onAddressSelected?: (address: AutocompleteSuggestion) => void;
	onAutocompleteSuggestionsReceived?: (
		suggestions: AutocompleteSuggestion[],
	) => AutocompleteSuggestion[];
	onDropdownOpen?: () => void;
	onDropdownClose?: () => void;
}

export interface AutocompleteSuggestion {
	street_line: string;
	secondary?: string;
	city: string;
	state: string;
	zipcode: string;
	country: string;
	entries?: number;
	metadata?: Record<string, unknown>;
}
