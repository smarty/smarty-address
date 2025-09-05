
export const findDomElement = (selector: string | undefined) => {
	const element:HTMLElement|null = selector ? document.querySelector(selector) : null;

	return element;
};