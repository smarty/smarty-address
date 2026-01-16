import type { ApiService } from "./api/ApiService";
import type { AutocompleteDropdownService } from "./autocompleteDropdown/AutocompleteDropdownService";
import type { AddressFormUiService } from "./addressFormUi/AddressFormUiService";
import type { DropdownStateService } from "./autocompleteDropdown/DropdownStateService";
import type { DropdownDomService } from "./autocompleteDropdown/DropdownDomService";

export interface ServiceDependencies {
	apiService?: ApiService;
	autocompleteDropdownService?: AutocompleteDropdownService;
	addressFormUiService?: AddressFormUiService;
	dropdownStateService?: DropdownStateService;
	dropdownDomService?: DropdownDomService;
}

export abstract class BaseService {
	protected services: ServiceDependencies = {};

	setServices(services: ServiceDependencies) {
		this.services = services;
	}
}
