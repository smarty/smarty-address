import { SmartyAddressConfig } from "../interfaces";

export class ConfigValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SmartyAddressConfigError";
	}
}

export const validateConfig = (config: SmartyAddressConfig): void => {
	const errors: string[] = [];

	if (
		!config.embeddedKey ||
		typeof config.embeddedKey !== "string" ||
		config.embeddedKey.trim() === ""
	) {
		errors.push("embeddedKey is required");
	}

	if (
		!config.streetSelector ||
		typeof config.streetSelector !== "string" ||
		config.streetSelector.trim() === ""
	) {
		errors.push("streetSelector is required");
	}

	if (errors.length > 0) {
		throw new ConfigValidationError(`SmartyAddress configuration error:\n- ${errors.join("\n- ")}`);
	}
};
