import { DefaultSmartyAddressConfig, SmartyAddressConfig } from "./interfaces";
import { apiService } from "./services/api/ApiService";
import { autocompleteDropdownService } from "./services/autocompleteDropdown/AutocompleteDropdownService";
import { addressFormUiService } from "./services/addressFormUi/AddressFormUiService";
import { initService } from "./utils/serviceFactory";
import { themes } from "./themes";
import { defineStyles } from "./utils/appUtils";
import { US_AUTOCOMPLETE_PRO_API_URL } from "./constants";
// TODO: Update readme
// TODO: Add ability to destroy an instance of SmartyAddress (and remove all associated elements from DOM)
// TODO: Make styles dynamically configurable (e.g. what if I want to change the theme dynamically after the page has loaded?)
// TODO: Update code to use international names for address fields, variable names, etc. (e.g. postal code instead of zipcode)
// TODO: Add "backoff" for autocomplete results (add config option to make this customizable)
// TODO: Add config option for "min characters" before api request is sent
// TODO: Log autocomplete api calls for copy/paste scenarios (maybe just compare the length of the string to the previous search instead of watching the paste event). This can use the user-agent param in the query string.

export default class SmartyAddress {
	static defaultConfig: DefaultSmartyAddressConfig = {
		embeddedKey: "",
		theme: themes.default,
		services: {
			autocompleteDropdownService,
			addressFormUiService,
			apiService,
		},
		autocompleteApiUrl: US_AUTOCOMPLETE_PRO_API_URL,
	};
	static {
		defineStyles();
	}
	static themes = themes;
	static services = SmartyAddress.defaultConfig.services;

	private static instances: SmartyAddress[] = [];
	private instanceId;

	// TODO: update "config" type/interface to be more specific
	// TODO: Verify config is valid before setting up services
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
	};

	setupServices = (config: SmartyAddressConfig) => {
		Object.entries(config.services).forEach(([name, serviceDefinition]) => {
			const serviceHandlers = initService(name, serviceDefinition, this.instanceId);
			if (serviceHandlers.init) {
				serviceHandlers.init(config);
			}
		});
	};
}
