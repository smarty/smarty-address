import type { SmartyAddressConfig } from "../interfaces";
import type { ApiService } from "./ApiService";
import type { DropdownService } from "./DropdownService";
import type { FormService } from "./FormService";
import type { DomService } from "./DomService";
import type { StyleService } from "./StyleService";

export interface ServiceDependencies {
	apiService?: ApiService;
	dropdownService?: DropdownService;
	formService?: FormService;
	domService?: DomService;
	styleService?: StyleService;
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
