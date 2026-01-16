import { BaseService } from "../BaseService";
import { AddressSuggestion, SmartyAddressConfig } from "../../interfaces";
import {
	findDomElement,
	getStreetLineFormValue,
	setInputValue,
	getStateValueForInput,
} from "../../utils/domUtils";

export class AddressFormUiService extends BaseService {
	private streetLineSelector: string | null = null;
	private secondarySelector: string | null = null;
	private citySelector: string | null = null;
	private stateSelector: string | null = null;
	private zipcodeSelector: string | null = null;

	init(config: SmartyAddressConfig) {
		this.streetLineSelector = config?.streetLineSelector ?? null;
		this.secondarySelector = config?.secondarySelector ?? null;
		this.citySelector = config?.citySelector ?? null;
		this.stateSelector = config?.stateSelector ?? null;
		this.zipcodeSelector = config?.zipcodeSelector ?? null;
	}

	populateFormWithNewAddress(selectedAddress: AddressSuggestion) {
		const elements = {
			streetLineInputElement: findDomElement(this.streetLineSelector),
			secondaryInputElement: findDomElement(this.secondarySelector) as HTMLInputElement | null,
			cityInputElement: findDomElement(this.citySelector) as HTMLInputElement | null,
			stateInputElement: findDomElement(this.stateSelector) as HTMLInputElement | null,
			zipcodeInputElement: findDomElement(this.zipcodeSelector) as HTMLInputElement | null,
		};

		if (!elements?.streetLineInputElement) return;

		setInputValue(elements.streetLineInputElement, getStreetLineFormValue(elements, selectedAddress));

		if (elements.secondaryInputElement) {
			setInputValue(elements.secondaryInputElement, selectedAddress.secondary ?? "");
		}
		if (elements.cityInputElement) {
			setInputValue(elements.cityInputElement, selectedAddress.city);
		}
		if (elements.stateInputElement) {
			setInputValue(
				elements.stateInputElement,
				getStateValueForInput(elements.stateInputElement, selectedAddress.state),
			);
		}
		if (elements.zipcodeInputElement) {
			setInputValue(elements.zipcodeInputElement, selectedAddress.zipcode);
		}
	}
}
