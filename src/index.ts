import { DefaultSmartyAddressConfig, SmartyAddressConfig } from "./interfaces";
import { ApiService } from "./services/ApiService";
import { DropdownService } from "./services/DropdownService";
import { FormService } from "./services/FormService";
import { DomService } from "./services/DomService";
import { StyleService } from "./services/StyleService";
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
		DropdownService,
		FormService,
		DomService,
		StyleService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private dropdownService: DropdownService;
	private formService: FormService;
	private domService: DomService;
	private styleService: StyleService;

	constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const ApiServiceClass = config.services?.ApiService || ApiService;
		const DropdownServiceClass = config.services?.DropdownService || DropdownService;
		const FormServiceClass = config.services?.FormService || FormService;
		const DomServiceClass = config.services?.DomService || DomService;
		const StyleServiceClass = config.services?.StyleService || StyleService;

		this.domService = new DomServiceClass();
		this.styleService = new StyleServiceClass();
		this.apiService = new ApiServiceClass();
		this.dropdownService = new DropdownServiceClass(this.instanceId);
		this.formService = new FormServiceClass();

		const services = {
			apiService: this.apiService,
			dropdownService: this.dropdownService,
			formService: this.formService,
			domService: this.domService,
			styleService: this.styleService,
		};

		this.apiService.setServices(services);
		this.dropdownService.setServices(services);
		this.formService.setServices(services);
		this.domService.setServices(services);
		this.styleService.setServices(services);

		this.init(config);
	}

	init = async (config: SmartyAddressConfig) => {
		const mergedConfig = {
			...SmartyAddress.defaultConfig,
			...config,
		};

		validateConfig(mergedConfig);

		this.apiService.init(mergedConfig);
		this.dropdownService.init(mergedConfig);
		this.formService.init(mergedConfig);
	};
}
