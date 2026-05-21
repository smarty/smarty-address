/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../../index";
import { AutocompleteSuggestion } from "../../interfaces";
import { INTERNATIONAL_AUTOCOMPLETE_API_URL } from "../../constants";

interface InternationalSummaryCandidate {
	address_id: string;
	address_text: string;
	entries?: number;
}

interface InternationalDetailCandidate {
	street?: string;
	locality?: string;
	administrative_area?: string;
	administrative_area_short?: string;
	administrative_area_long?: string;
	postal_code?: string;
	country_iso3?: string;
}

describe("Integration: International Address Flow", () => {
	let instance: SmartyAddress | null = null;
	const originalFetch = global.fetch;

	const setupForm = (countrySelectInitial?: string) => {
		const countryField = countrySelectInitial
			? `<select id="country">
					<option value="USA">United States</option>
					<option value="CAN" ${countrySelectInitial === "CAN" ? "selected" : ""}>Canada</option>
					<option value="GBR" ${countrySelectInitial === "GBR" ? "selected" : ""}>United Kingdom</option>
				</select>`
			: "";
		document.body.innerHTML = `
			<form>
				${countryField}
				<input id="street" type="text" />
				<input id="secondary" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;
	};

	const flushAsync = async () => {
		for (let i = 0; i < 5; i++) {
			await jest.runAllTimersAsync();
			await Promise.resolve();
		}
	};

	const buildIntlFetchMock = (
		summaryCandidates: InternationalSummaryCandidate[],
		detailCandidatesByAddressId: Record<string, InternationalDetailCandidate[]>,
	) =>
		jest.fn().mockImplementation((url: string) => {
			const parsed = new URL(url);
			const isDetail = /\/v2\/lookup\/[^?]+/.test(parsed.pathname);

			if (isDetail) {
				const id = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ candidates: detailCandidatesByAddressId[id] ?? [] }),
				});
			}

			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ candidates: summaryCandidates }),
			});
		});

	beforeEach(() => {
		setupForm();
		jest.useFakeTimers();
	});

	afterEach(() => {
		if (instance) {
			instance.destroy();
			instance = null;
		}
		global.fetch = originalFetch;
		document.body.innerHTML = "";
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("hits the international endpoint when country is set to a non-US value", async () => {
		const fetchMock = buildIntlFetchMock([], {});
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "CAN",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		expect(fetchMock).toHaveBeenCalled();
		const calledUrl: string = fetchMock.mock.calls[0][0];
		expect(calledUrl).toContain(INTERNATIONAL_AUTOCOMPLETE_API_URL);
		expect(calledUrl).toContain("country=CAN");
	});

	it("performs the two-step summary→detail lookup and populates the form on selection", async () => {
		const summaryCandidate: InternationalSummaryCandidate = {
			address_id: "summary-id-1",
			address_text: "123 Main St Toronto, ON, M5V 3A8",
			entries: 0,
		};
		const detailCandidate: InternationalDetailCandidate = {
			street: "123 Main St",
			locality: "Toronto",
			administrative_area: "ON",
			administrative_area_short: "ON",
			administrative_area_long: "Ontario",
			postal_code: "M5V 3A8",
			country_iso3: "CAN",
		};

		const fetchMock = buildIntlFetchMock([summaryCandidate], {
			"summary-id-1": [detailCandidate],
		});
		global.fetch = fetchMock as unknown as typeof fetch;

		let selected: AutocompleteSuggestion | null = null;
		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "CAN",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
			onAddressSelected: (address) => {
				selected = address;
			},
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123 Main";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		const options = document.querySelectorAll('[role="option"]');
		expect(options.length).toBe(1);
		expect(options[0].textContent).toContain("123 Main St Toronto");

		(options[0] as HTMLElement).click();
		await flushAsync();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		const detailCallUrl: string = fetchMock.mock.calls[1][0];
		expect(detailCallUrl).toContain("/v2/lookup/summary-id-1");

		expect(selected).not.toBeNull();
		expect((selected as unknown as AutocompleteSuggestion).address_id).toBe("summary-id-1");

		expect((document.querySelector("#street") as HTMLInputElement).value).toBe("123 Main St");
		expect((document.querySelector("#city") as HTMLInputElement).value).toBe("Toronto");
		expect((document.querySelector("#state") as HTMLInputElement).value).toBe("ON");
		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("M5V 3A8");
	});

	it("re-opens the dropdown with multiple candidates when the detail lookup is ambiguous", async () => {
		const summaryCandidate: InternationalSummaryCandidate = {
			address_id: "ambig-id",
			address_text: "Apt building, 1 Maple Ave",
		};
		const detailCandidates: InternationalDetailCandidate[] = [
			{
				street: "1-1 Maple Ave",
				locality: "Vancouver",
				administrative_area_short: "BC",
				postal_code: "V6B 1A1",
				country_iso3: "CAN",
			},
			{
				street: "2-1 Maple Ave",
				locality: "Vancouver",
				administrative_area_short: "BC",
				postal_code: "V6B 1A2",
				country_iso3: "CAN",
			},
		];

		const fetchMock = buildIntlFetchMock([summaryCandidate], {
			"ambig-id": detailCandidates,
		});
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "CAN",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "1 Maple";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		(document.querySelectorAll('[role="option"]')[0] as HTMLElement).click();
		await flushAsync();

		const allOptions = document.querySelectorAll('[role="option"]');
		const vancouverMatches = Array.from(allOptions).filter((el) =>
			el.textContent?.includes("Vancouver"),
		);
		expect(vancouverMatches.length).toBeGreaterThanOrEqual(2);

		expect((document.querySelector("#street") as HTMLInputElement).value).not.toBe("1-1 Maple Ave");
	});

	it("auto-populates the form when a single detail candidate is returned even with no street form fields beyond street", async () => {
		const summaryCandidate: InternationalSummaryCandidate = {
			address_id: "single-id",
			address_text: "10 Downing St London, SW1A 2AA",
		};
		const detailCandidate: InternationalDetailCandidate = {
			street: "10 Downing St",
			locality: "London",
			administrative_area: "England",
			postal_code: "SW1A 2AA",
			country_iso3: "GBR",
		};

		const fetchMock = buildIntlFetchMock([summaryCandidate], {
			"single-id": [detailCandidate],
		});
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "GBR",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "10 Down";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		(document.querySelectorAll('[role="option"]')[0] as HTMLElement).click();
		await flushAsync();

		expect(streetInput.value).toContain("10 Downing St");
		expect(streetInput.value).toContain("London");
		expect(streetInput.value).toContain("SW1A 2AA");
	});

	it("falls back to the summary candidate when the detail endpoint returns no candidates", async () => {
		const summaryCandidate: InternationalSummaryCandidate = {
			address_id: "no-detail",
			address_text: "Fallback Line, MX",
		};
		const fetchMock = buildIntlFetchMock([summaryCandidate], { "no-detail": [] });
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "MEX",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "Fallback";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		(document.querySelectorAll('[role="option"]')[0] as HTMLElement).click();
		await flushAsync();

		expect(streetInput.value).toContain("Fallback Line");
	});

	it("uses the live value from countrySelector and switches between US and international endpoints", async () => {
		setupForm("USA");

		const usFetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					suggestions: [
						{
							street_line: "1 US Way",
							secondary: "",
							city: "Denver",
							state: "CO",
							zipcode: "80202",
							country: "US",
						},
					],
				}),
		});

		const intlSummary: InternationalSummaryCandidate = {
			address_id: "intl-id",
			address_text: "Intl Address Line",
		};
		const intlDetail: InternationalDetailCandidate = {
			street: "1 Intl Way",
			locality: "Toronto",
			administrative_area_short: "ON",
			postal_code: "M5V 3A8",
			country_iso3: "CAN",
		};
		const intlFetch = buildIntlFetchMock([intlSummary], { "intl-id": [intlDetail] });

		const routedFetch = jest.fn().mockImplementation((url: string) => {
			if (url.startsWith(INTERNATIONAL_AUTOCOMPLETE_API_URL)) {
				return intlFetch(url);
			}
			return usFetch(url);
		});
		global.fetch = routedFetch as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			countrySelector: "#country",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;

		streetInput.value = "1";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();
		expect(usFetch).toHaveBeenCalledTimes(1);
		expect(intlFetch).not.toHaveBeenCalled();

		(document.querySelector("#country") as HTMLSelectElement).value = "CAN";
		streetInput.value = "1 Intl";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		expect(intlFetch).toHaveBeenCalled();
		const intlCall: string = intlFetch.mock.calls[0][0];
		expect(intlCall).toContain("country=CAN");
	});

	it("closes the dropdown without form mutation when the international lookup errors", async () => {
		const consoleSpy = jest.spyOn(console, "error").mockImplementation();
		const fetchMock = jest.fn().mockResolvedValue({
			ok: false,
			status: 401,
			json: () => Promise.resolve({ errors: [{ id: 1611079217, message: "Auth failed" }] }),
		});
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "CAN",
			streetSelector: "#street",
			localitySelector: "#city",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "abc";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		expect(document.querySelectorAll('[role="option"]').length).toBe(0);
		expect((document.querySelector("#city") as HTMLInputElement).value).toBe("");
		consoleSpy.mockRestore();
	});

	it("does not request a US selected= follow-up when an international primary is clicked", async () => {
		const summary: InternationalSummaryCandidate = {
			address_id: "intl-id",
			address_text: "10 Rue de Rivoli, Paris",
		};
		const detail: InternationalDetailCandidate = {
			street: "10 Rue de Rivoli",
			locality: "Paris",
			postal_code: "75001",
			country_iso3: "FRA",
		};
		const fetchMock = buildIntlFetchMock([summary], { "intl-id": [detail] });
		global.fetch = fetchMock as unknown as typeof fetch;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			country: "FRA",
			streetSelector: "#street",
			localitySelector: "#city",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "10 Rue";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await flushAsync();

		(document.querySelectorAll('[role="option"]')[0] as HTMLElement).click();
		await flushAsync();

		const allCalls = fetchMock.mock.calls.map((c) => c[0] as string);
		expect(allCalls.every((u) => !u.includes("selected="))).toBe(true);
		expect(allCalls.some((u) => /\/v2\/lookup\/intl-id/.test(u))).toBe(true);
	});
});
