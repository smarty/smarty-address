import {
	computeDiff,
	fingerprint,
	fromSuggestion,
	fromVerification,
	toSuggestion,
} from "./currentAddress";
import type { AutocompleteSuggestion, CurrentAddress, VerificationResult } from "../interfaces";

const address = (overrides: Partial<CurrentAddress> = {}): CurrentAddress => ({
	street: "3214 N University Ave",
	secondary: "",
	locality: "Provo",
	administrativeArea: "UT",
	postalCode: "84604",
	country: "USA",
	origin: "free-form",
	...overrides,
});

describe("currentAddress", () => {
	describe("fromSuggestion", () => {
		it("maps autocomplete fields and origin", () => {
			const suggestion: AutocompleteSuggestion = {
				street_line: "1 Main St",
				secondary: "Apt 2",
				locality: "Denver",
				administrativeArea: "CO",
				postalCode: "80202",
				country: "USA",
				address_id: "abc",
			};
			expect(fromSuggestion(suggestion)).toEqual({
				street: "1 Main St",
				secondary: "Apt 2",
				locality: "Denver",
				administrativeArea: "CO",
				postalCode: "80202",
				country: "USA",
				origin: "autocomplete",
				address_id: "abc",
			});
		});

		it("omits address_id when absent", () => {
			const result = fromSuggestion({
				street_line: "1 Main St",
				locality: "Denver",
				administrativeArea: "CO",
				postalCode: "80202",
				country: "USA",
			});
			expect(result.address_id).toBeUndefined();
		});
	});

	describe("fromVerification", () => {
		it("prefers the corrected address and re-origins to verification", () => {
			const result = {
				entered: address(),
				corrected: address({ postalCode: "84604-4405", origin: "verification" }),
			} as VerificationResult;
			expect(fromVerification(result)).toMatchObject({
				postalCode: "84604-4405",
				origin: "verification",
			});
		});

		it("falls back to entered when there is no correction", () => {
			const result = { entered: address(), corrected: null } as VerificationResult;
			expect(fromVerification(result)).toMatchObject({
				postalCode: "84604",
				origin: "verification",
			});
		});
	});

	describe("toSuggestion round-trip", () => {
		it("preserves the six address fields", () => {
			const suggestion = toSuggestion(address({ secondary: "Apt 9", address_id: "x" }));
			expect(suggestion).toMatchObject({
				street_line: "3214 N University Ave",
				secondary: "Apt 9",
				locality: "Provo",
				administrativeArea: "UT",
				postalCode: "84604",
				country: "USA",
				address_id: "x",
			});
		});
	});

	describe("fingerprint", () => {
		it("is case- and whitespace-insensitive", () => {
			const a = address({ street: "3214 N University Ave " });
			const b = address({ street: "3214 n university ave" });
			expect(fingerprint(a)).toBe(fingerprint(b));
		});

		it("differs when a field changes", () => {
			expect(fingerprint(address())).not.toBe(fingerprint(address({ postalCode: "84604-4405" })));
		});

		it("ignores origin / address_id", () => {
			expect(fingerprint(address({ origin: "autocomplete" }))).toBe(
				fingerprint(address({ origin: "verification", address_id: "z" })),
			);
		});
	});

	describe("computeDiff", () => {
		it("returns null when nothing changed", () => {
			expect(computeDiff(address(), address())).toBeNull();
		});

		it("reports only changed fields", () => {
			const diff = computeDiff(
				address(),
				address({ postalCode: "84604-4405", street: "3214 North University Avenue" }),
			);
			expect(diff?.changedFields.sort()).toEqual(["postalCode", "street"]);
			expect(diff?.changes.postalCode).toEqual({ from: "84604", to: "84604-4405" });
		});

		it("does not treat country as a correction", () => {
			expect(computeDiff(address(), address({ country: "US" }))).toBeNull();
		});
	});
});
