/**
 * @jest-environment jsdom
 */
import { DropdownService } from "./DropdownService";
import { UiSuggestionItem } from "../interfaces";

describe("DropdownService", () => {
	describe("getMergedSuggestions", () => {
		const createMockUiSuggestionItem = (streetLine: string): UiSuggestionItem => ({
			address: {
				street_line: streetLine,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			},
			suggestionElement: document.createElement("div"),
		});

		it("should insert secondary suggestions after selected index", () => {
			const service = new DropdownService(1);
			const primary = [
				createMockUiSuggestionItem("123 Main St"),
				createMockUiSuggestionItem("456 Oak Ave"),
				createMockUiSuggestionItem("789 Pine Rd"),
			];
			const secondary = [
				createMockUiSuggestionItem("123 Main St Apt 1"),
				createMockUiSuggestionItem("123 Main St Apt 2"),
			];

			service.setAddressSuggestions(primary);
			service.setSecondarySuggestions(secondary);
			service.setSelectedIndex(0);

			const result = service.getMergedSuggestions();

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
				createMockUiSuggestionItem("123 Main St"),
				createMockUiSuggestionItem("456 Oak Ave"),
			];

			service.setAddressSuggestions(primary);
			service.setSecondarySuggestions([]);
			service.setSelectedIndex(0);

			const result = service.getMergedSuggestions();

			expect(result.length).toBe(2);
			expect(result[0].address.street_line).toBe("123 Main St");
			expect(result[1].address.street_line).toBe("456 Oak Ave");
		});

		it("should handle empty primary suggestions", () => {
			const service = new DropdownService(1);
			const secondary = [createMockUiSuggestionItem("123 Main St Apt 1")];

			service.setAddressSuggestions([]);
			service.setSecondarySuggestions(secondary);
			service.setSelectedIndex(0);

			const result = service.getMergedSuggestions();

			expect(result.length).toBe(1);
			expect(result[0].address.street_line).toBe("123 Main St Apt 1");
		});

		it("should insert at middle position", () => {
			const service = new DropdownService(1);
			const primary = [
				createMockUiSuggestionItem("123 Main St"),
				createMockUiSuggestionItem("456 Oak Ave"),
				createMockUiSuggestionItem("789 Pine Rd"),
			];
			const secondary = [createMockUiSuggestionItem("456 Oak Ave Apt 1")];

			service.setAddressSuggestions(primary);
			service.setSecondarySuggestions(secondary);
			service.setSelectedIndex(1);

			const result = service.getMergedSuggestions();

			expect(result.length).toBe(4);
			expect(result[0].address.street_line).toBe("123 Main St");
			expect(result[1].address.street_line).toBe("456 Oak Ave");
			expect(result[2].address.street_line).toBe("456 Oak Ave Apt 1");
			expect(result[3].address.street_line).toBe("789 Pine Rd");
		});
	});
});
