/**
 * @jest-environment jsdom
 */
import { ApiService, unknownError } from "./ApiService";
import { DomService } from "./DomService";
import { AutocompleteSuggestion, ApiConfig } from "../interfaces";

describe("ApiService", () => {
	let service: ApiService;

	beforeEach(() => {
		service = new ApiService();
	});

	describe("getMatchingResult", () => {
		const createAutocompleteSuggestion = (
			street: string,
			secondary: string = "",
		): AutocompleteSuggestion => ({
			street_line: street,
			secondary,
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		});

		it("should find matching result by street_line", () => {
			const autocompleteSuggestions = [
				createAutocompleteSuggestion("123 Main St"),
				createAutocompleteSuggestion("456 Oak Ave"),
			];
			const selected = createAutocompleteSuggestion("123 Main St");

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result?.street_line).toBe("123 Main St");
		});

		it("should return undefined when no match found", () => {
			const autocompleteSuggestions = [
				createAutocompleteSuggestion("123 Main St"),
				createAutocompleteSuggestion("456 Oak Ave"),
			];
			const selected = createAutocompleteSuggestion("789 Pine Rd");

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeUndefined();
		});

		it("should trim whitespace when comparing street_line", () => {
			const autocompleteSuggestions = [createAutocompleteSuggestion("  123 Main St  ")];
			const selected = createAutocompleteSuggestion("123 Main St");

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeDefined();
		});

		it("should match when suggestion secondary includes selected secondary", () => {
			const autocompleteSuggestions = [
				{
					...createAutocompleteSuggestion("123 Main St"),
					secondary: "Apt 1, Apt 2, Apt 3",
				},
			];
			const selected = createAutocompleteSuggestion("123 Main St", "Apt 2");

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeDefined();
		});

		it("should not match when secondaries do not overlap", () => {
			const autocompleteSuggestions = [createAutocompleteSuggestion("123 Main St", "Apt 1")];
			const selected = createAutocompleteSuggestion("123 Main St", "Apt 5");

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeUndefined();
		});

		it("should handle empty suggestions array", () => {
			const selected = createAutocompleteSuggestion("123 Main St");

			const result = service.getMatchingResult([], selected);
			expect(result).toBeUndefined();
		});

		it("should handle undefined secondary in selected address", () => {
			const autocompleteSuggestions = [createAutocompleteSuggestion("123 Main St", "Apt 1")];
			const selected: AutocompleteSuggestion = {
				street_line: "123 Main St",
				secondary: undefined,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			};

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeDefined();
		});

		it("should distinguish addresses with same street but different cities", () => {
			const miamiBeach: AutocompleteSuggestion = {
				street_line: "1600 Pennsylvania Ave",
				secondary: "Apt",
				city: "Miami Beach",
				state: "FL",
				zipcode: "33139",
				country: "US",
				entries: 20,
			};
			const stoughton: AutocompleteSuggestion = {
				street_line: "1600 Pennsylvania Ave",
				secondary: "Apt",
				city: "Stoughton",
				state: "MA",
				zipcode: "02072",
				country: "US",
				entries: 10,
			};
			const autocompleteSuggestions = [miamiBeach, stoughton];

			const resultMiami = service.getMatchingResult(autocompleteSuggestions, miamiBeach);
			expect(resultMiami?.city).toBe("Miami Beach");

			const resultStoughton = service.getMatchingResult(autocompleteSuggestions, stoughton);
			expect(resultStoughton?.city).toBe("Stoughton");
		});

		it("should not match when street matches but city differs", () => {
			const autocompleteSuggestions = [
				{
					...createAutocompleteSuggestion("123 Main St", "Apt"),
					city: "Miami Beach",
					state: "FL",
				},
			];
			const selected: AutocompleteSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt",
				city: "Stoughton",
				state: "MA",
				zipcode: "02072",
				country: "US",
			};

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeUndefined();
		});

		it("should not match when street and city match but state differs", () => {
			const autocompleteSuggestions = [
				{
					...createAutocompleteSuggestion("123 Main St", "Apt"),
					city: "Springfield",
					state: "IL",
				},
			];
			const selected: AutocompleteSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt",
				city: "Springfield",
				state: "MO",
				zipcode: "65801",
				country: "US",
			};

			const result = service.getMatchingResult(autocompleteSuggestions, selected);
			expect(result).toBeUndefined();
		});
	});

	describe("getApiError", () => {
		it("should return auth error for 401 status", () => {
			const errorResponse = { errors: [{ id: 1611079217, message: "Auth failed" }] };

			const result = service.getApiError(401, errorResponse);
			expect(result.name).toBe("authenticationRequired");
			expect(result.statusCode).toBe(401);
			expect(result.message).toContain("authenticate");
		});

		it("should return security rate limit error for 429 with security error id", () => {
			const errorResponse = { errors: [{ id: 1730482419, message: "Rate limited" }] };

			const result = service.getApiError(429, errorResponse);
			expect(result.name).toBe("tooManyRequests_security");
			expect(result.statusCode).toBe(429);
			expect(result.message).toContain("limit");
		});

		it("should return plan rate limit error for 429 with plan error id", () => {
			const errorResponse = { errors: [{ id: 1637696258, message: "Rate limited" }] };

			const result = service.getApiError(429, errorResponse);
			expect(result.name).toBe("tooManyRequests_plan");
			expect(result.statusCode).toBe(429);
			expect(result.message).toContain("rate limit");
		});

		it("should return API error message for unrecognized status code", () => {
			const errorResponse = {
				errors: [{ id: 9999, name: "some-api-error", message: "Something went wrong" }],
			};

			const result = service.getApiError(500, errorResponse);
			expect(result.name).toBe("some-api-error");
			expect(result.message).toBe("SmartyAddress: Something went wrong");
			expect(result.statusCode).toBe(500);
		});

		it("should return API error message when error id does not match", () => {
			const errorResponse = { errors: [{ id: 9999, message: "Different error" }] };

			const result = service.getApiError(401, errorResponse);
			expect(result.name).toBe("apiError");
			expect(result.message).toBe("SmartyAddress: Different error");
		});

		it("should handle empty errors array", () => {
			const errorResponse = { errors: [] };

			const result = service.getApiError(500, errorResponse);
			expect(result.name).toBe(unknownError.name);
		});
	});

	describe("fetchAutocompleteResults", () => {
		const apiConfig: ApiConfig = {
			embeddedKey: "test-key",
			autocompleteApiUrl: "https://api.example.com/lookup",
		};

		it("should return suggestions on successful response", async () => {
			const mockAutocompleteSuggestions: AutocompleteSuggestion[] = [
				{
					street_line: "123 Main St",
					city: "Denver",
					state: "CO",
					zipcode: "80202",
					country: "US",
				},
			];

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: mockAutocompleteSuggestions }),
			});

			const result = await service.fetchAutocompleteResults(apiConfig, "123 Main", null, mockFetch);

			expect(result).toEqual(mockAutocompleteSuggestions);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should include search string in request", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.fetchAutocompleteResults(apiConfig, "456 Oak", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("search=456+Oak");
		});

		it("should include auth-id in request", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.fetchAutocompleteResults(apiConfig, "test", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("auth-id=test-key");
		});

		it("should throw auth error on 401 response", async () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			const mockFetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ errors: [{ id: 1611079217, message: "Auth failed" }] }),
			});

			await expect(
				service.fetchAutocompleteResults(apiConfig, "test", null, mockFetch),
			).rejects.toThrow("authenticationRequired");
			consoleSpy.mockRestore();
		});

		it("should throw unknown error on network failure", async () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();
			const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));

			await expect(
				service.fetchAutocompleteResults(apiConfig, "test", null, mockFetch),
			).rejects.toThrow(unknownError.name);
			consoleSpy.mockRestore();
		});

		it("should map API params correctly", async () => {
			const configWithParams: ApiConfig = {
				...apiConfig,
				maxResults: 10,
				includeOnlyAdministrativeAreas: ["CO", "CA"],
				preferGeolocation: "city",
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.fetchAutocompleteResults(configWithParams, "test", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("max_results=10");
			expect(calledUrl).toContain("include_only_states=CO%3BCA");
			expect(calledUrl).toContain("prefer_geolocation=city");
		});

		it("should include selected address when provided", async () => {
			const selectedAddress: AutocompleteSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt 1",
				entries: 5,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.fetchAutocompleteResults(apiConfig, "123 Main", selectedAddress, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("selected=");
			expect(calledUrl).toContain("123+Main+St");
		});
	});

	describe("init", () => {
		it("should store embeddedKey from config", () => {
			service.init({
				embeddedKey: "my-key",
				autocompleteApiUrl: "https://api.example.com",
				streetSelector: "#street",
				searchInputSelector: "#search",
				theme: [],
			});

			const apiConfig = service.getApiConfig();
			expect(apiConfig.embeddedKey).toBe("my-key");
		});

		it("should store autocompleteApiUrl from config", () => {
			service.init({
				embeddedKey: "my-key",
				autocompleteApiUrl: "https://custom.api.com",
				streetSelector: "#street",
				searchInputSelector: "#search",
				theme: [],
			});

			const apiConfig = service.getApiConfig();
			expect(apiConfig.autocompleteApiUrl).toBe("https://custom.api.com");
		});

		it("should store API params from config", () => {
			service.init({
				embeddedKey: "my-key",
				autocompleteApiUrl: "https://api.example.com",
				streetSelector: "#street",
				searchInputSelector: "#search",
				theme: [],
				maxResults: 5,
				preferAdministrativeAreas: ["CO"],
			});

			const apiConfig = service.getApiConfig();
			expect(apiConfig.maxResults).toBe(5);
			expect(apiConfig.preferAdministrativeAreas).toEqual(["CO"]);
		});
	});

	describe("country resolution", () => {
		const initWith = (
			overrides: Partial<Parameters<ApiService["init"]>[0]> = {},
		): ApiService => {
			const svc = new ApiService();
			const domService = new DomService();
			svc.setServices({ domService });
			svc.init({
				embeddedKey: "k",
				autocompleteApiUrl: "https://us.example.com",
				internationalAutocompleteApiUrl: "https://intl.example.com",
				streetSelector: "#s",
				theme: [],
				...overrides,
			});
			return svc;
		};

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("defaults to USA when no country or selector is configured", () => {
			expect(initWith().getCountry()).toBe("USA");
		});

		it("uses the static country config when set", () => {
			expect(initWith({ country: "CAN" }).getCountry()).toBe("CAN");
		});

		it("reads country from a countrySelector input", () => {
			document.body.innerHTML = `<input id="country" value="GBR" />`;
			expect(initWith({ countrySelector: "#country" }).getCountry()).toBe("GBR");
		});

		it("falls back to static country when selector value is blank", () => {
			document.body.innerHTML = `<input id="country" value="" />`;
			expect(
				initWith({ countrySelector: "#country", country: "CAN" }).getCountry(),
			).toBe("CAN");
		});

		it("treats US and USA as US (not international)", () => {
			expect(initWith({ country: "US" }).isInternational()).toBe(false);
			expect(initWith({ country: "USA" }).isInternational()).toBe(false);
		});

		it("treats other countries as international", () => {
			expect(initWith({ country: "CAN" }).isInternational()).toBe(true);
			expect(initWith({ country: "gbr" }).isInternational()).toBe(true);
		});
	});

	describe("international fetchAutocompleteResults", () => {
		const apiConfig: ApiConfig = {
			embeddedKey: "test-key",
			autocompleteApiUrl: "https://us.example.com/lookup",
			internationalAutocompleteApiUrl: "https://intl.example.com/v2/lookup",
			country: "CAN",
		};

		beforeEach(() => {
			service.setServices({ domService: new DomService() });
		});

		it("calls the international endpoint with country and key", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ candidates: [] }),
			});

			await service.fetchAutocompleteResults(apiConfig, "1 Main", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("https://intl.example.com/v2/lookup?");
			expect(calledUrl).toContain("key=test-key");
			expect(calledUrl).toContain("country=CAN");
			expect(calledUrl).toContain("search=1+Main");
			expect(calledUrl).not.toContain("auth-id=");
		});

		it("normalizes summary candidates into AutocompleteSuggestion", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [
							{
								address_id: "abc-123",
								address_text: "123 Main St Winnipeg, MB, R3C",
								entries: 12,
							},
						],
					}),
			});

			const result = await service.fetchAutocompleteResults(apiConfig, "123", null, mockFetch);

			expect(result).toEqual([
				{
					street_line: "123 Main St Winnipeg, MB, R3C",
					city: "",
					state: "",
					zipcode: "",
					country: "CAN",
					entries: 12,
					address_id: "abc-123",
				},
			]);
		});

		it("maps international filter params to the documented names", async () => {
			const configWithParams: ApiConfig = {
				...apiConfig,
				maxResults: 3,
				includeOnlyLocalities: ["Toronto", "Montreal"],
				includeOnlyPostalCodes: ["M5V"],
				preferGeolocation: "on",
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ candidates: [] }),
			});

			await service.fetchAutocompleteResults(configWithParams, "test", null, mockFetch);
			const calledUrl = mockFetch.mock.calls[0][0];

			expect(calledUrl).toContain("max_results=3");
			expect(calledUrl).toContain("include_only_locality=Toronto%2CMontreal");
			expect(calledUrl).toContain("include_only_postal_code=M5V");
			expect(calledUrl).toContain("geolocation=on");
		});

		it("uppercases the country code", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ candidates: [] }),
			});

			await service.fetchAutocompleteResults(
				{ ...apiConfig, country: "can" },
				"test",
				null,
				mockFetch,
			);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("country=CAN");
		});

		it("truncates search to 32 characters", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ candidates: [] }),
			});

			const longSearch = "a".repeat(50);
			await service.fetchAutocompleteResults(apiConfig, longSearch, null, mockFetch);

			const calledUrl: string = mockFetch.mock.calls[0][0];
			const search = new URL(calledUrl).searchParams.get("search");
			expect(search).toHaveLength(32);
		});
	});

	describe("fetchInternationalAddressDetail", () => {
		const apiConfig: ApiConfig = {
			embeddedKey: "test-key",
			autocompleteApiUrl: "https://us.example.com/lookup",
			internationalAutocompleteApiUrl: "https://intl.example.com/v2/lookup",
			country: "CAN",
		};

		beforeEach(() => {
			service.setServices({ domService: new DomService() });
		});

		it("appends the address_id to the URL path", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ candidates: [] }),
			});

			const selected: AutocompleteSuggestion = {
				street_line: "preview",
				city: "",
				state: "",
				zipcode: "",
				country: "CAN",
				address_id: "id with spaces",
			};

			await service.fetchInternationalAddressDetail(apiConfig, selected, mockFetch);

			const calledUrl: string = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("/v2/lookup/id%20with%20spaces?");
		});

		it("normalizes detail candidates with locality/admin/postal fields", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						candidates: [
							{
								street: "1-123 Main St",
								locality: "Fredericton",
								administrative_area: "NB",
								administrative_area_short: "NB",
								administrative_area_long: "New Brunswick",
								postal_code: "E3A 1C7",
								country_iso3: "CAN",
							},
						],
					}),
			});

			const selected: AutocompleteSuggestion = {
				street_line: "preview",
				city: "",
				state: "",
				zipcode: "",
				country: "CAN",
				address_id: "abc",
			};

			const result = await service.fetchInternationalAddressDetail(apiConfig, selected, mockFetch);

			expect(result).toEqual([
				{
					street_line: "1-123 Main St",
					city: "Fredericton",
					state: "NB",
					zipcode: "E3A 1C7",
					country: "CAN",
					entries: 0,
					metadata: { administrative_area_long: "New Brunswick" },
				},
			]);
		});

		it("returns the selected address unchanged when address_id is missing", async () => {
			const mockFetch = jest.fn();
			const selected: AutocompleteSuggestion = {
				street_line: "1 Main",
				city: "Toronto",
				state: "ON",
				zipcode: "M5V",
				country: "CAN",
			};

			const result = await service.fetchInternationalAddressDetail(apiConfig, selected, mockFetch);

			expect(mockFetch).not.toHaveBeenCalled();
			expect(result).toEqual([selected]);
		});
	});
});
