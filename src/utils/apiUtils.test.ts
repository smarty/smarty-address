import {
	getMatchingResult,
	getAutocompleteApiResults,
	getApiError,
	unknownError,
} from "./apiUtils";
import { AddressSuggestion, ApiConfig } from "../interfaces";

describe("apiUtils", () => {
	describe("getMatchingResult", () => {
		it("should find a matching suggestion by street_line and secondary", () => {
			const primarySuggestions: AddressSuggestion[] = [
				{
					street_line: "123 Main St",
					secondary: "Apt 1",
					entries: 5,
					city: "Springfield",
					state: "IL",
					zipcode: "62701",
					country: "US",
				},
				{
					street_line: "456 Oak Ave",
					secondary: "Unit 2",
					entries: 3,
					city: "Springfield",
					state: "IL",
					zipcode: "62702",
					country: "US",
				},
			];

			const selectedAddress: AddressSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt 1",
				entries: 5,
				city: "Springfield",
				state: "IL",
				zipcode: "62701",
				country: "US",
			};

			const result = getMatchingResult(primarySuggestions, selectedAddress);

			expect(result).toEqual(primarySuggestions[0]);
		});

		it("should return undefined when no match is found", () => {
			const primarySuggestions: AddressSuggestion[] = [
				{
					street_line: "123 Main St",
					secondary: "Apt 1",
					entries: 5,
					city: "Springfield",
					state: "IL",
					zipcode: "62701",
					country: "US",
				},
			];

			const selectedAddress: AddressSuggestion = {
				street_line: "789 Elm St",
				secondary: "Suite 3",
				entries: 2,
				city: "Springfield",
				state: "IL",
				zipcode: "62703",
				country: "US",
			};

			const result = getMatchingResult(primarySuggestions, selectedAddress);

			expect(result).toBeUndefined();
		});

		it("should match when secondary contains the selected secondary", () => {
			const primarySuggestions: AddressSuggestion[] = [
				{
					street_line: "123 Main St",
					secondary: "Apt 1 (5 entries)",
					entries: 5,
					city: "Springfield",
					state: "IL",
					zipcode: "62701",
					country: "US",
				},
			];

			const selectedAddress: AddressSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt 1",
				entries: 5,
				city: "Springfield",
				state: "IL",
				zipcode: "62701",
				country: "US",
			};

			const result = getMatchingResult(primarySuggestions, selectedAddress);

			expect(result).toEqual(primarySuggestions[0]);
		});

		it("should trim whitespace when comparing street_line", () => {
			const primarySuggestions: AddressSuggestion[] = [
				{
					street_line: "  123 Main St  ",
					secondary: "Apt 1",
					entries: 5,
					city: "Springfield",
					state: "IL",
					zipcode: "62701",
					country: "US",
				},
			];

			const selectedAddress: AddressSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt 1",
				entries: 5,
				city: "Springfield",
				state: "IL",
				zipcode: "62701",
				country: "US",
			};

			const result = getMatchingResult(primarySuggestions, selectedAddress);

			expect(result).toEqual(primarySuggestions[0]);
		});
	});

	describe("getAutocompleteApiResults", () => {
		const mockApiConfig: ApiConfig = {
			apiKey: "test-api-key",
			autocompleteApiUrl: "https://api.example.com/autocomplete",
		};

		it("should return suggestions on successful response", async () => {
			const mockSuggestions: AddressSuggestion[] = [
				{
					street_line: "123 Main St",
					city: "Springfield",
					state: "IL",
					zipcode: "62701",
					country: "US",
				},
			];

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ suggestions: mockSuggestions }),
			});

			const result = await getAutocompleteApiResults(
				mockApiConfig,
				"123 Main",
				null,
				mockFetch as any,
			);

			expect(result).toEqual(mockSuggestions);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("https://api.example.com/autocomplete"),
			);
			expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("search=123+Main"));
		});

		it("should include selected address in request when provided", async () => {
			const mockSuggestions: AddressSuggestion[] = [];
			const selectedAddress: AddressSuggestion = {
				street_line: "123 Main St",
				secondary: "Apt 1",
				entries: 5,
				city: "Springfield",
				state: "IL",
				zipcode: "62701",
				country: "US",
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ suggestions: mockSuggestions }),
			});

			await getAutocompleteApiResults(mockApiConfig, "123 Main", selectedAddress, mockFetch as any);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("selected=123+Main+St+Apt+1"),
			);
		});

		it("should throw error on API error response", async () => {
			const mockErrorResponse = {
				errors: [
					{
						id: 1611079217,
						message: "Authentication failed",
					},
				],
			};

			const mockFetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 401,
				json: jest.fn().mockResolvedValue(mockErrorResponse),
			});

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

			await expect(
				getAutocompleteApiResults(mockApiConfig, "123 Main", null, mockFetch as any),
			).rejects.toThrow("authenticationRequired");

			consoleErrorSpy.mockRestore();
		});

		it("should throw unknown error on network failure", async () => {
			const mockFetch = jest.fn().mockRejectedValue(new Error("Network error"));

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

			await expect(
				getAutocompleteApiResults(mockApiConfig, "123 Main", null, mockFetch as any),
			).rejects.toThrow(unknownError.name);

			consoleErrorSpy.mockRestore();
		});

		it("should include API key and user agent in request", async () => {
			const mockSuggestions: AddressSuggestion[] = [];
			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ suggestions: mockSuggestions }),
			});

			await getAutocompleteApiResults(mockApiConfig, "123 Main", null, mockFetch as any);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("auth-id=test-api-key"),
			);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("user-agent="),
			);
		});
	});

	describe("getApiError", () => {
		it("should return authentication error for 401 with matching error ID", () => {
			const errorResponse = {
				errors: [
					{
						id: 1611079217,
						message: "Authentication failed",
					},
				],
			};

			const result = getApiError(401, errorResponse);

			expect(result.name).toBe("authenticationRequired");
			expect(result.statusCode).toBe(401);
		});

		it("should return security rate limit error for 429 with matching error ID", () => {
			const errorResponse = {
				errors: [
					{
						id: 1730482419,
						message: "Rate limit exceeded",
					},
				],
			};

			const result = getApiError(429, errorResponse);

			expect(result.name).toBe("tooManyRequests_security");
			expect(result.statusCode).toBe(429);
		});

		it("should return plan rate limit error for 429 with different error ID", () => {
			const errorResponse = {
				errors: [
					{
						id: 1637696258,
						message: "Rate limit exceeded",
					},
				],
			};

			const result = getApiError(429, errorResponse);

			expect(result.name).toBe("tooManyRequests_plan");
			expect(result.statusCode).toBe(429);
		});

		it("should return unknown error for unrecognized status code", () => {
			const errorResponse = {
				errors: [
					{
						id: 999999,
						message: "Some error",
					},
				],
			};

			const result = getApiError(500, errorResponse);

			expect(result).toEqual(unknownError);
		});

		it("should return unknown error for unrecognized error ID", () => {
			const errorResponse = {
				errors: [
					{
						id: 999999,
						message: "Unknown error",
					},
				],
			};

			const result = getApiError(401, errorResponse);

			expect(result).toEqual(unknownError);
		});
	});
});
