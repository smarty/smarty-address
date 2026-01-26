import {
	DefaultSmartyAddressConfig,
	SmartyAddressConfig,
	NormalizedSmartyAddressConfig,
} from "./interfaces";
import { normalizeConfig } from "./utils/configNormalizer";
import { ApiService } from "./services/ApiService";
import { ColorService } from "./services/ColorService";
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
		ColorService,
		DropdownService,
		FormService,
		FormatService,
		DomService,
		StyleService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private colorService: ColorService;
	private dropdownService: DropdownService;
	private formService: FormService;
	private formatService: FormatService;
	private domService: DomService;
	private styleService: StyleService;

	static async create(config: SmartyAddressConfig): Promise<SmartyAddress> {
		const instance = new SmartyAddress(config);
		await instance.init(config);
		return instance;
	}

	private constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const ApiServiceClass = config.services?.ApiService || ApiService;
		const ColorServiceClass = config.services?.ColorService || ColorService;
		const DropdownServiceClass = config.services?.DropdownService || DropdownService;
		const FormServiceClass = config.services?.FormService || FormService;
		const FormatServiceClass = config.services?.FormatService || FormatService;
		const DomServiceClass = config.services?.DomService || DomService;
		const StyleServiceClass = config.services?.StyleService || StyleService;

		this.colorService = new ColorServiceClass();
		this.domService = new DomServiceClass();
		this.styleService = new StyleServiceClass();
		this.formatService = new FormatServiceClass();
		this.apiService = new ApiServiceClass();
		this.dropdownService = new DropdownServiceClass(this.instanceId);
		this.formService = new FormServiceClass();

		const services = {
			apiService: this.apiService,
			colorService: this.colorService,
			dropdownService: this.dropdownService,
			formService: this.formService,
			formatService: this.formatService,
			domService: this.domService,
			styleService: this.styleService,
		};

		Object.values(services).forEach((service) => service.setServices(services));
	}

	private init = async (config: SmartyAddressConfig): Promise<void> => {
		const normalizedConfig = normalizeConfig(config);
		const mergedConfig: NormalizedSmartyAddressConfig = {
			...SmartyAddress.defaultConfig,
			...normalizedConfig,
		};

		validateConfig(mergedConfig);

		this.apiService.init(mergedConfig);
		this.dropdownService.init(mergedConfig);
		this.formService.init(mergedConfig);
	};

	destroy(): void {
		this.apiService.destroy();
		this.colorService.destroy();
		this.dropdownService.destroy();
		this.formService.destroy();
		this.formatService.destroy();
		this.domService.destroy();
		this.styleService.destroy();

		const index = SmartyAddress.instances.indexOf(this);
		if (index > -1) {
			SmartyAddress.instances.splice(index, 1);
		}
	}
}
