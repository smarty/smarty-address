/**
 * @jest-environment jsdom
 */
import { FormService } from "./FormService";
import { AddressSuggestion } from "../interfaces";

describe("FormService", () => {
	let service: FormService;

	beforeEach(() => {
		service = new FormService();
	});

	describe("getStreetFormValue", () => {
		const baseAddress: AddressSuggestion = {
			street_line: "123 Main St",
			secondary: "Apt 5",
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		};

		it("should return just street_line when all form elements are present", () => {
			const formElements = {
				streetInputElement: document.createElement("input"),
				secondaryInputElement: document.createElement("input"),
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St");
		});

		it("should include secondary when secondaryInputElement is null", () => {
			const formElements = {
				streetInputElement: document.createElement("input"),
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St, Apt 5");
		});

		it("should include full address when all form elements are null (input)", () => {
			const formElements = {
				streetInputElement: document.createElement("input"),
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const result = service.getStreetFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St, Apt 5, Denver, CO 80202");
		});

		it("should format address with newlines for textarea single-field forms", () => {
			const formElements = {
				streetInputElement: document.createElement("textarea"),
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const result = service.getStreetFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St\nApt 5\nDenver, CO 80202");
		});

		it("should not include empty secondary", () => {
			const address = { ...baseAddress, secondary: "" };
			const formElements = {
				streetInputElement: document.createElement("input"),
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetFormValue(formElements, address);
			expect(result).toBe("123 Main St");
		});

		it("should handle partial null form elements", () => {
			const formElements = {
				streetInputElement: document.createElement("input"),
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St, Apt 5");
		});
	});

	describe("getStateValueForInput", () => {
		it("should return state value as-is for non-select element", () => {
			const input = document.createElement("input");
			const result = service.getStateValueForInput(input, "CO");
			expect(result).toBe("CO");
		});

		it("should find matching option by value", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="CA">California</option>
				<option value="CO">Colorado</option>
				<option value="TX">Texas</option>
			`;

			const result = service.getStateValueForInput(select, "CO");
			expect(result).toBe("CO");
		});

		it("should find matching option by text", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="ca">California</option>
				<option value="co">Colorado</option>
			`;

			const result = service.getStateValueForInput(select, "Colorado");
			expect(result).toBe("co");
		});

		it("should convert state name to abbreviation when abbreviation matches option value", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="CA">CA</option>
				<option value="CO">CO</option>
			`;

			const result = service.getStateValueForInput(select, "Colorado");
			expect(result).toBe("CO");
		});

		it("should convert abbreviation to full state name when full name matches option value", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="California">CA</option>
				<option value="Colorado">CO</option>
			`;

			const result = service.getStateValueForInput(select, "CO");
			expect(result).toBe("Colorado");
		});

		it("should return original value when no match found", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="CA">California</option>
			`;

			const result = service.getStateValueForInput(select, "ZZ");
			expect(result).toBe("ZZ");
		});

		it("should be case insensitive", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="CO">Colorado</option>
			`;

			const result = service.getStateValueForInput(select, "co");
			expect(result).toBe("CO");
		});
	});
});
