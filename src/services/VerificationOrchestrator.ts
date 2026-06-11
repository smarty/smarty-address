import { BaseService } from "./BaseService";
import type {
	AutocompleteSuggestion,
	NormalizedSmartyAddressConfig,
	VerificationTrigger,
} from "../interfaces";

// Wires verification triggers to the DOM (ERD §5.6). Kept separate from
// VerificationService so the service stays a pure verify/classify/dispatch unit
// and listener lifecycle lives in one place.
export class VerificationOrchestrator extends BaseService {
	private triggers: VerificationTrigger[] = [];
	private staleness: "invalidate" | "revalidate" = "invalidate";
	private testMode = false;
	private watchedSelectors: string[] = [];
	private cleanups: Array<() => void> = [];

	init(config: NormalizedSmartyAddressConfig) {
		const verificationService = this.getService("verificationService");
		this.triggers = verificationService.getEffectiveConfig().trigger;
		this.staleness = verificationService.getEffectiveConfig().staleness;
		this.testMode = config._testMode ?? false;
		this.watchedSelectors = [
			config.streetSelector,
			config.secondarySelector,
			config.localitySelector,
			config.administrativeAreaSelector,
			config.postalCodeSelector,
		].filter((selector): selector is string => !!selector);

		if (this.triggers.includes("selection")) this.wireSelection();
		if (this.triggers.includes("blur")) this.wireBlur();
		this.wireStaleness();
	}

	destroy() {
		this.cleanups.forEach((cleanup) => cleanup());
		this.cleanups = [];
		this.getService("formService").setOnPopulated(null);
	}

	private wireSelection(): void {
		const verificationService = this.getService("verificationService");
		this.getService("formService").setOnPopulated((address: AutocompleteSuggestion) => {
			void verificationService.verifyFromSuggestion(address, "selection");
		});
	}

	private wireBlur(): void {
		const verificationService = this.getService("verificationService");
		this.forEachWatchedElement((element) => {
			const handler = () => {
				if (verificationService.isApplyingCorrection()) return;
				if (!this.addressLooksComplete()) return;
				void verificationService.verifyCurrent("blur");
			};
			element.addEventListener("blur", handler, true);
			this.cleanups.push(() => element.removeEventListener("blur", handler, true));
		});
	}

	// Invalidate-on-edit staleness (ERD §5.6, Q9). Only user-initiated edits
	// count — programmatic corrections dispatch untrusted events.
	private wireStaleness(): void {
		if (this.staleness !== "invalidate") return;
		const verificationService = this.getService("verificationService");
		this.forEachWatchedElement((element) => {
			const handler = (event: Event) => {
				if (verificationService.isApplyingCorrection()) return;
				if (!event.isTrusted && !this.testMode) return;
				verificationService.markStale();
			};
			element.addEventListener("input", handler);
			this.cleanups.push(() => element.removeEventListener("input", handler));
		});
	}

	private forEachWatchedElement(callback: (element: HTMLElement) => void): void {
		const domService = this.getService("domService");
		this.watchedSelectors.forEach((selector) => {
			const element = domService.findDomElement(selector);
			if (element) callback(element);
		});
	}

	private addressLooksComplete(): boolean {
		const verificationService = this.getService("verificationService");
		const country = verificationService.resolveCountry();
		const address = this.getService("formService").readCurrentAddress(country);
		const hasStreet = !!address.street.trim();
		const hasRegion =
			!!address.postalCode.trim() ||
			(!!address.locality.trim() && !!address.administrativeArea.trim());
		return hasStreet && hasRegion;
	}
}
