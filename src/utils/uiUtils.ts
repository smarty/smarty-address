import {
	AddressSuggestion,
	HslColor,
	RgbaColor,
	StylesObject,
	UiSuggestionItem,
} from "../interfaces";
import { getRgbaFromCssColor } from "./domUtils";

export const getFormattedAddressSuggestion = (
	suggestion: AddressSuggestion,
	isSecondary: boolean = false,
) => {
	const { street_line, secondary = "", city, state, zipcode } = suggestion;
	const streetText = isSecondary ? "…" : street_line;
	const secondaryText = secondary.length ? ` ${secondary}` : secondary;

	return `${streetText}${secondaryText}, ${city}, ${state} ${zipcode}`;
};

export const createHighlightedTextElements = (
	text: string,
	searchString: string,
): Array<{ text: string; isMatch?: boolean }> => {
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
};

export const formatStyleBlock = (selector: string, styles: {}) => {
	const stylesString = Object.entries(styles)
		.map(([property, value]) => `${property}: ${value};`)
		.join("\n");
	return `${selector} {\n${stylesString}\n}`;
};

export const getInstanceClassName = (instanceId: number) => {
	return `smartyAddress__instance_${instanceId}`;
};

const rgbToHsl = ({ red, green, blue, alpha }: RgbaColor): HslColor => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const cmin = Math.min(red, green, blue);
	const cmax = Math.max(red, green, blue);
	const delta = cmax - cmin;
	const minMaxAverage = (cmin + cmax) / 2;

	let hue = 0;
	const lightness = convertDecimalToPercentage(minMaxAverage);
	const saturation = convertDecimalToPercentage(
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
};

export const convertDecimalToPercentage = (decimal: number) => {
	return +(decimal * 100);
};

export const getHslFromColorString = (colorString: CSSStyleDeclaration) => {
	const rgbaColor = getRgbaFromCssColor(colorString);
	const validRgba: RgbaColor = {
		red: rgbaColor.red ?? 0,
		green: rgbaColor.green ?? 0,
		blue: rgbaColor.blue ?? 0,
		alpha: rgbaColor.alpha ?? 1,
	};
	return rgbToHsl(validRgba);
};

export const convertStylesObjectToCssBlock = (stylesObject: StylesObject) => {
	const selectorsBlock = Object.entries(stylesObject).map(([selector, selectorStyles]) => {
		const stylesBlock = Object.entries(selectorStyles)
			.map(([key, value]) => {
				return `${key}: ${value};`;
			})
			.join("\n\t");

		return `\n${selector} {\n\t${stylesBlock}\n}`;
	});

	return selectorsBlock.join("");
};

interface SuggestionState {
	addressSuggestionResults: UiSuggestionItem[];
	secondaryAddressSuggestionResults: UiSuggestionItem[];
	selectedSuggestionIndex: number;
}

export const getMergedAddressSuggestions = (state: SuggestionState): UiSuggestionItem[] => {
	const { addressSuggestionResults, secondaryAddressSuggestionResults, selectedSuggestionIndex } =
		state;

	return addressSuggestionResults.toSpliced(
		selectedSuggestionIndex + 1,
		0,
		...secondaryAddressSuggestionResults,
	);
};
