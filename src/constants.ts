import type { VerificationConfig } from "./interfaces";

export const APP_VERSION = "1.1.0";
export const US_AUTOCOMPLETE_PRO_API_URL = "https://us-autocomplete-pro.api.smarty.com/lookup";
export const INTERNATIONAL_AUTOCOMPLETE_API_URL =
	"https://international-autocomplete.api.smarty.com/v2/lookup";

export const US_STREET_API_URL = "https://us-street.api.smarty.com/street-address";
export const INTERNATIONAL_STREET_API_URL = "https://international-street.api.smarty.com/verify";

export const US_COUNTRY_CODES = ["US", "USA"];

// US Street footnote classes that indicate the address was standardized /
// corrected (ERD §5.4). Footnotes arrive as a semicolon-joined string like
// "A#N#" — the leading letter is the class. Presence of any of these on a
// deliverable match means a Type 2 (verified, corrected) result.
export const US_CORRECTION_FOOTNOTE_CLASSES = ["A", "B", "M", "N", "L", "K"];
// Footnote that marks a deliverable-but-flagged address (vacant/no-stat).
export const US_FLAGGED_FOOTNOTE_CLASS = "R7";
// Footnote that accompanies a missing-secondary (default) match.
export const US_MISSING_SECONDARY_FOOTNOTE_CLASS = "N1";

// International address_precision rank, low → high (ERD §5.4, Q10). Used as a
// fallback when a response omits max_address_precision: precision >= Premise is
// treated as verified-for-country.
export const INTERNATIONAL_PRECISION_RANK = [
	"None",
	"Administrative_Area",
	"Locality",
	"Thoroughfare",
	"Premise",
	"DeliveryPoint",
];
export const INTERNATIONAL_MIN_VERIFIED_PRECISION = "Premise";

// Provisional defaults (PRD §6). Every field is a one-line change so locking the
// API does not lock the defaults. `enabled` is gated at Epic 5's public ship.
export const defaultVerificationConfig: Required<
	Pick<
		VerificationConfig,
		"enabled" | "trigger" | "ui" | "failureMode" | "fieldLevelHighlighting" | "staleness"
	>
> & { onResult: NonNullable<VerificationConfig["onResult"]> } = {
	enabled: true,
	trigger: ["selection", "blur"],
	ui: "badge",
	failureMode: "fail-open",
	fieldLevelHighlighting: false,
	staleness: "invalidate",
	onResult: {
		verified: "silent",
		corrected: "apply-and-notify",
		missingSecondary: "prompt",
		secondaryNotMatched: "prompt",
		flagged: "warn",
		ambiguous: "prompt",
		undeliverable: "warn",
	},
};
