/**
 * @jest-environment jsdom
 */
import { DropdownStateService, UiAutocompleteSuggestionItem } from "./DropdownStateService";

describe("DropdownStateService", () => {
	const createMockUiAutocompleteSuggestionItem = (
		street: string,
	): UiAutocompleteSuggestionItem => ({
		address: {
			street_line: street,
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		},
		autocompleteSuggestionElement: document.createElement("div"),
	});

	describe("state management", () => {
		it("should initialize with default values", () => {
			const service = new DropdownStateService();

			expect(service.isDropdownOpen()).toBe(false);
			expect(service.getHighlightedIndex()).toBe(0);
			expect(service.getSelectedIndex()).toBe(-1);
			expect(service.getSelectedAddressSearchTerm()).toBe("");
			expect(service.getIsInteractingWithDropdown()).toBe(false);
			expect(service.getAutocompleteSuggestions()).toEqual([]);
			expect(service.getSecondaryAutocompleteSuggestions()).toEqual([]);
		});

		it("should set and get dropdown open state", () => {
			const service = new DropdownStateService();

			service.setDropdownOpen(true);
			expect(service.isDropdownOpen()).toBe(true);

			service.setDropdownOpen(false);
			expect(service.isDropdownOpen()).toBe(false);
		});

		it("should set and get highlighted index", () => {
			const service = new DropdownStateService();

			service.setHighlightedIndex(3);
			expect(service.getHighlightedIndex()).toBe(3);
		});

		it("should set and get selected index", () => {
			const service = new DropdownStateService();

			service.setSelectedIndex(2);
			expect(service.getSelectedIndex()).toBe(2);
		});

		it("should set and get selected address search term", () => {
			const service = new DropdownStateService();

			service.setSelectedAddressSearchTerm("123 Main St");
			expect(service.getSelectedAddressSearchTerm()).toBe("123 Main St");
		});

		it("should set and get interacting with dropdown state", () => {
			const service = new DropdownStateService();

			service.setIsInteractingWithDropdown(true);
			expect(service.getIsInteractingWithDropdown()).toBe(true);
		});

		it("should set and get autocomplete suggestions", () => {
			const service = new DropdownStateService();
			const suggestions = [createMockUiAutocompleteSuggestionItem("123 Main St")];

			service.setAutocompleteSuggestions(suggestions);
			expect(service.getAutocompleteSuggestions()).toEqual(suggestions);
		});

		it("should set and get secondary autocomplete suggestions", () => {
			const service = new DropdownStateService();
			const suggestions = [createMockUiAutocompleteSuggestionItem("123 Main St Apt 1")];

			service.setSecondaryAutocompleteSuggestions(suggestions);
			expect(service.getSecondaryAutocompleteSuggestions()).toEqual(suggestions);
		});
	});

	describe("resetSelectionState", () => {
		it("should reset all selection-related state to defaults", () => {
			const service = new DropdownStateService();

			service.setSelectedAddressSearchTerm("123 Main St");
			service.setSelectedIndex(2);
			service.setHighlightedIndex(5);

			service.resetSelectionState();

			expect(service.getSelectedAddressSearchTerm()).toBe("");
			expect(service.getSelectedIndex()).toBe(-1);
			expect(service.getHighlightedIndex()).toBe(0);
		});
	});

	describe("getMergedAutocompleteSuggestions", () => {
		it("should insert secondary suggestions after selected index", () => {
			const service = new DropdownStateService();
			const primary = [
				createMockUiAutocompleteSuggestionItem("123 Main St"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd"),
			];
			const secondary = [
				createMockUiAutocompleteSuggestionItem("123 Main St Apt 1"),
				createMockUiAutocompleteSuggestionItem("123 Main St Apt 2"),
			];

			service.setAutocompleteSuggestions(primary);
			service.setSecondaryAutocompleteSuggestions(secondary);
			service.setSelectedIndex(0);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(5);
			expect(result[0].address.street_line).toBe("123 Main St");
			expect(result[1].address.street_line).toBe("123 Main St Apt 1");
			expect(result[2].address.street_line).toBe("123 Main St Apt 2");
			expect(result[3].address.street_line).toBe("456 Oak Ave");
			expect(result[4].address.street_line).toBe("789 Pine Rd");
		});

		it("should handle empty secondary suggestions", () => {
			const service = new DropdownStateService();
			const primary = [
				createMockUiAutocompleteSuggestionItem("123 Main St"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave"),
			];

			service.setAutocompleteSuggestions(primary);
			service.setSecondaryAutocompleteSuggestions([]);
			service.setSelectedIndex(0);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(2);
		});

		it("should handle empty primary suggestions", () => {
			const service = new DropdownStateService();
			const secondary = [createMockUiAutocompleteSuggestionItem("123 Main St Apt 1")];

			service.setAutocompleteSuggestions([]);
			service.setSecondaryAutocompleteSuggestions(secondary);
			service.setSelectedIndex(0);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(1);
		});

		it("should insert at beginning when selectedIndex is -1", () => {
			const service = new DropdownStateService();
			const primary = [createMockUiAutocompleteSuggestionItem("123 Main St")];
			const secondary = [createMockUiAutocompleteSuggestionItem("456 Oak Ave")];

			service.setAutocompleteSuggestions(primary);
			service.setSecondaryAutocompleteSuggestions(secondary);
			service.setSelectedIndex(-1);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(2);
			expect(result[0].address.street_line).toBe("456 Oak Ave");
			expect(result[1].address.street_line).toBe("123 Main St");
		});

		it("should insert at middle position", () => {
			const service = new DropdownStateService();
			const primary = [
				createMockUiAutocompleteSuggestionItem("123 Main St"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave"),
				createMockUiAutocompleteSuggestionItem("789 Pine Rd"),
			];
			const secondary = [createMockUiAutocompleteSuggestionItem("456 Oak Ave Apt 1")];

			service.setAutocompleteSuggestions(primary);
			service.setSecondaryAutocompleteSuggestions(secondary);
			service.setSelectedIndex(1);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(4);
			expect(result[0].address.street_line).toBe("123 Main St");
			expect(result[1].address.street_line).toBe("456 Oak Ave");
			expect(result[2].address.street_line).toBe("456 Oak Ave Apt 1");
			expect(result[3].address.street_line).toBe("789 Pine Rd");
		});
	});
});
