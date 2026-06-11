/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../index";
import type { SmartyAddressConfig } from "../interfaces";

const candidate = (analysis: Record<string, string>, components: Record<string, string> = {}) => ({
	delivery_line_1: "3214 N University Ave",
	last_line: "Provo UT 84604",
	components: { city_name: "Provo", state_abbreviation: "UT", zipcode: "84604", ...components },
	analysis,
});

const verifiedCandidate = candidate({ dpv_match_code: "Y", footnotes: "" });
const undeliverableCandidate = candidate({ dpv_match_code: "N", footnotes: "" });

const okFetch = (data: unknown): typeof fetch =>
	(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

const failFetch = (status: number): typeof fetch =>
	(async () => ({ ok: false, status, json: async () => ({}) })) as unknown as typeof fetch;

const FORM_HTML = `
	<form id="form">
		<input id="street" value="3214 N University Ave" />
		<input id="city" value="Provo" />
		<input id="state" value="UT" />
		<input id="zip" value="84604" />
	</form>`;

async function build(
	verification: SmartyAddressConfig["verification"],
	fetchData: { fetchFn: typeof fetch },
) {
	document.body.innerHTML = FORM_HTML;
	const instance = await SmartyAddress.create({
		embeddedKey: "key",
		streetSelector: "#street",
		localitySelector: "#city",
		administrativeAreaSelector: "#state",
		postalCodeSelector: "#zip",
		autocomplete: { enabled: false },
		verification,
		_testMode: true,
	} as SmartyAddressConfig);
	// Inject fetch into the internal service via the public verify path.
	(
		instance as unknown as { verificationService: { setFetch: (f: typeof fetch) => void } }
	).verificationService.setFetch(fetchData.fetchFn);
	return instance;
}

describe("Epic 3 — verifyBeforeSubmit()", () => {
	it("allows submit for a verified address", async () => {
		const instance = await build(
			{ trigger: ["manual"] },
			{ fetchFn: okFetch([verifiedCandidate]) },
		);
		await expect(instance.verifyBeforeSubmit()).resolves.toBe(true);
		instance.destroy();
	});

	it("blocks submit when undeliverable is configured to block (Type 7 override)", async () => {
		const instance = await build(
			{ trigger: ["manual"], onResult: { undeliverable: "block" } },
			{ fetchFn: okFetch([undeliverableCandidate]) },
		);
		await expect(instance.verifyBeforeSubmit()).resolves.toBe(false);
		instance.destroy();
	});

	it("allows submit for undeliverable under the default warn (fail-open)", async () => {
		const instance = await build(
			{ trigger: ["manual"] },
			{ fetchFn: okFetch([undeliverableCandidate]) },
		);
		await expect(instance.verifyBeforeSubmit()).resolves.toBe(true);
		instance.destroy();
	});

	it("blocks submit on a service error when fail-closed", async () => {
		const instance = await build(
			{ trigger: ["manual"], failureMode: "fail-closed" },
			{ fetchFn: failFetch(500) },
		);
		await expect(instance.verifyBeforeSubmit()).resolves.toBe(false);
		instance.destroy();
	});

	it("lets an onBeforeSubmit hook force a block", async () => {
		const onBeforeSubmit = jest.fn().mockReturnValue(false);
		const instance = await build(
			{ trigger: ["manual"], onBeforeSubmit },
			{ fetchFn: okFetch([verifiedCandidate]) },
		);
		await expect(instance.verifyBeforeSubmit()).resolves.toBe(false);
		expect(onBeforeSubmit).toHaveBeenCalled();
		instance.destroy();
	});
});
