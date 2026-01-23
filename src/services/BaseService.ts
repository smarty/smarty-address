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

	protected get apiService(): ApiService {
		if (!this.services.apiService) throw new Error("ApiService not initialized");
		return this.services.apiService;
	}

	protected get dropdownService(): DropdownService {
		if (!this.services.dropdownService) throw new Error("DropdownService not initialized");
		return this.services.dropdownService;
	}

	protected get formService(): FormService {
		if (!this.services.formService) throw new Error("FormService not initialized");
		return this.services.formService;
	}

	protected get domService(): DomService {
		if (!this.services.domService) throw new Error("DomService not initialized");
		return this.services.domService;
	}

	protected get styleService(): StyleService {
		if (!this.services.styleService) throw new Error("StyleService not initialized");
		return this.services.styleService;
	}
}
