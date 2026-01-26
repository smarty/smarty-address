import { BaseService } from "./BaseService";
import { HslColor, RgbaColor, StylesObject } from "../interfaces";
import {
	convertDecimalToPercentage,
	getHslFromColorString,
	getRgbaFromCssColor,
	rgbToHsl,
} from "../utils/colorUtils";

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
		return convertDecimalToPercentage(decimal);
	}

	rgbToHsl(rgba: RgbaColor): HslColor {
		return rgbToHsl(rgba);
	}

	getHslFromColorString(cssColor: string): HslColor {
		return getHslFromColorString(cssColor);
	}

	getRgbaFromCssColor(cssColor: string): RgbaColor {
		return getRgbaFromCssColor(cssColor);
	}

	getNearestStyledElement(element: HTMLElement, colorProperty: string): HTMLElement {
		const colorValue = this.domService.getElementStyles(element, colorProperty);
		const { alpha } = getRgbaFromCssColor(colorValue);

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

		const { hue, saturation, lightness } = getHslFromColorString(inputBackgroundColor);
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
