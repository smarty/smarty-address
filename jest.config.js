export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
	// Playwright acceptance specs run under @playwright/test, not jest.
	testPathIgnorePatterns: ["/node_modules/", "/acceptance/"],
};
