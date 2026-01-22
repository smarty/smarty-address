import { BaseService } from "./BaseService";
import { AddressSuggestion } from "../interfaces";
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
	}

	getElementStyles(
		element: HTMLElement,
		property: string,
		getComputedStyleFn = window.getComputedStyle,
	): CSSStyleDeclaration {
		const styles = getComputedStyleFn(element);
		return (styles as any)[property] ?? "rgba(0, 0, 0, 0)";
	}

	getStreetLineFormValue(
		{
			streetLineInputElement,
			secondaryInputElement,
			cityInputElement,
			stateInputElement,
			zipcodeInputElement,
		}: {
			streetLineInputElement: HTMLElement | null;
			secondaryInputElement: HTMLInputElement | null;
			cityInputElement: HTMLInputElement | null;
			stateInputElement: HTMLInputElement | null;
			zipcodeInputElement: HTMLInputElement | null;
		},
		address: AddressSuggestion,
	): string {
		const streetLineValues = [address.street_line];

		if (!secondaryInputElement && address.secondary?.length) {
			streetLineValues.push(address.secondary || "");
		}

		const isSingleFieldForm =
			!secondaryInputElement && !cityInputElement && !stateInputElement && !zipcodeInputElement;

		if (isSingleFieldForm) {
			const isTextarea = streetLineInputElement instanceof HTMLTextAreaElement;
			const cityStateZip =
				[address.city, address.state].filter((value) => value.length).join(", ") +
				(address.zipcode ? " " + address.zipcode : "");

			if (isTextarea) {
				const lines = [address.street_line];
				if (address.secondary?.length) lines.push(address.secondary);
				lines.push(cityStateZip);
				return lines.join("\n");
			}

			return [...streetLineValues, cityStateZip].join(", ");
		}

		return streetLineValues.join(", ");
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
}
