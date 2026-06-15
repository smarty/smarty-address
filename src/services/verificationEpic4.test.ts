/**
 * @jest-environment jsdom
 */
import { VerificationService } from "./VerificationService";
import { VerificationUiService } from "./VerificationUiService";
import { FormService } from "./FormService";
import { DomService } from "./DomService";
import type { CurrentAddress, VerificationConfig } from "../interfaces";

const enteredIntl = (overrides: Partial<CurrentAddress> = {}): CurrentAddress => ({
	street: "221B Baker St",
	secondary: "",
	locality: "London",
	administrativeArea: "",
	postalCode: "NW1 6XE",
	country: "GBR",
	origin: "free-form",
	...overrides,
});

const intlCandidate = (
	analysis: Record<string, unknown>,
	components: Record<string, string> = {},
) => ({
	address1: "221B Baker St",
	components: {
		locality: "London",
		postal_code: "NW1 6XE",
		country_iso3: "GBR",
		...components,
	},
	analysis,
});

const svc = new VerificationService();
const classify = (candidates: unknown[]) => svc.classify(candidates, enteredIntl());

describe("Epic 4 — classifyInternational (ERD §5.4)", () => {
	it("Type 1 — verified at country max precision", () => {
		const result = classify([
			intlCandidate({
				verification_status: "Verified",
				address_precision: "DeliveryPoint",
				max_address_precision: "DeliveryPoint",
				changes: {},
			}),
		]);
		expect(result.type).toBe("verified");
	});

	it("Type 2 — corrected (Verified-SmallChange)", () => {
		const result = classify([
			intlCandidate({
				verification_status: "Verified",
				address_precision: "DeliveryPoint",
				max_address_precision: "DeliveryPoint",
				changes: { thoroughfare: "Verified-SmallChange" },
			}),
		]);
		expect(result.type).toBe("corrected");
	});

	it("Type 3 — missing secondary (Partial / Premise / no sub_building)", () => {
		const result = classify([
			intlCandidate({
				verification_status: "Partial",
				address_precision: "Premise",
				max_address_precision: "DeliveryPoint",
				changes: {},
			}),
		]);
		expect(result.type).toBe("missingSecondary");
	});

	it("Type 4 — secondary not recognized (changes.sub_building Unrecognized)", () => {
		const result = classify([
			intlCandidate(
				{
					verification_status: "Verified",
					address_precision: "DeliveryPoint",
					max_address_precision: "DeliveryPoint",
					changes: { sub_building: "Unrecognized" },
				},
				{ sub_building: "Flat 99" },
			),
		]);
		expect(result.type).toBe("secondaryNotMatched");
	});

	it("Type 6 — ambiguous (verification_status Ambiguous)", () => {
		const result = classify([
			intlCandidate({ verification_status: "Ambiguous", address_precision: "Thoroughfare" }),
		]);
		expect(result.type).toBe("ambiguous");
	});

	it("Type 7 — undeliverable (status None)", () => {
		expect(classify([intlCandidate({ verification_status: "None" })]).type).toBe("undeliverable");
	});

	it("Type 7 — undeliverable (address_precision None)", () => {
		expect(
			classify([intlCandidate({ verification_status: "Partial", address_precision: "None" })]).type,
		).toBe("undeliverable");
	});

	it("Type 7 — undeliverable (zero candidates)", () => {
		expect(classify([]).type).toBe("undeliverable");
	});

	it("Type 6 requires verification_status Ambiguous — multiple candidates alone are not ambiguous internationally", () => {
		const verified = intlCandidate({
			verification_status: "Verified",
			address_precision: "DeliveryPoint",
			max_address_precision: "DeliveryPoint",
			changes: {},
		});
		const result = classify([verified, verified]);
		expect(result.type).toBe("verified");
	});

	it("guard order: Ambiguous + sub_building Unrecognized is ambiguous, not secondaryNotMatched", () => {
		const result = classify([
			intlCandidate({
				verification_status: "Ambiguous",
				address_precision: "Premise",
				changes: { sub_building: "Unrecognized" },
			}),
		]);
		expect(result.type).toBe("ambiguous");
	});

	it("Type 2 requires a qualifying change — a mere component diff stays verified at country max", () => {
		const result = classify([
			intlCandidate(
				{
					verification_status: "Verified",
					address_precision: "DeliveryPoint",
					max_address_precision: "DeliveryPoint",
					changes: {},
				},
				{ locality: "Camden" },
			),
		]);
		expect(result.type).toBe("verified");
	});

	it("a diff cannot bypass the Q10 precision gate — Verified below country max is not corrected", () => {
		const result = classify([
			intlCandidate(
				{
					verification_status: "Verified",
					address_precision: "Premise",
					max_address_precision: "DeliveryPoint",
					changes: {},
				},
				{ locality: "Camden" },
			),
		]);
		expect(result.type).toBe("missingSecondary");
	});

	it("Q10 fallback: missing max_address_precision below Premise is not verified, and the gap is logged", () => {
		const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
		const result = classify([
			intlCandidate({
				verification_status: "Verified",
				address_precision: "Locality",
				changes: {},
			}),
		]);
		expect(result.type).not.toBe("verified");
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("max_address_precision"));
		warn.mockRestore();
	});

	it("Type 5 (flagged) can never fire internationally", () => {
		const statuses = ["Verified", "Partial", "Ambiguous", "None"];
		statuses.forEach((verification_status) => {
			const result = classify([
				intlCandidate({ verification_status, address_precision: "Premise", dpv_vacant: "Y" }),
			]);
			expect(result.type).not.toBe("flagged");
		});
	});

	describe("Q10 — per-country max precision boundary", () => {
		it("verified when precision reaches a lower country max (Locality)", () => {
			const result = classify([
				intlCandidate({
					verification_status: "Verified",
					address_precision: "Locality",
					max_address_precision: "Locality",
					changes: {},
				}),
			]);
			expect(result.type).toBe("verified");
		});

		it("not verified when precision is below the country max", () => {
			const result = classify([
				intlCandidate({
					verification_status: "Verified",
					address_precision: "Thoroughfare",
					max_address_precision: "DeliveryPoint",
					changes: {},
				}),
			]);
			expect(result.type).not.toBe("verified");
		});

		it("falls back to Premise minimum when max_address_precision is absent", () => {
			const result = classify([
				intlCandidate({
					verification_status: "Verified",
					address_precision: "Premise",
					changes: {},
				}),
			]);
			expect(result.type).toBe("verified");
		});
	});
});

