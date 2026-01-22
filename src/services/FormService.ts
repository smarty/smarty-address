import { BaseService } from "./BaseService";
import { AddressSuggestion, SmartyAddressConfig } from "../interfaces";

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

	populateFormWithAddress(selectedAddress: AddressSuggestion) {
		const elements = {
			streetLineInputElement: this.services.domService!.findDomElement(this.streetSelector),
			secondaryInputElement: this.services.domService!.findDomElement(
				this.secondarySelector,
			) as HTMLInputElement | null,
			cityInputElement: this.services.domService!.findDomElement(
				this.citySelector,
			) as HTMLInputElement | null,
			stateInputElement: this.services.domService!.findDomElement(
				this.stateSelector,
			) as HTMLInputElement | null,
			zipcodeInputElement: this.services.domService!.findDomElement(
				this.zipcodeSelector,
			) as HTMLInputElement | null,
		};

		if (!elements?.streetLineInputElement) return;

		const streetLineValue = this.services.domService!.getStreetLineFormValue(
			elements,
			selectedAddress,
		);
		this.services.domService!.setInputValue(elements.streetLineInputElement, streetLineValue);

		if (elements.secondaryInputElement) {
			this.services.domService!.setInputValue(
				elements.secondaryInputElement,
				selectedAddress.secondary ?? "",
			);
		}
		if (elements.cityInputElement) {
			this.services.domService!.setInputValue(elements.cityInputElement, selectedAddress.city);
		}
		if (elements.stateInputElement) {
			this.services.domService!.setInputValue(
				elements.stateInputElement,
				this.services.domService!.getStateValueForInput(
					elements.stateInputElement,
					selectedAddress.state,
				),
			);
		}
		if (elements.zipcodeInputElement) {
			this.services.domService!.setInputValue(
				elements.zipcodeInputElement,
				selectedAddress.zipcode,
			);
		}
	}
}
