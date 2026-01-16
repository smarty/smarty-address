import type { ApiService } from "./api/ApiService";
import type { AutocompleteDropdownService } from "./autocompleteDropdown/AutocompleteDropdownService";
import type { AddressFormUiService } from "./addressFormUi/AddressFormUiService";

export interface ServiceDependencies {
	apiService?: ApiService;
	autocompleteDropdownService?: AutocompleteDropdownService;
	addressFormUiService?: AddressFormUiService;
}

export abstract class BaseService {
	protected services: ServiceDependencies = {};

	setServices(services: ServiceDependencies) {
		this.services = services;
	}
}
