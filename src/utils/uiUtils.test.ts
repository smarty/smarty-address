import {
	getFormattedAddressSuggestion,
	formatStyleBlock,
	getInstanceClassName,
	convertDecimalToPercentage,
	getHslFromColorString,
	convertStylesObjectToCssBlock,
	getMergedAddressSuggestions,
} from "./uiUtils";
import { AbstractStateObject, StylesObject } from "../interfaces";
import * as domUtils from "./domUtils";
import {
	basicAddressWithoutSecondary,
	completeAddressWithSecondary,
	completeAddressWithSecondaryAlternate,
	completeAddressWithSecondaryForNoMatch,
} from "./addressSuggestions.fixtures";

jest.mock("./domUtils");

describe("uiUtils", () => {
	describe("getFormattedAddressSuggestion", () => {
		it("should format a suggestion without secondary", () => {
			const result = getFormattedAddressSuggestion({
				...basicAddressWithoutSecondary,
				secondary: "",
			});

			expect(result).toBe("123 Main St, Springfield, IL 62701");
		});

		it("should format a suggestion with secondary", () => {
			const result = getFormattedAddressSuggestion(completeAddressWithSecondary);

			expect(result).toBe("123 Main St Apt 1, Springfield, IL 62701");
		});

		it("should use ellipsis for secondary suggestions", () => {
			const result = getFormattedAddressSuggestion(completeAddressWithSecondary, true);

			expect(result).toBe("… Apt 1, Springfield, IL 62701");
		});

		it("should handle missing secondary field", () => {
			const result = getFormattedAddressSuggestion({
				...completeAddressWithSecondaryAlternate,
				secondary: undefined,
			} as any);

			expect(result).toBe("456 Oak Ave, Springfield, IL 62702");
		});
	});

	describe("formatStyleBlock", () => {
		it("should format a simple style block", () => {
			const selector = ".test-class";
			const styles = {
				color: "red",
				"font-size": "16px",
			};

			const result = formatStyleBlock(selector, styles);

			expect(result).toBe(`.test-class {
color: red;
font-size: 16px;
}`);
		});

		it("should handle empty styles object", () => {
			const selector = ".empty-class";
			const styles = {};

			const result = formatStyleBlock(selector, styles);

			expect(result).toBe(`.empty-class {

}`);
		});

		it("should handle single style property", () => {
			const selector = "#test-id";
			const styles = {
				display: "flex",
			};

			const result = formatStyleBlock(selector, styles);

			expect(result).toBe(`#test-id {
display: flex;
}`);
		});
	});

	describe("getInstanceClassName", () => {
		it("should generate class name for instance 0", () => {
			const result = getInstanceClassName(0);

			expect(result).toBe("smartyAddress__instance_0");
		});

		it("should generate class name for instance 42", () => {
			const result = getInstanceClassName(42);

			expect(result).toBe("smartyAddress__instance_42");
		});

		it("should generate class name for negative instance", () => {
			const result = getInstanceClassName(-1);

			expect(result).toBe("smartyAddress__instance_-1");
		});
	});

	describe("convertDecimalToPercentage", () => {
		it("should convert 0.5 to 50", () => {
			const result = convertDecimalToPercentage(0.5);

			expect(result).toBe(50);
		});

		it("should convert 1 to 100", () => {
			const result = convertDecimalToPercentage(1);

			expect(result).toBe(100);
		});

		it("should convert 0 to 0", () => {
			const result = convertDecimalToPercentage(0);

			expect(result).toBe(0);
		});

		it("should convert 0.25 to 25", () => {
			const result = convertDecimalToPercentage(0.25);

			expect(result).toBe(25);
		});

		it("should handle decimals with precision", () => {
			const result = convertDecimalToPercentage(0.333);

			expect(result).toBeCloseTo(33.3, 1);
		});
	});

	describe("getHslFromColorString", () => {
		it("should convert rgb color string to HSL", () => {
			const mockRgbaColor = { red: 255, green: 0, blue: 0, alpha: 1 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgb(255, 0, 0)" as any);

			expect(result).toEqual({
				hue: 0,
				saturation: 100,
				lightness: 50,
				alpha: 1,
			});
		});

		it("should convert rgba color string with alpha to HSL", () => {
			const mockRgbaColor = { red: 0, green: 255, blue: 0, alpha: 0.5 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgba(0, 255, 0, 0.5)" as any);

			expect(result).toEqual({
				hue: 120,
				saturation: 100,
				lightness: 50,
				alpha: 0.5,
			});
		});

		it("should convert blue color to HSL", () => {
			const mockRgbaColor = { red: 0, green: 0, blue: 255, alpha: 1 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgb(0, 0, 255)" as any);

			expect(result).toEqual({
				hue: 240,
				saturation: 100,
				lightness: 50,
				alpha: 1,
			});
		});

		it("should handle grayscale colors", () => {
			const mockRgbaColor = { red: 128, green: 128, blue: 128, alpha: 1 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgb(128, 128, 128)" as any);

			expect(result).toEqual({
				hue: 0,
				saturation: 0,
				lightness: expect.closeTo(50.2, 0),
				alpha: 1,
			});
		});

		it("should handle black", () => {
			const mockRgbaColor = { red: 0, green: 0, blue: 0, alpha: 1 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgb(0, 0, 0)" as any);

			expect(result).toEqual({
				hue: 0,
				saturation: 0,
				lightness: 0,
				alpha: 1,
			});
		});

		it("should handle white", () => {
			const mockRgbaColor = { red: 255, green: 255, blue: 255, alpha: 1 };
			(domUtils.getRgbaFromCssColor as jest.Mock).mockReturnValue(mockRgbaColor);

			const result = getHslFromColorString("rgb(255, 255, 255)" as any);

			expect(result).toEqual({
				hue: 0,
				saturation: 0,
				lightness: 100,
				alpha: 1,
			});
		});
	});

	describe("convertStylesObjectToCssBlock", () => {
		it("should convert a styles object to CSS block", () => {
			const stylesObject: StylesObject = {
				".test-class": {
					color: "red",
					"font-size": "16px",
				},
			};

			const result = convertStylesObjectToCssBlock(stylesObject);

			expect(result).toBe(`
.test-class {
	color: red;
	font-size: 16px;
}`);
		});

		it("should handle multiple selectors", () => {
			const stylesObject: StylesObject = {
				".class-one": {
					color: "blue",
				},
				".class-two": {
					display: "flex",
				},
			};

			const result = convertStylesObjectToCssBlock(stylesObject);

			expect(result).toBe(`
.class-one {
	color: blue;
}
.class-two {
	display: flex;
}`);
		});

		it("should handle empty styles object", () => {
			const stylesObject: StylesObject = {};

			const result = convertStylesObjectToCssBlock(stylesObject);

			expect(result).toBe("");
		});

		it("should handle selector with multiple properties", () => {
			const stylesObject: StylesObject = {
				"#test-id": {
					margin: "10px",
					padding: "5px",
					border: "1px solid black",
					"background-color": "white",
				},
			};

			const result = convertStylesObjectToCssBlock(stylesObject);

			expect(result).toBe(`
#test-id {
	margin: 10px;
	padding: 5px;
	border: 1px solid black;
	background-color: white;
}`);
		});
	});

	describe("getMergedAddressSuggestions", () => {
		it("should merge secondary suggestions after selected suggestion", () => {
			const state: AbstractStateObject = {
				addressSuggestionResults: [
					basicAddressWithoutSecondary,
					completeAddressWithSecondaryAlternate,
				],
				secondaryAddressSuggestionResults: [
					completeAddressWithSecondary,
					completeAddressWithSecondaryForNoMatch,
				],
				selectedSuggestionIndex: 0,
			} as AbstractStateObject;

			const result = getMergedAddressSuggestions(state);

			expect(result).toHaveLength(4);
			expect(result[0]).toEqual(basicAddressWithoutSecondary);
			expect(result[1]).toEqual(completeAddressWithSecondary);
			expect(result[2]).toEqual(completeAddressWithSecondaryForNoMatch);
			expect(result[3]).toEqual(completeAddressWithSecondaryAlternate);
		});

		it("should handle empty secondary suggestions", () => {
			const state: AbstractStateObject = {
				addressSuggestionResults: [basicAddressWithoutSecondary],
				secondaryAddressSuggestionResults: [],
				selectedSuggestionIndex: 0,
			} as AbstractStateObject;

			const result = getMergedAddressSuggestions(state);

			expect(result).toEqual([basicAddressWithoutSecondary]);
		});

		it("should insert at correct index when selection is not first", () => {
			const state: AbstractStateObject = {
				addressSuggestionResults: [
					basicAddressWithoutSecondary,
					completeAddressWithSecondaryAlternate,
				],
				secondaryAddressSuggestionResults: [completeAddressWithSecondary],
				selectedSuggestionIndex: 1,
			} as AbstractStateObject;

			const result = getMergedAddressSuggestions(state);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual(basicAddressWithoutSecondary);
			expect(result[1]).toEqual(completeAddressWithSecondaryAlternate);
			expect(result[2]).toEqual(completeAddressWithSecondary);
		});
	});
});
