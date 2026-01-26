import { DefaultSmartyAddressConfig, SmartyAddressConfig } from "./interfaces";
import { ApiService } from "./services/ApiService";
import { DropdownService } from "./services/DropdownService";
import { FormService } from "./services/FormService";
import { FormatService } from "./services/FormatService";
import { DomService } from "./services/DomService";
import { StyleService } from "./services/StyleService";
import { themes } from "./themes";
import { defineStyles, validateConfig } from "./utils/appUtils";
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
		FormatService,
		DomService,
		StyleService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private dropdownService: DropdownService;
	private formService: FormService;
	private formatService: FormatService;
	private domService: DomService;
	private styleService: StyleService;

	constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const ApiServiceClass = config.services?.ApiService || ApiService;
		const DropdownServiceClass = config.services?.DropdownService || DropdownService;
		const FormServiceClass = config.services?.FormService || FormService;
		const FormatServiceClass = config.services?.FormatService || FormatService;
		const DomServiceClass = config.services?.DomService || DomService;
		const StyleServiceClass = config.services?.StyleService || StyleService;

		this.domService = new DomServiceClass();
		this.styleService = new StyleServiceClass();
		this.formatService = new FormatServiceClass();
		this.apiService = new ApiServiceClass();
		this.dropdownService = new DropdownServiceClass(this.instanceId);
		this.formService = new FormServiceClass();

		const services = {
			apiService: this.apiService,
			dropdownService: this.dropdownService,
			formService: this.formService,
			formatService: this.formatService,
			domService: this.domService,
			styleService: this.styleService,
		};

		Object.values(services).forEach((service) => service.setServices(services));

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
