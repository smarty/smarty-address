/**
 * @jest-environment jsdom
 */
import { DropdownService, UiAutocompleteSuggestionItem } from "./DropdownService";

describe("DropdownService", () => {
	describe("getMergedAutocompleteSuggestions", () => {
		const createMockUiAutocompleteSuggestionItem = (street: string): UiAutocompleteSuggestionItem => ({
			address: {
				street_line: street,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			},
			autocompleteSuggestionElement: document.createElement("div"),
		});

		it("should insert secondary suggestions after selected index", () => {
			const service = new DropdownService(1);
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
			const service = new DropdownService(1);
			const primary = [
				createMockUiAutocompleteSuggestionItem("123 Main St"),
				createMockUiAutocompleteSuggestionItem("456 Oak Ave"),
			];

			service.setAutocompleteSuggestions(primary);
			service.setSecondaryAutocompleteSuggestions([]);
			service.setSelectedIndex(0);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(2);
			expect(result[0].address.street_line).toBe("123 Main St");
			expect(result[1].address.street_line).toBe("456 Oak Ave");
		});

		it("should handle empty primary suggestions", () => {
			const service = new DropdownService(1);
			const secondary = [createMockUiAutocompleteSuggestionItem("123 Main St Apt 1")];

			service.setAutocompleteSuggestions([]);
			service.setSecondaryAutocompleteSuggestions(secondary);
			service.setSelectedIndex(0);

			const result = service.getMergedAutocompleteSuggestions();

			expect(result.length).toBe(1);
			expect(result[0].address.street_line).toBe("123 Main St Apt 1");
		});

		it("should insert at middle position", () => {
			const service = new DropdownService(1);
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
