import type { SmartyAddressConfig } from "../interfaces";
import type { ApiService } from "./api/ApiService";
import type { AutocompleteDropdownService } from "./autocompleteDropdown/AutocompleteDropdownService";
import type { AddressFormUiService } from "./addressFormUi/AddressFormUiService";
import type { DropdownStateService } from "./autocompleteDropdown/DropdownStateService";
import type { DropdownDomService } from "./autocompleteDropdown/DropdownDomService";
import type { DomUtilsService } from "./utils/DomUtilsService";
import type { FormattingService } from "./utils/FormattingService";
import type { ApiUtilsService } from "./utils/ApiUtilsService";

export interface ServiceDependencies {
	apiService?: ApiService;
	autocompleteDropdownService?: AutocompleteDropdownService;
	addressFormUiService?: AddressFormUiService;
	dropdownStateService?: DropdownStateService;
	dropdownDomService?: DropdownDomService;
	domUtilsService?: DomUtilsService;
	formattingService?: FormattingService;
	apiUtilsService?: ApiUtilsService;
}

export abstract class BaseService {
	protected services: ServiceDependencies = {};

	setServices(services: ServiceDependencies) {
		this.services = services;
	}

	init(_config?: SmartyAddressConfig) {
		// Default no-op, override in subclasses that need initialization
	}
}
