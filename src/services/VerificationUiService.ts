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
	private announcer: HTMLElement | null = null;
	private badge: HTMLElement | null = null;

	init(config: NormalizedSmartyAddressConfig) {
		this.streetSelector = config.streetSelector ?? null;
	}

	destroy() {
		this.removeBadge();
		this.announcer?.remove();
		this.announcer = null;
	}

	render(result: VerificationResult, _behavior: VerificationBehavior, config: UiConfig): void {
		const surface = config.ui ?? "badge";
		const meta = RESULT_TYPE_META[result.type];
		const message = this.buildMessage(result);

		// Type 8 (error) is always aria-only / silent regardless of `ui` (ERD §8.1).
		if (result.type === "error") {
			this.removeBadge();
			if (surface !== "none") this.announce(message);
			return;
		}

		if (surface === "none") return;

		this.announce(message);
		if (surface === "aria-only") {
			this.removeBadge();
			return;
		}

		// `badge` (and `panel` until Epic 2 lands its richer surface) render the cue.
		this.renderBadge(meta.badge, meta.tone);
	}

	clear(): void {
		this.removeBadge();
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
		const anchor = this.getAnchor();
		if (!anchor) return;

		const domService = this.getService("domService");
		this.removeBadge();
		const badge = domService.createDomElement("span", [
			CSS_CLASSES.verifyVars,
			CSS_CLASSES.verifyBadge,
			TONE_CLASS[tone],
		]);
		badge.setAttribute("role", "status");
		badge.textContent = label;
		anchor.insertAdjacentElement("afterend", badge);
		this.badge = badge;
	}

	private removeBadge(): void {
		this.badge?.remove();
		this.badge = null;
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
