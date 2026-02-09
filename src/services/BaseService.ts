import type { SmartyAddressConfig } from "../interfaces";
import type { ApiService } from "./ApiService";
import type { ColorService } from "./ColorService";
import type { DropdownService } from "./DropdownService";
import type { DropdownStateService } from "./DropdownStateService";
import type { FormService } from "./FormService";
import type { FormatService } from "./FormatService";
import type { DomService } from "./DomService";
import type { KeyboardNavigationService } from "./KeyboardNavigationService";
import type { StyleService } from "./StyleService";

export interface ServiceDependencies {
	apiService?: ApiService;
	colorService?: ColorService;
	dropdownService?: DropdownService;
	dropdownStateService?: DropdownStateService;
	formService?: FormService;
	formatService?: FormatService;
	domService?: DomService;
	keyboardNavigationService?: KeyboardNavigationService;
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

	destroy() {
		// Default no-op, override in subclasses that need cleanup
	}

	protected getService<K extends keyof ServiceDependencies>(
		name: K,
	): NonNullable<ServiceDependencies[K]> {
		const service = this.services[name];
		if (!service) throw new Error(`${String(name)} not initialized`);
		return service as NonNullable<ServiceDependencies[K]>;
	}
}
