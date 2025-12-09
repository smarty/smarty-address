import {
	DefaultSmartyAddressConfig,
	SmartyAddressConfig
} from "./interfaces";
import {apiService} from "./services/ApiService";
import {EventDispatcher} from "./utils/EventDispatcher";
import {initService} from "./utils/serviceFactory";
import {themes} from "./themes";
import {defineStyles} from "./utils/appUtils";
import {AUTOCOMPLETE_API_URL} from "./constants";
import {autocompleteUiService} from "./services/AutocompleteUiService";
import {addressFormUiService} from "./services/AddressFormUiService";
// TODO: Update readme
// TODO: Update tsconfig.json (borrow from storefront-2)
// TODO: Add ability to destroy an instance of SmartyAddress (and remove all associated elements from DOM)
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
// TODO: Handle populating select lists (e.g. for "state")

export default class SmartyAddress {
	static defaultConfig:DefaultSmartyAddressConfig = {
		theme: themes.default,
		services: {
			autocompleteUiService,
			addressFormUiService,
			apiService,
		},
		autocompleteApiUrl: AUTOCOMPLETE_API_URL,
	};
	static {
		defineStyles();
	}

	private static instances:SmartyAddress[] = [];

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
		};
		this.setupServices(config);
		this.eventDispatcher.dispatch("SmartyAddress_receivedSmartyAddressConfig", config);
	}

	setupServices = (config:SmartyAddressConfig) => {
		Object.entries(config.services).forEach(([name, serviceDefinition]) => {
			const serviceMethods = initService(name, serviceDefinition, this.eventDispatcher, this.instanceId);
			if (serviceMethods.init) {
				serviceMethods.init(config);
			}
		});
	}
}
