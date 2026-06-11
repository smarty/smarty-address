import type { ApiService } from "./services/ApiService";
import type { ColorService } from "./services/ColorService";
import type { DropdownService } from "./services/DropdownService";
import type { DropdownStateService } from "./services/DropdownStateService";
import type { FormService } from "./services/FormService";
import type { FormatService } from "./services/FormatService";
import type { DomService } from "./services/DomService";
import type { KeyboardNavigationService } from "./services/KeyboardNavigationService";
import type { StyleService } from "./services/StyleService";
import type { VerificationService } from "./services/VerificationService";
import type { VerificationUiService } from "./services/VerificationUiService";

export interface ApiConfig {
	embeddedKey: string;
	autocompleteApiUrl: string;
	internationalAutocompleteApiUrl?: string;
	country?: string;
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
	VerificationService?: typeof VerificationService;
	VerificationUiService?: typeof VerificationUiService;
}

export interface DefaultSmartyAddressConfig extends ApiConfig {
	theme: string[];
	internationalAutocompleteApiUrl: string;
}

export interface SmartyAddressConfig extends Omit<
	DefaultSmartyAddressConfig,
	"theme" | "autocompleteApiUrl" | "internationalAutocompleteApiUrl"
> {
	embeddedKey: string;
	streetSelector: string;
	theme?: string[];
	autocompleteApiUrl?: string;
	internationalAutocompleteApiUrl?: string;

	country?: string;
	countrySelector?: string;

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

	autocomplete?: AutocompleteConfig;
	verification?: VerificationConfig;

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

	country?: string;
	countrySelector?: string;

	searchInputSelector?: string;
	secondarySelector?: string;
	localitySelector?: string;
	administrativeAreaSelector?: string;
	postalCodeSelector?: string;

	autocomplete?: AutocompleteConfig;
	verification?: VerificationConfig;

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
	locality: string;
	administrativeArea: string;
	postalCode: string;
	country: string;
	entries?: number;
	metadata?: Record<string, unknown>;

	address_id?: string;
}

// ---------------------------------------------------------------------------
// Address verification (ERD §3, §4). Additive subsystem alongside autocomplete.
// ---------------------------------------------------------------------------

export type VerificationTrigger = "selection" | "blur" | "submit" | "manual";

export type VerificationBehavior =
	| "silent"
	| "apply-and-notify"
	| "prompt"
	| "apply-primary"
	| "warn"
	| "block"
	| "ignore"
	| "first-candidate";

export type VerificationResultKey =
	| "verified"
	| "corrected"
	| "missingSecondary"
	| "secondaryNotMatched"
	| "flagged"
	| "ambiguous"
	| "undeliverable"
	| "error";

// Deliverability normalized across US + Intl into one enum the dispatcher keys
// on. Raw signals preserved in VerificationResult.raw for debugging/hooks.
export type DeliverabilityCode =
	| "deliverable"
	| "deliverable-missing-secondary"
	| "deliverable-bad-secondary"
	| "deliverable-flagged"
	| "ambiguous"
	| "undeliverable"
	| "unknown";

export type AddressField =
	| "street"
	| "secondary"
	| "locality"
	| "administrativeArea"
	| "postalCode"
	| "country";

// The address being worked with, regardless of where it came from (ERD §4.1).
// This is the seam that lets verification run identically in all three modes.
export interface CurrentAddress {
	street: string;
	secondary: string;
	locality: string;
	administrativeArea: string;
	postalCode: string;
	country: string;

	origin: "autocomplete" | "free-form" | "verification";
	address_id?: string;
	verifiedAt?: number;
}

export interface AddressDiff {
	changes: Partial<Record<AddressField, { from: string; to: string }>>;
	changedFields: AddressField[];
}

export interface VerificationResult {
	type: VerificationResultKey;
	code: DeliverabilityCode;
	entered: CurrentAddress;
	corrected: CurrentAddress | null;
	diff: AddressDiff | null;
	candidates?: CurrentAddress[];
	nonBlocking: boolean;
	raw: unknown;
	source: "us" | "international";
}

export interface VerificationError {
	kind: "network" | "auth" | "quota" | "parse" | "unknown";
	message: string;
	failureMode: "fail-open" | "fail-closed";
	cause?: unknown;
}

export interface VerificationDecision {
	action: "accept" | "reject" | "choose";
	chosen?: CurrentAddress;
}

export interface VerificationConfig {
	enabled?: boolean;

	trigger?: VerificationTrigger[];
	onResult?: Partial<Record<VerificationResultKey, VerificationBehavior>>;

	ui?: "none" | "aria-only" | "badge" | "panel";

	failureMode?: "fail-open" | "fail-closed";
	fieldLevelHighlighting?: boolean;
	staleness?: "invalidate" | "revalidate";

	correctionPrompt?: { style?: "inline-note" | "did-you-mean" | "silent-swap" };

	usStreetApiUrl?: string;
	internationalStreetApiUrl?: string;

	onVerified?: (result: VerificationResult) => void | Promise<void>;
	onVerificationFailed?: (error: VerificationError) => void | Promise<void>;
	onCorrectionOffered?: (
		diff: AddressDiff,
		result: VerificationResult,
	) => void | VerificationDecision | Promise<VerificationDecision | void>;
	onBeforeSubmit?: (result: VerificationResult | null) => boolean | Promise<boolean>;
}

// Nested autocomplete block (de-skew, ERD §2 / Q5). Every existing root-level
// autocomplete key keeps working as an alias; this block is additive only.
export interface AutocompleteConfig {
	enabled?: boolean;

	streetSelector?: string;
	searchInputSelector?: string;
	secondarySelector?: string;
	localitySelector?: string;
	administrativeAreaSelector?: string;
	postalCodeSelector?: string;

	country?: string;
	countrySelector?: string;

	autocompleteApiUrl?: string;
	internationalAutocompleteApiUrl?: string;
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
