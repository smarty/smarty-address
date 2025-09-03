/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../../index";
import { AutocompleteSuggestion } from "../../interfaces";

describe("Integration: Keyboard Navigation", () => {
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
		{
			street_line: "789 Pine Rd",
			secondary: "",
			city: "Aurora",
			state: "CO",
			zipcode: "80010",
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

	const triggerKeydown = (element: HTMLElement, key: string) => {
		const event = new KeyboardEvent("keydown", {
			key,
			bubbles: true,
			cancelable: true,
		});
		element.dispatchEvent(event);
	};

	const openDropdownWithSuggestions = async (streetInput: HTMLInputElement) => {
		streetInput.value = "123";
		streetInput.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();
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

	it("should highlight next item on ArrowDown", async () => {
		global.fetch = mockFetch();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements[0].getAttribute("aria-selected")).toBe("true");

		triggerKeydown(streetInput, "ArrowDown");
		await jest.runAllTimersAsync();

		expect(suggestionElements[0].getAttribute("aria-selected")).toBe("false");
		expect(suggestionElements[1].getAttribute("aria-selected")).toBe("true");
	});

	it("should highlight previous item on ArrowUp", async () => {
		global.fetch = mockFetch();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		triggerKeydown(streetInput, "ArrowDown");
		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements[1].getAttribute("aria-selected")).toBe("true");

		triggerKeydown(streetInput, "ArrowUp");
		await jest.runAllTimersAsync();

		expect(suggestionElements[0].getAttribute("aria-selected")).toBe("true");
		expect(suggestionElements[1].getAttribute("aria-selected")).toBe("false");
	});

	it("should wrap to last item when pressing ArrowUp on first item", async () => {
		global.fetch = mockFetch();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements[0].getAttribute("aria-selected")).toBe("true");

		triggerKeydown(streetInput, "ArrowUp");
		await jest.runAllTimersAsync();

		expect(suggestionElements[suggestionElements.length - 1].getAttribute("aria-selected")).toBe(
			"true",
		);
	});

	it("should wrap to first item when pressing ArrowDown on last item", async () => {
		global.fetch = mockFetch();

		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		const suggestionElements = document.querySelectorAll('[role="option"]');

		for (let i = 0; i < suggestionElements.length; i++) {
			triggerKeydown(streetInput, "ArrowDown");
			await jest.runAllTimersAsync();
		}

		expect(suggestionElements[0].getAttribute("aria-selected")).toBe("true");
	});

	it("should select highlighted item on Enter", async () => {
		global.fetch = mockFetch();

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
		await openDropdownWithSuggestions(streetInput);

		triggerKeydown(streetInput, "ArrowDown");
		await jest.runAllTimersAsync();

		triggerKeydown(streetInput, "Enter");
		await jest.runAllTimersAsync();

		expect(selectedAddress).not.toBeNull();
		expect(selectedAddress?.street_line).toBe("456 Oak Ave");

		const cityInput = document.querySelector("#city") as HTMLInputElement;
		expect(cityInput.value).toBe("Boulder");
	});

	it("should close dropdown on Escape", async () => {
		global.fetch = mockFetch();

		const onDropdownClose = jest.fn();
		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onDropdownClose,
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;
		await openDropdownWithSuggestions(streetInput);

		let suggestionElements = document.querySelectorAll('[role="option"]');
		expect(suggestionElements.length).toBe(3);

		triggerKeydown(streetInput, "Escape");
		await jest.runAllTimersAsync();

		expect(onDropdownClose).toHaveBeenCalled();
	});

	it("should not respond to keyboard navigation when dropdown is closed", async () => {
		global.fetch = mockFetch();

		let selectedAddress: AutocompleteSuggestion | null = null;
		instance = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key",
			streetSelector: "#street",
			onAddressSelected: (address) => {
				selectedAddress = address;
			},
		});

		const streetInput = document.querySelector("#street") as HTMLInputElement;

		triggerKeydown(streetInput, "ArrowDown");
		triggerKeydown(streetInput, "Enter");
		await jest.runAllTimersAsync();

		expect(selectedAddress).toBeNull();
	});
});
