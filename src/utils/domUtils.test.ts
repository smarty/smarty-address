/**
 * @jest-environment jsdom
 */

import {
	createDomElement,
	getStreetLineFormValue,
	showElement,
	hideElement,
	configureSearchInputForAutocomplete,
	findDomElement,
	getElementStyles,
} from "./domUtils";
import { completeAddressWithSecondary } from "./addressSuggestions.fixtures";

describe("domUtils", () => {
	describe("createDomElement", () => {
		it("should create an element with the specified tag name", () => {
			const element = createDomElement("div");

			expect(element.tagName).toBe("DIV");
		});

		it("should add classes to the element", () => {
			const element = createDomElement("div", ["class1", "class2"]);

			expect(element.classList.contains("class1")).toBe(true);
			expect(element.classList.contains("class2")).toBe(true);
		});

		it("should append children to the element", () => {
			const child1 = document.createElement("span");
			const child2 = document.createTextNode("text");
			const element = createDomElement("div", [], [child1, child2]);

			expect(element.children.length).toBe(1);
			expect(element.children[0]).toBe(child1);
			expect(element.childNodes.length).toBe(2);
			expect(element.childNodes[1]).toBe(child2);
		});

		it("should create element with no classes when empty array provided", () => {
			const element = createDomElement("section", []);

			expect(element.classList.length).toBe(0);
		});

		it("should create element with no children when empty array provided", () => {
			const element = createDomElement("ul", [], []);

			expect(element.children.length).toBe(0);
		});

		it("should create element with default parameters", () => {
			const element = createDomElement("p");

			expect(element.tagName).toBe("P");
			expect(element.classList.length).toBe(0);
			expect(element.children.length).toBe(0);
		});
	});

	describe("getStreetLineFormValue", () => {
		it("should return only street_line when all input elements exist", () => {
			const inputs = {
				secondaryInputElement: document.createElement("input"),
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = getStreetLineFormValue(inputs, completeAddressWithSecondary);

			expect(result).toBe("123 Main St");
		});

		it("should include secondary when secondaryInputElement is missing and secondary exists", () => {
			const inputs = {
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const result = getStreetLineFormValue(inputs, completeAddressWithSecondary);

			expect(result).toBe("123 Main St, Apt 1");
		});

		it("should not include secondary when it is empty", () => {
			const inputs = {
				secondaryInputElement: null,
				cityInputElement: document.createElement("input"),
				stateInputElement: document.createElement("input"),
				zipcodeInputElement: document.createElement("input"),
			};

			const addressWithoutSecondary = { ...completeAddressWithSecondary, secondary: "" };
			const result = getStreetLineFormValue(inputs, addressWithoutSecondary);

			expect(result).toBe("123 Main St");
		});

		it("should include all address parts when no input elements exist", () => {
			const inputs = {
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const result = getStreetLineFormValue(inputs, completeAddressWithSecondary);

			expect(result).toBe("123 Main St, Apt 1, Springfield, IL, 62701");
		});

		it("should include only street_line and city/state/zip when no input elements and no secondary", () => {
			const inputs = {
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const addressWithoutSecondary = { ...completeAddressWithSecondary, secondary: "" };
			const result = getStreetLineFormValue(inputs, addressWithoutSecondary);

			expect(result).toBe("123 Main St, Springfield, IL, 62701");
		});

		it("should skip empty values when no input elements exist", () => {
			const inputs = {
				secondaryInputElement: null,
				cityInputElement: null,
				stateInputElement: null,
				zipcodeInputElement: null,
			};

			const addressWithMissingValues = {
				...completeAddressWithSecondary,
				secondary: "",
				state: "",
			};
			const result = getStreetLineFormValue(inputs, addressWithMissingValues);

			expect(result).toBe("123 Main St, Springfield, 62701");
		});
	});

	describe("showElement", () => {
		it("should remove the hidden class from an element", () => {
			const element = document.createElement("div");
			element.classList.add("smartyAddress__hidden");

			showElement(element);

			expect(element.classList.contains("smartyAddress__hidden")).toBe(false);
		});

		it("should not throw error if element does not have hidden class", () => {
			const element = document.createElement("div");

			expect(() => showElement(element)).not.toThrow();
			expect(element.classList.contains("smartyAddress__hidden")).toBe(false);
		});
	});

	describe("hideElement", () => {
		it("should add the hidden class to an element", () => {
			const element = document.createElement("div");

			hideElement(element);

			expect(element.classList.contains("smartyAddress__hidden")).toBe(true);
		});

		it("should not add duplicate hidden class if already present", () => {
			const element = document.createElement("div");
			element.classList.add("smartyAddress__hidden");

			hideElement(element);

			expect(element.classList.length).toBe(1);
			expect(element.classList.contains("smartyAddress__hidden")).toBe(true);
		});
	});

	describe("configureSearchInputForAutocomplete", () => {
		it("should set all required attributes on input element", () => {
			const input = document.createElement("input") as HTMLInputElement;

			configureSearchInputForAutocomplete(input);

			expect(input.getAttribute("autocomplete")).toBe("smarty");
			expect(input.getAttribute("aria-autocomplete")).toBe("list");
			expect(input.getAttribute("role")).toBe("combobox");
			expect(input.getAttribute("aria-expanded")).toBe("false");
		});

		it("should set aria-owns and aria-controls when dropdownId is provided", () => {
			const input = document.createElement("input") as HTMLInputElement;

			configureSearchInputForAutocomplete(input, "dropdown-123");

			expect(input.getAttribute("aria-owns")).toBe("dropdown-123");
			expect(input.getAttribute("aria-controls")).toBe("dropdown-123");
		});

		it("should overwrite existing attributes", () => {
			const input = document.createElement("input") as HTMLInputElement;
			input.setAttribute("autocomplete", "off");
			input.setAttribute("role", "textbox");

			configureSearchInputForAutocomplete(input);

			expect(input.getAttribute("autocomplete")).toBe("smarty");
			expect(input.getAttribute("role")).toBe("combobox");
		});
	});

	describe("findDomElement", () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<div id="test-id" class="test-class"></div>
				<span class="test-class"></span>
			`;
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should find element by id selector", () => {
			const element = findDomElement("#test-id");

			expect(element).not.toBeNull();
			expect(element?.id).toBe("test-id");
		});

		it("should find element by class selector", () => {
			const element = findDomElement(".test-class");

			expect(element).not.toBeNull();
			expect(element?.classList.contains("test-class")).toBe(true);
		});

		it("should return null when selector is undefined", () => {
			const element = findDomElement(undefined);

			expect(element).toBeNull();
		});

		it("should return null when selector is empty string", () => {
			const element = findDomElement("");

			expect(element).toBeNull();
		});

		it("should return null when element not found", () => {
			const element = findDomElement("#non-existent");

			expect(element).toBeNull();
		});

		it("should use provided document object", () => {
			const mockDoc = {
				querySelector: jest.fn().mockReturnValue(null),
			} as unknown as Document;

			findDomElement("#test", mockDoc);

			expect(mockDoc.querySelector).toHaveBeenCalledWith("#test");
		});

		it("should use default document when not provided", () => {
			const element = findDomElement("#test-id");

			expect(element).toBeTruthy();
		});
	});

	describe("getElementStyles", () => {
		it("should get computed style for a property", () => {
			const element = document.createElement("div");
			const mockStyles = {
				color: "rgb(255, 0, 0)",
			};
			const mockGetComputedStyle = jest.fn().mockReturnValue(mockStyles);

			const result = getElementStyles(element, "color", mockGetComputedStyle);

			expect(mockGetComputedStyle).toHaveBeenCalledWith(element);
			expect(result).toBe("rgb(255, 0, 0)");
		});

		it("should return default rgba when property not found", () => {
			const element = document.createElement("div");
			const mockStyles = {};
			const mockGetComputedStyle = jest.fn().mockReturnValue(mockStyles);

			const result = getElementStyles(element, "nonExistentProperty", mockGetComputedStyle);

			expect(result).toBe("rgba(0, 0, 0, 0)");
		});

		it("should use window.getComputedStyle by default", () => {
			const element = document.createElement("div");
			document.body.appendChild(element);

			const result = getElementStyles(element, "display");

			expect(result).toBeDefined();
			document.body.removeChild(element);
		});

		it("should handle multiple property requests", () => {
			const element = document.createElement("div");
			const mockStyles = {
				color: "rgb(0, 0, 0)",
				backgroundColor: "rgb(255, 255, 255)",
			};
			const mockGetComputedStyle = jest.fn().mockReturnValue(mockStyles);

			const color = getElementStyles(element, "color", mockGetComputedStyle);
			const bgColor = getElementStyles(element, "backgroundColor", mockGetComputedStyle);

			expect(color).toBe("rgb(0, 0, 0)");
			expect(bgColor).toBe("rgb(255, 255, 255)");
			expect(mockGetComputedStyle).toHaveBeenCalledTimes(2);
		});
	});
});
