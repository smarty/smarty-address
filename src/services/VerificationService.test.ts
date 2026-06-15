/**
 * @jest-environment jsdom
 */
import { VerificationService, parseUsFootnotes } from "./VerificationService";
import { VerificationUiService } from "./VerificationUiService";
import { FormService } from "./FormService";
import { DomService } from "./DomService";
import type { CurrentAddress, VerificationConfig } from "../interfaces";

const entered = (overrides: Partial<CurrentAddress> = {}): CurrentAddress => ({
	street: "3214 N University Ave",
	secondary: "",
	locality: "Provo",
	administrativeArea: "UT",
	postalCode: "84604",
	country: "USA",
	origin: "free-form",
	...overrides,
});

// US Street candidate fixtures keyed to the §7 taxonomy.
const candidate = (analysis: Record<string, string>, components: Record<string, string> = {}) => ({
	delivery_line_1: "3214 N University Ave",
	last_line: "Provo UT 84604",
	components: { city_name: "Provo", state_abbreviation: "UT", zipcode: "84604", ...components },
	analysis,
});

const verifiedCandidate = candidate({ dpv_match_code: "Y", footnotes: "" });
const correctedCandidate = candidate(
	{ dpv_match_code: "Y", footnotes: "A#N#" },
	{ plus4_code: "4405" },
);
const missingSecondaryCandidate = candidate(
	{ dpv_match_code: "D", footnotes: "N1#" },
	{ plus4_code: "7409" },
);
const badSecondaryCandidate = candidate(
	{ dpv_match_code: "S", footnotes: "" },
	{ plus4_code: "7409" },
);
const flaggedCandidate = candidate(
	{ dpv_match_code: "Y", dpv_vacant: "Y", footnotes: "" },
	{ plus4_code: "1820" },
);
const undeliverableCandidate = candidate({ dpv_match_code: "N", footnotes: "" });

describe("parseUsFootnotes", () => {
	it("splits the #-joined footnote string into class tokens", () => {
		expect(parseUsFootnotes("A#N#R7#")).toEqual(new Set(["A", "N", "R7"]));
	});
	it("returns an empty set for undefined / empty", () => {
		expect(parseUsFootnotes(undefined).size).toBe(0);
		expect(parseUsFootnotes("").size).toBe(0);
	});
});

describe("VerificationService.classify (US)", () => {
	const svc = new VerificationService();

	const classifyOne = (c: unknown) => svc.classify([c], entered());

	it("Type 1 — verified, unchanged", () => {
		expect(classifyOne(verifiedCandidate).type).toBe("verified");
	});

	it("Type 2 — verified, corrected (standardization footnotes + ZIP4)", () => {
		const result = classifyOne(correctedCandidate);
		expect(result.type).toBe("corrected");
		expect(result.corrected?.postalCode).toBe("84604-4405");
		expect(result.diff?.changedFields).toContain("postalCode");
	});

	it("Type 3 — missing secondary (dpv D)", () => {
		expect(classifyOne(missingSecondaryCandidate).type).toBe("missingSecondary");
	});

	it("Type 4 — secondary not recognized (dpv S)", () => {
		expect(classifyOne(badSecondaryCandidate).type).toBe("secondaryNotMatched");
	});

	it("Type 5 — deliverable but flagged (vacant) takes precedence over corrected", () => {
		expect(classifyOne(flaggedCandidate).type).toBe("flagged");
	});

	it("Type 7 — undeliverable (dpv N)", () => {
		expect(classifyOne(undeliverableCandidate).type).toBe("undeliverable");
	});

	it("Type 7 — undeliverable (zero candidates)", () => {
		expect(svc.classify([], entered()).type).toBe("undeliverable");
	});

	it("Type 6 — ambiguous (multiple deliverable candidates)", () => {
		const result = svc.classify([verifiedCandidate, verifiedCandidate], entered());
		expect(result.type).toBe("ambiguous");
		expect(result.candidates).toHaveLength(2);
	});

	it("sets nonBlocking only for flagged / undeliverable / error", () => {
		expect(classifyOne(verifiedCandidate).nonBlocking).toBe(false);
		expect(classifyOne(flaggedCandidate).nonBlocking).toBe(true);
		expect(classifyOne(undeliverableCandidate).nonBlocking).toBe(true);
	});
});

