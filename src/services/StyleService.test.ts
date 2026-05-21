/**
 * @jest-environment jsdom
 */
import { StyleService, StylesObject } from "./StyleService";
import { ColorService } from "./ColorService";

describe("StyleService", () => {
	let service: StyleService;

	beforeEach(() => {
		const colorService = new ColorService();
		service = new StyleService();
		service.setServices({ colorService });
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
});
