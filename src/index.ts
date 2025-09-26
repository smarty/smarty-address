import {DefaultSmartyAddressConfig, ServiceDefinitionMap, SmartyAddressConfig} from "./interfaces.ts";
import {uiService} from "./services/UiService.ts";
import {apiService} from "./services/ApiService.ts";
import {EventDispatcher} from "./utils/EventDispatcher.ts";
import {initService} from "./utils/serviceFactory.ts";
import {themes} from "./themes.ts";
import {getResourceUrl} from "./utils/appUtils.ts";
// TODO: Update readme
// TODO: Update tsconfig.json (borrow from storefront-2)
// TODO: Add ability to destroy an instance of SmartyAddress (and remove all associated elements from DOM)
// TODO: Upload package to npm
// TODO: Figure out what to name the plugin
// TODO: Make styles dynamically configurable (e.g. what if I want to change the theme dynamically after the page has loaded?)
// TODO: add `rel="preload" (or similar) to <link> tags (use a service worker?)
// TODO: reference package.json from the SDK and borrow what makes sense
// TODO: Add prettier
// TODO: Add error handling (what does the UI look like?)
// TODO: Add testing
// TODO: Build in accessibility (see https://smartystreets.slack.com/archives/D07C2G81HRD/p1758644912463549)

const SMARTY_LOGO_DARK_URL = "/assets/img/smarty-logo-blue.svg";
const SMARTY_LOGO_LIGHT_URL = "/assets/img/smarty-logo-white.svg";
const STYLESHEET_HREF = "/assets/styles/theme.css";

export default class SmartyAddress {
	static defaultServiceDefinitions:ServiceDefinitionMap = {
		uiService,
		apiService,
	};
	static defaultConfigValues:DefaultSmartyAddressConfig = {
		theme: themes.default,
		// TODO: Why aren't these actual URLs? (the contents of the file are just directly embedded)
		smartyLogoDark: getResourceUrl(SMARTY_LOGO_DARK_URL).href,
		smartyLogoLight: getResourceUrl(SMARTY_LOGO_LIGHT_URL).href,
	};

	static themes = themes;
	private static instances:SmartyAddress[] = [];
	private static stylesheetPromise:undefined | Promise<Event>;

	private eventDispatcher = new EventDispatcher();
	private instanceId;

	// TODO: update "config" type/interface to be more specific
	// TODO: Verify config is valid before setting up services or dispatching events
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
			initService(serviceDefinition, this.eventDispatcher, this.instanceId);
		});
	}

	loadStylesheet = () => {
		if (this.instanceId === 1) {
			SmartyAddress.stylesheetPromise = new Promise((resolve, reject) => {
				const stylesUrl = getResourceUrl(STYLESHEET_HREF);
				const head  = document.getElementsByTagName('head')[0];
				const linkElement  = document.createElement('link');
				linkElement.rel  = 'stylesheet';
				linkElement.type = 'text/css';
				linkElement.href = stylesUrl.href;
				linkElement.onload = resolve;
				// TODO: the onerror event doesn't actually fire (at least, in most cases)
				linkElement.onerror = reject;
				head.appendChild(linkElement);
			});
		}
	}
}
