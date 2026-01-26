import { ApiService, unknownError, API_PARAM_MAP } from "./ApiService";
import { AddressSuggestion, ApiConfig } from "../interfaces";

describe("ApiService", () => {
	let service: ApiService;

	beforeEach(() => {
		service = new ApiService();
	});

	describe("getMatchingResult", () => {
		const createSuggestion = (street: string, secondary: string = ""): AddressSuggestion => ({
			street_line: street,
			secondary,
			city: "Denver",
			state: "CO",
			zipcode: "80202",
			country: "US",
		});

		it("should find matching result by street_line", () => {
			const suggestions = [createSuggestion("123 Main St"), createSuggestion("456 Oak Ave")];
			const selected = createSuggestion("123 Main St");

			const result = service.getMatchingResult(suggestions, selected);
			expect(result?.street_line).toBe("123 Main St");
		});

		it("should return undefined when no match found", () => {
			const suggestions = [createSuggestion("123 Main St"), createSuggestion("456 Oak Ave")];
			const selected = createSuggestion("789 Pine Rd");

			const result = service.getMatchingResult(suggestions, selected);
			expect(result).toBeUndefined();
		});

		it("should trim whitespace when comparing street_line", () => {
			const suggestions = [createSuggestion("  123 Main St  ")];
			const selected = createSuggestion("123 Main St");

			const result = service.getMatchingResult(suggestions, selected);
			expect(result).toBeDefined();
		});

		it("should match when suggestion secondary includes selected secondary", () => {
			const suggestions = [
				{
					...createSuggestion("123 Main St"),
					secondary: "Apt 1, Apt 2, Apt 3",
				},
			];
			const selected = createSuggestion("123 Main St", "Apt 2");

			const result = service.getMatchingResult(suggestions, selected);
			expect(result).toBeDefined();
		});

		it("should not match when secondaries do not overlap", () => {
			const suggestions = [createSuggestion("123 Main St", "Apt 1")];
			const selected = createSuggestion("123 Main St", "Apt 5");

			const result = service.getMatchingResult(suggestions, selected);
			expect(result).toBeUndefined();
		});

		it("should handle empty suggestions array", () => {
			const selected = createSuggestion("123 Main St");

			const result = service.getMatchingResult([], selected);
			expect(result).toBeUndefined();
		});

		it("should handle undefined secondary in selected address", () => {
			const suggestions = [createSuggestion("123 Main St", "Apt 1")];
			const selected: AddressSuggestion = {
				street_line: "123 Main St",
				secondary: undefined,
				city: "Denver",
				state: "CO",
				zipcode: "80202",
				country: "US",
			};

			const result = service.getMatchingResult(suggestions, selected);
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

		it("should return unknown error for unrecognized status code", () => {
			const errorResponse = { errors: [{ id: 9999, message: "Unknown" }] };

			const result = service.getApiError(500, errorResponse);
			expect(result.name).toBe(unknownError.name);
			expect(result.message).toBe(unknownError.message);
		});

		it("should return unknown error when error id does not match", () => {
			const errorResponse = { errors: [{ id: 9999, message: "Different error" }] };

			const result = service.getApiError(401, errorResponse);
			expect(result.name).toBe(unknownError.name);
		});

		it("should handle empty errors array", () => {
			const errorResponse = { errors: [] };

			const result = service.getApiError(500, errorResponse);
			expect(result.name).toBe(unknownError.name);
		});
	});

	describe("getAutocompleteApiResults", () => {
		const apiConfig: ApiConfig = {
			embeddedKey: "test-key",
			autocompleteApiUrl: "https://api.example.com/lookup",
		};

		it("should return suggestions on successful response", async () => {
			const mockSuggestions: AddressSuggestion[] = [
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
				json: () => Promise.resolve({ suggestions: mockSuggestions }),
			});

			const result = await service.getAutocompleteApiResults(
				apiConfig,
				"123 Main",
				null,
				mockFetch,
			);

			expect(result).toEqual(mockSuggestions);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should include search string in request", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.getAutocompleteApiResults(apiConfig, "456 Oak", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("search=456+Oak");
		});

		it("should include auth-id in request", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.getAutocompleteApiResults(apiConfig, "test", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("auth-id=test-key");
		});

		it("should throw auth error on 401 response", async () => {
			const mockFetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ errors: [{ id: 1611079217, message: "Auth failed" }] }),
			});

			await expect(
				service.getAutocompleteApiResults(apiConfig, "test", null, mockFetch),
			).rejects.toThrow("authenticationRequired");
		});

		it("should throw unknown error on network failure", async () => {
			const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));

			await expect(
				service.getAutocompleteApiResults(apiConfig, "test", null, mockFetch),
			).rejects.toThrow(unknownError.name);
		});

		it("should map API params correctly", async () => {
			const configWithParams: ApiConfig = {
				...apiConfig,
				maxResults: 10,
				includeOnlyStates: ["CO", "CA"],
				preferGeolocation: "city",
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ suggestions: [] }),
			});

			await service.getAutocompleteApiResults(configWithParams, "test", null, mockFetch);

			const calledUrl = mockFetch.mock.calls[0][0];
			expect(calledUrl).toContain("max_results=10");
			expect(calledUrl).toContain("include_only_states=CO%3BCA");
			expect(calledUrl).toContain("prefer_geolocation=city");
		});

		it("should include selected address when provided", async () => {
			const selectedAddress: AddressSuggestion = {
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

			await service.getAutocompleteApiResults(apiConfig, "123 Main", selectedAddress, mockFetch);

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
				preferStates: ["CO"],
			});

			const apiConfig = service.getApiConfig();
			expect(apiConfig.maxResults).toBe(5);
			expect(apiConfig.preferStates).toEqual(["CO"]);
		});
	});
});
