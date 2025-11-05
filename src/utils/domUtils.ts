import {AddressSuggestion, BasicStateObject, UiSuggestionItem} from "../interfaces.ts";
import {formatStyleBlock, getHslFromColorString, getInstanceClassName} from "./uiUtils.ts";

export const findDomElement = (selector?: string): HTMLElement | null => {
	return selector ? document.querySelector(selector) : null;
};

export const createDomElement = (tagName: string, classList?: string[] = [], children:HTMLElement[] = []) => {
	const element = document.createElement(tagName);
	element.classList.add(...classList);
	children.forEach((child) => {
		element.appendChild(child);
	});

	return element;
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

export const getNearestStyledElement = (element:HTMLElement, colorProperty:string):HTMLElement => {
	// TODO: What about background-images, gradients, styles defined in a sibling (instead of ancestor), and other edge cases?
	const colorValue = getElementStyles(element, colorProperty);
	const {alpha} = getRgbaFromCssColor(colorValue);

	return alpha < .1 && element.parentElement ? getNearestStyledElement(element.parentElement, colorProperty) : element;
};

export const getRgbaFromCssColor = (cssColor:CSSStyleDeclaration) => {
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

export const buildAutocompleteDomElements = (instanceClassname:string, smartyLogoDark:string, smartyLogoLight:string):Record<string, HTMLElement> => {
	const customStylesElement = createDomElement("style");

	const smartyLogoDarkElement = createDomElement("img", ["smartyAddress__smartyLogoDark"]);
	const smartyLogoLightElement = createDomElement("img", ["smartyAddress__smartyLogoLight"]);
	const poweredByText = document.createTextNode("Powered by");
	const suggestionsElement = createDomElement("ul", ["smartyAddress__suggestionsElement"]);
	const poweredBySmartyElement = createDomElement("div", ["smartyAddress__poweredBy"], [poweredByText, smartyLogoDarkElement, smartyLogoLightElement]);
	const dropdownElement = createDomElement("div", ["smartyAddress__dropdownElement", "smartyAddress__hidden"], [suggestionsElement, poweredBySmartyElement]);
	const dropdownWrapperElement = createDomElement("div", ["smartyAddress__suggestionsWrapperElement", instanceClassname], [dropdownElement]);

	dropdownElement.setAttribute("role", "listbox");
	smartyLogoDarkElement.setAttribute("src", smartyLogoDark);
	smartyLogoLightElement.setAttribute("src", smartyLogoLight);

	return {
		customStylesElement,
		dropdownWrapperElement,
		dropdownElement,
		suggestionsElement,
		poweredBySmartyElement,
	};
};

export const configureDynamicStyling = (dynamicStylingHandler:Function) => {
	// TODO: Do we need to separate "color" and "position" functionality?
	// TODO: Do we need to setup polling or a mutation observer so we can also recalculate these values when sizes/positions/colors change for other reasons besides scroll/resize?

	dynamicStylingHandler();
	window.addEventListener("scroll", () => dynamicStylingHandler);
	window.addEventListener("resize", () => dynamicStylingHandler);
};

// TODO: Figure out how to simplify this function
export const highlightNewAddress = (items:UiSuggestionItem[], currentIndex:number, suggestionsElement:HTMLElement, indexChange:number) => {
	const newIndex = (currentIndex + indexChange + items.length) % items.length;

	items.forEach((item, i) => {
		item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
	});

	scrollToHighlightedSuggestion(items[newIndex].suggestionElement, suggestionsElement);

	return newIndex;
};

export const updateThemeClass = (newTheme:string[], previousTheme:string[] = [], dropdownWrapperElement:HTMLElement) => {
	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...newTheme);
	}
};
