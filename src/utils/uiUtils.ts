
export const findDomElement = (selector: string | undefined) => {
	const element:HTMLElement|null = selector ? document.querySelector(selector) : null;

	return element;
};

export const createDomElement = (tagName: string, classList?: string[] = [], children:HTMLElement[] = []) => {
	const element = document.createElement(tagName);
	element.classList.add(...classList);
	children.forEach((child) => {
		element.appendChild(child);
	})

	return element;
};

export const formatStyleBlock = (selector:string, styles:{}) => {
	const stylesString = Object.entries(styles).map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${stylesString}\n}`;
};

export const getColorBrightness = (color:string) => {
	const DEFAULT_BRIGHTNESS = 255;
	const match = color.match(/\d+/g);
	if (!match) return DEFAULT_BRIGHTNESS;

	const [r, g, b] = match.map(Number);

	const brightness = (0.299 * r + 0.587 * g + 0.114 * b);

	return brightness;
};

export const getInstanceClassName = (instanceId:number) => {
	return `smartyAddress__instance_${instanceId}`;
};

export const getElementStyles = (element:HTMLElement) => {
	return {
		"color": window.getComputedStyle(element).color,
		"backgroundColor": window.getComputedStyle(element).backgroundColor,
	};
};
