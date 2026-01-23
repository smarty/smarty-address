import { BaseService } from "./BaseService";
import { AddressSuggestion, SmartyAddressConfig } from "../interfaces";

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

	populateFormWithAddress(selectedAddress: AddressSuggestion) {
		const elements = {
			streetLineInputElement: this.domService.findDomElement(this.streetSelector),
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

		if (!elements?.streetLineInputElement) return;

		const streetLineValue = this.getStreetLineFormValue(elements, selectedAddress);
		this.domService.setInputValue(elements.streetLineInputElement, streetLineValue);

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
			this.domService.setInputValue(
				elements.zipcodeInputElement,
				selectedAddress.zipcode,
			);
		}
	}
}
