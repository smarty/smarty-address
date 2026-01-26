import { BaseService } from "./BaseService";
import { AddressSuggestion, HslColor, RgbaColor, StylesObject } from "../interfaces";

export class StyleService extends BaseService {
	static convertStylesObjectToCssBlock(stylesObject: StylesObject): string {
		const selectorsBlock = Object.entries(stylesObject).map(([selector, selectorStyles]) => {
			const stylesBlock = Object.entries(selectorStyles)
				.map(([key, value]) => {
					return `${key}: ${value};`;
				})
				.join("\n\t");

			return `\n${selector} {\n\t${stylesBlock}\n}`;
		});

		return selectorsBlock.join("");
	}

	getFormattedAddressSuggestion(
		suggestion: AddressSuggestion,
		isSecondary: boolean = false,
	): string {
		const { street_line, secondary = "", city, state, zipcode } = suggestion;
		const streetText = isSecondary ? "…" : street_line;
		const secondaryText = secondary.length ? ` ${secondary}` : secondary;

		return `${streetText}${secondaryText}, ${city}, ${state} ${zipcode}`;
	}

	createHighlightedTextElements(
		text: string,
		searchString: string,
	): Array<{ text: string; isMatch?: boolean }> {
		if (!searchString || !searchString.trim()) {
			return [{ text }];
		}

		const searchLower = searchString.toLowerCase().trim();
		const textLower = text.toLowerCase();
		const matchIndex = textLower.indexOf(searchLower);

		if (matchIndex === -1) {
			return [{ text }];
		}

		const result: Array<{ text: string; isMatch?: boolean }> = [];

		if (matchIndex > 0) {
			result.push({ text: text.slice(0, matchIndex) });
		}

		result.push({ text: text.slice(matchIndex, matchIndex + searchString.length), isMatch: true });

		if (matchIndex + searchString.length < text.length) {
			result.push({ text: text.slice(matchIndex + searchString.length) });
		}

		return result;
	}

	formatStyleBlock(selector: string, styles: {}): string {
		const stylesString = Object.entries(styles)
			.map(([property, value]) => `${property}: ${value};`)
			.join("\n");
		return `${selector} {\n${stylesString}\n}`;
	}

	getInstanceClassName(instanceId: number): string {
		return `smartyAddress__instance_${instanceId}`;
	}

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

	getRgbaFromCssColor(cssColor: string): {
		red: number;
		green: number;
		blue: number;
		alpha: number;
	} {
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
		const aByte = imageData[3] ?? 255;
		const alpha = Math.round((aByte / 255) * 1000) / 1000;

		return { red, green, blue, alpha };
	}

	getNearestStyledElement(element: HTMLElement, colorProperty: string): HTMLElement {
		const colorValue = this.domService.getElementStyles(element, colorProperty);
		const { alpha } = this.getRgbaFromCssColor(colorValue);

		return alpha < 0.1 && element.parentElement
			? this.getNearestStyledElement(element.parentElement, colorProperty)
			: element;
	}

	updateDynamicStyles(
		stylesElement: HTMLStyleElement,
		searchInputElement: HTMLInputElement,
		instanceId: number,
	): void {
		const positionStyles = this.calculatePositionStyles(searchInputElement);
		const colorStyles = this.calculateColorStyles(searchInputElement);
		const instanceClass = this.getInstanceClassName(instanceId);

		const colorsStyleBlock = this.formatStyleBlock(
			`.smartyAddress__color_dynamic.${instanceClass}`,
			colorStyles,
		);
		const positionStyleBlock = this.formatStyleBlock(
			`.smartyAddress__position_dynamic.${instanceClass}`,
			positionStyles,
		);

		stylesElement.innerHTML = `${colorsStyleBlock} ${positionStyleBlock}`;
	}

	private calculatePositionStyles(element: HTMLElement): Record<string, string> {
		const { left, bottom, width } = element.getBoundingClientRect();
		return {
			"--smartyAddress__dropdownPositionTop": `${bottom + window.scrollY}px`,
			"--smartyAddress__dropdownPositionLeft": `${left + window.scrollX}px`,
			"--smartyAddress__dropdownWidth": `${width}px`,
		};
	}

	private calculateColorStyles(element: HTMLElement): Record<string, string> {
		const backgroundColorElement = this.getNearestStyledElement(element, "backgroundColor");
		const colorElement = this.getNearestStyledElement(element, "color");

		const inputBackgroundColor = this.domService.getElementStyles(
			backgroundColorElement,
			"backgroundColor",
		);
		const inputTextColor = this.domService.getElementStyles(colorElement, "color");

		const { hue, saturation, lightness } = this.getHslFromColorString(inputBackgroundColor);
		const derivedColors = this.deriveSurfaceColors(hue, saturation, lightness);

		return {
			"--smartyAddress__textBasePrimaryColor": inputTextColor,
			"--smartyAddress__surfaceBasePrimaryColor": inputBackgroundColor,
			"--smartyAddress__surfaceBaseSecondaryColor": derivedColors.secondary,
			"--smartyAddress__surfaceBaseTertiaryColor": derivedColors.tertiary,
			"--smartyAddress__surfaceInverseExtremeColor": derivedColors.hoverMix,
			"--smartyAddress__surfaceBasePrimaryInverseColor": inputTextColor,
			"--smartyAddress__textAccentColor": derivedColors.accent,
			"--smartyAddress__logoDarkDisplay": derivedColors.useBlueLogo ? "block" : "none",
			"--smartyAddress__logoLightDisplay": derivedColors.useBlueLogo ? "none" : "block",
			"--smartyAddress__largeShadow1": "0 12px 24px 0 rgba(4, 34, 75, 0.10)",
			"--smartyAddress__largeShadow2": "0 20px 40px 0 rgba(21, 27, 35, 0.06)",
		};
	}

	private deriveSurfaceColors(
		hue: number,
		saturation: number,
		lightness: number,
	): {
		secondary: string;
		tertiary: string;
		hoverMix: string;
		accent: string;
		useBlueLogo: boolean;
	} {
		const isLightMode = lightness > 50;
		const lightnessOffset = isLightMode ? -10 : 10;

		return {
			secondary: `hsl(${hue} ${saturation}% ${lightness + lightnessOffset}%)`,
			tertiary: `hsl(${hue} ${saturation}% ${lightness + lightnessOffset * 2}%)`,
			hoverMix: isLightMode ? "#000" : "#fff",
			accent: isLightMode ? "#0066ff" : "#6699ff",
			useBlueLogo: lightness > 75,
		};
	}
}
