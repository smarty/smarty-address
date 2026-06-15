import { BaseService } from "./BaseService";
import { CSS_CLASSES } from "../constants/cssClasses";
import { RESULT_TYPE_META, ResultTone } from "../constants/resultTypeMeta";
import type {
	CurrentAddress,
	NormalizedSmartyAddressConfig,
	VerificationBehavior,
	VerificationResult,
} from "../interfaces";

interface UiConfig {
	ui: NonNullable<NormalizedSmartyAddressConfig["verification"]>["ui"];
}

const TONE_CLASS: Record<ResultTone, string> = {
	positive: CSS_CLASSES.verifyBadgePositive,
	warning: CSS_CLASSES.verifyBadgeWarning,
	negative: CSS_CLASSES.verifyBadgeNegative,
};

// Optional UI surfaces for verification (ERD §8). Follows DropdownService's
// DOM-creation + announce() aria-live pattern; themed entirely via CSS
// variables. Each surface is swappable without touching classification.
export class VerificationUiService extends BaseService {
	private streetSelector: string | null = null;
	private themeClasses: string[] = [];
	private announcer: HTMLElement | null = null;
	private surface: HTMLElement | null = null;
	private chooser: HTMLElement | null = null;

	init(config: NormalizedSmartyAddressConfig) {
		this.streetSelector = config.streetSelector ?? null;
		this.themeClasses = config.theme ?? [];
	}

	// Verify surfaces sit outside the dropdown wrapper, so the configured theme
	// classes are carried on each surface directly — themes restyle verification
	// the same way they restyle the dropdown (ERD §8.2). The verify_default
	// class supplies fallback values for every variable.
	private surfaceClasses(...classes: string[]): string[] {
		return [CSS_CLASSES.verifyVars, ...this.themeClasses, ...classes];
	}

	destroy() {
		this.clear();
		this.announcer?.remove();
		this.announcer = null;
	}

	render(result: VerificationResult, _behavior: VerificationBehavior, config: UiConfig): void {
		const surface = config.ui ?? "badge";
		const meta = RESULT_TYPE_META[result.type];
		const message = this.buildMessage(result);

		// Type 8 (error) is always aria-only / silent regardless of `ui` (ERD §8.1).
		if (result.type === "error") {
			this.clear();
			if (surface !== "none") this.announce(message);
			return;
		}

		if (surface === "none") return;

		this.announce(message);
		if (surface === "aria-only") {
			this.clear();
			return;
		}

		if (surface === "panel") {
			this.renderPanel(message, meta.tone);
			return;
		}

		this.renderBadge(meta.badge, meta.tone);
	}

	// Ambiguous (Type 6) chooser — a lightweight candidate picker that works with
	// no dropdown infrastructure (the verification-only fallback, Q4 / ERD §8.1).
	renderChooser(
		result: VerificationResult,
		config: UiConfig,
		onChoose: (chosen: CurrentAddress) => void,
	): void {
		const surface = config.ui ?? "badge";
		if (surface === "none") return;

		this.announce(RESULT_TYPE_META.ambiguous.message);
		if (surface === "aria-only") {
			this.clear();
			return;
		}

		this.clear();
		const candidates = result.candidates ?? [];
		const anchor = this.getAnchor();
		if (!anchor || candidates.length === 0) return;

		const domService = this.getService("domService");
		const chooser = domService.createDomElement(
			"div",
			this.surfaceClasses(CSS_CLASSES.verifyPanel, CSS_CLASSES.verifyChooser),
		);
		chooser.setAttribute("role", "listbox");

		const heading = domService.createDomElement("div", [CSS_CLASSES.verifyPanelMessage]);
		heading.textContent = RESULT_TYPE_META.ambiguous.message;
		chooser.appendChild(heading);

		candidates.forEach((candidate) => {
			const option = domService.createDomElement("button", [CSS_CLASSES.verifyChooserOption]);
			option.setAttribute("type", "button");
			option.setAttribute("role", "option");
			option.textContent = this.formatAddress(candidate);
			option.addEventListener("click", () => {
				onChoose(candidate);
				this.clear();
			});
			chooser.appendChild(option);
		});

		anchor.insertAdjacentElement("afterend", chooser);
		this.chooser = chooser;
	}

	clear(): void {
		this.surface?.remove();
		this.surface = null;
		this.chooser?.remove();
		this.chooser = null;
	}

	private buildMessage(result: VerificationResult): string {
		const base = RESULT_TYPE_META[result.type].message;
		const showsCorrection = result.type === "corrected" && result.corrected;
		if (showsCorrection) return `${base} ${this.formatAddress(result.corrected!)}`;
		return base;
	}

	protected formatAddress(address: CurrentAddress): string {
		const line1 = [address.street, address.secondary].filter(Boolean).join(", ");
		const line2 = [address.locality, address.administrativeArea].filter(Boolean).join(", ");
		return [line1, `${line2} ${address.postalCode}`.trim()].filter(Boolean).join(" · ");
	}

	private renderBadge(label: string, tone: ResultTone): void {
		this.clear();
		const anchor = this.getAnchor();
		if (!anchor) return;

		const domService = this.getService("domService");
		const badge = domService.createDomElement(
			"span",
			this.surfaceClasses(CSS_CLASSES.verifyBadge, TONE_CLASS[tone]),
		);
		badge.setAttribute("role", "status");
		badge.textContent = label;
		anchor.insertAdjacentElement("afterend", badge);
		this.surface = badge;
	}

	// Full inline panel (R2 / Epic 2): shows the diff note, secondary prompt, or
	// caution text. Tone-styled; copy comes from the result message.
	private renderPanel(message: string, tone: ResultTone): void {
		this.clear();
		const anchor = this.getAnchor();
		if (!anchor) return;

		const domService = this.getService("domService");
		const panel = domService.createDomElement(
			"div",
			this.surfaceClasses(CSS_CLASSES.verifyPanel, TONE_CLASS[tone]),
		);
		panel.setAttribute("role", "status");
		const text = domService.createDomElement("div", [CSS_CLASSES.verifyPanelMessage]);
		text.textContent = message;
		panel.appendChild(text);
		anchor.insertAdjacentElement("afterend", panel);
		this.surface = panel;
	}

	protected getAnchor(): HTMLElement | null {
		return this.getService("domService").findDomElement(this.streetSelector);
	}

	announce(message: string): void {
		const region = this.ensureAnnouncer();
		if (region) region.textContent = message;
	}

	private ensureAnnouncer(): HTMLElement | null {
		if (this.announcer) return this.announcer;
		if (typeof document === "undefined") return null;

		const announcer = this.getService("domService").createDomElement("div", [CSS_CLASSES.srOnly]);
		announcer.classList.add(CSS_CLASSES.verifyAnnouncer);
		announcer.setAttribute("aria-live", "polite");
		announcer.setAttribute("role", "status");
		document.body.appendChild(announcer);
		this.announcer = announcer;
		return announcer;
	}
}
