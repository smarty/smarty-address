import { BaseService } from "./BaseService";
import { AddressSuggestion } from "../interfaces";

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

	getStateValueForInput(element: HTMLElement, stateValue: string): string {
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
}
