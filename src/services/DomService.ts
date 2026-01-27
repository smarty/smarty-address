import { BaseService } from "./BaseService";

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
		timeoutMs: number = 5000,
	): Promise<HTMLElement | null> {
		const existing = this.findDomElement(selector);
		if (existing) return existing;

		return new Promise((resolve) => {
			const observer = new MutationObserver(() => {
				const element = this.findDomElement(selector);
				if (element) {
					observer.disconnect();
					resolve(element);
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});

			setTimeout(() => {
				observer.disconnect();
				resolve(null);
			}, timeoutMs);
		});
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
}
