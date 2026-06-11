import { BaseService } from "./BaseService";
import {
	AutocompleteSuggestion,
	CurrentAddress,
	NormalizedSmartyAddressConfig,
} from "../interfaces";
import { STATE_ABBREVIATIONS } from "../constants/stateAbbreviations";
import { toSuggestion } from "../utils/currentAddress";

export class FormService extends BaseService {
	private streetSelector: string | null = null;
	private secondarySelector: string | null = null;
	private localitySelector: string | null = null;
	private administrativeAreaSelector: string | null = null;
	private postalCodeSelector: string | null = null;
	private onPopulated: ((address: AutocompleteSuggestion) => void) | null = null;

	init(config: NormalizedSmartyAddressConfig) {
		this.streetSelector = config?.streetSelector ?? null;
		this.secondarySelector = config?.secondarySelector ?? null;
		this.localitySelector = config?.localitySelector ?? null;
		this.administrativeAreaSelector = config?.administrativeAreaSelector ?? null;
		this.postalCodeSelector = config?.postalCodeSelector ?? null;
	}

	// The verification orchestrator subscribes here to fire the "selection"
	// trigger after an address actually lands in the form (covers US multi-entry
	// and the international detail flow, which both finish at populateFormWithAddress).
	setOnPopulated(callback: ((address: AutocompleteSuggestion) => void) | null) {
		this.onPopulated = callback;
	}

	getAdministrativeAreaValueForInput(element: HTMLElement, areaValue: string): string {
		if (!(element instanceof HTMLSelectElement)) {
			return areaValue;
		}

		const options = Array.from(element.options);
		const normalized = areaValue.trim().toLowerCase();

		return (
			this.findOptionByValue(options, normalized) ??
			this.findOptionByText(options, normalized) ??
			this.findOptionByAbbreviation(options, areaValue) ??
			this.findOptionByFullName(options, normalized) ??
			areaValue
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

	private findOptionByAbbreviation(options: HTMLOptionElement[], areaValue: string): string | null {
		const abbreviation = STATE_ABBREVIATIONS[areaValue]?.toLowerCase();
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
			localityInputElement: HTMLInputElement | null;
			administrativeAreaInputElement: HTMLInputElement | null;
			postalCodeInputElement: HTMLInputElement | null;
		},
		address: AutocompleteSuggestion,
	): string {
		const {
			streetInputElement,
			secondaryInputElement,
			localityInputElement,
			administrativeAreaInputElement,
			postalCodeInputElement,
		} = elements;
		const isSingleFieldForm =
			!secondaryInputElement &&
			!localityInputElement &&
			!administrativeAreaInputElement &&
			!postalCodeInputElement;

		if (isSingleFieldForm) {
			return this.formatSingleFieldAddress(
				address,
				streetInputElement instanceof HTMLTextAreaElement,
			);
		}

		const includeSecondary = !secondaryInputElement && address.secondary?.length;
		return includeSecondary ? `${address.street_line}, ${address.secondary}` : address.street_line;
	}

	private formatSingleFieldAddress(address: AutocompleteSuggestion, isTextarea: boolean): string {
		const localityAreaPostal = this.formatLocalityAreaPostal(address);

		if (isTextarea) {
			const lines = [address.street_line];
			if (address.secondary?.length) lines.push(address.secondary);
			lines.push(localityAreaPostal);
			return lines.join("\n");
		}

		const parts = [address.street_line];
		if (address.secondary?.length) parts.push(address.secondary);
		parts.push(localityAreaPostal);
		return parts.join(", ");
	}

	private formatLocalityAreaPostal(address: AutocompleteSuggestion): string {
		const localityArea = [address.locality, address.administrativeArea].filter(Boolean).join(", ");
		return address.postalCode ? `${localityArea} ${address.postalCode}` : localityArea;
	}

	populateFormWithAddress(selectedAddress: AutocompleteSuggestion) {
		this.applyAddressToForm(selectedAddress);
		this.onPopulated?.(selectedAddress);
	}

	private applyAddressToForm(selectedAddress: AutocompleteSuggestion) {
		const domService = this.getService("domService");
		const elements = {
			streetInputElement: domService.findDomElement(this.streetSelector),
			secondaryInputElement: domService.findDomElement(
				this.secondarySelector,
			) as HTMLInputElement | null,
			localityInputElement: domService.findDomElement(
				this.localitySelector,
			) as HTMLInputElement | null,
			administrativeAreaInputElement: domService.findDomElement(
				this.administrativeAreaSelector,
			) as HTMLInputElement | null,
			postalCodeInputElement: domService.findDomElement(
				this.postalCodeSelector,
			) as HTMLInputElement | null,
		};

		if (!elements.streetInputElement) return;

		const streetValue = this.getStreetFormValue(elements, selectedAddress);
		domService.setInputValue(elements.streetInputElement, streetValue);

		if (elements.secondaryInputElement) {
			domService.setInputValue(elements.secondaryInputElement, selectedAddress.secondary ?? "");
		}
		if (elements.localityInputElement) {
			domService.setInputValue(elements.localityInputElement, selectedAddress.locality);
		}
		if (elements.administrativeAreaInputElement) {
			domService.setInputValue(
				elements.administrativeAreaInputElement,
				this.getAdministrativeAreaValueForInput(
					elements.administrativeAreaInputElement,
					selectedAddress.administrativeArea,
				),
			);
		}
		if (elements.postalCodeInputElement) {
			domService.setInputValue(elements.postalCodeInputElement, selectedAddress.postalCode);
		}
	}

	// Corrections round-trip back through here (ERD §4.1, Q6). Maps the
	// CurrentAddress onto the same population path autocomplete already uses.
	// Does NOT fire onPopulated — a verification correction must not re-trigger
	// the selection flow that produced it.
	populateFormWithCurrentAddress(address: CurrentAddress) {
		this.applyAddressToForm(toSuggestion(address));
	}

	// fromFormFields adapter (ERD §4.1, Q8). Reads the configured selectors into
	// a CurrentAddress for the verification-only / free-form path, where no
	// autocomplete suggestion exists.
	readCurrentAddress(
		country: string,
		origin: CurrentAddress["origin"] = "free-form",
	): CurrentAddress {
		const domService = this.getService("domService");
		const readValue = (selector: string | null): string => {
			if (!selector) return "";
			const element = domService.findDomElement(selector) as
				| HTMLInputElement
				| HTMLSelectElement
				| null;
			return element?.value?.trim() ?? "";
		};

		return {
			street: readValue(this.streetSelector),
			secondary: readValue(this.secondarySelector),
			locality: readValue(this.localitySelector),
			administrativeArea: readValue(this.administrativeAreaSelector),
			postalCode: readValue(this.postalCodeSelector),
			country,
			origin,
		};
	}
}
