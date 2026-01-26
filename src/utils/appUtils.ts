import { themeStyles } from "../../assets/styles/theme";
import { baseStyles } from "../../assets/styles/base";
import { colorStyles } from "../../assets/styles/colors";
import { miscStyles } from "../../assets/styles/misc";
import { spacingStyles } from "../../assets/styles/spacing";
import { StyleService } from "../services/StyleService";
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
