import { BaseService } from "./BaseService";

export interface RgbaColor {
	red: number;
	green: number;
	blue: number;
	alpha: number;
}

export interface HslColor {
	hue: number;
	saturation: number;
	lightness: number;
	alpha: number;
}

export class ColorService extends BaseService {
	convertDecimalToPercentage(decimal: number): number {
		return +(decimal * 100);
	}

	rgbToHsl({ red, green, blue, alpha }: RgbaColor): HslColor {
		const r = red / 255;
		const g = green / 255;
		const b = blue / 255;

		const cmin = Math.min(r, g, b);
		const cmax = Math.max(r, g, b);
		const delta = cmax - cmin;
		const midpoint = (cmin + cmax) / 2;

		const hue = this.calculateHue(r, g, b, cmax, delta);
		const saturation = this.calculateSaturation(delta, midpoint);
		const lightness = this.convertDecimalToPercentage(midpoint);

		return { hue, saturation, lightness, alpha };
	}

	getRgbaFromCssColor(cssColor: string): RgbaColor {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		const context = canvas.getContext("2d", { willReadFrequently: true });

		if (!context) {
			return { red: 0, green: 0, blue: 0, alpha: 1 };
		}

		context.globalCompositeOperation = "copy";
		context.fillStyle = cssColor as any;
		context.fillRect(0, 0, 1, 1);

		const imageData = context.getImageData(0, 0, 1, 1).data;
		const red = imageData[0] ?? 0;
		const green = imageData[1] ?? 0;
		const blue = imageData[2] ?? 0;
		const alphaByte = imageData[3] ?? 255;
		const alpha = Math.round((alphaByte / 255) * 1000) / 1000;

		return { red, green, blue, alpha };
	}

	getHslFromColorString(cssColor: string): HslColor {
		const rgbaColor = this.getRgbaFromCssColor(cssColor);
		const validRgba: RgbaColor = {
			red: rgbaColor.red ?? 0,
			green: rgbaColor.green ?? 0,
			blue: rgbaColor.blue ?? 0,
			alpha: rgbaColor.alpha ?? 1,
		};
		return this.rgbToHsl(validRgba);
	}

	private calculateHue(r: number, g: number, b: number, cmax: number, delta: number): number {
		if (delta === 0) return 0;

		let hue: number;
		if (cmax === r) {
			hue = ((g - b) / delta) % 6;
		} else if (cmax === g) {
			hue = (b - r) / delta + 2;
		} else {
			hue = (r - g) / delta + 4;
		}

		hue *= 60;
		return hue < 0 ? hue + 360 : hue;
	}

	private calculateSaturation(delta: number, midpoint: number): number {
		if (delta === 0) return 0;
		return this.convertDecimalToPercentage(delta / (1 - Math.abs(2 * midpoint - 1)));
	}
}
