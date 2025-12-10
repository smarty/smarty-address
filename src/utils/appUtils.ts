import { themeStyles } from "../../assets/styles/theme";
import { baseStyles } from "../../assets/styles/base";
import { colorStyles } from "../../assets/styles/colors";
import { miscStyles } from "../../assets/styles/misc";
import { spacingStyles } from "../../assets/styles/spacing";
import { convertStylesObjectToCssBlock } from "./uiUtils";

export const defineStyles = () => {
	const allStyles = {
		...baseStyles,
		...colorStyles,
		...miscStyles,
		...spacingStyles,
		...themeStyles,
	};
	const cssStylesBlock = convertStylesObjectToCssBlock(allStyles);
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
