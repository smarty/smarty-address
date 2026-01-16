import { DefaultSmartyAddressConfig, SmartyAddressConfig } from "./interfaces";
import { ApiService } from "./services/api/ApiService";
import { AutocompleteDropdownService } from "./services/autocompleteDropdown/AutocompleteDropdownService";
import { AddressFormUiService } from "./services/addressFormUi/AddressFormUiService";
import { themes } from "./themes";
import { defineStyles } from "./utils/appUtils";
import { US_AUTOCOMPLETE_PRO_API_URL } from "./constants";

export default class SmartyAddress {
	static defaultConfig: DefaultSmartyAddressConfig = {
		embeddedKey: "",
		theme: themes.default,
		autocompleteApiUrl: US_AUTOCOMPLETE_PRO_API_URL,
	};

	static {
		defineStyles();
	}

	static themes = themes;

	static services = {
		ApiService,
		AutocompleteDropdownService,
		AddressFormUiService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private autocompleteDropdownService: AutocompleteDropdownService;
	private addressFormUiService: AddressFormUiService;

	constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const ApiServiceClass = config.services?.ApiService || ApiService;
		const DropdownServiceClass = config.services?.AutocompleteDropdownService || AutocompleteDropdownService;
		const FormServiceClass = config.services?.AddressFormUiService || AddressFormUiService;

		this.apiService = new ApiServiceClass();
		this.autocompleteDropdownService = new DropdownServiceClass(this.instanceId);
		this.addressFormUiService = new FormServiceClass();

		const services = {
			apiService: this.apiService,
			autocompleteDropdownService: this.autocompleteDropdownService,
			addressFormUiService: this.addressFormUiService,
		};

		this.apiService.setServices(services);
		this.autocompleteDropdownService.setServices(services);
		this.addressFormUiService.setServices(services);

		this.init(config);
	}

	init = async (config: SmartyAddressConfig) => {
		const mergedConfig = {
			...SmartyAddress.defaultConfig,
			...config,
		};

		this.apiService.init(mergedConfig);
		this.autocompleteDropdownService.init(mergedConfig);
		this.addressFormUiService.init(mergedConfig);
	};
}
