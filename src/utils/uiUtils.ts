import {AddressSuggestion, BasicStateObject, HslColor, RgbaColor} from "../interfaces.ts";

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

export const getElementStyles = (element:HTMLElement, property:string):CSSStyleDeclaration => {
	const styles:CSSStyleDeclaration = window.getComputedStyle(element);

	return styles[property] ?? "rgba(0, 0, 0, 0)";
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

export const getNearestStyledElement = (element:HTMLElement, colorProperty:string):HTMLElement => {
	// TODO: What about background-images, gradients, styles defined in a sibling (instead of ancestor), and other edge cases?
	const colorValue = getElementStyles(element, colorProperty);
	const {alpha} = getRgbaFromCssColor(colorValue);

	return alpha < .1 && element.parentElement ? getNearestStyledElement(element.parentElement, colorProperty) : element;
};

function getRgbaFromCssColor(cssColor:CSSStyleDeclaration) {
	const canvas = document.createElement("canvas");
	canvas.width = 1; canvas.height = 1;
	// TODO: review "canvas.getContext()" config options
	// TODO: Make sure this solution works cross-browser
	const context = canvas.getContext("2d", { willReadFrequently: true });

	context.globalCompositeOperation = "copy";
	context.fillStyle = cssColor;
	context.fillRect(0, 0, 1, 1);

	const [red, green, blue, aByte] = context.getImageData(0, 0, 1, 1).data;
	const alpha = Math.round((aByte / 255) * 1000) / 1000;

	return {red, green, blue, alpha};
}

export const getHslFromColorString = (colorString:CSSStyleDeclaration) => {
	const rgbaColor = getRgbaFromCssColor(colorString);
	return rgbToHsl(rgbaColor);
};
