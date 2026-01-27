export const SELECTOR_ALIASES: Record<string, string> = {
	streetSelector: "streetSelector",
	secondarySelector: "secondarySelector",
	localitySelector: "localitySelector",
	administrativeAreaSelector: "administrativeAreaSelector",
	postalCodeSelector: "postalCodeSelector",

	citySelector: "localitySelector",
	stateSelector: "administrativeAreaSelector",
	zipcodeSelector: "postalCodeSelector",

	regionSelector: "administrativeAreaSelector",
	provinceSelector: "administrativeAreaSelector",
	postcodeSelector: "postalCodeSelector",
	zipSelector: "postalCodeSelector",
};

export const API_FILTER_ALIASES: Record<string, string> = {
	includeOnlyCities: "includeOnlyLocalities",
	includeOnlyLocalities: "includeOnlyLocalities",

	includeOnlyStates: "includeOnlyAdministrativeAreas",
	includeOnlyAdministrativeAreas: "includeOnlyAdministrativeAreas",
	includeOnlyRegions: "includeOnlyAdministrativeAreas",
	includeOnlyProvinces: "includeOnlyAdministrativeAreas",

	includeOnlyZipCodes: "includeOnlyPostalCodes",
	includeOnlyPostalCodes: "includeOnlyPostalCodes",
	includeOnlyZipcodes: "includeOnlyPostalCodes",
	includeOnlyPostcodes: "includeOnlyPostalCodes",

	excludeStates: "excludeAdministrativeAreas",
	excludeAdministrativeAreas: "excludeAdministrativeAreas",
	excludeRegions: "excludeAdministrativeAreas",
	excludeProvinces: "excludeAdministrativeAreas",

	preferCities: "preferLocalities",
	preferLocalities: "preferLocalities",

	preferStates: "preferAdministrativeAreas",
	preferAdministrativeAreas: "preferAdministrativeAreas",
	preferRegions: "preferAdministrativeAreas",
	preferProvinces: "preferAdministrativeAreas",

	preferZipCodes: "preferPostalCodes",
	preferPostalCodes: "preferPostalCodes",
	preferZipcodes: "preferPostalCodes",
	preferPostcodes: "preferPostalCodes",
};
