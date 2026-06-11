import type {
	AddressDiff,
	AddressField,
	AutocompleteSuggestion,
	CurrentAddress,
	VerificationResult,
} from "../interfaces";

// Adapters + helpers for the CurrentAddress abstraction (ERD §4.1). Pure
// functions: the seam that lets verification run identically regardless of
// whether the address came from autocomplete, free-form fields, or a prior
// verification.

const CORRECTABLE_FIELDS: AddressField[] = [
	"street",
	"secondary",
	"locality",
	"administrativeArea",
	"postalCode",
];

const FINGERPRINT_FIELDS: AddressField[] = [...CORRECTABLE_FIELDS, "country"];

export function fromSuggestion(suggestion: AutocompleteSuggestion): CurrentAddress {
	const address: CurrentAddress = {
		street: suggestion.street_line ?? "",
		secondary: suggestion.secondary ?? "",
		locality: suggestion.locality ?? "",
		administrativeArea: suggestion.administrativeArea ?? "",
		postalCode: suggestion.postalCode ?? "",
		country: suggestion.country ?? "",
		origin: "autocomplete",
	};
	if (suggestion.address_id) address.address_id = suggestion.address_id;
	return address;
}

export function fromVerification(result: VerificationResult): CurrentAddress {
	const base = result.corrected ?? result.entered;
	return { ...base, origin: "verification" };
}

export function toSuggestion(address: CurrentAddress): AutocompleteSuggestion {
	const suggestion: AutocompleteSuggestion = {
		street_line: address.street,
		secondary: address.secondary,
		locality: address.locality,
		administrativeArea: address.administrativeArea,
		postalCode: address.postalCode,
		country: address.country,
	};
	if (address.address_id) suggestion.address_id = address.address_id;
	return suggestion;
}

// Normalized 6-field fingerprint for the in-memory dedupe + staleness check
// (ERD §5.6). No persistent cache; this is the only dedupe in v1.
export function fingerprint(address: CurrentAddress): string {
	return FINGERPRINT_FIELDS.map((field) =>
		String(address[field] ?? "")
			.trim()
			.toLowerCase(),
	).join("|");
}

export function computeDiff(
	entered: CurrentAddress,
	corrected: CurrentAddress,
): AddressDiff | null {
	const changes: AddressDiff["changes"] = {};
	const changedFields: AddressField[] = [];

	for (const field of CORRECTABLE_FIELDS) {
		const from = String(entered[field] ?? "").trim();
		const to = String(corrected[field] ?? "").trim();
		if (from === to) continue;
		changes[field] = { from, to };
		changedFields.push(field);
	}

	if (changedFields.length === 0) return null;
	return { changes, changedFields };
}
