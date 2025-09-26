export const getResourceUrl = (pathFromRoot:string) => {
	const relativePath = `../..${pathFromRoot}`;
	return new URL(relativePath, import.meta.url);
};