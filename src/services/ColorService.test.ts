/**
 * @jest-environment jsdom
 */
import { ColorService } from "./ColorService";

describe("ColorService", () => {
	let service: ColorService;

	beforeEach(() => {
		service = new ColorService();
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

	describe("getRgbaFromCssColor", () => {
		it("should return default color when canvas context unavailable", () => {
			const result = service.getRgbaFromCssColor("#ff0000");
			expect(result).toEqual({ red: 0, green: 0, blue: 0, alpha: 1 });
		});
	});
});
