import { BaseService } from "./BaseService";
import { getSmartyLogo } from "../utils/getSmartyLogo";

export interface ElementConfig {
	name?: string;
	text?: string;
	elementType?: string;
	className?: string[];
	attributes?: Record<string, string>;
	children?: ElementConfig[] | undefined;
}

export class DomService extends BaseService {
	findDomElement(selector?: string | null, doc: Document = document): HTMLElement | null {
		return selector ? doc.querySelector(selector) : null;
	}

	async findDomElementWithRetry(
		selector: string,
		maxAttempts: number = 50,
		delayMs: number = 100,
	): Promise<HTMLElement | null> {
		const retryAfterDelay = async () => {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			return this.findDomElementWithRetry(selector, maxAttempts - 1, delayMs);
		};

		return this.findDomElement(selector) ?? (maxAttempts > 1 ? await retryAfterDelay() : null);
	}

	createDomElement(
		tagName: string,
		classList: string[] = [],
		children: (HTMLElement | Text)[] = [],
	): HTMLElement {
		const element = document.createElement(tagName);
		element.classList.add(...classList);
		children.forEach((child) => {
			element.appendChild(child);
		});

		return element;
	}

	setInputValue(element: HTMLElement, value: string): void {
		const nativeValueSetter = this.getNativeValueSetter(element);

		if (nativeValueSetter) {
			nativeValueSetter.call(element, value);
			element.dispatchEvent(new Event("change", { bubbles: true }));
		} else if ("value" in element) {
			(element as HTMLInputElement).value = value;
			element.dispatchEvent(new Event("change", { bubbles: true }));
		} else {
			element.textContent = value;
		}
	}

	private getNativeValueSetter(element: HTMLElement): ((v: string) => void) | undefined {
		const prototypeMap: [Function, object][] = [
			[HTMLInputElement, window.HTMLInputElement.prototype],
			[HTMLTextAreaElement, window.HTMLTextAreaElement.prototype],
			[HTMLSelectElement, window.HTMLSelectElement.prototype],
		];

		for (const [ElementType, prototype] of prototypeMap) {
			if (element instanceof ElementType) {
				return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
			}
		}

		return undefined;
	}

	getElementStyles(
		element: HTMLElement,
		property: string,
		getComputedStyleFn = window.getComputedStyle,
	): string {
		const styles = getComputedStyleFn(element);
		return (styles as any)[property] ?? "rgba(0, 0, 0, 0)";
	}

	buildElementsFromMap(fullElementsMap: ElementConfig[]): Record<string, HTMLElement | Text> {
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
				: this.createDomElement(elementType!, className, children.map(buildElement));

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
	}

	buildAutocompleteDomElements(instanceClassname: string): Record<string, HTMLElement | Text> {
		const darkLogoElementClasses = ["smartyAddress__smartyLogoDark"];
		const lightLogoElementClasses = ["smartyAddress__smartyLogoLight"];
		const suggestionsElementClasses = ["smartyAddress__suggestionsElement"];
		const poweredByElementClasses = ["smartyAddress__poweredBy"];
		const dropdownElementInitialClasses = [
			"smartyAddress__dropdownElement",
			"smartyAddress__hidden",
		];
		const dropdownWrapperElementClasses = [
			"smartyAddress__suggestionsWrapperElement",
			instanceClassname,
		];
		const announcementElementClasses = ["smartyAddress__srOnly"];

		const elementsMap: ElementConfig[] = [
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
							{
								name: "suggestionsElement",
								elementType: "ul",
								className: suggestionsElementClasses,
							},
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

		return this.buildElementsFromMap(elementsMap);
	}

	buildSuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		suggestionData: string,
		ariaLabel: string,
		entries: number = 0,
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const entriesElementClasses = ["smartyAddress__suggestionEntries"];
		const suggestionElementClasses = ["smartyAddress__suggestion"];

		const entriesChildren: ElementConfig[] | undefined =
			entries > 1 ? [{ text: `${entries} entries` }] : undefined;

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": suggestionData,
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

		return this.buildElementsFromMap(elementsMap);
	}

	buildSecondarySuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		suggestionData: string,
		ariaLabel: string,
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const secondarySuggestionElementClasses = ["smartyAddress__secondarySuggestion"];

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": suggestionData,
			role: "option",
			"aria-label": ariaLabel,
		};
		if (suggestionId) {
			attributes.id = suggestionId;
		}

		const elementsMap: ElementConfig[] = [
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

		return this.buildElementsFromMap(elementsMap);
	}
}
