import { BaseService } from "../BaseService";
import { AddressSuggestion, SmartyAddressConfig } from "../../interfaces";

export class AddressFormUiService extends BaseService {
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

	populateFormWithNewAddress(selectedAddress: AddressSuggestion) {
		const elements = {
			streetLineInputElement: this.services.domUtilsService!.findDomElement(this.streetSelector),
			secondaryInputElement: this.services.domUtilsService!.findDomElement(
				this.secondarySelector,
			) as HTMLInputElement | null,
			cityInputElement: this.services.domUtilsService!.findDomElement(
				this.citySelector,
			) as HTMLInputElement | null,
			stateInputElement: this.services.domUtilsService!.findDomElement(
				this.stateSelector,
			) as HTMLInputElement | null,
			zipcodeInputElement: this.services.domUtilsService!.findDomElement(
				this.zipcodeSelector,
			) as HTMLInputElement | null,
		};

		if (!elements?.streetLineInputElement) return;

		this.services.domUtilsService!.setInputValue(
			elements.streetLineInputElement,
			this.services.domUtilsService!.getStreetLineFormValue(elements, selectedAddress),
		);

		if (elements.secondaryInputElement) {
			this.services.domUtilsService!.setInputValue(
				elements.secondaryInputElement,
				selectedAddress.secondary ?? "",
			);
		}
		if (elements.cityInputElement) {
			this.services.domUtilsService!.setInputValue(elements.cityInputElement, selectedAddress.city);
		}
		if (elements.stateInputElement) {
			this.services.domUtilsService!.setInputValue(
				elements.stateInputElement,
				this.services.domUtilsService!.getStateValueForInput(
					elements.stateInputElement,
					selectedAddress.state,
				),
			);
		}
		if (elements.zipcodeInputElement) {
			this.services.domUtilsService!.setInputValue(
				elements.zipcodeInputElement,
				selectedAddress.zipcode,
			);
		}
	}
}
