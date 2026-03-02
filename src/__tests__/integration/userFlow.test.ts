/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../../index";
import { AutocompleteSuggestion } from "../../interfaces";

describe("Integration: User Flow", () => {
	let instance: SmartyAddress | null = null;

	const mockSuggestions: AutocompleteSuggestion[] = [
		{
			street_line: "123 Main St",
			secondary: "",
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		},
		{
			street_line: "456 Oak Ave",
			secondary: "",
			city: "Boulder",
			state: "CO",
			zipcode: "80301",
			country: "US",
		},
	];

	const setupForm = () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;
	};

	const mockFetch = (suggestions: AutocompleteSuggestion[] = mockSuggestions) => {
		return jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ suggestions }),
		});
	};

	beforeEach(() => {
		setupForm();
		jest.useFakeTimers();
	});

	afterEach(async () => {
		if (instance) {
			instance.destroy();
			instance = null;
		}
		document.body.innerHTML = "";
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("should display suggestions when user types in search input", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123 Main";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		expect(fetchMock).toHaveBeenCalled();
		const calledUrl = fetchMock.mock.calls[0][0];
		expect(calledUrl).toContain("search=123+Main");
	});

	it("should populate form fields when user clicks a suggestion", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		let selectedAddress: AutocompleteSuggestion | null = null;
		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
			onAddressSelected: (address) => {
				selectedAddress = address;
			},
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123 Main";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements.length).toBeGreaterThan(0);

		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(selectedAddress).not.toBeNull();
		expect(selectedAddress?.street_line).toBe("123 Main St");

		const cityInput = document.querySelector("#city") as HTMLInputElement;
		const stateInput = document.querySelector("#state") as HTMLInputElement;
		const zipInput = document.querySelector("#zip") as HTMLInputElement;

		expect(streetInput.value).toBe("123 Main St");
		expect(cityInput.value).toBe("Denver");
		expect(stateInput.value).toBe("CO");
		expect(zipInput.value).toBe("80202");
	});

	it("should call onSuggestionsReceived hook when suggestions arrive", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		const onSuggestionsReceived = jest.fn((suggestions) => suggestions);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onAutocompleteSuggestionsReceived: onSuggestionsReceived,
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		expect(onSuggestionsReceived).toHaveBeenCalledWith(mockSuggestions);
	});

	it("should allow filtering suggestions via onSuggestionsReceived hook", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onAutocompleteSuggestionsReceived: (suggestions) =>
				suggestions.filter((s) => s.city === "Denver"),
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements.length).toBe(1);
	});

	it("should call onDropdownOpen when dropdown opens", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		const onDropdownOpen = jest.fn();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onDropdownOpen,
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		expect(onDropdownOpen).toHaveBeenCalled();
	});

	it("should call onDropdownClose when dropdown closes", async () => {
		const fetchMock = mockFetch();
		global.fetch = fetchMock;

		const onDropdownClose = jest.fn();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onDropdownClose,
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));

		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();

		await jest.runAllTimersAsync();

		expect(onDropdownClose).toHaveBeenCalled();
	});

	describe("secondary address selection", () => {
		const primarySuggestions: AutocompleteSuggestion[] = [
			{
				street_line: "100 Main St",
				secondary: "",
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			},
			{
				street_line: "200 Oak Ave",
				secondary: "Apt",
				city: "Miami Beach",
				state: "FL",
				zipcode: "33139",
				country: "US",
				entries: 3,
			},
			{
				street_line: "200 Oak Ave",
				secondary: "Apt",
				city: "Stoughton",
				state: "MA",
				zipcode: "02072",
				country: "US",
				entries: 2,
			},
		];

		const miamiSecondaries: AutocompleteSuggestion[] = [
			{
				street_line: "200 Oak Ave",
				secondary: "Apt 1",
				city: "Miami Beach",
				state: "FL",
				zipcode: "33139",
				country: "US",
			},
			{
				street_line: "200 Oak Ave",
				secondary: "Apt 2",
				city: "Miami Beach",
				state: "FL",
				zipcode: "33139",
				country: "US",
			},
			{
				street_line: "200 Oak Ave",
				secondary: "Apt 3",
				city: "Miami Beach",
				state: "FL",
				zipcode: "33139",
				country: "US",
			},
		];

		const stoughtonSecondaries: AutocompleteSuggestion[] = [
			{
				street_line: "200 Oak Ave",
				secondary: "Apt 1",
				city: "Stoughton",
				state: "MA",
				zipcode: "02072",
				country: "US",
			},
			{
				street_line: "200 Oak Ave",
				secondary: "Apt 2",
				city: "Stoughton",
				state: "MA",
				zipcode: "02072",
				country: "US",
			},
		];

		const flushAsync = async () => {
			for (let i = 0; i < 5; i++) {
				await jest.runAllTimersAsync();
				await Promise.resolve();
			}
		};

		const secondaryFetchMock = () =>
			jest.fn().mockImplementation((url: string) => {
				const params = new URLSearchParams(url.split("?")[1]);
				const selected = params.get("selected") || "";

				if (selected.includes("Stoughton")) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ suggestions: stoughtonSecondaries }),
					});
				}
				if (selected.includes("Miami")) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({ suggestions: miamiSecondaries }),
					});
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ suggestions: primarySuggestions }),
				});
			});

		it("should expand correct secondaries when clicking a second address with entries", async () => {
			global.fetch = secondaryFetchMock();

			instance = await SmartyAddress.create({
				_testMode: true,
				embeddedKey: "test-key",
				streetSelector: "#street",
				localitySelector: "#city",
				administrativeAreaSelector: "#state",
				postalCodeSelector: "#zip",
			});

			const streetInput = document.querySelector("#street") as HTMLInputElement;
			streetInput.value = "200 Oak";
			streetInput.dispatchEvent(new Event("input", { bubbles: true }));
			await flushAsync();

			const suggestions = document.querySelectorAll('[role="option"]');
			expect(suggestions.length).toBe(3);

			(suggestions[1] as HTMLElement).click();
			await flushAsync();

			let allOptions = document.querySelectorAll('[role="option"]');
			const hasMiamiSecondary = Array.from(allOptions).some(
				(el) => el.textContent?.includes("Apt 1") && el.textContent?.includes("Miami Beach"),
			);
			expect(hasMiamiSecondary).toBe(true);

			const stoughtonOption = Array.from(allOptions).find((el) =>
				el.textContent?.includes("Stoughton"),
			) as HTMLElement;
			stoughtonOption.click();
			await flushAsync();

			allOptions = document.querySelectorAll('[role="option"]');
			const hasStoughtonSecondary = Array.from(allOptions).some(
				(el) => el.textContent?.includes("Apt 1") && el.textContent?.includes("Stoughton"),
			);
			expect(hasStoughtonSecondary).toBe(true);
		});

		it("should select correct address when clicking a primary after secondaries are expanded", async () => {
			global.fetch = secondaryFetchMock();

			instance = await SmartyAddress.create({
				_testMode: true,
				embeddedKey: "test-key",
				streetSelector: "#street",
				localitySelector: "#city",
				administrativeAreaSelector: "#state",
				postalCodeSelector: "#zip",
			});

			const streetInput = document.querySelector("#street") as HTMLInputElement;
			streetInput.value = "200 Oak";
			streetInput.dispatchEvent(new Event("input", { bubbles: true }));
			await flushAsync();

			const suggestions = document.querySelectorAll('[role="option"]');
			(suggestions[1] as HTMLElement).click();
			await flushAsync();

			const allOptions = document.querySelectorAll('[role="option"]');
			const denverOption = Array.from(allOptions).find((el) =>
				el.textContent?.includes("Denver"),
			) as HTMLElement;
			expect(denverOption).toBeDefined();

			denverOption.click();
			await flushAsync();

			const streetValue = (document.querySelector("#street") as HTMLInputElement).value;
			const cityValue = (document.querySelector("#city") as HTMLInputElement).value;
			expect(streetValue).toBe("100 Main St");
			expect(cityValue).toBe("Denver");
		});
	});
});
