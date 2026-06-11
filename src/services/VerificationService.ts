import { BaseService } from "./BaseService";
import { fetchStreetJson, StreetApiError } from "./http/streetTransport";
import { computeDiff, fingerprint, fromSuggestion } from "../utils/currentAddress";
import {
	defaultVerificationConfig,
	INTERNATIONAL_MIN_VERIFIED_PRECISION,
	INTERNATIONAL_PRECISION_RANK,
	INTERNATIONAL_STREET_API_URL,
	US_CORRECTION_FOOTNOTE_CLASSES,
	US_COUNTRY_CODES,
	US_FLAGGED_FOOTNOTE_CLASS,
	US_STREET_API_URL,
} from "../constants";
import type {
	AutocompleteSuggestion,
	CurrentAddress,
	DeliverabilityCode,
	NormalizedSmartyAddressConfig,
	VerificationBehavior,
	VerificationConfig,
	VerificationDecision,
	VerificationError,
	VerificationResult,
	VerificationResultKey,
	VerificationTrigger,
} from "../interfaces";

interface UsStreetComponents {
	primary_number?: string;
	street_name?: string;
	secondary_number?: string;
	secondary_designator?: string;
	city_name?: string;
	state_abbreviation?: string;
	zipcode?: string;
	plus4_code?: string;
}

interface UsStreetAnalysis {
	dpv_match_code?: string;
	dpv_vacant?: string;
	dpv_no_stat?: string;
	dpv_cmra?: string;
	footnotes?: string;
}

interface UsStreetCandidate {
	delivery_line_1?: string;
	delivery_line_2?: string;
	last_line?: string;
	components?: UsStreetComponents;
	analysis?: UsStreetAnalysis;
}

interface InternationalChanges {
	sub_building?: string;
	[component: string]: string | undefined;
}

interface InternationalAnalysis {
	verification_status?: string;
	address_precision?: string;
	max_address_precision?: string;
	changes?: InternationalChanges;
}

interface InternationalComponents {
	thoroughfare?: string;
	premise?: string;
	sub_building?: string;
	locality?: string;
	administrative_area?: string;
	postal_code?: string;
	country_iso3?: string;
}

interface InternationalStreetCandidate {
	address1?: string;
	address2?: string;
	components?: InternationalComponents;
	analysis?: InternationalAnalysis;
}

const INTL_CORRECTION_CHANGES = ["Verified-SmallChange", "Added"];

const precisionRank = (precision: string | undefined): number => {
	const index = INTERNATIONAL_PRECISION_RANK.indexOf(precision ?? "None");
	return index === -1 ? 0 : index;
};

// Q10 / ERD §5.4 — "verified" means reaching the country's max precision, not a
// hard DeliveryPoint. Compare to the per-response max_address_precision; fall
// back to a fixed minimum when the response omits it.
const reachedCountryMaxPrecision = (analysis: InternationalAnalysis): boolean => {
	if (analysis.max_address_precision) {
		return (
			precisionRank(analysis.address_precision) >= precisionRank(analysis.max_address_precision)
		);
	}
	return (
		precisionRank(analysis.address_precision) >= precisionRank(INTERNATIONAL_MIN_VERIFIED_PRECISION)
	);
};

interface EffectiveVerificationConfig {
	enabled: boolean;
	trigger: VerificationTrigger[];
	onResult: NonNullable<VerificationConfig["onResult"]>;
	ui: NonNullable<VerificationConfig["ui"]>;
	failureMode: NonNullable<VerificationConfig["failureMode"]>;
	fieldLevelHighlighting: boolean;
	staleness: NonNullable<VerificationConfig["staleness"]>;
	correctionPrompt?: VerificationConfig["correctionPrompt"];
	hooks: {
		onVerified?: VerificationConfig["onVerified"];
		onVerificationFailed?: VerificationConfig["onVerificationFailed"];
		onCorrectionOffered?: VerificationConfig["onCorrectionOffered"];
		onBeforeSubmit?: VerificationConfig["onBeforeSubmit"];
	};
}

