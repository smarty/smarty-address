import { normalizeConfig } from "./configNormalizer";
import { validateConfig, isAutocompleteEnabled, isVerificationEnabled } from "./appUtils";
import type { NormalizedSmartyAddressConfig, SmartyAddressConfig } from "../interfaces";

describe("normalizeConfig — de-skew (Q5)", () => {
	it("folds a nested autocomplete block down to root keys", () => {
		const normalized = normalizeConfig({
			embeddedKey: "k",
			autocomplete: { streetSelector: "#street", citySelector: "#city" },
		} as SmartyAddressConfig);
		expect(normalized.streetSelector).toBe("#street");
		expect(normalized.localitySelector).toBe("#city");
	});

	it("keeps existing root keys winning over the nested block (additive aliases)", () => {
		const normalized = normalizeConfig({
			embeddedKey: "k",
			streetSelector: "#root-street",
			autocomplete: { streetSelector: "#nested-street" },
		} as SmartyAddressConfig);
		expect(normalized.streetSelector).toBe("#root-street");
	});

	it("passes the verification block through untouched", () => {
		const verification = { enabled: true, ui: "badge" as const };
		const normalized = normalizeConfig({
			embeddedKey: "k",
			streetSelector: "#s",
			verification,
		} as SmartyAddressConfig);
		expect(normalized.verification).toEqual(verification);
	});

	it("does not leak the block-local 'enabled' flag onto the root", () => {
		const normalized = normalizeConfig({
			embeddedKey: "k",
			streetSelector: "#s",
			autocomplete: { enabled: false },
		} as SmartyAddressConfig) as Record<string, unknown>;
		expect(normalized.enabled).toBeUndefined();
	});
});

describe("mode resolution", () => {
	const base = { embeddedKey: "k", streetSelector: "#s" } as NormalizedSmartyAddressConfig;

	it("both modes default to enabled", () => {
		expect(isAutocompleteEnabled(base)).toBe(true);
		expect(isVerificationEnabled(base)).toBe(true);
	});

	it("respects explicit disable", () => {
		expect(isAutocompleteEnabled({ ...base, autocomplete: { enabled: false } })).toBe(false);
		expect(isVerificationEnabled({ ...base, verification: { enabled: false } })).toBe(false);
	});
});

describe("validateConfig", () => {
	let warn: jest.SpyInstance;
	beforeEach(() => {
		warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
	});
	afterEach(() => warn.mockRestore());

	it("warns and no-ops when neither mode is enabled (does not throw)", () => {
		expect(() =>
			validateConfig({
				embeddedKey: "",
				autocomplete: { enabled: false },
				verification: { enabled: false },
			} as NormalizedSmartyAddressConfig),
		).not.toThrow();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("will not initialize"));
	});

	it("still requires embeddedKey + streetSelector when a mode is on", () => {
		expect(() => validateConfig({ embeddedKey: "" } as NormalizedSmartyAddressConfig)).toThrow(
			/embeddedKey is required/,
		);
	});

	it("accepts panel UI, ambiguous override, and block behavior (Epics 2–3)", () => {
		validateConfig({
			embeddedKey: "k",
			streetSelector: "#s",
			verification: { ui: "panel", onResult: { ambiguous: "prompt", undeliverable: "block" } },
		} as NormalizedSmartyAddressConfig);
		const messages = warn.mock.calls.map((call) => String(call[0]));
		expect(messages.some((m) => m.includes("not yet supported"))).toBe(false);
	});
});
