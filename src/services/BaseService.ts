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

	protected get apiService(): ApiService {
		if (!this.services.apiService) throw new Error("ApiService not initialized");
		return this.services.apiService;
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

	protected get formatService(): FormatService {
		if (!this.services.formatService) throw new Error("FormatService not initialized");
		return this.services.formatService;
	}

	protected get colorService(): ColorService {
		if (!this.services.colorService) throw new Error("ColorService not initialized");
		return this.services.colorService;
	}

	protected get dropdownStateService(): DropdownStateService {
		if (!this.services.dropdownStateService)
			throw new Error("DropdownStateService not initialized");
		return this.services.dropdownStateService;
	}

	protected get keyboardNavigationService(): KeyboardNavigationService {
		if (!this.services.keyboardNavigationService)
			throw new Error("KeyboardNavigationService not initialized");
		return this.services.keyboardNavigationService;
	}
}
