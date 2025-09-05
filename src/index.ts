import {SmartyAddressConfig} from "./interfaces.ts";
import {UiService} from "./services/UiService.ts";
import {ApiService} from "./services/ApiService.ts";
import {EventDispatcher} from "./utils/EventDispatcher.ts";

export class SmartyAddress {
	static defaultServices: {} = {
		UiService,
		ApiService,
	};

	private eventDispatcher:EventDispatcher | undefined;
	private services:{} = SmartyAddress.defaultServices;

	constructor(config: SmartyAddressConfig) {
		this.setup(config);
	}

	setup = (config: SmartyAddressConfig) => {
		this.eventDispatcher = new EventDispatcher();
		this.setupServices(config.services);
		this.eventDispatcher.dispatch("SmartyAddress.receivedSmartyAddressConfig", config);
	}

	setupServices = (services = {}) => {
		Object.entries(services)?.forEach(([name, service]) => {
			this.services[name] = service;
		});
		Object.entries(this.services).forEach(([, service]) => {
			const overrides = {};
			service(this.eventDispatcher, overrides);
		});
	}
}
