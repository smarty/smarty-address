import {DefaultSmartyAddressConfig, ServiceDefinitionMap, SmartyAddressConfig} from "./interfaces.ts";
import {uiService} from "./services/UiService.ts";
import {apiService} from "./services/ApiService.ts";
import {EventDispatcher} from "./utils/EventDispatcher.ts";
import {defineService} from "./utils/serviceFactory.ts";
import {themes} from "./themes.ts";

export class SmartyAddress {
	static defaultServiceDefinitions:ServiceDefinitionMap = {
		uiService,
		apiService,
	};
	static defaultConfigValues:DefaultSmartyAddressConfig = {
		theme: themes.default,
	};

	static themes = themes;
	private static instances:SmartyAddress[] = [];
	private static stylesheetPromise:undefined | Promise<Event>;

	private eventDispatcher = new EventDispatcher();
	private instanceId;

	constructor(config: SmartyAddressConfig) {
		SmartyAddress.instances.push(this);
		this.instanceId = SmartyAddress.instances.length;
		this.init(config);
	}

	init = async (config: SmartyAddressConfig) => {
		config = {...SmartyAddress.defaultConfigValues, ...config};
		this.setupServices(config.services);
		this.loadStylesheet();
		await SmartyAddress.stylesheetPromise;

		this.eventDispatcher.dispatch("SmartyAddress_receivedSmartyAddressConfig", config);
	}

	setupServices = (services:ServiceDefinitionMap = {}) => {
		const serviceDefinitions = {...SmartyAddress.defaultServiceDefinitions, ...services};
		Object.entries(serviceDefinitions).forEach(([, serviceDefinition]) => {
			defineService(serviceDefinition, this.eventDispatcher, this.instanceId);
		});
	}

	loadStylesheet = () => {
		if (this.instanceId === 1) {
			SmartyAddress.stylesheetPromise = new Promise((resolve, reject) => {
				const STYLESHEET_HREF = "/styles/theme.css";

				const head  = document.getElementsByTagName('head')[0];
				const linkElement  = document.createElement('link');
				linkElement.rel  = 'stylesheet';
				linkElement.type = 'text/css';
				linkElement.href = STYLESHEET_HREF;
				linkElement.onload = resolve;
				linkElement.onerror = reject;
				head.appendChild(linkElement);
			});
		}
	}
}

