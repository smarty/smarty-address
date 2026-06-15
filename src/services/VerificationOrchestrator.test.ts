/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../index";
import type { FormService } from "./FormService";
import type { VerificationService } from "./VerificationService";
import type { SmartyAddressConfig } from "../interfaces";
import { CSS_CLASSES } from "../constants/cssClasses";

const candidate = (analysis: Record<string, string>, components: Record<string, string> = {}) => ({
	delivery_line_1: "3214 N University Ave",
	last_line: "Provo UT 84604",
	components: { city_name: "Provo", state_abbreviation: "UT", zipcode: "84604", ...components },
	analysis,
});

const verifiedCandidate = candidate({ dpv_match_code: "Y", footnotes: "" });
const verifiedWithUnitCandidate = candidate(
	{ dpv_match_code: "Y", footnotes: "" },
	{ secondary_designator: "Apt", secondary_number: "4" },
);
const undeliverableCandidate = candidate({ dpv_match_code: "N", footnotes: "" });

const okFetch = (data: unknown): typeof fetch =>
	(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

const slowFetch = (data: unknown, delayMs: number): typeof fetch =>
	(() =>
		new Promise((resolve) =>
			setTimeout(() => resolve({ ok: true, status: 200, json: async () => data }), delayMs),
		)) as unknown as typeof fetch;

// Two macrotask rounds: the verify settles in microtasks, then the native
// re-submission is deferred one macrotask by wireSubmit.
const flush = () => new Promise((resolve) => setTimeout(() => setTimeout(resolve, 0), 0));

const FORM_HTML = `
	<form id="form">
		<input id="street" value="3214 N University Ave" />
		<input id="city" value="Provo" />
		<input id="state" value="UT" />
		<input id="zip" value="84604" />
	</form>`;

interface Internals {
	formService: FormService;
	verificationService: VerificationService;
}

async function build(
	verification: SmartyAddressConfig["verification"],
	fetchFn: typeof fetch,
	html: string = FORM_HTML,
	selectors: Partial<SmartyAddressConfig> = {
		localitySelector: "#city",
		administrativeAreaSelector: "#state",
		postalCodeSelector: "#zip",
	},
) {
	document.body.innerHTML = html;
	const instance = await SmartyAddress.create({
		embeddedKey: "key",
		streetSelector: "#street",
		...selectors,
		autocomplete: { enabled: false },
		verification,
		_testMode: true,
	} as SmartyAddressConfig);
	const internals = instance as unknown as Internals;
	internals.verificationService.setFetch(fetchFn);
	return { instance, internals };
}

describe("Orchestrator — selection trigger + merged-field dedupe", () => {
	it("verifies on selection and dedupes the blur that follows, even when the street field holds 'street, unit'", async () => {
		const fetchFn = jest.fn(okFetch([verifiedWithUnitCandidate]));
		const { instance, internals } = await build(
			{ trigger: ["selection", "blur"] },
			fetchFn as unknown as typeof fetch,
		);

		// No secondarySelector is configured, so population merges the unit into
		// the street input ("3214 N University Ave, Apt 4").
		internals.formService.populateFormWithAddress({
			street_line: "3214 N University Ave",
			secondary: "Apt 4",
			locality: "Provo",
			administrativeArea: "UT",
			postalCode: "84604",
			country: "USA",
		});
		await flush();
		expect(fetchFn).toHaveBeenCalledTimes(1);

		document.querySelector("#street")!.dispatchEvent(new FocusEvent("blur"));
		await flush();
		expect(fetchFn).toHaveBeenCalledTimes(1);

		instance.destroy();
	});
});

describe("Orchestrator — native <form> interception", () => {
	it("intercepts submit, verifies, and re-submits on pass", async () => {
		const { instance } = await build({ trigger: ["submit"] }, okFetch([verifiedCandidate]));
		const form = document.querySelector("#form") as HTMLFormElement;
		const requestSubmit = jest.fn();
		form.requestSubmit = requestSubmit;

		const event = new Event("submit", { cancelable: true });
		form.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		await flush();
		expect(requestSubmit).toHaveBeenCalledTimes(1);

		instance.destroy();
	});

	it("attaches interception when block is configured even without the submit trigger", async () => {
		const { instance } = await build(
			{ trigger: ["blur"], onResult: { undeliverable: "block" } },
			okFetch([undeliverableCandidate]),
		);
		const form = document.querySelector("#form") as HTMLFormElement;
		const requestSubmit = jest.fn();
		form.requestSubmit = requestSubmit;

		const event = new Event("submit", { cancelable: true });
		form.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		await flush();
		expect(requestSubmit).not.toHaveBeenCalled();

		instance.destroy();
	});

	it("keeps intercepting after a re-submit attempt that fired no event (no stuck flag)", async () => {
		const { instance } = await build({ trigger: ["submit"] }, okFetch([verifiedCandidate]));
		const form = document.querySelector("#form") as HTMLFormElement;
		const requestSubmit = jest.fn(); // fires no submit event, like a constraint-validation failure
		form.requestSubmit = requestSubmit;

		form.dispatchEvent(new Event("submit", { cancelable: true }));
		await flush();
		expect(requestSubmit).toHaveBeenCalledTimes(1);

		const second = new Event("submit", { cancelable: true });
		form.dispatchEvent(second);
		expect(second.defaultPrevented).toBe(true);
		await flush();
		expect(requestSubmit).toHaveBeenCalledTimes(2);

		instance.destroy();
	});
});

describe("Orchestrator — submit racing an in-flight blur verify", () => {
	it("verifyBeforeSubmit awaits the in-flight verify and still blocks", async () => {
		const fetchFn = jest.fn(slowFetch([undeliverableCandidate], 20));
		const { instance } = await build(
			{ trigger: ["blur", "submit"], onResult: { undeliverable: "block" } },
			fetchFn as unknown as typeof fetch,
		);

		document.querySelector("#street")!.dispatchEvent(new FocusEvent("blur"));
		const allow = await instance.verifyBeforeSubmit();

		expect(allow).toBe(false);
		expect(fetchFn).toHaveBeenCalledTimes(1);

		instance.destroy();
	});
});

describe("Orchestrator — staleness modes (Q9)", () => {
	it("invalidate (default): editing clears the badge and does not auto re-verify", async () => {
		jest.useFakeTimers();
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { instance } = await build({ trigger: ["manual"] }, fetchFn as unknown as typeof fetch);

		await instance.verify();
		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).not.toBeNull();

		const street = document.querySelector("#street") as HTMLInputElement;
		street.value = "3215 N University Ave";
		street.dispatchEvent(new Event("input"));

		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).toBeNull();
		await jest.advanceTimersByTimeAsync(2000);
		expect(fetchFn).toHaveBeenCalledTimes(1);

		instance.destroy();
		jest.useRealTimers();
	});

	it("revalidate: editing re-verifies after the debounce window", async () => {
		jest.useFakeTimers();
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { instance } = await build(
			{ trigger: ["manual"], staleness: "revalidate" },
			fetchFn as unknown as typeof fetch,
		);

		await instance.verify();
		expect(fetchFn).toHaveBeenCalledTimes(1);

		const street = document.querySelector("#street") as HTMLInputElement;
		street.value = "3215 N University Ave";
		street.dispatchEvent(new Event("input"));

		await jest.advanceTimersByTimeAsync(2000);
		expect(fetchFn).toHaveBeenCalledTimes(2);

		instance.destroy();
		jest.useRealTimers();
	});

	it("revalidate debounces: one call after a burst of keystrokes", async () => {
		jest.useFakeTimers();
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { instance } = await build(
			{ trigger: ["manual"], staleness: "revalidate" },
			fetchFn as unknown as typeof fetch,
		);

		await instance.verify();
		const street = document.querySelector("#street") as HTMLInputElement;
		for (const value of ["3215", "3215 N", "3215 N University Ave"]) {
			street.value = value;
			street.dispatchEvent(new Event("input"));
			await jest.advanceTimersByTimeAsync(100);
		}
		await jest.advanceTimersByTimeAsync(2000);
		expect(fetchFn).toHaveBeenCalledTimes(2);

		instance.destroy();
		jest.useRealTimers();
	});
});

describe("Orchestrator — single-field integrations", () => {
	it("blur verifies when the only configured field is the street input", async () => {
		const fetchFn = jest.fn(okFetch([verifiedCandidate]));
		const { instance } = await build(
			{ trigger: ["blur"] },
			fetchFn as unknown as typeof fetch,
			`<form id="form"><input id="street" value="3214 N University Ave, Provo, UT 84604" /></form>`,
			{},
		);

		document.querySelector("#street")!.dispatchEvent(new FocusEvent("blur"));
		await flush();
		expect(fetchFn).toHaveBeenCalledTimes(1);

		instance.destroy();
	});
});
