/**
 * @jest-environment jsdom
 */
import SmartyAddress from "../../index";
import { AutocompleteSuggestion } from "../../interfaces";

describe("Integration: Multiple Instances", () => {
	let instance1: SmartyAddress | null = null;
	let instance2: SmartyAddress | null = null;

	const mockSuggestions1: AutocompleteSuggestion[] = [
		{
			street_line: "100 First St",
			secondary: "",
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		},
	];

	const mockSuggestions2: AutocompleteSuggestion[] = [
		{
			street_line: "200 Second Ave",
			secondary: "",
			city: "Boulder",
			state: "CO",
			zipcode: "80301",
			country: "US",
		},
	];

	const setupForms = () => {
		document.body.innerHTML = `
			<div id="form1">
				<input id="street1" type="text" />
				<input id="city1" type="text" />
			</div>
			<div id="form2">
				<input id="street2" type="text" />
				<input id="city2" type="text" />
			</div>
		`;
	};

	beforeEach(() => {
		setupForms();
		jest.useFakeTimers();
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ suggestions: mockSuggestions1 }),
		});
	});

	afterEach(() => {
		if (instance1) {
			instance1.destroy();
			instance1 = null;
		}
		if (instance2) {
			instance2.destroy();
			instance2 = null;
		}
		document.body.innerHTML = "";
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("should create two independent instances", async () => {
		instance1 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-1",
			streetSelector: "#street1",
			localitySelector: "#city1",
		});

		instance2 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-2",
			streetSelector: "#street2",
			localitySelector: "#city2",
		});

		expect(instance1).toBeDefined();
		expect(instance2).toBeDefined();
		expect(instance1).not.toBe(instance2);
	});

	it("should populate only the correct form when selecting from first instance", async () => {
		instance1 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-1",
			streetSelector: "#street1",
			localitySelector: "#city1",
		});

		instance2 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-2",
			streetSelector: "#street2",
			localitySelector: "#city2",
		});

		const street1 = document.querySelector("#street1") as HTMLInputElement;
		const street2 = document.querySelector("#street2") as HTMLInputElement;
		const city1 = document.querySelector("#city1") as HTMLInputElement;
		const city2 = document.querySelector("#city2") as HTMLInputElement;

		street1.value = "100 First";
		street1.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		if (suggestionElements.length > 0) {
			(suggestionElements[0] as HTMLElement).click();
			await jest.runAllTimersAsync();
		}

		expect(street1.value).toBe("100 First St");
		expect(city1.value).toBe("Denver");
		expect(street2.value).toBe("");
		expect(city2.value).toBe("");
	});

	it("should call correct onAddressSelected callback for each instance", async () => {
		const callback1 = jest.fn();
		const callback2 = jest.fn();

		instance1 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-1",
			streetSelector: "#street1",
			onAddressSelected: callback1,
		});

		instance2 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-2",
			streetSelector: "#street2",
			onAddressSelected: callback2,
		});

		const street1 = document.querySelector("#street1") as HTMLInputElement;
		street1.value = "100";
		street1.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		if (suggestionElements.length > 0) {
			(suggestionElements[0] as HTMLElement).click();
			await jest.runAllTimersAsync();
		}

		expect(callback1).toHaveBeenCalledWith(
			expect.objectContaining({ street_line: "100 First St" }),
		);
		expect(callback2).not.toHaveBeenCalled();
	});

	it("should properly clean up when one instance is destroyed", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ suggestions: mockSuggestions2 }),
		});

		instance1 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-1",
			streetSelector: "#street1",
			localitySelector: "#city1",
		});

		instance2 = await SmartyAddress.create({
			_testMode: true,
			embeddedKey: "test-key-2",
			streetSelector: "#street2",
			localitySelector: "#city2",
		});

		instance1.destroy();
		instance1 = null;

		const street2 = document.querySelector("#street2") as HTMLInputElement;
		const city2 = document.querySelector("#city2") as HTMLInputElement;

		street2.value = "200";
		street2.dispatchEvent(new Event("input", { bubbles: true }));
		await jest.runAllTimersAsync();

		const suggestionElements = document.querySelectorAll('[role="option"]');
		if (suggestionElements.length > 0) {
			(suggestionElements[0] as HTMLElement).click();
			await jest.runAllTimersAsync();
		}

		expect(street2.value).toBe("200 Second Ave");
		expect(city2.value).toBe("Boulder");
	});
});
