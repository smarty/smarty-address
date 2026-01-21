import { BaseService } from "./BaseService";
import {
	AddressSuggestion,
	HslColor,
	RgbaColor,
	StylesObject,
	UiSuggestionItem,
} from "../interfaces";

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
		red /= 255;
		green /= 255;
		blue /= 255;
		const cmin = Math.min(red, green, blue);
		const cmax = Math.max(red, green, blue);
		const delta = cmax - cmin;
		const minMaxAverage = (cmin + cmax) / 2;

		let hue = 0;
		const lightness = this.convertDecimalToPercentage(minMaxAverage);
		const saturation = this.convertDecimalToPercentage(
			delta === 0 ? 0 : delta / (1 - Math.abs(2 * minMaxAverage - 1)),
		);

		if (delta === 0) {
			hue = 0;
		} else if (cmax === red) {
			hue = ((green - blue) / delta) % 6;
		} else if (cmax === green) {
			hue = (blue - red) / delta + 2;
		} else {
			hue = (red - green) / delta + 4;
		}

		hue *= 60;

		if (hue < 0) {
			hue += 360;
		}

		return { hue, saturation, lightness, alpha };
	}

	getHslFromColorString(cssColor: CSSStyleDeclaration): HslColor {
		const rgbaColor = this.getRgbaFromCssColor(cssColor);
		const validRgba: RgbaColor = {
			red: rgbaColor.red ?? 0,
			green: rgbaColor.green ?? 0,
			blue: rgbaColor.blue ?? 0,
			alpha: rgbaColor.alpha ?? 1,
		};
		return this.rgbToHsl(validRgba);
	}

	getRgbaFromCssColor(cssColor: CSSStyleDeclaration): {
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

	getMergedAddressSuggestions(state: {
		addressSuggestionResults: UiSuggestionItem[];
		secondaryAddressSuggestionResults: UiSuggestionItem[];
		selectedSuggestionIndex: number;
	}): UiSuggestionItem[] {
		const { addressSuggestionResults, secondaryAddressSuggestionResults, selectedSuggestionIndex } =
			state;

		return addressSuggestionResults.toSpliced(
			selectedSuggestionIndex + 1,
			0,
			...secondaryAddressSuggestionResults,
		);
	}
}
