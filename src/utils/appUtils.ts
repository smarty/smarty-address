import { themeStyles } from "../../assets/styles/theme";
import { baseStyles } from "../../assets/styles/base";
import { colorStyles } from "../../assets/styles/colors";
import { miscStyles } from "../../assets/styles/misc";
import { spacingStyles } from "../../assets/styles/spacing";
import { StyleService } from "../services/StyleService";
import { NormalizedSmartyAddressConfig } from "../interfaces";

export class ConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SmartyAddressConfigError";
	}
}

export const isAutocompleteEnabled = (config: NormalizedSmartyAddressConfig): boolean =>
	config.autocomplete?.enabled ?? true;

export const isVerificationEnabled = (config: NormalizedSmartyAddressConfig): boolean =>
	config.verification?.enabled ?? true;

// Behaviors / surfaces not yet shipped in the current release. Each list shrinks
// as the corresponding epic lands (ERD §3.1 validation guard). Verification
// config that requests an unbuilt capability gets a clear warning rather than a
// silent no-op.
const UNSUPPORTED_BEHAVIORS: string[] = ["block"]; // lifted in Epic 3
const UNSUPPORTED_UI: string[] = []; // panel shipped in Epic 2
const UNSUPPORTED_RESULT_KEYS: string[] = []; // ambiguous shipped in Epic 2

export const validateConfig = (config: NormalizedSmartyAddressConfig): void => {
	const autocompleteOn = isAutocompleteEnabled(config);
	const verificationOn = isVerificationEnabled(config);

	if (!autocompleteOn && !verificationOn) {
		console.warn(
			"SmartyAddress: neither autocomplete nor verification is enabled; the plugin will not initialize.",
		);
		return;
	}

	const errors: string[] = [];

	const isEmbeddedKeyMissing =
		!config.embeddedKey ||
		typeof config.embeddedKey !== "string" ||
		config.embeddedKey.trim() === "";

	if (isEmbeddedKeyMissing) {
		errors.push("embeddedKey is required");
	}

	const isStreetSelectorMissing =
		!config.streetSelector ||
		typeof config.streetSelector !== "string" ||
		config.streetSelector.trim() === "";

	if (isStreetSelectorMissing) {
		errors.push("streetSelector is required");
	}

	if (errors.length > 0) {
		throw new ConfigValidationError(`SmartyAddress configuration error:\n- ${errors.join("\n- ")}`);
	}

	if (verificationOn) warnUnsupportedVerification(config.verification);
};

const warnUnsupportedVerification = (
	verification: NormalizedSmartyAddressConfig["verification"],
): void => {
	if (!verification) return;

	const warn = (message: string) =>
		console.warn(
			`SmartyAddress: ${message} is not yet supported in this version and will be ignored.`,
		);

	if (verification.ui && UNSUPPORTED_UI.includes(verification.ui)) {
		warn(`verification.ui "${verification.ui}"`);
	}

	const onResult = verification.onResult ?? {};
	for (const [resultKey, behavior] of Object.entries(onResult)) {
		if (UNSUPPORTED_RESULT_KEYS.includes(resultKey)) {
			warn(`verification.onResult.${resultKey}`);
		}
		if (behavior && UNSUPPORTED_BEHAVIORS.includes(behavior)) {
			warn(`verification behavior "${behavior}"`);
		}
	}
};

export const defineStyles = () => {
	const allStyles = {
		...baseStyles,
		...colorStyles,
		...miscStyles,
		...spacingStyles,
		...themeStyles,
	};
	const cssStylesBlock = StyleService.convertStylesObjectToCssBlock(allStyles);
	return addStylesheetToDom(cssStylesBlock);
};

const addStylesheetToDom = (stylesString: string) => {
	if (!stylesString || typeof document == "undefined") return;

	const headElement = document.head || document.getElementsByTagName("head")[0];
	const styleElement = document.createElement("style");

	if (headElement.firstChild) {
		headElement.insertBefore(styleElement, headElement.firstChild);
	} else {
		headElement.appendChild(styleElement);
	}

	styleElement.appendChild(document.createTextNode(stylesString));

	return styleElement;
};
