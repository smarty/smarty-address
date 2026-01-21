import { DefaultSmartyAddressConfig, SmartyAddressConfig } from "./interfaces";
import { ApiService } from "./services/api/ApiService";
import { AutocompleteDropdownService } from "./services/autocompleteDropdown/AutocompleteDropdownService";
import { AddressFormUiService } from "./services/addressFormUi/AddressFormUiService";
import { DropdownStateService } from "./services/autocompleteDropdown/DropdownStateService";
import { DropdownDomService } from "./services/autocompleteDropdown/DropdownDomService";
import { DomUtilsService } from "./services/utils/DomUtilsService";
import { FormattingService } from "./services/utils/FormattingService";
import { ApiUtilsService } from "./services/utils/ApiUtilsService";
import { themes } from "./themes";
import { defineStyles } from "./utils/appUtils";
import { validateConfig } from "./utils/configValidation";
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
		DropdownStateService,
		DropdownDomService,
		DomUtilsService,
		FormattingService,
		ApiUtilsService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private autocompleteDropdownService: AutocompleteDropdownService;
	private addressFormUiService: AddressFormUiService;
	private dropdownStateService: DropdownStateService;
	private dropdownDomService: DropdownDomService;
	private domUtilsService: DomUtilsService;
	private formattingService: FormattingService;
	private apiUtilsService: ApiUtilsService;

	constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const ApiServiceClass = config.services?.ApiService || ApiService;
		const DropdownServiceClass =
			config.services?.AutocompleteDropdownService || AutocompleteDropdownService;
		const FormServiceClass = config.services?.AddressFormUiService || AddressFormUiService;
		const DropdownStateServiceClass = config.services?.DropdownStateService || DropdownStateService;
		const DropdownDomServiceClass = config.services?.DropdownDomService || DropdownDomService;
		const DomUtilsServiceClass = config.services?.DomUtilsService || DomUtilsService;
		const FormattingServiceClass = config.services?.FormattingService || FormattingService;
		const ApiUtilsServiceClass = config.services?.ApiUtilsService || ApiUtilsService;

		this.domUtilsService = new DomUtilsServiceClass(this.instanceId);
		this.formattingService = new FormattingServiceClass();
		this.apiUtilsService = new ApiUtilsServiceClass();
		this.apiService = new ApiServiceClass();
		this.dropdownStateService = new DropdownStateServiceClass();
		this.dropdownDomService = new DropdownDomServiceClass(this.instanceId);
		this.autocompleteDropdownService = new DropdownServiceClass(this.instanceId);
		this.addressFormUiService = new FormServiceClass();

		const services = {
			apiService: this.apiService,
			autocompleteDropdownService: this.autocompleteDropdownService,
			addressFormUiService: this.addressFormUiService,
			dropdownStateService: this.dropdownStateService,
			dropdownDomService: this.dropdownDomService,
			domUtilsService: this.domUtilsService,
			formattingService: this.formattingService,
			apiUtilsService: this.apiUtilsService,
		};

		this.apiService.setServices(services);
		this.autocompleteDropdownService.setServices(services);
		this.addressFormUiService.setServices(services);
		this.dropdownStateService.setServices(services);
		this.dropdownDomService.setServices(services);
		this.domUtilsService.setServices(services);
		this.formattingService.setServices(services);
		this.apiUtilsService.setServices(services);

		this.init(config);
	}

	init = async (config: SmartyAddressConfig) => {
		const mergedConfig = {
			...SmartyAddress.defaultConfig,
			...config,
		};

		validateConfig(mergedConfig);

		this.apiService.init(mergedConfig);
		this.dropdownDomService.init(mergedConfig);
		this.autocompleteDropdownService.init(mergedConfig);
		this.addressFormUiService.init(mergedConfig);
	};
}
