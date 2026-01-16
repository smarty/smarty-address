import { AddressSuggestion, UiSuggestionItem } from "../interfaces";
import {
	formatStyleBlock,
	getFormattedAddressSuggestion,
	getHslFromColorString,
	getInstanceClassName,
	createHighlightedTextElements,
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
	maxAttempts: number = 50,
	delayMs: number = 100,
): Promise<HTMLElement | null> => {
	const retryAfterDelay = async () => {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		return findDomElementWithRetry(selector, findDomElementFn, maxAttempts - 1, delayMs);
	};

	return findDomElementFn(selector) ?? (maxAttempts > 1 ? await retryAfterDelay() : null);
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

const STATE_ABBREVIATIONS: Record<string, string> = {
	Alabama: "AL",
	Alaska: "AK",
	Arizona: "AZ",
	Arkansas: "AR",
	California: "CA",
	Colorado: "CO",
	Connecticut: "CT",
	Delaware: "DE",
	Florida: "FL",
	Georgia: "GA",
	Hawaii: "HI",
	Idaho: "ID",
	Illinois: "IL",
	Indiana: "IN",
	Iowa: "IA",
	Kansas: "KS",
	Kentucky: "KY",
	Louisiana: "LA",
	Maine: "ME",
	Maryland: "MD",
	Massachusetts: "MA",
	Michigan: "MI",
	Minnesota: "MN",
	Mississippi: "MS",
	Missouri: "MO",
	Montana: "MT",
	Nebraska: "NE",
	Nevada: "NV",
	"New Hampshire": "NH",
	"New Jersey": "NJ",
	"New Mexico": "NM",
	"New York": "NY",
	"North Carolina": "NC",
	"North Dakota": "ND",
	Ohio: "OH",
	Oklahoma: "OK",
	Oregon: "OR",
	Pennsylvania: "PA",
	"Rhode Island": "RI",
	"South Carolina": "SC",
	"South Dakota": "SD",
	Tennessee: "TN",
	Texas: "TX",
	Utah: "UT",
	Vermont: "VT",
	Virginia: "VA",
	Washington: "WA",
	"West Virginia": "WV",
	Wisconsin: "WI",
	Wyoming: "WY",
	"District of Columbia": "DC",
	"Puerto Rico": "PR",
	Guam: "GU",
	"American Samoa": "AS",
	"U.S. Virgin Islands": "VI",
	"Northern Mariana Islands": "MP",
};

export const getStateValueForInput = (element: HTMLElement, stateValue: string): string => {
	if (!(element instanceof HTMLSelectElement)) {
		return stateValue;
	}

	const options = Array.from(element.options);
	const normalizedStateValue = stateValue.trim().toLowerCase();

	const exactMatch = options.find((opt) => opt.value.toLowerCase() === normalizedStateValue);
	if (exactMatch) {
		return exactMatch.value;
	}

	const textMatch = options.find((opt) => opt.text.toLowerCase() === normalizedStateValue);
	if (textMatch) {
		return textMatch.value;
	}

	const stateAbbreviation = STATE_ABBREVIATIONS[stateValue];
	if (stateAbbreviation) {
		const abbreviationMatch = options.find(
			(opt) => opt.value.toLowerCase() === stateAbbreviation.toLowerCase(),
		);
		if (abbreviationMatch) {
			return abbreviationMatch.value;
		}
	}

	const fullStateName = Object.keys(STATE_ABBREVIATIONS).find(
		(key) => STATE_ABBREVIATIONS[key]?.toLowerCase() === normalizedStateValue,
	);
	if (fullStateName) {
		const fullNameMatch = options.find(
			(opt) => opt.value.toLowerCase() === fullStateName.toLowerCase(),
		);
		if (fullNameMatch) {
			return fullNameMatch.value;
		}
	}

	return stateValue;
};

export const setInputValue = (element: HTMLElement, value: string) => {
	let nativeValueSetter;

	if (element instanceof HTMLInputElement) {
		nativeValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			"value",
		)?.set;
	} else if (element instanceof HTMLTextAreaElement) {
		nativeValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLTextAreaElement.prototype,
			"value",
		)?.set;
	} else if (element instanceof HTMLSelectElement) {
		nativeValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLSelectElement.prototype,
			"value",
		)?.set;
	}

	if (nativeValueSetter) {
		nativeValueSetter.call(element, value);
		element.dispatchEvent(new Event("change", { bubbles: true }));
	} else if ("value" in element) {
		(element as HTMLInputElement).value = value;
		element.dispatchEvent(new Event("change", { bubbles: true }));
	} else {
		element.textContent = value;
	}
};

