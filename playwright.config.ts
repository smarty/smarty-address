import { defineConfig, devices } from "@playwright/test";

// Acceptance harness for address verification (RS Epic 0, PRD §12.4, §13).
// Specs drive the built IIFE bundle (dist/smarty-address.iife.js) in a real
// browser with an in-page fetch mock, exercising the representative matrix cells
// documented in acceptance/README.md. Run `npm run build` first.
export default defineConfig({
	testDir: "./acceptance",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
