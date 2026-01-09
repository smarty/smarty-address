import { AddressSuggestion, UiSuggestionItem } from "../interfaces";
import {
	formatStyleBlock,
	getFormattedAddressSuggestion,
	getHslFromColorString,
	getInstanceClassName,
} from "./uiUtils";
import { getSmartyLogo } from "./getSmartyLogo";

export const findDomElement = (
	selector?: string | null,
	doc: Document = document,
): HTMLElement | null => {
	return selector ? doc.querySelector(selector) : null;
};

export const findDomElementWithRetry = async (
	selector: string,
	findDomElementFn: typeof findDomElement,
	maxAttempts: number = 5,
	delayMs: number = 100,
): Promise<HTMLElement | null> => {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const element = findDomElementFn(selector);

		if (element) {
			return element;
		}

		if (attempt < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return null;
};

export const createDomElement = (
	tagName: string,
	classList: string[] = [],
	children: (HTMLElement | Text)[] = [],
) => {
	const element = document.createElement(tagName);
	element.classList.add(...classList);
	children.forEach((child) => {
		element.appendChild(child);
	});

	return element;
};

export const createSuggestionElement = (suggestion: AddressSuggestion) => {
	const { entries = 0 } = suggestion;
	const addressElementClasses = ["smartyAddress__autocompleteAddress"];
	const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
	const entriesElementClasses = ["smartyAddress__suggestionEntries"];
	const suggestionElementClasses = ["smartyAddress__suggestion"];

	const entriesChildren: ElementConfig[] | undefined =
		entries > 1 ? [{ text: `${entries} entries` }] : undefined;

	const elementsMap: ElementConfig[] = [
		{
			name: "suggestionElement",
			elementType: "li",
			className: suggestionElementClasses,
			attributes: { "data-address": JSON.stringify(suggestion) },
			children: [
				{
					elementType: "div",
					className: addressWrapperElementClasses,
					children: [
						{
							name: "addressElement",
							elementType: "div",
							className: addressElementClasses,
							children: [{ text: getFormattedAddressSuggestion(suggestion) }],
						},
						{
							name: "entriesElement",
							elementType: "div",
							className: entriesElementClasses,
							children: entriesChildren,
						},
					],
				},
			],
		},
	];

	return buildElementsFromMap(elementsMap);
};

export const createSecondarySuggestionElement = (suggestion: AddressSuggestion) => {
	const addressElementClasses = ["smartyAddress__autocompleteAddress"];
	const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
	const secondarySuggestionElementClasses = ["smartyAddress__secondarySuggestion"];

	const elementsMap = [
		{
			name: "secondarySuggestionElement",
			elementType: "li",
			className: secondarySuggestionElementClasses,
			attributes: { "data-address": JSON.stringify(suggestion) },
			children: [
				{
					elementType: "div",
					className: addressWrapperElementClasses,
					children: [
						{
							name: "addressElement",
							elementType: "div",
							className: addressElementClasses,
							children: [{ text: getFormattedAddressSuggestion(suggestion, true) }],
						},
					],
				},
			],
		},
	];

	return buildElementsFromMap(elementsMap);
};

export const updateDropdownContents = (
	addressSuggestionResults: UiSuggestionItem[],
	suggestionsElement: HTMLElement,
) => {
	suggestionsElement.replaceChildren(
		...addressSuggestionResults.map((item) => item.suggestionElement),
	);
};

export const getElementStyles = (
	element: HTMLElement,
	property: string,
	getComputedStyleFn = window.getComputedStyle,
): CSSStyleDeclaration => {
	const styles = getComputedStyleFn(element);
	return (styles as any)[property] ?? "rgba(0, 0, 0, 0)";
};

export const scrollToHighlightedSuggestion = (
	highlightedElement: HTMLElement,
	container: HTMLElement,
) => {
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

export const getStreetLineFormValue = (
	{
		secondaryInputElement,
		cityInputElement,
		stateInputElement,
		zipcodeInputElement,
	}: {
		secondaryInputElement: HTMLInputElement | null;
		cityInputElement: HTMLInputElement | null;
		stateInputElement: HTMLInputElement | null;
		zipcodeInputElement: HTMLInputElement | null;
	},
	address: AddressSuggestion,
) => {
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

export const showElement = (element: HTMLElement) => {
	// TODO: Create a single place to store all class names
	element.classList.remove("smartyAddress__hidden");
};

export const hideElement = (element: HTMLElement) => {
	element.classList.add("smartyAddress__hidden");
};

export const getNearestStyledElement = (
	element: HTMLElement,
	colorProperty: string,
): HTMLElement => {
	const colorValue = getElementStyles(element, colorProperty);
	const { alpha } = getRgbaFromCssColor(colorValue);

	return alpha < 0.1 && element.parentElement
		? getNearestStyledElement(element.parentElement, colorProperty)
		: element;
};

export const getRgbaFromCssColor = (cssColor: CSSStyleDeclaration) => {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	// TODO: review "canvas.getContext()" config options
	// TODO: Make sure this solution works cross-browser
	const context = canvas.getContext("2d", { willReadFrequently: true });

	if (!context) {
		return { red: 0, green: 0, blue: 0, alpha: 1 };
	}

	context.globalCompositeOperation = "copy";
	context.fillStyle = cssColor as any;
	context.fillRect(0, 0, 1, 1);

	const [red, green, blue, aByte] = context.getImageData(0, 0, 1, 1).data;
	const alpha = Math.round(((aByte ?? 255) / 255) * 1000) / 1000;

	return { red, green, blue, alpha };
};

export const updateDynamicStyles = (
	stylesElement: HTMLStyleElement,
	searchInputElement: HTMLInputElement,
	instanceId: number,
) => {
	const { left, bottom, width } = searchInputElement.getBoundingClientRect();
	const scrollY = window.scrollY;
	const scrollX = window.scrollX;

	const backgroundColorElement = getNearestStyledElement(searchInputElement, "backgroundColor");
	const colorElement = getNearestStyledElement(searchInputElement, "color");
	const inputBackgroundColor = getElementStyles(backgroundColorElement, "backgroundColor");
	const inputTextColor = getElementStyles(colorElement, "color");
	const { hue, saturation, lightness } = getHslFromColorString(inputBackgroundColor);

	const isLightMode = lightness > 50;
	const useBlueLogo = lightness > 75;

	const secondaryLightness = isLightMode ? lightness - 10 : lightness + 10;
	const tertiaryLightness = isLightMode ? lightness - 20 : lightness + 20;
	const secondarySurfaceColor = `hsl(${hue} ${saturation}% ${secondaryLightness}%)`;
	const tertiarySurfaceColor = `hsl(${hue} ${saturation}% ${tertiaryLightness}%)`;
	const hoverMixColor = isLightMode ? "#000" : "#fff";

	// TODO: Need to define all the missing vars here (see colors.ts)
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

	const colorsStyleBlock = formatStyleBlock(
		`.smartyAddress__color_dynamic.${getInstanceClassName(instanceId)}`,
		dynamicColorStyles,
	);
	const positionStyleBlock = formatStyleBlock(
		`.smartyAddress__position_dynamic.${getInstanceClassName(instanceId)}`,
		dynamicPositionStyles,
	);
	stylesElement.innerHTML = `${colorsStyleBlock} ${positionStyleBlock}`;
};

interface ElementConfig {
	name?: string;
	text?: string;
	elementType?: string;
	className?: string[];
	attributes?: Record<string, string>;
	children?: ElementConfig[] | undefined;
}

const buildElementsFromMap = (
	fullElementsMap: ElementConfig[],
): Record<string, HTMLElement | Text> => {
	const elements: Record<string, HTMLElement | Text> = {};

	const buildElement = ({
		name,
		text,
		elementType,
		className = [],
		attributes = {},
		children = [],
	}: ElementConfig): HTMLElement | Text => {
		const element = text
			? document.createTextNode(text)
			: createDomElement(elementType!, className, children.map(buildElement));

		if (element instanceof HTMLElement) {
			Object.entries(attributes).forEach(([attr, value]) => {
				element.setAttribute(attr, value);
			});
		}

		if (name) {
			elements[name] = element;
		}

		return element;
	};

	fullElementsMap.map(buildElement);

	return elements;
};

export const buildAutocompleteDomElements = (
	instanceClassname: string,
): Record<string, HTMLElement | Text> => {
	const darkLogoElementClasses = ["smartyAddress__smartyLogoDark"];
	const lightLogoElementClasses = ["smartyAddress__smartyLogoLight"];
	const suggestionsElementClasses = ["smartyAddress__suggestionsElement"];
	const poweredByElementClasses = ["smartyAddress__poweredBy"];
	const dropdownElementInitialClasses = ["smartyAddress__dropdownElement", "smartyAddress__hidden"];
	const dropdownWrapperElementClasses = [
		"smartyAddress__suggestionsWrapperElement",
		instanceClassname,
	];

	const elementsMap = [
		{ name: "customStylesElement", elementType: "style" },
		{
			name: "dropdownWrapperElement",
			elementType: "div",
			className: dropdownWrapperElementClasses,
			children: [
				{
					name: "dropdownElement",
					elementType: "div",
					className: dropdownElementInitialClasses,
					attributes: { role: "listbox" },
					children: [
						{ name: "suggestionsElement", elementType: "ul", className: suggestionsElementClasses },
						{
							name: "poweredBySmartyElement",
							elementType: "div",
							className: poweredByElementClasses,
							children: [
								{ text: "Powered by" },
								{
									elementType: "img",
									className: darkLogoElementClasses,
									attributes: { src: getSmartyLogo("#0066FF") },
								},
								{
									elementType: "img",
									className: lightLogoElementClasses,
									attributes: { src: getSmartyLogo("#FFFFFF") },
								},
							],
						},
					],
				},
			],
		},
	];

	return buildElementsFromMap(elementsMap);
};

export const configureSearchInputForAutocomplete = (searchInputElement: HTMLInputElement) => {
	searchInputElement.setAttribute("autocomplete", "smarty");
	searchInputElement.setAttribute("aria-autocomplete", "list");
	searchInputElement.setAttribute("role", "combobox");
	searchInputElement.setAttribute("aria-expanded", "true");
};

export const configureDynamicStyling = (dynamicStylingHandler: Function) => {
	// TODO: Do we need to separate "color" and "position" functionality?
	// TODO: Do we need to setup polling or a mutation observer so we can also recalculate these values when sizes/positions/colors change for other reasons besides scroll/resize?

	dynamicStylingHandler();
	window.addEventListener("scroll", () => dynamicStylingHandler);
	window.addEventListener("resize", () => dynamicStylingHandler);
};

export const updateThemeClass = (
	newTheme: string[],
	previousTheme: string[] = [],
	dropdownWrapperElement: HTMLElement,
) => {
	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...newTheme);
	}
};