const TYPE_TO_CODE: Record<VerificationResultKey, DeliverabilityCode> = {
	verified: "deliverable",
	corrected: "deliverable",
	missingSecondary: "deliverable-missing-secondary",
	secondaryNotMatched: "deliverable-bad-secondary",
	flagged: "deliverable-flagged",
	ambiguous: "ambiguous",
	undeliverable: "undeliverable",
	error: "unknown",
};

const NON_BLOCKING_TYPES: VerificationResultKey[] = ["flagged", "undeliverable", "error"];

// Footnotes arrive as a "#"-joined string (e.g. "A#N#R7#"). Split into the set
// of class tokens ("A", "N", "R7", …). ERD §5.4.
export function parseUsFootnotes(footnotes: string | undefined): Set<string> {
	if (!footnotes) return new Set();
	return new Set(
		footnotes
			.split("#")
			.map((token) => token.trim())
			.filter(Boolean),
	);
}

const hasCorrectionFootnote = (footnotes: Set<string>): boolean => {
	for (const token of footnotes) {
		if (US_CORRECTION_FOOTNOTE_CLASSES.includes(token.charAt(0))) return true;
	}
	return false;
};

export class VerificationService extends BaseService {
	private embeddedKey = "";
	private usStreetApiUrl = US_STREET_API_URL;
	private internationalStreetApiUrl = INTERNATIONAL_STREET_API_URL;
	private staticCountry: string | undefined;
	private countrySelector: string | undefined;
	private fetchFn: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args);

	private effective: EffectiveVerificationConfig = this.buildEffectiveConfig({});

	private inFlightFingerprint: string | null = null;
	private verifiedFingerprints = new Set<string>();
	private stale = false;
	private lastResult: VerificationResult | null = null;
	private applyingCorrection = false;

	init(config: NormalizedSmartyAddressConfig) {
		this.embeddedKey = config.embeddedKey;
		const verification = config.verification ?? {};
		this.effective = this.buildEffectiveConfig(verification);
		this.usStreetApiUrl = verification.usStreetApiUrl ?? US_STREET_API_URL;
		this.internationalStreetApiUrl =
			verification.internationalStreetApiUrl ?? INTERNATIONAL_STREET_API_URL;
		this.staticCountry = config.country?.trim() || undefined;
		this.countrySelector = config.countrySelector;
	}

	destroy() {
		this.inFlightFingerprint = null;
		this.verifiedFingerprints.clear();
		this.lastResult = null;
		this.stale = false;
	}

	/** @internal Inject fetch for tests. */
	setFetch(fetchFn: typeof fetch) {
		this.fetchFn = fetchFn;
	}

	getEffectiveConfig(): EffectiveVerificationConfig {
		return this.effective;
	}

	getLastResult(): VerificationResult | null {
		return this.lastResult;
	}

	private buildEffectiveConfig(verification: VerificationConfig): EffectiveVerificationConfig {
		return {
			enabled: verification.enabled ?? defaultVerificationConfig.enabled,
			trigger: verification.trigger ?? defaultVerificationConfig.trigger,
			onResult: { ...defaultVerificationConfig.onResult, ...verification.onResult },
			ui: verification.ui ?? defaultVerificationConfig.ui,
			failureMode: verification.failureMode ?? defaultVerificationConfig.failureMode,
			fieldLevelHighlighting:
				verification.fieldLevelHighlighting ?? defaultVerificationConfig.fieldLevelHighlighting,
			staleness: verification.staleness ?? defaultVerificationConfig.staleness,
			correctionPrompt: verification.correctionPrompt,
			hooks: {
				onVerified: verification.onVerified,
				onVerificationFailed: verification.onVerificationFailed,
				onCorrectionOffered: verification.onCorrectionOffered,
				onBeforeSubmit: verification.onBeforeSubmit,
			},
		};
	}

	resolveCountry(): string {
		if (this.countrySelector) {
			const element = this.getService("domService").findDomElement(this.countrySelector) as
				| HTMLInputElement
				| HTMLSelectElement
				| null;
			const fromSelector = element?.value?.trim();
			if (fromSelector) return fromSelector;
		}
		return this.staticCountry ?? "USA";
	}

	isInternational(country: string): boolean {
		return !!country && !US_COUNTRY_CODES.includes(country.toUpperCase());
	}

	// --- Entry points ------------------------------------------------------

	// Manual / standalone entry (PRD §8). Exposed as smartyAddress.verify().
	async verify(
		address?: CurrentAddress | Partial<CurrentAddress>,
	): Promise<VerificationResult | null> {
		const country = address?.country?.trim() || this.resolveCountry();
		const entered = this.resolveEntered(address, country);
		return this.runFlow(entered, "manual");
	}

	verifyFromSuggestion(
		suggestion: AutocompleteSuggestion,
		trigger: VerificationTrigger,
	): Promise<VerificationResult | null> {
		return this.runFlow(fromSuggestion(suggestion), trigger);
	}

	verifyCurrent(trigger: VerificationTrigger): Promise<VerificationResult | null> {
		const country = this.resolveCountry();
		const entered = this.getService("formService").readCurrentAddress(country);
		return this.runFlow(entered, trigger);
	}

	// Await-able pre-submit gate (Epic 3 / ERD §6). The supported cross-framework
	// blocking path: the integrator awaits this in their own submit handler and
	// gets back `true` (ok to submit) / `false` (block). Verifies the current
	// address, applies the configured block / fail-closed policy, then lets an
	// onBeforeSubmit hook have the final say.
	async verifyBeforeSubmit(): Promise<boolean> {
		const fresh = await this.verifyCurrent("submit");
		const result = fresh ?? this.lastResult;

		let allow = this.resolveSubmitDecision(result);
		const hook = this.effective.hooks.onBeforeSubmit;
		if (hook) {
			const hookAllow = await hook(result ?? null);
			allow = allow && hookAllow !== false;
		}
		return allow;
	}

	private resolveSubmitDecision(result: VerificationResult | null): boolean {
		if (!result) return true;
		if (result.type === "error") return this.effective.failureMode !== "fail-closed";
		return this.behaviorFor(result.type) !== "block";
	}

	private resolveEntered(
		address: CurrentAddress | Partial<CurrentAddress> | undefined,
		country: string,
	): CurrentAddress {
		if (!address) {
			return this.getService("formService").readCurrentAddress(country);
		}
		return {
			street: address.street ?? "",
			secondary: address.secondary ?? "",
			locality: address.locality ?? "",
			administrativeArea: address.administrativeArea ?? "",
			postalCode: address.postalCode ?? "",
			country,
			origin: address.origin ?? "verification",
			...(address.address_id ? { address_id: address.address_id } : {}),
		};
	}

	// --- Core flow ---------------------------------------------------------

	private async runFlow(
		entered: CurrentAddress,
		trigger: VerificationTrigger,
	): Promise<VerificationResult | null> {
		if (this.isEmptyAddress(entered)) return null;

		const country = entered.country;
		const international = this.isInternational(country);

		// International verification ships in Epic 4 (R4). Until then it is a
		// no-op rather than a fake error. See VerificationService Epic 4 branch.
		if (international && !this.internationalEnabled()) {
			console.warn("SmartyAddress: international verification is not available in this release.");
			return null;
		}

		const fp = fingerprint(entered);
		if (fp === this.inFlightFingerprint) return null;
		if (!this.stale && this.verifiedFingerprints.has(fp)) return null;

		this.inFlightFingerprint = fp;
		let result: VerificationResult;
		try {
			const raw = international
				? await this.fetchInternational(entered)
				: await this.fetchUs(entered);
			result = this.classify(raw, entered);
		} catch (error) {
			this.inFlightFingerprint = null;
			return this.handleError(error, entered, international);
		}
		this.inFlightFingerprint = null;

		this.recordVerified(entered, result);
		await this.dispatch(result, trigger);
		return result;
	}

	private recordVerified(entered: CurrentAddress, result: VerificationResult): void {
		this.lastResult = result;
		this.stale = false;
		this.verifiedFingerprints = new Set([fingerprint(entered)]);
		if (result.corrected) this.verifiedFingerprints.add(fingerprint(result.corrected));
	}

	protected internationalEnabled(): boolean {
		return true;
	}

	private isEmptyAddress(address: CurrentAddress): boolean {
		return !address.street?.trim() && !address.postalCode?.trim() && !address.locality?.trim();
	}

	// --- US request + classification --------------------------------------

	private async fetchUs(entered: CurrentAddress): Promise<UsStreetCandidate[]> {
		const params: Record<string, string> = {
			key: this.embeddedKey,
			candidates: "10",
			match: "enhanced",
		};
		if (entered.street) params.street = entered.street;
		if (entered.secondary) params.secondary = entered.secondary;
		if (entered.locality) params.city = entered.locality;
		if (entered.administrativeArea) params.state = entered.administrativeArea;
		if (entered.postalCode) params.zipcode = entered.postalCode;

		return fetchStreetJson<UsStreetCandidate[]>(this.usStreetApiUrl, params, this.fetchFn);
	}

	// International ordering (ERD §5.3): in "both" mode the autocomplete detail
	// fetch has already populated full components into the CurrentAddress before
	// this runs, so verify always has complete components to send.
	protected async fetchInternational(
		entered: CurrentAddress,
	): Promise<InternationalStreetCandidate[]> {
		const params: Record<string, string> = {
			key: this.embeddedKey,
			country: entered.country,
		};
		if (entered.street) params.address1 = entered.street;
		if (entered.secondary) params.address2 = entered.secondary;
		if (entered.locality) params.locality = entered.locality;
		if (entered.administrativeArea) params.administrative_area = entered.administrativeArea;
		if (entered.postalCode) params.postal_code = entered.postalCode;

		return fetchStreetJson<InternationalStreetCandidate[]>(
			this.internationalStreetApiUrl,
			params,
			this.fetchFn,
		);
	}

	classify(raw: unknown, entered: CurrentAddress): VerificationResult {
		if (entered.country && this.isInternational(entered.country)) {
			return this.classifyInternational(raw, entered);
		}
		return this.classifyUs((raw as UsStreetCandidate[]) ?? [], entered);
	}

	private classifyUs(candidates: UsStreetCandidate[], entered: CurrentAddress): VerificationResult {
		const first = candidates[0];
		if (!first) return this.makeResult("undeliverable", entered, null, null, "us");

		const analysis = first.analysis ?? {};
		const dpv = (analysis.dpv_match_code ?? "").toUpperCase();
		const footnotes = parseUsFootnotes(analysis.footnotes);
		const deliverable = ["Y", "S", "D"].includes(dpv);
		const corrected = this.usCandidateToAddress(first, entered);
		const diff = computeDiff(entered, corrected);

		if (dpv === "N") return this.makeResult("undeliverable", entered, null, null, "us", first);

		const flaggedSignal =
			analysis.dpv_vacant === "Y" ||
			analysis.dpv_no_stat === "Y" ||
			footnotes.has(US_FLAGGED_FOOTNOTE_CLASS);
		if (deliverable && flaggedSignal) {
			return this.makeResult("flagged", entered, corrected, diff, "us", first);
		}

		if (dpv === "D")
			return this.makeResult("missingSecondary", entered, corrected, diff, "us", first);
		if (dpv === "S")
			return this.makeResult("secondaryNotMatched", entered, corrected, diff, "us", first);

		if (candidates.length > 1) {
			const candidateAddresses = candidates.map((candidate) =>
				this.usCandidateToAddress(candidate, entered),
			);
			const result = this.makeResult("ambiguous", entered, null, null, "us", candidates);
			result.candidates = candidateAddresses;
			return result;
		}

		if (deliverable && hasCorrectionFootnote(footnotes)) {
			return this.makeResult("corrected", entered, corrected, diff, "us", first);
		}

		if (dpv === "Y" && !diff) {
			return this.makeResult("verified", entered, corrected, null, "us", first);
		}
		if (dpv === "Y") {
			// Y with component differences we didn't footnote-detect: still corrected.
			return this.makeResult("corrected", entered, corrected, diff, "us", first);
		}

		return this.makeResult("undeliverable", entered, null, null, "us", first);
	}

	// International branch (ERD §5.4). Same VerificationResultKey outputs as US;
	// only the input signals differ. Type 5 (flagged) is USPS-specific and never
	// fires here.
	protected classifyInternational(raw: unknown, entered: CurrentAddress): VerificationResult {
		const candidates = (raw as InternationalStreetCandidate[]) ?? [];
		const first = candidates[0];
		if (!first) return this.makeResult("undeliverable", entered, null, null, "international");

		const analysis = first.analysis ?? {};
		const status = analysis.verification_status ?? "";
		const corrected = this.intlCandidateToAddress(first, entered);
		const diff = computeDiff(entered, corrected);

		if (status === "None" || analysis.address_precision === "None") {
			return this.makeResult("undeliverable", entered, null, null, "international", first);
		}

		if (status === "Ambiguous" || candidates.length > 1) {
			const candidateAddresses = candidates.map((candidate) =>
				this.intlCandidateToAddress(candidate, entered),
			);
			const result = this.makeResult("ambiguous", entered, null, null, "international", candidates);
			result.candidates = candidateAddresses;
			return result;
		}

		const changes = analysis.changes ?? {};
		if (changes.sub_building === "Unrecognized") {
			return this.makeResult(
				"secondaryNotMatched",
				entered,
				corrected,
				diff,
				"international",
				first,
			);
		}

		const subBuildingAbsent = !corrected.secondary && !changes.sub_building;
		if (status === "Partial" && analysis.address_precision === "Premise" && subBuildingAbsent) {
			return this.makeResult("missingSecondary", entered, corrected, diff, "international", first);
		}

		if (status === "Verified") {
			const hasCorrection = Object.values(changes).some((change) =>
				INTL_CORRECTION_CHANGES.includes(change ?? ""),
			);
			if (hasCorrection || diff) {
				return this.makeResult("corrected", entered, corrected, diff, "international", first);
			}
			if (reachedCountryMaxPrecision(analysis)) {
				return this.makeResult("verified", entered, corrected, null, "international", first);
			}
			// Verified status but below the country's max precision — treat as
			// missing detail rather than verified (Q10 boundary).
			return this.makeResult("missingSecondary", entered, corrected, diff, "international", first);
		}

		return this.makeResult("undeliverable", entered, null, null, "international", first);
	}

	private intlCandidateToAddress(
		candidate: InternationalStreetCandidate,
		entered: CurrentAddress,
	): CurrentAddress {
		const components = candidate.components ?? {};
		return {
			street: candidate.address1 ?? components.thoroughfare ?? entered.street,
			secondary: components.sub_building ?? "",
			locality: components.locality ?? entered.locality,
			administrativeArea: components.administrative_area ?? entered.administrativeArea,
			postalCode: components.postal_code ?? entered.postalCode,
			country: components.country_iso3 ?? entered.country,
			origin: "verification",
		};
	}

	private usCandidateToAddress(
		candidate: UsStreetCandidate,
		entered: CurrentAddress,
	): CurrentAddress {
		const components = candidate.components ?? {};
		const zip = components.zipcode ?? "";
		const plus4 = components.plus4_code ?? "";
		const postalCode = zip && plus4 ? `${zip}-${plus4}` : zip || entered.postalCode;
		const secondary = [components.secondary_designator, components.secondary_number]
			.filter(Boolean)
			.join(" ");

		return {
			street: candidate.delivery_line_1 ?? entered.street,
			secondary: secondary || (candidate.delivery_line_2 ?? ""),
			locality: components.city_name ?? entered.locality,
			administrativeArea: components.state_abbreviation ?? entered.administrativeArea,
			postalCode,
			country: entered.country,
			origin: "verification",
		};
	}

	private makeResult(
		type: VerificationResultKey,
		entered: CurrentAddress,
		corrected: CurrentAddress | null,
		diff: VerificationResult["diff"],
		source: "us" | "international",
		raw: unknown = null,
	): VerificationResult {
		return {
			type,
			code: TYPE_TO_CODE[type],
			entered,
			corrected,
			diff,
			nonBlocking: NON_BLOCKING_TYPES.includes(type),
			raw,
			source,
		};
	}

	// --- Dispatch ----------------------------------------------------------

	behaviorFor(type: VerificationResultKey): VerificationBehavior {
		return this.effective.onResult[type] ?? defaultVerificationConfig.onResult[type] ?? "ignore";
	}

	private async dispatch(result: VerificationResult, _trigger: VerificationTrigger): Promise<void> {
		const behavior = this.behaviorFor(result.type);
		this.applyBehavior(result, behavior);

		const offersCorrection = (
			[
				"corrected",
				"missingSecondary",
				"secondaryNotMatched",
				"ambiguous",
			] as VerificationResultKey[]
		).includes(result.type);

		// A customer hook returning a decision overrides the built-in UI (ERD §7).
		if (behavior === "prompt" && offersCorrection && this.effective.hooks.onCorrectionOffered) {
			const decision = await this.effective.hooks.onCorrectionOffered(
				result.diff ?? { changes: {}, changedFields: [] },
				result,
			);
			if (decision) {
				this.applyDecision(decision, result);
				await this.effective.hooks.onVerified?.(result);
				return;
			}
		}

		this.renderResult(result, behavior);
		await this.effective.hooks.onVerified?.(result);
	}

	private renderResult(result: VerificationResult, behavior: VerificationBehavior): void {
		const ui = this.getService("verificationUiService");
		const isChooser =
			result.type === "ambiguous" && behavior === "prompt" && !!result.candidates?.length;
		if (isChooser) {
			ui.renderChooser(result, this.effective, (chosen) => this.applyToForm(chosen));
			return;
		}
		ui.render(result, behavior, this.effective);
	}

	private applyBehavior(result: VerificationResult, behavior: VerificationBehavior): void {
		if (behavior === "ignore" || behavior === "block") return;

		if (behavior === "apply-primary" && result.corrected) {
			this.applyToForm({ ...result.corrected, secondary: result.entered.secondary });
			return;
		}

		const firstCandidate = result.candidates?.[0];
		if (behavior === "first-candidate" && firstCandidate) {
			this.applyToForm(firstCandidate);
			return;
		}

		const applies = ["silent", "apply-and-notify", "prompt", "warn"].includes(behavior);
		if (applies && result.corrected) {
			this.applyToForm(result.corrected);
		}
	}

	private applyDecision(decision: VerificationDecision, result: VerificationResult): void {
		if (decision.action === "reject") return;
		if (decision.action === "choose" && decision.chosen) {
			this.applyToForm(decision.chosen);
			return;
		}
		if (decision.action === "accept" && result.corrected) {
			this.applyToForm(result.corrected);
		}
	}

	private applyToForm(address: CurrentAddress): void {
		this.applyingCorrection = true;
		try {
			this.getService("formService").populateFormWithCurrentAddress(address);
		} finally {
			this.applyingCorrection = false;
		}
	}

	private async handleError(
		error: unknown,
		entered: CurrentAddress,
		international: boolean,
	): Promise<VerificationResult> {
		const failureMode = this.effective.failureMode;
		const verificationError: VerificationError = {
			kind: error instanceof StreetApiError ? error.kind : "unknown",
			message: error instanceof Error ? error.message : String(error),
			failureMode,
			cause: error,
		};

		const result = this.makeResult(
			"error",
			entered,
			null,
			null,
			international ? "international" : "us",
			error,
		);
		result.nonBlocking = failureMode === "fail-open";
		this.lastResult = result;

		this.getService("verificationUiService").render(result, "ignore", this.effective);
		await this.effective.hooks.onVerificationFailed?.(verificationError);
		return result;
	}

	// --- Staleness ---------------------------------------------------------

	isStale(address: CurrentAddress): boolean {
		return this.stale || !this.verifiedFingerprints.has(fingerprint(address));
	}

	isApplyingCorrection(): boolean {
		return this.applyingCorrection;
	}

	markStale(): void {
		if (this.verifiedFingerprints.size === 0) return;
		this.stale = true;
		this.verifiedFingerprints.clear();
		this.getService("verificationUiService").clear();
	}
}