const okFetch = (data: unknown): typeof fetch =>
	(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

function setupIntl(verification: VerificationConfig = {}) {
	document.body.innerHTML = `
		<input id="street" value="221B Baker St" />
		<input id="city" value="London" />
		<input id="zip" value="NW1 6XE" />`;
	const domService = new DomService();
	const formService = new FormService();
	const verificationUiService = new VerificationUiService();
	const verificationService = new VerificationService();
	const services = { domService, formService, verificationUiService, verificationService };
	Object.values(services).forEach((service) => service.setServices(services));
	const config = {
		embeddedKey: "key",
		streetSelector: "#street",
		localitySelector: "#city",
		postalCodeSelector: "#zip",
		country: "GBR",
		autocompleteApiUrl: "",
		internationalAutocompleteApiUrl: "",
		theme: [],
		verification,
	} as never;
	formService.init(config);
	verificationUiService.init(config);
	verificationService.init(config);
	return { verificationService };
}

describe("Epic 4 — international verify end-to-end", () => {
	it("fetches the international Street API and renders a verified badge", async () => {
		const { verificationService } = setupIntl();
		verificationService.setFetch(
			okFetch([
				intlCandidate({
					verification_status: "Verified",
					address_precision: "DeliveryPoint",
					max_address_precision: "DeliveryPoint",
					changes: {},
				}),
			]),
		);
		const result = await verificationService.verifyCurrent("manual");
		expect(result?.source).toBe("international");
		expect(result?.type).toBe("verified");
		expect(document.querySelector(".smartyAddress__verifyBadge")?.textContent).toBe("Verified");
	});
});