export const createSuggestionElement = (
	suggestion: AddressSuggestion,
	searchString: string = "",
	suggestionId?: string,
) => {
	const { entries = 0 } = suggestion;
	const addressElementClasses = ["smartyAddress__autocompleteAddress"];
	const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
	const entriesElementClasses = ["smartyAddress__suggestionEntries"];
	const suggestionElementClasses = ["smartyAddress__suggestion"];

	const entriesChildren: ElementConfig[] | undefined =
		entries > 1 ? [{ text: `${entries} entries` }] : undefined;

	const formattedAddress = getFormattedAddressSuggestion(suggestion);
	const highlightedParts = createHighlightedTextElements(formattedAddress, searchString);
	const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
		elementType: "span",
		className: part.isMatch ? ["smartyAddress__matchedText"] : [],
		children: [{ text: part.text }],
	}));

	const entriesLabel = entries > 1 ? `, ${entries} entries available` : "";
	const ariaLabel = `${formattedAddress}${entriesLabel}`;

	const attributes: Record<string, string> = {
		"data-address": JSON.stringify(suggestion),
		role: "option",
		"aria-label": ariaLabel,
	};
	if (suggestionId) {
		attributes.id = suggestionId;
	}

	const elementsMap: ElementConfig[] = [
		{
			name: "suggestionElement",
			elementType: "li",
			className: suggestionElementClasses,
			attributes,
			children: [
				{
					elementType: "div",
					className: addressWrapperElementClasses,
					children: [
						{
							name: "addressElement",
							elementType: "div",
							className: addressElementClasses,
							children: addressChildren,
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

export const createSecondarySuggestionElement = (
	suggestion: AddressSuggestion,
	searchString: string = "",
	suggestionId?: string,
) => {
	const addressElementClasses = ["smartyAddress__autocompleteAddress"];
	const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
	const secondarySuggestionElementClasses = ["smartyAddress__secondarySuggestion"];

	const formattedAddress = getFormattedAddressSuggestion(suggestion, true);
	const fullAddress = getFormattedAddressSuggestion(suggestion, false);
	const highlightedParts = createHighlightedTextElements(formattedAddress, searchString);
	const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
		elementType: "span",
		className: part.isMatch ? ["smartyAddress__matchedText"] : [],
		children: [{ text: part.text }],
	}));

	const attributes: Record<string, string> = {
		"data-address": JSON.stringify(suggestion),
		role: "option",
		"aria-label": fullAddress,
	};
	if (suggestionId) {
		attributes.id = suggestionId;
	}

	const elementsMap = [
		{
			name: "secondarySuggestionElement",
			elementType: "li",
			className: secondarySuggestionElementClasses,
			attributes,
			children: [
				{
					elementType: "div",
					className: addressWrapperElementClasses,
					children: [
						{
							name: "addressElement",
							elementType: "div",
							className: addressElementClasses,
							children: addressChildren,
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

	const accentColor = isLightMode ? "#0066ff" : "#6699ff";

	// TODO: Need to define all the missing vars here (see colors.ts)
	const dynamicColorStyles = {
		"--smartyAddress__textBasePrimaryColor": inputTextColor,
		"--smartyAddress__surfaceBasePrimaryColor": inputBackgroundColor,
		"--smartyAddress__surfaceBaseSecondaryColor": secondarySurfaceColor,
		"--smartyAddress__surfaceBaseTertiaryColor": tertiarySurfaceColor,
		"--smartyAddress__surfaceInverseExtremeColor": hoverMixColor,
		"--smartyAddress__surfaceBasePrimaryInverseColor": inputTextColor,
		"--smartyAddress__textAccentColor": accentColor,
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
	const announcementElementClasses = ["smartyAddress__srOnly"];

	const elementsMap = [
		{ name: "customStylesElement", elementType: "style" },
		{
			name: "dropdownWrapperElement",
			elementType: "div",
			className: dropdownWrapperElementClasses,
			children: [
				{
					name: "announcementElement",
					elementType: "div",
					className: announcementElementClasses,
					attributes: {
						"aria-live": "polite",
						"aria-atomic": "true",
					},
				},
				{
					name: "dropdownElement",
					elementType: "div",
					className: dropdownElementInitialClasses,
					attributes: {
						role: "listbox",
						"aria-label": "Address suggestions",
					},
					children: [
						{ name: "suggestionsElement", elementType: "ul", className: suggestionsElementClasses },
						{
							name: "poweredBySmartyElement",
							elementType: "div",
							className: poweredByElementClasses,
							attributes: { "aria-hidden": "true" },
							children: [
								{ text: "Powered by" },
								{
									elementType: "img",
									className: darkLogoElementClasses,
									attributes: {
										src: getSmartyLogo("#0066FF"),
										alt: "",
										"aria-hidden": "true",
									},
								},
								{
									elementType: "img",
									className: lightLogoElementClasses,
									attributes: {
										src: getSmartyLogo("#FFFFFF"),
										alt: "",
										"aria-hidden": "true",
									},
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

export const configureSearchInputForAutocomplete = (
	searchInputElement: HTMLInputElement,
	dropdownId?: string,
) => {
	searchInputElement.setAttribute("autocomplete", "smarty");
	searchInputElement.setAttribute("aria-autocomplete", "list");
	searchInputElement.setAttribute("role", "combobox");
	searchInputElement.setAttribute("aria-expanded", "false");
	if (dropdownId) {
		searchInputElement.setAttribute("aria-owns", dropdownId);
		searchInputElement.setAttribute("aria-controls", dropdownId);
	}
};

export const getSuggestionId = (instanceId: number, index: number): string => {
	return `smartyAddress__suggestion_${instanceId}_${index}`;
};

export const updateAriaActivedescendant = (
	searchInputElement: HTMLInputElement,
	suggestionId: string | null,
) => {
	if (suggestionId) {
		searchInputElement.setAttribute("aria-activedescendant", suggestionId);
	} else {
		searchInputElement.removeAttribute("aria-activedescendant");
	}
};

export const configureDynamicStyling = (
	dynamicStylingHandler: Function,
	searchInputElement: HTMLElement,
) => {
	dynamicStylingHandler();
	window.addEventListener("scroll", () => dynamicStylingHandler());
	window.addEventListener("resize", () => dynamicStylingHandler());

	const observerCallback = () => dynamicStylingHandler();
	const observerOptions: MutationObserverInit = {
		attributes: true,
		attributeFilter: ["style", "class"],
	};

	const observer = new MutationObserver(observerCallback);

	let element: HTMLElement | null = searchInputElement;
	while (element && element !== document.body) {
		observer.observe(element, observerOptions);
		element = element.parentElement;
	}
	if (document.body) {
		observer.observe(document.body, observerOptions);
	}
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