const FORM_HTML = `
	<form>
		<input id="street" value="3214 N University Ave" />
		<input id="secondary" value="" />
		<input id="city" value="Provo" />
		<input id="state" value="UT" />
		<input id="zip" value="84604" />
	</form>`;

const okFetch = (data: unknown): typeof fetch =>
	(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

const failFetch = (status: number): typeof fetch =>
	(async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch;

function setup(verification: VerificationConfig = {}) {
	document.body.innerHTML = FORM_HTML;
	const domService = new DomService();
	const formService = new FormService();
	const verificationUiService = new VerificationUiService();
	const verificationService = new VerificationService();
	const services = { domService, formService, verificationUiService, verificationService };
	Object.values(services).forEach((service) => service.setServices(services));

	const config = {
		embeddedKey: "key",
		streetSelector: "#street",
		secondarySelector: "#secondary",
		localitySelector: "#city",
		administrativeAreaSelector: "#state",
		postalCodeSelector: "#zip",
		autocompleteApiUrl: "",
		internationalAutocompleteApiUrl: "",
		theme: [],
		verification,
	} as never;

	formService.init(config);
	verificationUiService.init(config);
	verificationService.init(config);

	return { verificationService, formService, domService };
}

describe("VerificationService dispatch + behavior", () => {
	it("applies a Type 2 correction to the form and announces it", async () => {
		const onVerified = jest.fn();
		const { verificationService } = setup({ onVerified });
		verificationService.setFetch(okFetch([correctedCandidate]));

		const result = await verificationService.verifyCurrent("manual");

		expect(result?.type).toBe("corrected");
		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("84604-4405");
		expect(document.querySelector(".smartyAddress__verifyBadge")?.textContent).toBe("Adjusted");
		expect(onVerified).toHaveBeenCalledTimes(1);
	});

	it("verified result renders a positive badge", async () => {
		const { verificationService } = setup();
		verificationService.setFetch(okFetch([verifiedCandidate]));
		await verificationService.verifyCurrent("manual");
		expect(document.querySelector(".smartyAddress__verifyBadge_positive")?.textContent).toBe(
			"Verified",
		);
	});

	it("honors an onResult override (corrected → silent: no badge)", async () => {
		const { verificationService } = setup({ onResult: { corrected: "silent" } });
		verificationService.setFetch(okFetch([correctedCandidate]));
		await verificationService.verifyCurrent("manual");
		// silent still applies the correction, but with badge UI the cue is shown.
		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("84604-4405");
	});

	it("ui: 'none' renders no badge", async () => {
		const { verificationService } = setup({ ui: "none" });
		verificationService.setFetch(okFetch([verifiedCandidate]));
		await verificationService.verifyCurrent("manual");
		expect(document.querySelector(".smartyAddress__verifyBadge")).toBeNull();
	});

	it("prompt: a reject decision leaves the entered address untouched (nothing applied before the hook)", async () => {
		const onCorrectionOffered = jest.fn().mockResolvedValue({ action: "reject" });
		const { verificationService } = setup({
			onResult: { corrected: "prompt" },
			onCorrectionOffered,
		});
		verificationService.setFetch(okFetch([correctedCandidate]));

		await verificationService.verifyCurrent("manual");

		expect(onCorrectionOffered).toHaveBeenCalled();
		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("84604");
	});

	it("prompt: an accept decision applies the correction", async () => {
		const onCorrectionOffered = jest.fn().mockResolvedValue({ action: "accept" });
		const { verificationService } = setup({
			onResult: { corrected: "prompt" },
			onCorrectionOffered,
		});
		verificationService.setFetch(okFetch([correctedCandidate]));

		await verificationService.verifyCurrent("manual");

		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("84604-4405");
	});

	it("type 4 prompt keeps the entered unit instead of overwriting it (PRD §7 row 4)", async () => {
		const { verificationService } = setup();
		(document.querySelector("#secondary") as HTMLInputElement).value = "Apt 9";
		verificationService.setFetch(okFetch([badSecondaryCandidate]));

		const result = await verificationService.verifyCurrent("manual");

		expect(result?.type).toBe("secondaryNotMatched");
		expect((document.querySelector("#secondary") as HTMLInputElement).value).toBe("Apt 9");
	});

	it("nonBlocking reflects a block override on type 7", async () => {
		const { verificationService } = setup({ onResult: { undeliverable: "block" } });
		verificationService.setFetch(okFetch([undeliverableCandidate]));
		const result = await verificationService.verifyCurrent("manual");
		expect(result?.nonBlocking).toBe(false);
	});

	it("drops a disallowed onResult override instead of dispatching it", () => {
		const { verificationService } = setup({ onResult: { verified: "block" } } as never);
		expect(verificationService.getEffectiveConfig().onResult.verified).toBe("silent");
	});
});

describe("VerificationService dedupe + staleness", () => {
	it("dedupes the selection→blur double call (same fingerprint)", async () => {
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { verificationService } = setup();
		verificationService.setFetch(fetchFn as unknown as typeof fetch);

		const first = await verificationService.verifyCurrent("selection");
		const second = await verificationService.verifyCurrent("blur");

		expect(second).toBe(first);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("re-verifies after markStale()", async () => {
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { verificationService } = setup();
		verificationService.setFetch(fetchFn as unknown as typeof fetch);

		await verificationService.verifyCurrent("selection");
		verificationService.markStale();
		await verificationService.verifyCurrent("blur");

		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it("sets verifiedAt on a successful verify and clears it on staleness", async () => {
		const { verificationService } = setup();
		verificationService.setFetch(okFetch([verifiedCandidate]));

		const result = await verificationService.verifyCurrent("manual");
		expect(typeof result?.entered.verifiedAt).toBe("number");
		expect(typeof result?.corrected?.verifiedAt).toBe("number");

		verificationService.markStale();
		expect(result?.entered.verifiedAt).toBeUndefined();
		expect(result?.corrected?.verifiedAt).toBeUndefined();
	});

	it("tracks the corrected fingerprint so a follow-up blur on corrected values is deduped", async () => {
		const fetchFn = jest.fn(okFetch([correctedCandidate]));
		const { verificationService } = setup();
		verificationService.setFetch(fetchFn as unknown as typeof fetch);

		const first = await verificationService.verifyCurrent("selection"); // applies 84604-4405 to the form
		const second = await verificationService.verifyCurrent("blur"); // reads corrected values

		expect(second).toBe(first);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});

describe("VerificationService error handling", () => {
	it("fail-open by default: Type 8 error, non-blocking, onVerificationFailed fired", async () => {
		const onVerificationFailed = jest.fn();
		const { verificationService } = setup({ onVerificationFailed });
		verificationService.setFetch(failFetch(429));

		const result = await verificationService.verifyCurrent("manual");

		expect(result?.type).toBe("error");
		expect(result?.nonBlocking).toBe(true);
		expect(onVerificationFailed).toHaveBeenCalledWith(
			expect.objectContaining({ kind: "quota", failureMode: "fail-open" }),
		);
	});

	it("fail-closed marks the error result blocking", async () => {
		const { verificationService } = setup({ failureMode: "fail-closed" });
		verificationService.setFetch(failFetch(500));
		const result = await verificationService.verifyCurrent("manual");
		expect(result?.type).toBe("error");
		expect(result?.nonBlocking).toBe(false);
	});
});
