/**
 * @jest-environment jsdom
 */
import { DomService } from "./DomService";
import { AddressSuggestion } from "../interfaces";

describe("DomService", () => {
	let service: DomService;

	beforeEach(() => {
		service = new DomService();
		document.body.innerHTML = "";
	});

	describe("getStreetLineFormValue (pure function)", () => {
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
				secondaryInputElement: document.createElement("input"),
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetLineFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St");
		});

		it("should include secondary when secondaryInputElement is null", () => {
			const formElements = {
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetLineFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St, Apt 5");
		});

		it("should include full address when all form elements are null", () => {
			const formElements = {
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const result = service.getStreetLineFormValue(formElements, baseAddress);
			expect(result).toBe("123 Main St, Apt 5, Denver, CO, 80202");
		});

		it("should not include empty secondary", () => {
			const address = { ...baseAddress, secondary: "" };
			const formElements = {
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetLineFormValue(formElements, address);
			expect(result).toBe("123 Main St");
		});

		it("should handle partial null form elements", () => {
			const formElements = {
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = service.getStreetLineFormValue(formElements, baseAddress);
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

	describe("findDomElement", () => {
		it("should return element when found", () => {
			document.body.innerHTML = '<div id="test-element"></div>';

			const result = service.findDomElement("#test-element");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("test-element");
		});

		it("should return null when element not found", () => {
			const result = service.findDomElement("#non-existent");
			expect(result).toBeNull();
		});

		it("should return null for null selector", () => {
			const result = service.findDomElement(null);
			expect(result).toBeNull();
		});

		it("should return null for undefined selector", () => {
			const result = service.findDomElement(undefined);
			expect(result).toBeNull();
		});

		it("should use provided document", () => {
			const mockDoc = {
				querySelector: jest.fn().mockReturnValue(null),
			} as unknown as Document;

			service.findDomElement("#test", mockDoc);
			expect(mockDoc.querySelector).toHaveBeenCalledWith("#test");
		});
	});

	describe("createDomElement", () => {
		it("should create element with specified tag name", () => {
			const element = service.createDomElement("div");
			expect(element.tagName.toLowerCase()).toBe("div");
		});

		it("should add classes to element", () => {
			const element = service.createDomElement("div", ["class-a", "class-b"]);
			expect(element.classList.contains("class-a")).toBe(true);
			expect(element.classList.contains("class-b")).toBe(true);
		});

		it("should append children to element", () => {
			const child1 = document.createElement("span");
			const child2 = document.createTextNode("Hello");

			const element = service.createDomElement("div", [], [child1, child2]);
			expect(element.children.length).toBe(1);
			expect(element.childNodes.length).toBe(2);
			expect(element.textContent).toBe("Hello");
		});

		it("should handle empty classList", () => {
			const element = service.createDomElement("p", []);
			expect(element.classList.length).toBe(0);
		});

		it("should handle empty children array", () => {
			const element = service.createDomElement("div", ["test"], []);
			expect(element.childNodes.length).toBe(0);
		});
	});

	describe("setInputValue", () => {
		it("should set value on input element", () => {
			const input = document.createElement("input");
			service.setInputValue(input, "test value");
			expect(input.value).toBe("test value");
		});

		it("should set value on textarea element", () => {
			const textarea = document.createElement("textarea");
			service.setInputValue(textarea, "textarea content");
			expect(textarea.value).toBe("textarea content");
		});

		it("should set value on select element", () => {
			const select = document.createElement("select");
			select.innerHTML = `
				<option value="opt1">Option 1</option>
				<option value="opt2">Option 2</option>
			`;
			service.setInputValue(select, "opt2");
			expect(select.value).toBe("opt2");
		});

		it("should dispatch change event", () => {
			const input = document.createElement("input");
			const changeHandler = jest.fn();
			input.addEventListener("change", changeHandler);

			service.setInputValue(input, "new value");
			expect(changeHandler).toHaveBeenCalled();
		});

		it("should dispatch bubbling change event", () => {
			const container = document.createElement("div");
			const input = document.createElement("input");
			container.appendChild(input);

			const changeHandler = jest.fn();
			container.addEventListener("change", changeHandler);

			service.setInputValue(input, "bubbling test");
			expect(changeHandler).toHaveBeenCalled();
		});
	});
});
