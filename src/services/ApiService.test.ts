import { ApiService, unknownError, API_PARAM_MAP } from "./ApiService";
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
});
