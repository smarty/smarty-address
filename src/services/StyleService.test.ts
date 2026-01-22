/**
 * @jest-environment jsdom
 */
import { StyleService } from "./StyleService";
import { StylesObject } from "../interfaces";

describe("StyleService", () => {
	let service: StyleService;

	beforeEach(() => {
		service = new StyleService();
	});

	describe("convertStylesObjectToCssBlock (static)", () => {
		it("should convert single selector with styles to CSS block", () => {
			const stylesObject: StylesObject = {
				".my-class": {
					color: "red",
					"font-size": "16px",
				},
			};
			const result = StyleService.convertStylesObjectToCssBlock(stylesObject);
			expect(result).toContain(".my-class");
			expect(result).toContain("color: red;");
			expect(result).toContain("font-size: 16px;");
		});

		it("should convert multiple selectors to CSS blocks", () => {
			const stylesObject: StylesObject = {
				".class-a": { color: "blue" },
				".class-b": { "background-color": "white" },
			};
			const result = StyleService.convertStylesObjectToCssBlock(stylesObject);
			expect(result).toContain(".class-a");
			expect(result).toContain("color: blue;");
			expect(result).toContain(".class-b");
			expect(result).toContain("background-color: white;");
		});

		it("should return empty string for empty object", () => {
			const result = StyleService.convertStylesObjectToCssBlock({});
			expect(result).toBe("");
		});
	});

	describe("getFormattedAddressSuggestion", () => {
		const baseAddress: AddressSuggestion = {
			street_line: "123 Main St",
			secondary: "",
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		};

		it("should format address without secondary", () => {
			const result = service.getFormattedAddressSuggestion(baseAddress);
			expect(result).toBe("123 Main St, Denver, CO 80202");
		});

		it("should format address with secondary", () => {
			const address = { ...baseAddress, secondary: "Apt 5" };
			const result = service.getFormattedAddressSuggestion(address);
			expect(result).toBe("123 Main St Apt 5, Denver, CO 80202");
		});

		it("should format secondary suggestion with ellipsis when isSecondary is true", () => {
			const address = { ...baseAddress, secondary: "Apt 5" };
			const result = service.getFormattedAddressSuggestion(address, true);
			expect(result).toBe("… Apt 5, Denver, CO 80202");
		});

		it("should handle empty secondary when isSecondary is true", () => {
			const result = service.getFormattedAddressSuggestion(baseAddress, true);
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

	describe("formatStyleBlock", () => {
		it("should format selector with styles", () => {
			const result = service.formatStyleBlock(".test", { color: "red", display: "block" });
			expect(result).toContain(".test {");
			expect(result).toContain("color: red;");
			expect(result).toContain("display: block;");
			expect(result).toContain("}");
		});

		it("should handle empty styles object", () => {
			const result = service.formatStyleBlock(".empty", {});
			expect(result).toBe(".empty {\n\n}");
		});
	});

	describe("getInstanceClassName", () => {
		it("should return correctly formatted class name", () => {
			expect(service.getInstanceClassName(1)).toBe("smartyAddress__instance_1");
			expect(service.getInstanceClassName(42)).toBe("smartyAddress__instance_42");
			expect(service.getInstanceClassName(0)).toBe("smartyAddress__instance_0");
		});
	});

	describe("convertDecimalToPercentage", () => {
		it("should convert 0 to 0", () => {
			expect(service.convertDecimalToPercentage(0)).toBe(0);
		});

		it("should convert 0.5 to 50", () => {
			expect(service.convertDecimalToPercentage(0.5)).toBe(50);
		});

		it("should convert 1 to 100", () => {
			expect(service.convertDecimalToPercentage(1)).toBe(100);
		});

		it("should handle values greater than 1", () => {
			expect(service.convertDecimalToPercentage(1.5)).toBe(150);
		});

		it("should handle small decimals", () => {
			expect(service.convertDecimalToPercentage(0.01)).toBe(1);
		});
	});

	describe("rgbToHsl", () => {
		it("should convert pure red", () => {
			const result = service.rgbToHsl({ red: 255, green: 0, blue: 0, alpha: 1 });
			expect(result.hue).toBeCloseTo(0, 0);
			expect(result.saturation).toBeCloseTo(100, 0);
			expect(result.lightness).toBeCloseTo(50, 0);
			expect(result.alpha).toBe(1);
		});

		it("should convert pure green", () => {
			const result = service.rgbToHsl({ red: 0, green: 255, blue: 0, alpha: 1 });
			expect(result.hue).toBeCloseTo(120, 0);
			expect(result.saturation).toBeCloseTo(100, 0);
			expect(result.lightness).toBeCloseTo(50, 0);
		});

		it("should convert pure blue", () => {
			const result = service.rgbToHsl({ red: 0, green: 0, blue: 255, alpha: 1 });
			expect(result.hue).toBeCloseTo(240, 0);
			expect(result.saturation).toBeCloseTo(100, 0);
			expect(result.lightness).toBeCloseTo(50, 0);
		});

		it("should convert white", () => {
			const result = service.rgbToHsl({ red: 255, green: 255, blue: 255, alpha: 1 });
			expect(result.saturation).toBe(0);
			expect(result.lightness).toBe(100);
		});

		it("should convert black", () => {
			const result = service.rgbToHsl({ red: 0, green: 0, blue: 0, alpha: 1 });
			expect(result.saturation).toBe(0);
			expect(result.lightness).toBe(0);
		});

		it("should convert gray (50%)", () => {
			const result = service.rgbToHsl({ red: 128, green: 128, blue: 128, alpha: 1 });
			expect(result.saturation).toBe(0);
			expect(result.lightness).toBeCloseTo(50, 0);
		});

		it("should preserve alpha value", () => {
			const result = service.rgbToHsl({ red: 255, green: 0, blue: 0, alpha: 0.5 });
			expect(result.alpha).toBe(0.5);
		});
	});
});
