import {
	AddressSuggestion,
	HslColor,
	RgbaColor,
	StylesObject,
} from "../interfaces";
import {createDomElement, getRgbaFromCssColor} from "./domUtils";

export const getFormattedAddressSuggestion = (suggestion:AddressSuggestion) => {
	const {street_line, secondary = "", city, state, zipcode} = suggestion;

	return `${street_line} ${secondary}, ${city}, ${state} ${zipcode}`;
};

export const createSuggestionElement = (suggestion) => {
	const {entries = 0} = suggestion;
	const addressElementClasses = ["smartyAddress__autocompleteAddress"];
	const entriesElementClasses = ["smartyAddress__suggestionEntries"];
	const suggestionElementClasses = ["smartyAddress__suggestion"];

	const addressElement = createDomElement("div", addressElementClasses);
	const entriesElement = createDomElement("div", entriesElementClasses);
	const suggestionElement = createDomElement("li", suggestionElementClasses, [
		addressElement,
		entriesElement,
	]);

	addressElement.textContent = getFormattedAddressSuggestion(suggestion);
	suggestionElement.setAttribute("data-address", JSON.stringify(suggestion));

	if (entries > 1) {
		entriesElement.textContent = `${entries} entries`;
	}

	return suggestionElement;
};

export const formatStyleBlock = (selector:string, styles:{}) => {
	const stylesString = Object.entries(styles).map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${stylesString}\n}`;
};

export const getInstanceClassName = (instanceId:number) => {
	return `smartyAddress__instance_${instanceId}`;
};

const rgbToHsl = ({red, green, blue, alpha}:RgbaColor):HslColor => {
	red /= 255;
	green /= 255;
	blue /= 255;
	const cmin = Math.min(red, green, blue);
	const cmax = Math.max(red, green, blue);
	const delta = cmax - cmin;
	const minMaxAverage = (cmin + cmax) / 2;

	let	hue = 0;
	const lightness = convertDecimalToPercentage(minMaxAverage);
	const saturation = convertDecimalToPercentage(delta === 0 ? 0 : delta / (1 - Math.abs(2 * minMaxAverage - 1)));

	if (delta === 0) {
		hue = 0;
	}
	else if (cmax === red) {
		hue = ((green - blue) / delta) % 6;
	}
	else if (cmax === green) {
		hue = (blue - red) / delta + 2;
	}
	else {
		hue = (red - green) / delta + 4;
	}

	hue *= 60;

	if (hue < 0) {
		hue += 360;
	}

	return {hue, saturation, lightness, alpha};
};

export const convertDecimalToPercentage = (decimal:number) => {
	return +(decimal * 100);
};

export const getHslFromColorString = (colorString:CSSStyleDeclaration) => {
	const rgbaColor = getRgbaFromCssColor(colorString);
	return rgbToHsl(rgbaColor);
};

export const convertStylesObjectToCssBlock = (stylesObject:StylesObject) => {
	const selectorsBlock = Object.entries(stylesObject).map(([selector, selectorStyles]) => {
		const stylesBlock = Object.entries(selectorStyles).map(([key, value]) => {
			return `${key}: ${value};`;
		}).join("\n\t");

		return `\n${selector} {\n\t${stylesBlock}\n}`;
	});

	return selectorsBlock.join("");
};
