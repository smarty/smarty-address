import {AddressSuggestion, BasicStateObject} from "../interfaces.ts";
import Color from "color";

export const findDomElement = (selector: string | undefined) => {
	const element:HTMLElement|null = selector ? document.querySelector(selector) : null;

	return element;
};

export const createDomElement = (tagName: string, classList?: string[] = [], children:HTMLElement[] = []) => {
	const element = document.createElement(tagName);
	element.classList.add(...classList);
	children.forEach((child) => {
		element.appendChild(child);
	});

	return element;
};

export const formatStyleBlock = (selector:string, styles:{}) => {
	const stylesString = Object.entries(styles).map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${stylesString}\n}`;
};

export const getColorBrightness = (color:string) => {
	const DEFAULT_BRIGHTNESS = 255;
	const match = color.match(/\d+/g);
	if (!match) return DEFAULT_BRIGHTNESS;

	const [r, g, b] = match.map(Number);

	const brightness = (0.299 * r + 0.587 * g + 0.114 * b);

	return brightness;
};

export const getInstanceClassName = (instanceId:number) => {
	return `smartyAddress__instance_${instanceId}`;
};

export const getElementStyles = (element:HTMLElement):{color:string, backgroundColor:string} => {
	const {color, backgroundColor} = window.getComputedStyle(element);
	return {
		color,
		backgroundColor,
	};
};

export const scrollToHighlightedSuggestion = (highlightedElement:HTMLElement, container:HTMLElement) => {
	const elementTop = highlightedElement.offsetTop;
	const elementBottom = elementTop + highlightedElement.offsetHeight;
	const containerTop = container.scrollTop;
	const containerBottom = containerTop + container.offsetHeight;

	if (elementTop < containerTop) {
		container.scrollTop = elementTop;
	} else if (elementBottom > containerBottom) {
		container.scrollTop = elementBottom - container.offsetHeight;
	}
};

export const getStreetLineFormValue = ({secondaryInputElement, cityInputElement, stateInputElement, zipcodeInputElement}:BasicStateObject, address:AddressSuggestion) => {
	const streetLineValues = [address.street_line];

	if (!secondaryInputElement && address.secondary?.length) {
		streetLineValues.push(address.secondary || "");
	}

	if (!secondaryInputElement && !cityInputElement && !stateInputElement && !zipcodeInputElement) {
		[address.city, address.state, address.zipcode].forEach((value) => {
			value.length && streetLineValues.push(value);
		});
	}

	return streetLineValues.join(", ");
};

export const showElement = (element:HTMLElement) => {
	// TODO: Create a single place to store all class names
	element.classList.remove("smartyAddress__hidden");
};

export const hideElement = (element:HTMLElement) => {
	element.classList.add("smartyAddress__hidden");
};

export const getHslFromRgbColor = (rgbColor:string) => {
	const match = rgbColor.match(/\d+/g);
	const [red, green, blue] = (match ?? [255, 255, 255]).map((numString) => {
		return Number(numString) / 255;
	});

const rgbToHsl = ([red, green, blue]:number[]) => {
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

	hue = Math.round(hue * 60);

	if (hue < 0) {
		hue += 360;
	}

	return {hue, saturation, lightness};
};

export const convertDecimalToPercentage = (decimal:number) => {
	return +(decimal * 100).toFixed(1);
};

export const getFirstParentWithStyles = (element:HTMLElement):HTMLElement => {
	// TODO: What about background-images, gradients, styles defined in a sibling (instead of ancestor), and other edge cases?
	const backgroundColor = getElementStyles(element).backgroundColor;
	const {alpha} = getRGBAString(backgroundColor);

	return alpha < .1 && element.parentElement ? getFirstParentWithStyles(element.parentElement) : element;
};

function getRGBAString(colorValue:string) {
	const canvas = document.createElement("canvas");
	canvas.width = 1; canvas.height = 1;
	// TODO: review config options
	// TODO: Make sure this solution works cross-browser
	const context = canvas.getContext("2d", { willReadFrequently: true });

	context.globalCompositeOperation = "copy";
	context.fillStyle = colorValue;
	context.fillRect(0, 0, 1, 1);

	const [r, g, b, aByte] = context.getImageData(0, 0, 1, 1).data;
	const alpha = Math.round((aByte / 255) * 1000) / 1000;

	return {r, g, b, alpha};
}

export const getHslColorsFromElement = (colorString:string) => {
	// TODO: Should we use the "rgbToHsl()" function instead of the "color" npm package?
	return Color(getRGBAString(colorString)).hsl().object();
};
