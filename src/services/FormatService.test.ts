/**
 * @jest-environment jsdom
 */
import { FormatService } from "./FormatService";
import { AutocompleteSuggestion } from "../interfaces";

describe("FormatService", () => {
	let service: FormatService;

	beforeEach(() => {
		service = new FormatService();
	});

	describe("getFormattedAutocompleteSuggestion", () => {
		const baseAddress: AutocompleteSuggestion = {
			street_line: "123 Main St",
			secondary: "",
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		};

		it("should format address without secondary", () => {
			const result = service.getFormattedAutocompleteSuggestion(baseAddress);
			expect(result).toBe("123 Main St, Denver, CO 80202");
		});

		it("should format address with secondary", () => {
			const address = { ...baseAddress, secondary: "Apt 5" };
			const result = service.getFormattedAutocompleteSuggestion(address);
			expect(result).toBe("123 Main St Apt 5, Denver, CO 80202");
		});

		it("should format secondary suggestion with ellipsis when isSecondary is true", () => {
			const address = { ...baseAddress, secondary: "Apt 5" };
			const result = service.getFormattedAutocompleteSuggestion(address, true);
			expect(result).toBe("… Apt 5, Denver, CO 80202");
		});

		it("should handle empty secondary when isSecondary is true", () => {
			const result = service.getFormattedAutocompleteSuggestion(baseAddress, true);
			expect(result).toBe("…, Denver, CO 80202");
		});
	});

	describe("createHighlightedTextElements", () => {
		it("should return single element with full text when no search string", () => {
			const result = service.createHighlightedTextElements("123 Main St", "");
			expect(result).toEqual([{ text: "123 Main St" }]);
		});

		it("should return single element when search string is whitespace only", () => {
			const result = service.createHighlightedTextElements("123 Main St", "   ");
			expect(result).toEqual([{ text: "123 Main St" }]);
		});

		it("should return single element when no match found", () => {
			const result = service.createHighlightedTextElements("123 Main St", "Oak");
			expect(result).toEqual([{ text: "123 Main St" }]);
		});

		it("should highlight match at beginning of text", () => {
			const result = service.createHighlightedTextElements("123 Main St", "123");
			expect(result).toEqual([{ text: "123", isMatch: true }, { text: " Main St" }]);
		});

		it("should highlight match in middle of text", () => {
			const result = service.createHighlightedTextElements("123 Main St", "Main");
			expect(result).toEqual([{ text: "123 " }, { text: "Main", isMatch: true }, { text: " St" }]);
		});

		it("should highlight match at end of text", () => {
			const result = service.createHighlightedTextElements("123 Main St", "St");
			expect(result).toEqual([{ text: "123 Main " }, { text: "St", isMatch: true }]);
		});

		it("should be case insensitive", () => {
			const result = service.createHighlightedTextElements("123 Main St", "main");
			expect(result).toEqual([{ text: "123 " }, { text: "Main", isMatch: true }, { text: " St" }]);
		});

		it("should find match when search string has leading/trailing whitespace", () => {
			const result = service.createHighlightedTextElements("123 Main St", " Main ");
			expect(result.length).toBeGreaterThan(1);
			expect(result.some((el) => el.isMatch)).toBe(true);
		});
	});
});
