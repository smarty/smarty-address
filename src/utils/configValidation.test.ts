import { validateConfig, ConfigValidationError } from "./appUtils";
import { SmartyAddressConfig } from "../interfaces";

describe("configValidation", () => {
	const validConfig: SmartyAddressConfig = {
		embeddedKey: "test-api-key",
		streetSelector: "#address-input",
		theme: [],
		autocompleteApiUrl: "https://api.example.com",
	};

	describe("validateConfig", () => {
		it("should not throw when config is valid", () => {
			expect(() => validateConfig(validConfig)).not.toThrow();
		});

		describe("embeddedKey validation", () => {
			it("should throw when embeddedKey is missing", () => {
				const config = { ...validConfig, embeddedKey: undefined } as unknown as SmartyAddressConfig;
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/embeddedKey is required/);
			});

			it("should throw when embeddedKey is empty string", () => {
				const config = { ...validConfig, embeddedKey: "" };
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/embeddedKey is required/);
			});

			it("should throw when embeddedKey is whitespace only", () => {
				const config = { ...validConfig, embeddedKey: "   " };
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/embeddedKey is required/);
			});

			it("should throw when embeddedKey is not a string", () => {
				const config = { ...validConfig, embeddedKey: 12345 } as unknown as SmartyAddressConfig;
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/embeddedKey is required/);
			});
		});

		describe("streetSelector validation", () => {
			it("should throw when streetSelector is missing", () => {
				const config = { ...validConfig, streetSelector: undefined } as unknown as SmartyAddressConfig;
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/streetSelector is required/);
			});

			it("should throw when streetSelector is empty string", () => {
				const config = { ...validConfig, streetSelector: "" };
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/streetSelector is required/);
			});

			it("should throw when streetSelector is whitespace only", () => {
				const config = { ...validConfig, streetSelector: "   " };
				expect(() => validateConfig(config)).toThrow(ConfigValidationError);
				expect(() => validateConfig(config)).toThrow(/streetSelector is required/);
			});
		});

		describe("multiple errors", () => {
			it("should report all validation errors at once", () => {
				const config = {
					...validConfig,
					embeddedKey: "",
					streetSelector: "",
				};
				expect(() => validateConfig(config)).toThrow(/embeddedKey is required/);
				expect(() => validateConfig(config)).toThrow(/streetSelector is required/);
			});
		});
	});

	describe("ConfigValidationError", () => {
		it("should have the correct error name", () => {
			const error = new ConfigValidationError("test message");
			expect(error.name).toBe("SmartyAddressConfigError");
		});

		it("should have the correct message", () => {
			const error = new ConfigValidationError("test message");
			expect(error.message).toBe("test message");
		});

		it("should be an instance of Error", () => {
			const error = new ConfigValidationError("test message");
			expect(error).toBeInstanceOf(Error);
		});
	});
});
