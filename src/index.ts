import {
	DefaultSmartyAddressConfig,
	PrivateSmartyAddressConfig,
	ServiceDefinitionMap,
	SmartyAddressConfig
} from "./interfaces";
import {uiService} from "./services/UiService";
import {apiService} from "./services/ApiService";
import {EventDispatcher} from "./utils/EventDispatcher";
import {initService} from "./utils/serviceFactory";
import {themes} from "./themes";
import {getResourceUrl, loadStylesheet} from "./utils/appUtils";
import {AUTOCOMPLETE_API_URL, SMARTY_LOGO_DARK_URL, SMARTY_LOGO_LIGHT_URL, STYLESHEET_HREF} from "./constants";
// TODO: Update readme
// TODO: Update tsconfig.json (borrow from storefront-2)
// TODO: Add ability to destroy an instance of SmartyAddress (and remove all associated elements from DOM)
// TODO: Upload package to npm
// TODO: Make styles dynamically configurable (e.g. what if I want to change the theme dynamically after the page has loaded?)
// TODO: add `rel="preload" (or similar) to <link> tags (use a service worker?)
// TODO: reference package.json from the SDK and borrow what makes sense
// TODO: Add prettier
// TODO: Add error handling (what does the UI look like?)
// TODO: Add testing
// TODO: Build in accessibility (see https://smartystreets.slack.com/archives/D07C2G81HRD/p1758644912463549)
// TODO: Update code to use international names for address fields, variable names, etc. (e.g. postal code instead of zipcode)
// TODO: Add "backoff" for autocomplete results (add config option to make this customizable)
// TODO: Add config option for "min characters" before api request is sent
// TODO: Add ShadCdn to test site (see https://ui.shadcn.com/)

export default class SmartyAddress {
	static defaultConfig:DefaultSmartyAddressConfig = {
		theme: themes.default,
		services: {
			uiService,
			apiService,
		},
		autocompleteApiUrl: AUTOCOMPLETE_API_URL,
	};

	private static privateConfig:PrivateSmartyAddressConfig = {
		// TODO: Why aren't these actual URLs? (the contents of the file are just directly embedded)
		smartyLogoDark: getResourceUrl(SMARTY_LOGO_DARK_URL).href,
		smartyLogoLight: getResourceUrl(SMARTY_LOGO_LIGHT_URL).href,
	};

	static themes = themes;
	private static instances:SmartyAddress[] = [];
	private static stylesheetPromise:undefined | Promise<Event> = loadStylesheet(getResourceUrl(STYLESHEET_HREF).href);

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
		config = {
			...SmartyAddress.defaultConfig,
			...config,
			...SmartyAddress.privateConfig
		};
		this.setupServices(config.services);
		await SmartyAddress.stylesheetPromise;
		this.eventDispatcher.dispatch("SmartyAddress_receivedSmartyAddressConfig", config);
	}

	setupServices = (services:ServiceDefinitionMap = {}) => {
		Object.entries(services).forEach(([, serviceDefinition]) => {
			initService(serviceDefinition, this.eventDispatcher, this.instanceId);
		});
	}
}
