import { normalizeConfig } from "./configNormalizer";
import { SmartyAddressConfig } from "../interfaces";

describe("configNormalizer", () => {
	const baseConfig: SmartyAddressConfig = {
		embeddedKey: "test-key",
		searchInputSelector: "#search",
		theme: [],
		autocompleteApiUrl: "https://api.example.com",
	};

	describe("selector aliases", () => {
		it("should pass through canonical selector names unchanged", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				streetSelector: "#street",
				secondarySelector: "#secondary",
				localitySelector: "#city",
				administrativeAreaSelector: "#state",
				postalCodeSelector: "#zip",
			};

			const normalized = normalizeConfig(config);

			expect(normalized.streetSelector).toBe("#street");
			expect(normalized.secondarySelector).toBe("#secondary");
			expect(normalized.localitySelector).toBe("#city");
			expect(normalized.administrativeAreaSelector).toBe("#state");
			expect(normalized.postalCodeSelector).toBe("#zip");
		});

		it("should normalize US legacy selector names to canonical names", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				streetSelector: "#street",
				citySelector: "#city",
				stateSelector: "#state",
				zipcodeSelector: "#zip",
			};

			const normalized = normalizeConfig(config);

			expect(normalized.streetSelector).toBe("#street");
			expect(normalized.localitySelector).toBe("#city");
			expect(normalized.administrativeAreaSelector).toBe("#state");
			expect(normalized.postalCodeSelector).toBe("#zip");
			expect((normalized as any).citySelector).toBeUndefined();
			expect((normalized as any).stateSelector).toBeUndefined();
			expect((normalized as any).zipcodeSelector).toBeUndefined();
		});

		it("should normalize regional selector aliases", () => {
			const configWithProvince: SmartyAddressConfig = {
				...baseConfig,
				provinceSelector: "#province",
			};

			const configWithRegion: SmartyAddressConfig = {
				...baseConfig,
				regionSelector: "#region",
			};

			const configWithPostcode: SmartyAddressConfig = {
				...baseConfig,
				postcodeSelector: "#postcode",
			};

			const configWithZip: SmartyAddressConfig = {
				...baseConfig,
				zipSelector: "#zip",
			};

			expect(normalizeConfig(configWithProvince).administrativeAreaSelector).toBe("#province");
			expect(normalizeConfig(configWithRegion).administrativeAreaSelector).toBe("#region");
			expect(normalizeConfig(configWithPostcode).postalCodeSelector).toBe("#postcode");
			expect(normalizeConfig(configWithZip).postalCodeSelector).toBe("#zip");
		});

		it("should prefer canonical names when both canonical and alias are provided", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				localitySelector: "#canonical-city",
				citySelector: "#legacy-city",
				administrativeAreaSelector: "#canonical-state",
				stateSelector: "#legacy-state",
			};

			const normalized = normalizeConfig(config);

			expect(normalized.localitySelector).toBe("#canonical-city");
			expect(normalized.administrativeAreaSelector).toBe("#canonical-state");
		});
	});

	describe("API filter aliases", () => {
		it("should pass through canonical API filter names unchanged", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				includeOnlyLocalities: ["Denver", "Boulder"],
				includeOnlyAdministrativeAreas: ["CO", "CA"],
				includeOnlyPostalCodes: ["80202", "80203"],
				preferLocalities: ["Denver"],
				preferAdministrativeAreas: ["CO"],
				preferPostalCodes: ["80202"],
			};

			const normalized = normalizeConfig(config);

			expect(normalized.includeOnlyLocalities).toEqual(["Denver", "Boulder"]);
			expect(normalized.includeOnlyAdministrativeAreas).toEqual(["CO", "CA"]);
			expect(normalized.includeOnlyPostalCodes).toEqual(["80202", "80203"]);
			expect(normalized.preferLocalities).toEqual(["Denver"]);
			expect(normalized.preferAdministrativeAreas).toEqual(["CO"]);
			expect(normalized.preferPostalCodes).toEqual(["80202"]);
		});

		it("should normalize US legacy API filter names to canonical names", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				includeOnlyCities: ["Denver", "Boulder"],
				includeOnlyStates: ["CO", "CA"],
				includeOnlyZipCodes: ["80202", "80203"],
				excludeStates: ["TX"],
				preferCities: ["Denver"],
				preferStates: ["CO"],
				preferZipCodes: ["80202"],
			};

			const normalized = normalizeConfig(config);

			expect(normalized.includeOnlyLocalities).toEqual(["Denver", "Boulder"]);
			expect(normalized.includeOnlyAdministrativeAreas).toEqual(["CO", "CA"]);
			expect(normalized.includeOnlyPostalCodes).toEqual(["80202", "80203"]);
			expect(normalized.excludeAdministrativeAreas).toEqual(["TX"]);
			expect(normalized.preferLocalities).toEqual(["Denver"]);
			expect(normalized.preferAdministrativeAreas).toEqual(["CO"]);
			expect(normalized.preferPostalCodes).toEqual(["80202"]);
		});

		it("should prefer canonical API filter names when both are provided", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				includeOnlyLocalities: ["Denver"],
				includeOnlyCities: ["Boulder"],
			};

			const normalized = normalizeConfig(config);

			expect(normalized.includeOnlyLocalities).toEqual(["Denver"]);
		});
	});

	describe("non-alias config options", () => {
		it("should pass through non-aliased config options unchanged", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				maxResults: 10,
				preferRatio: 0.5,
				preferGeolocation: "ip",
				source: "all",
			};

			const normalized = normalizeConfig(config);

			expect(normalized.maxResults).toBe(10);
			expect(normalized.preferRatio).toBe(0.5);
			expect(normalized.preferGeolocation).toBe("ip");
			expect(normalized.source).toBe("all");
		});

		it("should preserve callback functions", () => {
			const onAddressSelected = jest.fn();
			const onAutocompleteSuggestionsReceived = jest.fn();
			const onDropdownOpen = jest.fn();
			const onDropdownClose = jest.fn();

			const config: SmartyAddressConfig = {
				...baseConfig,
				onAddressSelected,
				onAutocompleteSuggestionsReceived,
				onDropdownOpen,
				onDropdownClose,
			};

			const normalized = normalizeConfig(config);

			expect(normalized.onAddressSelected).toBe(onAddressSelected);
			expect(normalized.onAutocompleteSuggestionsReceived).toBe(onAutocompleteSuggestionsReceived);
			expect(normalized.onDropdownOpen).toBe(onDropdownOpen);
			expect(normalized.onDropdownClose).toBe(onDropdownClose);
		});
	});

	describe("undefined values", () => {
		it("should not include undefined values in normalized config", () => {
			const config: SmartyAddressConfig = {
				...baseConfig,
				streetSelector: "#street",
				citySelector: undefined,
			};

			const normalized = normalizeConfig(config);

			expect("localitySelector" in normalized).toBe(false);
		});
	});
});
