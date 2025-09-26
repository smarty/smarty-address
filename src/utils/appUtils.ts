export const getResourceUrl = (pathFromRoot:string) => {
	const relativePath = `../..${pathFromRoot}`;
	return new URL(relativePath, import.meta.url);
};

export const loadStylesheet = (stylesheetHref:string):Promise<Event> => {
	return new Promise((resolve, reject) => {
		const head  = document.getElementsByTagName('head')[0];
		const linkElement  = document.createElement('link');
		linkElement.rel  = 'stylesheet';
		linkElement.type = 'text/css';
		linkElement.href = stylesheetHref;
		linkElement.onload = resolve;
		// TODO: the onerror event doesn't actually fire (at least, in most cases)
		linkElement.onerror = reject;
		head.appendChild(linkElement);
	});
}