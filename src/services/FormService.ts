import { BaseService } from "./BaseService";
import { AddressSuggestion, SmartyAddressConfig } from "../interfaces";
import { STATE_ABBREVIATIONS } from "../constants/stateAbbreviations";

export class FormService extends BaseService {
	private streetSelector: string | null = null;
	private secondarySelector: string | null = null;
	private citySelector: string | null = null;
	private stateSelector: string | null = null;
	private zipcodeSelector: string | null = null;

	init(config: SmartyAddressConfig) {
		this.streetSelector = config?.streetSelector ?? null;
		this.secondarySelector = config?.secondarySelector ?? null;
		this.citySelector = config?.citySelector ?? null;
		this.stateSelector = config?.stateSelector ?? null;
		this.zipcodeSelector = config?.zipcodeSelector ?? null;
	}

	getStateValueForInput(element: HTMLElement, stateValue: string): string {
		if (!(element instanceof HTMLSelectElement)) {
			return stateValue;
		}

		const options = Array.from(element.options);
		const normalized = stateValue.trim().toLowerCase();

		return (
			this.findOptionByValue(options, normalized) ??
			this.findOptionByText(options, normalized) ??
			this.findOptionByAbbreviation(options, stateValue) ??
			this.findOptionByFullName(options, normalized) ??
			stateValue
		);
	}

	private findOptionByValue(options: HTMLOptionElement[], normalized: string): string | null {
		const match = options.find((opt) => opt.value.toLowerCase() === normalized);
		return match?.value ?? null;
	}

	private findOptionByText(options: HTMLOptionElement[], normalized: string): string | null {
		const match = options.find((opt) => opt.text.toLowerCase() === normalized);
		return match?.value ?? null;
	}

	private findOptionByAbbreviation(
		options: HTMLOptionElement[],
		stateValue: string,
	): string | null {
		const abbreviation = STATE_ABBREVIATIONS[stateValue]?.toLowerCase();
		if (!abbreviation) return null;

		const match = options.find((opt) => opt.value.toLowerCase() === abbreviation);
		return match?.value ?? null;
	}

	private findOptionByFullName(options: HTMLOptionElement[], normalized: string): string | null {
		const fullName = Object.keys(STATE_ABBREVIATIONS).find(
			(key) => STATE_ABBREVIATIONS[key]?.toLowerCase() === normalized,
		);
		if (!fullName) return null;

		const match = options.find((opt) => opt.value.toLowerCase() === fullName.toLowerCase());
		return match?.value ?? null;
	}

	getStreetFormValue(
		elements: {
			streetInputElement: HTMLElement | null;
			secondaryInputElement: HTMLInputElement | null;
			cityInputElement: HTMLInputElement | null;
			stateInputElement: HTMLInputElement | null;
			zipcodeInputElement: HTMLInputElement | null;
		},
		address: AddressSuggestion,
	): string {
		const {
			streetInputElement,
			secondaryInputElement,
			cityInputElement,
			stateInputElement,
			zipcodeInputElement,
		} = elements;
		const isSingleFieldForm =
			!secondaryInputElement && !cityInputElement && !stateInputElement && !zipcodeInputElement;

		if (isSingleFieldForm) {
			return this.formatSingleFieldAddress(
				address,
				streetInputElement instanceof HTMLTextAreaElement,
			);
		}

		const includeSecondary = !secondaryInputElement && address.secondary?.length;
		return includeSecondary ? `${address.street_line}, ${address.secondary}` : address.street_line;
	}

	private formatSingleFieldAddress(address: AddressSuggestion, isTextarea: boolean): string {
		const cityStateZip = this.formatCityStateZip(address);

		if (isTextarea) {
			const lines = [address.street_line];
			if (address.secondary?.length) lines.push(address.secondary);
			lines.push(cityStateZip);
			return lines.join("\n");
		}

		const parts = [address.street_line];
		if (address.secondary?.length) parts.push(address.secondary);
		parts.push(cityStateZip);
		return parts.join(", ");
	}

	private formatCityStateZip(address: AddressSuggestion): string {
		const cityState = [address.city, address.state].filter(Boolean).join(", ");
		return address.zipcode ? `${cityState} ${address.zipcode}` : cityState;
	}

	populateFormWithAddress(selectedAddress: AddressSuggestion) {
		const elements = {
			streetInputElement: this.domService.findDomElement(this.streetSelector),
			secondaryInputElement: this.domService.findDomElement(
				this.secondarySelector,
			) as HTMLInputElement | null,
			cityInputElement: this.domService.findDomElement(
				this.citySelector,
			) as HTMLInputElement | null,
			stateInputElement: this.domService.findDomElement(
				this.stateSelector,
			) as HTMLInputElement | null,
			zipcodeInputElement: this.domService.findDomElement(
				this.zipcodeSelector,
			) as HTMLInputElement | null,
		};

		if (!elements?.streetInputElement) return;

		const streetValue = this.getStreetFormValue(elements, selectedAddress);
		this.domService.setInputValue(elements.streetInputElement, streetValue);

		if (elements.secondaryInputElement) {
			this.domService.setInputValue(
				elements.secondaryInputElement,
				selectedAddress.secondary ?? "",
			);
		}
		if (elements.cityInputElement) {
			this.domService.setInputValue(elements.cityInputElement, selectedAddress.city);
		}
		if (elements.stateInputElement) {
			this.domService.setInputValue(
				elements.stateInputElement,
				this.getStateValueForInput(elements.stateInputElement, selectedAddress.state),
			);
		}
		if (elements.zipcodeInputElement) {
			this.domService.setInputValue(elements.zipcodeInputElement, selectedAddress.zipcode);
		}
	}
}
