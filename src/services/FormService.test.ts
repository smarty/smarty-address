/**
 * @jest-environment jsdom
 */
import { FormService } from "./FormService";

describe("FormService", () => {
	let service: FormService;

	beforeEach(() => {
		service = new FormService();
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
