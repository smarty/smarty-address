import themeStyles from '../../assets/styles/theme.css';

export const getResourceUrl = (pathFromRoot:string) => {
	const relativePath = `../..${pathFromRoot}`;
	return new URL(relativePath, import.meta.url);
};

export const loadStylesheet = ():Promise<void> => {
	return new Promise((resolve) => {
		addStylesheetToDom(themeStyles);
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