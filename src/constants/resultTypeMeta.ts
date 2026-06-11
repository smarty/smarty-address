import type { VerificationResultKey } from "../interfaces";

export type ResultTone = "positive" | "warning" | "negative";

export interface ResultTypeMeta {
	badge: string;
	tone: ResultTone;
	message: string;
}

// Display metadata per result type. Mirrors the badge / tone / guidance fields
// in design/verification/app/result-types.jsx (the §7 source of truth). UI copy
// only — classification lives in VerificationService.
export const RESULT_TYPE_META: Record<VerificationResultKey, ResultTypeMeta> = {
	verified: { badge: "Verified", tone: "positive", message: "Address verified." },
	corrected: {
		badge: "Adjusted",
		tone: "positive",
		message: "Adjusted to the official postal form.",
	},
	missingSecondary: {
		badge: "Needs unit",
		tone: "warning",
		message: "This building has multiple units — add an apartment or suite number.",
	},
	secondaryNotMatched: {
		badge: "Check unit",
		tone: "warning",
		message: "We verified the building but couldn't confirm the unit. Double-check it.",
	},
	flagged: {
		badge: "Deliverable · flagged",
		tone: "warning",
		message: "Deliverable, but USPS flags this address. You can continue.",
	},
	ambiguous: {
		badge: "Multiple matches",
		tone: "warning",
		message: "More than one address matches — choose one.",
	},
	undeliverable: {
		badge: "Undeliverable",
		tone: "negative",
		message: "We couldn't find this address. Double-check it — or submit as entered.",
	},
	error: {
		badge: "Service error",
		tone: "negative",
		message: "Verification is temporarily unavailable. Submitting is allowed.",
	},
};
