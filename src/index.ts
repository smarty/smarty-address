import {
	DefaultSmartyAddressConfig,
	SmartyAddressConfig,
	NormalizedSmartyAddressConfig,
	CurrentAddress,
	VerificationResult,
} from "./interfaces";
import { normalizeConfig } from "./utils/configNormalizer";
import { ApiService } from "./services/ApiService";
import { ColorService } from "./services/ColorService";
import { DropdownService } from "./services/DropdownService";
import { DropdownStateService } from "./services/DropdownStateService";
import { FormService } from "./services/FormService";
import { FormatService } from "./services/FormatService";
import { DomService } from "./services/DomService";
import { KeyboardNavigationService } from "./services/KeyboardNavigationService";
import { StyleService } from "./services/StyleService";
import { VerificationService } from "./services/VerificationService";
import { VerificationUiService } from "./services/VerificationUiService";
import { VerificationOrchestrator } from "./services/VerificationOrchestrator";
import { themes } from "./themes";
import {
	defineStyles,
	isAutocompleteEnabled,
	isVerificationEnabled,
	validateConfig,
} from "./utils/appUtils";
import { INTERNATIONAL_AUTOCOMPLETE_API_URL, US_AUTOCOMPLETE_PRO_API_URL } from "./constants";

export default class SmartyAddress {
	static defaultConfig: DefaultSmartyAddressConfig = {
		embeddedKey: "",
		theme: themes.default,
		autocompleteApiUrl: US_AUTOCOMPLETE_PRO_API_URL,
		internationalAutocompleteApiUrl: INTERNATIONAL_AUTOCOMPLETE_API_URL,
	};

	static {
		if (typeof document !== "undefined") {
			defineStyles();
		}
	}

	static themes = themes;

	static services = {
		ApiService,
		ColorService,
		DropdownService,
		DropdownStateService,
		FormService,
		FormatService,
		DomService,
		KeyboardNavigationService,
		StyleService,
		VerificationService,
		VerificationUiService,
	};

	private static instances: SmartyAddress[] = [];
	private instanceId: number;

	private apiService: ApiService;
	private colorService: ColorService;
	private dropdownService: DropdownService;
	private dropdownStateService: DropdownStateService;
	private formService: FormService;
	private formatService: FormatService;
	private domService: DomService;
	private keyboardNavigationService: KeyboardNavigationService;
	private styleService: StyleService;
	private verificationService: VerificationService;
	private verificationUiService: VerificationUiService;
	private verificationOrchestrator: VerificationOrchestrator;

	private verificationActive = false;

	static async create(config: SmartyAddressConfig): Promise<SmartyAddress> {
		const instance = new SmartyAddress(config);
		await instance.init(config);
		return instance;
	}

	private constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;

		const svc = { ...SmartyAddress.services, ...config.services };

		this.colorService = new svc.ColorService();
		this.domService = new svc.DomService();
		this.styleService = new svc.StyleService();
		this.formatService = new svc.FormatService();
		this.apiService = new svc.ApiService();
		this.dropdownStateService = new svc.DropdownStateService();
		this.keyboardNavigationService = new svc.KeyboardNavigationService();
		this.dropdownService = new svc.DropdownService(this.instanceId);
		this.formService = new svc.FormService();
		this.verificationService = new svc.VerificationService();
		this.verificationUiService = new svc.VerificationUiService();
		this.verificationOrchestrator = new VerificationOrchestrator();

		const services = {
			apiService: this.apiService,
			colorService: this.colorService,
			dropdownService: this.dropdownService,
			dropdownStateService: this.dropdownStateService,
			formService: this.formService,
			formatService: this.formatService,
			domService: this.domService,
			keyboardNavigationService: this.keyboardNavigationService,
			styleService: this.styleService,
			verificationService: this.verificationService,
			verificationUiService: this.verificationUiService,
			verificationOrchestrator: this.verificationOrchestrator,
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

		const autocompleteOn = isAutocompleteEnabled(mergedConfig);
		const verificationOn = isVerificationEnabled(mergedConfig);

		// Neither mode on → the plugin no-ops (PRD §4). validateConfig already warned.
		if (!autocompleteOn && !verificationOn) return;

		// FormService is shared: autocomplete populates through it and verification
		// reads/round-trips corrections through it.
		this.formService.init(mergedConfig);

		if (autocompleteOn) {
			this.apiService.init(mergedConfig);
			this.dropdownService.init(mergedConfig);
		}

		if (verificationOn) {
			this.verificationActive = true;
			this.verificationUiService.init(mergedConfig);
			this.verificationService.init(mergedConfig);
			this.verificationOrchestrator.init(mergedConfig);
		}
	};

	// Manual / standalone verification entry point (PRD §8, ERD §5.1).
	async verify(
		address?: CurrentAddress | Partial<CurrentAddress>,
	): Promise<VerificationResult | null> {
		if (!this.verificationActive) {
			console.warn("SmartyAddress: verify() called but verification is not enabled.");
			return null;
		}
		return this.verificationService.verify(address);
	}

	// Await-able pre-submit gate (Epic 3, ERD §6). Call this in your submit
	// handler: `if (!(await smartyAddress.verifyBeforeSubmit())) return;`.
	async verifyBeforeSubmit(): Promise<boolean> {
		if (!this.verificationActive) return true;
		return this.verificationService.verifyBeforeSubmit();
	}

	destroy(): void {
		this.apiService.destroy();
		this.colorService.destroy();
		this.dropdownService.destroy();
		this.dropdownStateService.destroy();
		this.formService.destroy();
		this.formatService.destroy();
		this.domService.destroy();
		this.keyboardNavigationService.destroy();
		this.styleService.destroy();
		this.verificationOrchestrator.destroy();
		this.verificationService.destroy();
		this.verificationUiService.destroy();

		const index = SmartyAddress.instances.indexOf(this);
		if (index > -1) {
			SmartyAddress.instances.splice(index, 1);
		}
	}
}
