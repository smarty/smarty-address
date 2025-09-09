
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