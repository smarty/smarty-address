/**
 * @jest-environment jsdom
 */
import { DomService } from "./DomService";

describe("DomService", () => {
	let service: DomService;

	beforeEach(() => {
		service = new DomService();
		document.body.innerHTML = "";
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

	describe("findDomElementWithRetry", () => {
		it("should resolve immediately when element exists", async () => {
			document.body.innerHTML = '<div id="existing-element"></div>';

			const result = await service.findDomElementWithRetry("#existing-element");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("existing-element");
		});

		it("should resolve when element is added dynamically", async () => {
			const promise = service.findDomElementWithRetry("#dynamic-element", 5000);

			setTimeout(() => {
				const element = document.createElement("div");
				element.id = "dynamic-element";
				document.body.appendChild(element);
			}, 50);

			const result = await promise;
			expect(result).not.toBeNull();
			expect(result?.id).toBe("dynamic-element");
		});

		it("should return null when element never appears within timeout", async () => {
			const result = await service.findDomElementWithRetry("#never-exists", 100);
			expect(result).toBeNull();
		});

		it("should use default timeout when not specified", async () => {
			document.body.innerHTML = '<div id="default-timeout"></div>';

			const result = await service.findDomElementWithRetry("#default-timeout");
			expect(result).not.toBeNull();
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
