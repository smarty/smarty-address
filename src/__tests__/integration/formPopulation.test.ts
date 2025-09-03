/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../../index";
import { AutocompleteSuggestion } from "../../interfaces";

describe("Integration: Form Population", () => {
	let instance: SmartyAddress | null = null;

	const mockSuggestionWithSecondary: AutocompleteSuggestion = {
		street_line: "123 Main St",
		secondary: "Apt 5",
		city: "Denver",
		state: "CO",
		zipcode: "80202",
		country: "US",
	};

	const mockSuggestionWithEntries: AutocompleteSuggestion = {
		street_line: "500 Office Park Dr",
		secondary: "(10 entries)",
		city: "Denver",
		state: "CO",
		zipcode: "80203",
		country: "US",
		entries: 10,
	};

	const mockSecondarySuggestions: AutocompleteSuggestion[] = [
		{
			street_line: "500 Office Park Dr",
			secondary: "Suite 100",
			city: "Denver",
			state: "CO",
			zipcode: "80203",
			country: "US",
		},
		{
			street_line: "500 Office Park Dr",
			secondary: "Suite 200",
			city: "Denver",
			state: "CO",
			zipcode: "80203",
			country: "US",
		},
	];

	const mockFetch = (suggestions: AutocompleteSuggestion[]) => {
		return jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ suggestions }),
		});
	};

	const openDropdownWithSuggestions = async (
		streetInput: HTMLInputElement,
		searchValue: string = "123",
	) => {
		streetInput.value = searchValue;
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();
	};

	beforeEach(() => {
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

	it("should populate all form fields when address is selected", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="apt" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			secondarySelector: "#apt",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(streetInput.value).toBe("123 Main St");
		expect((document.querySelector("#apt") as HTMLInputElement).value).toBe("Apt 5");
		expect((document.querySelector("#city") as HTMLInputElement).value).toBe("Denver");
		expect((document.querySelector("#state") as HTMLInputElement).value).toBe("CO");
		expect((document.querySelector("#zip") as HTMLInputElement).value).toBe("80202");
	});

	it("should include secondary in street field when secondary field is missing", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(streetInput.value).toBe("123 Main St, Apt 5");
	});

	it("should format full address in single field form", async () => {
		document.body.innerHTML = `
			<form>
				<input id="address" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#address",
		});

		const addressInput = document.querySelector("#address") as HTMLInputElement;
		await openDropdownWithSuggestions(addressInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(addressInput.value).toBe("123 Main St, Apt 5, Denver, CO 80202");
	});

	it("should format address with newlines in textarea single field form", async () => {
		document.body.innerHTML = `
			<form>
				<textarea id="address"></textarea>
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#address",
		});

		const addressInput = document.querySelector("#address") as HTMLTextAreaElement;
		addressInput.value = "123";
		addressInput.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(addressInput.value).toBe("123 Main St\nApt 5\nDenver, CO 80202");
	});

	it("should handle select element for state with abbreviation values", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="city" type="text" />
				<select id="state">
					<option value="">Select State</option>
					<option value="CA">California</option>
					<option value="CO">Colorado</option>
					<option value="TX">Texas</option>
				</select>
				<input id="zip" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		const stateSelect = document.querySelector("#state") as HTMLSelectElement;
		expect(stateSelect.value).toBe("CO");
	});

	it("should handle select element for state with full name values", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="city" type="text" />
				<select id="state">
					<option value="">Select State</option>
					<option value="California">CA</option>
					<option value="Colorado">CO</option>
					<option value="Texas">TX</option>
				</select>
				<input id="zip" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		const stateSelect = document.querySelector("#state") as HTMLSelectElement;
		expect(stateSelect.value).toBe("Colorado");
	});

	it("should trigger secondary fetch when address with multiple entries is clicked", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="apt" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;

		const fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ suggestions: [mockSuggestionWithEntries] }),
		});
		global.fetch = fetchMock;

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			secondarySelector: "#apt",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput, "500 Office");

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements.length).toBe(1);

		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(streetInput.value).toContain("500 Office Park Dr");
		expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

		const secondCallUrl = fetchMock.mock.calls[1][0];
		expect(secondCallUrl).toContain("selected=");
	});

	it("should keep dropdown open when address with entries is clicked", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="apt" type="text" />
				<input id="city" type="text" />
				<input id="state" type="text" />
				<input id="zip" type="text" />
			</form>
		`;

		const onDropdownClose = jest.fn();
		global.fetch = mockFetch([mockSuggestionWithEntries]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			secondarySelector: "#apt",
			localitySelector: "#city",
			administrativeAreaSelector: "#state",
			postalCodeSelector: "#zip",
			onDropdownClose,
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput, "500 Office");

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(onDropdownClose).not.toHaveBeenCalled();
	});

	it("should dispatch change events on form fields when populated", async () => {
		document.body.innerHTML = `
			<form>
				<input id="street" type="text" />
				<input id="city" type="text" />
			</form>
		`;

		global.fetch = mockFetch([mockSuggestionWithSecondary]);

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			localitySelector: "#city",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		const cityInput = document.querySelector("#city") as HTMLInputElement;

		const streetChangeHandler = jest.fn();
		const cityChangeHandler = jest.fn();
		streetInput.addEventListener("change", streetChangeHandler);
		cityInput.addEventListener("change", cityChangeHandler);

		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		(suggestionElements[0] as HTMLElement).click();
		await jest.runAllTimersAsync();

		expect(streetChangeHandler).toHaveBeenCalled();
		expect(cityChangeHandler).toHaveBeenCalled();
	});
});
