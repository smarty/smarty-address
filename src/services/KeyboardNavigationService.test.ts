/**
 * @jest-environment jsdom
 */
import { KeyboardNavigationService } from "./KeyboardNavigationService";
import { DropdownStateService, UiAutocompleteSuggestionItem } from "./DropdownStateService";

describe("KeyboardNavigationService", () => {
	const createMockUiAutocompleteSuggestionItem = (
		street: string,
		id: string,
	): UiAutocompleteSuggestionItem => {
		const element = document.createElement("div");
		element.id = id;
		return {
			address: {
				street_line: street,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			},
			autocompleteSuggestionElement: element,
		};
	};

	const createServicesWithCallbacks = () => {
		const keyboardNavigationService = new KeyboardNavigationService();
		const dropdownStateService = new DropdownStateService();

		const services = {
			keyboardNavigationService,
			dropdownStateService,
		};

		keyboardNavigationService.setServices(services);
		dropdownStateService.setServices(services);

		const mockCallbacks = {
			onSelectItem: jest.fn(),
			onClose: jest.fn(),
			getAutocompleteSuggestionsElement: jest.fn(() => document.createElement("div")),
			updateAriaActivedescendant: jest.fn(),
		};

		keyboardNavigationService.setCallbacks(mockCallbacks);

		return { keyboardNavigationService, dropdownStateService, mockCallbacks };
	};

	describe("handleAutocompleteKeydown", () => {
		it("should not handle keys when dropdown is closed", () => {
			const { keyboardNavigationService, dropdownStateService, mockCallbacks } =
				createServicesWithCallbacks();
			dropdownStateService.setDropdownOpen(false);

			const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
			const preventDefaultSpy = jest.spyOn(event, "preventDefault");

			keyboardNavigationService.handleAutocompleteKeydown(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
			expect(mockCallbacks.onSelectItem).not.toHaveBeenCalled();
		});

		it("should call onSelectItem on Enter when dropdown is open", () => {
			const { keyboardNavigationService, dropdownStateService, mockCallbacks } =
				createServicesWithCallbacks();
			dropdownStateService.setDropdownOpen(true);
			dropdownStateService.setHighlightedIndex(2);

			const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
			keyboardNavigationService.handleAutocompleteKeydown(event);

			expect(mockCallbacks.onSelectItem).toHaveBeenCalledWith(2);
		});

		it("should call onClose on Escape when dropdown is open", () => {
			const { keyboardNavigationService, dropdownStateService, mockCallbacks } =
				createServicesWithCallbacks();
			dropdownStateService.setDropdownOpen(true);

			const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
			keyboardNavigationService.handleAutocompleteKeydown(event);

			expect(mockCallbacks.onClose).toHaveBeenCalled();
		});

		it("should prevent default for handled keys", () => {
			const { keyboardNavigationService, dropdownStateService } = createServicesWithCallbacks();
			dropdownStateService.setDropdownOpen(true);

			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);

			const event = new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true });
			const preventDefaultSpy = jest.spyOn(event, "preventDefault");

			keyboardNavigationService.handleAutocompleteKeydown(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});

		it("should not prevent default for unhandled keys", () => {
			const { keyboardNavigationService, dropdownStateService } = createServicesWithCallbacks();
			dropdownStateService.setDropdownOpen(true);

			const event = new KeyboardEvent("keydown", { key: "a", cancelable: true });
			const preventDefaultSpy = jest.spyOn(event, "preventDefault");

			keyboardNavigationService.handleAutocompleteKeydown(event);

			expect(preventDefaultSpy).not.toHaveBeenCalled();
		});
	});

	describe("highlightNewAddress", () => {
		it("should move highlight down with positive indexChange", () => {
			const { keyboardNavigationService, dropdownStateService, mockCallbacks } =
				createServicesWithCallbacks();
			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd", "suggestion-2"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);
			dropdownStateService.setHighlightedIndex(0);

			const newIndex = keyboardNavigationService.highlightNewAddress(1);

			expect(newIndex).toBe(1);
			expect(dropdownStateService.getHighlightedIndex()).toBe(1);
			expect(mockCallbacks.updateAriaActivedescendant).toHaveBeenCalledWith("suggestion-1");
		});

		it("should move highlight up with negative indexChange", () => {
			const { keyboardNavigationService, dropdownStateService, mockCallbacks } =
				createServicesWithCallbacks();
			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd", "suggestion-2"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);
			dropdownStateService.setHighlightedIndex(2);

			const newIndex = keyboardNavigationService.highlightNewAddress(-1);

			expect(newIndex).toBe(1);
			expect(dropdownStateService.getHighlightedIndex()).toBe(1);
			expect(mockCallbacks.updateAriaActivedescendant).toHaveBeenCalledWith("suggestion-1");
		});

		it("should wrap around from last to first", () => {
			const { keyboardNavigationService, dropdownStateService } = createServicesWithCallbacks();
			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd", "suggestion-2"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);
			dropdownStateService.setHighlightedIndex(2);

			const newIndex = keyboardNavigationService.highlightNewAddress(1);

			expect(newIndex).toBe(0);
		});

		it("should wrap around from first to last", () => {
			const { keyboardNavigationService, dropdownStateService } = createServicesWithCallbacks();
			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd", "suggestion-2"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);
			dropdownStateService.setHighlightedIndex(0);

			const newIndex = keyboardNavigationService.highlightNewAddress(-1);

			expect(newIndex).toBe(2);
		});

		it("should set aria-selected on highlighted element", () => {
			const { keyboardNavigationService, dropdownStateService } = createServicesWithCallbacks();
			const suggestions = [
				createMockUiAutocompleteSuggestionItem("123 Main St", "suggestion-0"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave", "suggestion-1"),
			];
			dropdownStateService.setAutocompleteSuggestions(suggestions);
			dropdownStateService.setHighlightedIndex(0);

			keyboardNavigationService.highlightNewAddress(1);

			expect(suggestions[0].autocompleteSuggestionElement.getAttribute("aria-selected")).toBe(
				"false",
			);
			expect(suggestions[1].autocompleteSuggestionElement.getAttribute("aria-selected")).toBe(
				"true",
			);
		});
	});

	describe("scrollToHighlightedAutocompleteSuggestion", () => {
		it("should scroll up when element is above visible area", () => {
			const { keyboardNavigationService } = createServicesWithCallbacks();

			const container = document.createElement("div");
			Object.defineProperty(container, "scrollTop", { value: 100, writable: true });
			Object.defineProperty(container, "offsetHeight", { value: 200 });

			const element = document.createElement("div");
			Object.defineProperty(element, "offsetTop", { value: 50 });
			Object.defineProperty(element, "offsetHeight", { value: 40 });

			keyboardNavigationService.scrollToHighlightedAutocompleteSuggestion(element, container);

			expect(container.scrollTop).toBe(50);
		});

		it("should scroll down when element is below visible area", () => {
			const { keyboardNavigationService } = createServicesWithCallbacks();

			const container = document.createElement("div");
			Object.defineProperty(container, "scrollTop", { value: 0, writable: true });
			Object.defineProperty(container, "offsetHeight", { value: 100 });

			const element = document.createElement("div");
			Object.defineProperty(element, "offsetTop", { value: 150 });
			Object.defineProperty(element, "offsetHeight", { value: 40 });

			keyboardNavigationService.scrollToHighlightedAutocompleteSuggestion(element, container);

			expect(container.scrollTop).toBe(90);
		});

		it("should not scroll when element is within visible area", () => {
			const { keyboardNavigationService } = createServicesWithCallbacks();

			const container = document.createElement("div");
			Object.defineProperty(container, "scrollTop", { value: 0, writable: true });
			Object.defineProperty(container, "offsetHeight", { value: 200 });

			const element = document.createElement("div");
			Object.defineProperty(element, "offsetTop", { value: 50 });
			Object.defineProperty(element, "offsetHeight", { value: 40 });

			keyboardNavigationService.scrollToHighlightedAutocompleteSuggestion(element, container);

			expect(container.scrollTop).toBe(0);
		});
	});
});
