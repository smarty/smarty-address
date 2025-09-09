export const themes: {[index: string]:string[]} = {
	light: [
		"smartyAddress__base_default",
		"smartyAddress__color_light",
		"smartyAddress__font_size_medium",
		"smartyAddress__spacing_large",
	],
	dark: [
		"smartyAddress__base_default",
		"smartyAddress__color_dark",
		"smartyAddress__font_size_medium",
		"smartyAddress__spacing_large",
	],
	none: [],
};

themes.default = themes.light;