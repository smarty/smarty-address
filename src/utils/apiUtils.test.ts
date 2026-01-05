import {
	getMatchingResult,
	getAutocompleteApiResults,
	getApiError,
	unknownError,
	createErrorResponse,
} from "./apiUtils";
import { AddressSuggestion, ApiConfig } from "../interfaces";
import {
	completeAddressWithSecondary,
	completeAddressWithSecondaryAlternate,
	completeAddressWithSecondaryForNoMatch,
	completeAddressWithExtendedSecondary,
	completeAddressWithExtraWhitespace,
	basicAddressWithoutSecondary,
} from "./apiUtils.fixtures";

describe("apiUtils", () => {
	describe("getMatchingResult", () => {
		it("should find a matching suggestion by street_line and secondary", () => {
			const primarySuggestions: AddressSuggestion[] = [
				completeAddressWithSecondary,
				completeAddressWithSecondaryAlternate,
			];

			const result = getMatchingResult(primarySuggestions, completeAddressWithSecondary);

			expect(result).toEqual(primarySuggestions[0]);
		});

		it("should return undefined when no match is found", () => {
			const primarySuggestions: AddressSuggestion[] = [completeAddressWithSecondary];

			const result = getMatchingResult(primarySuggestions, completeAddressWithSecondaryForNoMatch);

			expect(result).toBeUndefined();
		});

		it("should match when secondary contains the selected secondary", () => {
			const primarySuggestions: AddressSuggestion[] = [completeAddressWithExtendedSecondary];

			const result = getMatchingResult(primarySuggestions, completeAddressWithSecondary);

			expect(result).toEqual(primarySuggestions[0]);
		});

		it("should trim whitespace when comparing street_line", () => {
			const primarySuggestions: AddressSuggestion[] = [completeAddressWithExtraWhitespace];

			const result = getMatchingResult(primarySuggestions, completeAddressWithSecondary);

			expect(result).toEqual(primarySuggestions[0]);
		});
	});

	describe("getAutocompleteApiResults", () => {
		const mockApiConfig: ApiConfig = {
			apiKey: "test-api-key",
			autocompleteApiUrl: "https://api.example.com/autocomplete",
		};

		it("should return suggestions on successful response", async () => {
			const mockSuggestions: AddressSuggestion[] = [basicAddressWithoutSecondary];

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

			const mockFetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ suggestions: mockSuggestions }),
			});

			await getAutocompleteApiResults(mockApiConfig, "123 Main", completeAddressWithSecondary, mockFetch as any);

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
			const errorResponse = createErrorResponse(1611079217, "Authentication failed");

			const result = getApiError(401, errorResponse);

			expect(result.name).toBe("authenticationRequired");
			expect(result.statusCode).toBe(401);
		});

		it("should return security rate limit error for 429 with matching error ID", () => {
			const errorResponse = createErrorResponse(1730482419, "Rate limit exceeded");

			const result = getApiError(429, errorResponse);

			expect(result.name).toBe("tooManyRequests_security");
			expect(result.statusCode).toBe(429);
		});

		it("should return plan rate limit error for 429 with different error ID", () => {
			const errorResponse = createErrorResponse(1637696258, "Rate limit exceeded");

			const result = getApiError(429, errorResponse);

			expect(result.name).toBe("tooManyRequests_plan");
			expect(result.statusCode).toBe(429);
		});

		it("should return unknown error for unrecognized status code", () => {
			const errorResponse = createErrorResponse(999999, "Some error");

			const result = getApiError(500, errorResponse);

			expect(result).toEqual(unknownError);
		});

		it("should return unknown error for unrecognized error ID", () => {
			const errorResponse = createErrorResponse(999999, "Unknown error");

			const result = getApiError(401, errorResponse);

			expect(result).toEqual(unknownError);
		});
	});
});
