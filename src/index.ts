import {ServiceDefinitionMap, SmartyAddressConfig} from "./interfaces.ts";
import {uiServiceDefinition} from "./services/UiService.ts";
import {apiServiceDefinition} from "./services/ApiService.ts";
import {EventDispatcher} from "./utils/EventDispatcher.ts";
import {defineService} from "./utils/serviceFactory.ts";
import {themes} from "./themes.ts";

export class SmartyAddress {
	static defaultServiceDefinitions:ServiceDefinitionMap = {
		uiServiceDefinition,
		apiServiceDefinition,
	};

	static themes = themes;

	private eventDispatcher = new EventDispatcher();
	private serviceDefinitions = SmartyAddress.defaultServiceDefinitions;

	constructor(config: SmartyAddressConfig) {
		this.setup(config);
	}

	setup = (config: SmartyAddressConfig) => {
		this.setupServices(config.services);
		this.eventDispatcher.dispatch("SmartyAddress_receivedSmartyAddressConfig", config);
	}

	setupServices = (services:ServiceDefinitionMap = {}) => {
		Object.entries(services)?.forEach(([name, serviceDefinition]) => {
			this.serviceDefinitions[name] = serviceDefinition;
		});
		Object.entries(this.serviceDefinitions).forEach(([, serviceDefinition]) => {
			defineService(serviceDefinition, this.eventDispatcher);
		});
	}
}
