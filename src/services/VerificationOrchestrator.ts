import { BaseService } from "./BaseService";
import { REVALIDATE_DEBOUNCE_MS } from "../constants";
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
	private revalidateTimer: ReturnType<typeof setTimeout> | null = null;

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
		// Native interception attaches when the submit trigger is configured OR
		// when any configured behavior can block (ERD §6: "when a real <form> is
		// present and block is configured") — a block override must not silently
		// fail to block just because the default triggers were kept.
		if (this.triggers.includes("submit") || this.blockingConfigured()) this.wireSubmit();
		this.wireStaleness();
	}

	destroy() {
		this.cleanups.forEach((cleanup) => cleanup());
		this.cleanups = [];
		if (this.revalidateTimer) clearTimeout(this.revalidateTimer);
		this.revalidateTimer = null;
		this.getService("formService").setOnPopulated(null);
	}

	private blockingConfigured(): boolean {
		const effective = this.getService("verificationService").getEffectiveConfig();
		return (
			Object.values(effective.onResult).includes("block") || effective.failureMode === "fail-closed"
		);
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

	// Best-effort native interception for a real <form> (ERD §6). The supported
	// path is the await-able verifyBeforeSubmit(); this is a convenience for
	// vanilla <form> hosts. SPA / non-form hosts must call the method directly.
	private wireSubmit(): void {
		const form = this.findForm();
		if (!form) return;

		const verificationService = this.getService("verificationService");
		let resubmitting = false;
		const handler = async (event: Event) => {
			if (resubmitting) return;
			event.preventDefault();
			const allow = await verificationService.verifyBeforeSubmit();
			if (!allow) return;
			// The re-submission MUST be deferred to a macrotask: a fast verify
			// resolves in a microtask checkpoint *between listeners of the original
			// submit event*, and the HTML form-submission algorithm silently ignores
			// a nested requestSubmit on a form whose submit event is still
			// dispatching — the submission would be lost. The flag is reset in the
			// finally, not in the re-entrant handler, because requestSubmit may fire
			// no event at all (constraint validation) — a stuck flag would skip the
			// gate on the next genuine submit.
			resubmitting = true;
			setTimeout(() => {
				try {
					if (typeof form.requestSubmit === "function") form.requestSubmit();
					else form.submit();
				} finally {
					resubmitting = false;
				}
			}, 0);
		};
		form.addEventListener("submit", handler, true);
		this.cleanups.push(() => form.removeEventListener("submit", handler, true));
	}

	private findForm(): HTMLFormElement | null {
		const street = this.watchedSelectors[0];
		if (!street) return null;
		const element = this.getService("domService").findDomElement(street);
		return element?.closest("form") ?? null;
	}

	// Staleness on edit (ERD §5.6, Q9). Only user-initiated edits count —
	// programmatic corrections dispatch untrusted events. "invalidate" (default)
	// clears the verified state and waits for the next configured trigger;
	// "revalidate" additionally re-verifies after the user pauses typing.
	private wireStaleness(): void {
		const verificationService = this.getService("verificationService");
		const revalidates = this.staleness === "revalidate";
		this.forEachWatchedElement((element) => {
			const handler = (event: Event) => {
				if (verificationService.isApplyingCorrection()) return;
				if (!event.isTrusted && !this.testMode) return;
				verificationService.markStale();
				if (revalidates) this.scheduleRevalidate();
			};
			element.addEventListener("input", handler);
			this.cleanups.push(() => element.removeEventListener("input", handler));
		});
	}

	// Debounced so revalidation never spends a billable call per keystroke —
	// the exact risk the ERD flags for silent re-triggering.
	private scheduleRevalidate(): void {
		if (this.revalidateTimer) clearTimeout(this.revalidateTimer);
		this.revalidateTimer = setTimeout(() => {
			this.revalidateTimer = null;
			if (!this.addressLooksComplete()) return;
			void this.getService("verificationService").verifyCurrent("blur");
		}, REVALIDATE_DEBOUNCE_MS);
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
		// A single-field integration carries the whole address in the street
		// input, so requiring separate region fields would leave the blur
		// trigger permanently dead there (PRD §4 mode 2).
		const isSingleFieldForm = this.watchedSelectors.length === 1;
		if (isSingleFieldForm) return hasStreet;
		const hasRegion =
			!!address.postalCode.trim() ||
			(!!address.locality.trim() && !!address.administrativeArea.trim());
		return hasStreet && hasRegion;
	}
}
