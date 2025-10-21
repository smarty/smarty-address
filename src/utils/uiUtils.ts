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

export const updateDynamicStyles = (stylesElement:HTMLStyleElement, searchInputElement:HTMLInputElement, instanceId:number) => {

	const {left, bottom, width} = searchInputElement.getBoundingClientRect();
	const scrollY = window.scrollY;
	const scrollX = window.scrollX;

	const backgroundColorElement = getNearestStyledElement(searchInputElement, "backgroundColor");
	// TODO: Do we also want to inherit boundingBoxPositions from this element? Probably not because it's super risky, but maybe we allow the user to pass in "offset-x" and "offset-y" config values to handle edge cases
	const colorElement = getNearestStyledElement(searchInputElement, "color");
	const inputBackgroundColor = getElementStyles(backgroundColorElement, "backgroundColor");
	const inputTextColor = getElementStyles(colorElement, "color");
	const {hue, saturation, lightness} = getHslFromColorString(inputBackgroundColor);

	const isLightMode = lightness  > 50;
	const useBlueLogo = lightness  > 75;

	const secondaryLightness = isLightMode ? lightness - 10 : lightness + 10;
	const tertiaryLightness = isLightMode ? lightness - 20 : lightness + 20;
	const secondarySurfaceColor = `hsl(${hue} ${saturation}% ${secondaryLightness}%)`;
	const tertiarySurfaceColor = `hsl(${hue} ${saturation}% ${tertiaryLightness}%)`;
	const hoverMixColor = isLightMode ? "#000" : "#fff";

	// TODO: Need to define all the missing vars here (see colors.css)
	const dynamicColorStyles = {
		"--smartyAddress__textBasePrimaryColor": inputTextColor,
		"--smartyAddress__surfaceBasePrimaryColor": inputBackgroundColor,
		"--smartyAddress__surfaceBaseSecondaryColor": secondarySurfaceColor,
		"--smartyAddress__surfaceBaseTertiaryColor": tertiarySurfaceColor,
		"--smartyAddress__surfaceInverseExtremeColor": hoverMixColor,
		"--smartyAddress__surfaceBasePrimaryInverseColor": inputTextColor,
		"--smartyAddress__logoDarkDisplay": useBlueLogo ? "block" : "none",
		"--smartyAddress__logoLightDisplay": useBlueLogo ? "none" : "block",
		// TODO: What to do about shadows for sites in dark mode
		"--smartyAddress__largeShadow1": "0 12px 24px 0 rgba(4, 34, 75, 0.10)",
		"--smartyAddress__largeShadow2": "0 20px 40px 0 rgba(21, 27, 35, 0.06)",
	};

	const dynamicPositionStyles = {
		"--smartyAddress__dropdownPositionTop": `${bottom + scrollY}px`,
		"--smartyAddress__dropdownPositionLeft": `${left + scrollX}px`,
		"--smartyAddress__dropdownWidth": `${width}px`,
	};

	const colorsStyleBlock = formatStyleBlock(`.smartyAddress__color_dynamic.${getInstanceClassName(instanceId)}`, dynamicColorStyles)
	const positionStyleBlock = formatStyleBlock(`.smartyAddress__position_dynamic.${getInstanceClassName(instanceId)}`, dynamicPositionStyles)
	stylesElement.innerHTML = `${colorsStyleBlock} ${positionStyleBlock}`;
};
