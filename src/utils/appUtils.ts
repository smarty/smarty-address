import {themeStyles} from '../../assets/styles/theme';
import {baseStyles} from '../../assets/styles/base';
import {colorStyles} from '../../assets/styles/colors';
import {miscStyles} from '../../assets/styles/misc';
import {spacingStyles} from '../../assets/styles/spacing';
import {convertStylesObjectToCssBlock} from "./uiUtils";

export const loadStylesheet = ():Promise<void> => {
	return new Promise((resolve) => {
		addStylesheetToDom(convertStylesObjectToCssBlock(baseStyles));
		addStylesheetToDom(convertStylesObjectToCssBlock(colorStyles));
		addStylesheetToDom(convertStylesObjectToCssBlock(miscStyles));
		addStylesheetToDom(convertStylesObjectToCssBlock(spacingStyles));
		addStylesheetToDom(convertStylesObjectToCssBlock(themeStyles));
		resolve();
	});
};

const addStylesheetToDom = (stylesString:string) => {
	if (!stylesString || typeof document == "undefined") return;

	const headElement = document.head || document.getElementsByTagName("head")[0];
	const styleElement = document.createElement("style");

	if (headElement.firstChild) {
		headElement.insertBefore(styleElement, headElement.firstChild);
	} else {
		headElement.appendChild(styleElement);
	}

	styleElement.appendChild(document.createTextNode(stylesString));
};