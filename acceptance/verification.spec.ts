import { test, expect, Page } from "@playwright/test";
import path from "path";

// Acceptance harness (RS Epic 0). Each test drives the built IIFE bundle in a
// real browser with an in-page fetch mock returning canned Street API payloads,
// then asserts the resulting DOM / decision. Representative matrix cells and the
// intentionally-untested combinations are documented in acceptance/README.md.

const BUNDLE = path.join(process.cwd(), "dist", "smarty-address.iife.js");

const US_FORM = `
	<input id="street" value="1600 pensylvania ave" />
	<input id="city" value="Washington" />
	<input id="state" value="DC" />
	<input id="zip" value="20500" />`;

type MockResponse = { match: string; body: unknown; ok?: boolean; status?: number };

async function loadPlugin(
	page: Page,
	html: string,
	responses: MockResponse[],
	config: Record<string, unknown>,
): Promise<void> {
	await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
	await page.addScriptTag({ path: BUNDLE });
	await page.evaluate(
		async ({ responses, config }) => {
			const win = window as unknown as {
				fetch: unknown;
				SmartyAddress: { create: (c: unknown) => Promise<unknown> };
				__sa: unknown;
			};
			win.fetch = async (url: unknown) => {
				const target = String(url);
				const match =
					(responses as MockResponse[]).find((r) => target.includes(r.match)) ??
					(responses as MockResponse[])[0];
				return {
					ok: match.ok ?? true,
					status: match.status ?? 200,
					json: async () => match.body,
				} as Response;
			};
			win.__sa = await win.SmartyAddress.create(config);
		},
		{ responses, config },
	);
}

const verify = (page: Page) =>
	page.evaluate(async () => {
		const result = await (
			window as unknown as { __sa: { verify: () => Promise<unknown> } }
		).__sa.verify();
		return result as { type: string } | null;
	});

const verifyBeforeSubmit = (page: Page) =>
	page.evaluate(() =>
		(
			window as unknown as { __sa: { verifyBeforeSubmit: () => Promise<boolean> } }
		).__sa.verifyBeforeSubmit(),
	);

const usConfig = (verification: Record<string, unknown>) => ({
	embeddedKey: "test-key",
	streetSelector: "#street",
	localitySelector: "#city",
	administrativeAreaSelector: "#state",
	postalCodeSelector: "#zip",
	autocomplete: { enabled: false },
	verification: { trigger: ["manual"], ...verification },
});

const usCandidate = (
	analysis: Record<string, string>,
	components: Record<string, string>,
	line = "1600 Pennsylvania Ave NW",
) => ({
	delivery_line_1: line,
	components: {
		city_name: "Washington",
		state_abbreviation: "DC",
		zipcode: "20500",
		...components,
	},
	analysis,
});

test.describe("US verification — verification-only, badge", () => {
	test("Type 1: verified (entered already standardized) renders a positive badge", async ({
		page,
	}) => {
		// Entered address matches the candidate exactly → no diff → Type 1.
		const matchedForm = `
			<input id="street" value="3214 N University Ave" />
			<input id="city" value="Provo" />
			<input id="state" value="UT" />
			<input id="zip" value="84604" />`;
		await loadPlugin(
			page,
			matchedForm,
			[
				{
					match: "us-street",
					body: [
						{
							delivery_line_1: "3214 N University Ave",
							components: { city_name: "Provo", state_abbreviation: "UT", zipcode: "84604" },
							analysis: { dpv_match_code: "Y", footnotes: "" },
						},
					],
				},
			],
			usConfig({ ui: "badge" }),
		);
		const result = await verify(page);
		expect(result?.type).toBe("verified");
		await expect(page.locator(".smartyAddress__verifyBadge_positive")).toHaveText("Verified");
	});

	test("Type 2: corrected applies the standardized address + shows Adjusted", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[
				{
					match: "us-street",
					body: [usCandidate({ dpv_match_code: "Y", footnotes: "A#N#" }, { plus4_code: "0003" })],
				},
			],
			usConfig({ ui: "badge" }),
		);
		await verify(page);
		await expect(page.locator(".smartyAddress__verifyBadge")).toHaveText("Adjusted");
		await expect(page.locator("#zip")).toHaveValue("20500-0003");
		await expect(page.locator("#street")).toHaveValue("1600 Pennsylvania Ave NW");
	});

	test("Type 7: undeliverable warns but does not block submit (fail-open)", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[{ match: "us-street", body: [usCandidate({ dpv_match_code: "N", footnotes: "" }, {})] }],
			usConfig({ ui: "badge" }),
		);
		const result = await verify(page);
		expect(result?.type).toBe("undeliverable");
		await expect(page.locator(".smartyAddress__verifyBadge_negative")).toHaveText("Undeliverable");
		expect(await verifyBeforeSubmit(page)).toBe(true);
	});
});

test.describe("Blocking submission (Epic 3)", () => {
	test("undeliverable→block blocks the submit gate", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[{ match: "us-street", body: [usCandidate({ dpv_match_code: "N", footnotes: "" }, {})] }],
			usConfig({ onResult: { undeliverable: "block" } }),
		);
		expect(await verifyBeforeSubmit(page)).toBe(false);
	});
});

test.describe("Ambiguous chooser (Epic 2)", () => {
	test("Type 6 renders a chooser; picking a candidate fills the form", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[
				{
					match: "us-street",
					body: [
						usCandidate(
							{ dpv_match_code: "Y", footnotes: "" },
							{ plus4_code: "4402" },
							"120 W Center St",
						),
						usCandidate(
							{ dpv_match_code: "Y", footnotes: "" },
							{ plus4_code: "3108" },
							"120 E Center St",
						),
					],
				},
			],
			usConfig({ ui: "panel" }),
		);
		const result = await verify(page);
		expect(result?.type).toBe("ambiguous");
		const options = page.locator(".smartyAddress__verifyChooserOption");
		await expect(options).toHaveCount(2);
		await options.nth(1).click();
		await expect(page.locator("#street")).toHaveValue("120 E Center St");
		await expect(page.locator(".smartyAddress__verifyChooser")).toHaveCount(0);
	});
});

test.describe("Staleness (Q9)", () => {
	test("editing a field after a successful verify clears the badge", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[{ match: "us-street", body: [usCandidate({ dpv_match_code: "Y", footnotes: "" }, {})] }],
			usConfig({ ui: "badge" }),
		);
		await verify(page);
		await expect(page.locator(".smartyAddress__verifyBadge")).toHaveCount(1);
		await page.locator("#street").fill("123 Different St");
		await expect(page.locator(".smartyAddress__verifyBadge")).toHaveCount(0);
	});
});

test.describe("Error handling (Type 8)", () => {
	test("service error is aria-only and fail-open allows submit", async ({ page }) => {
		await loadPlugin(
			page,
			US_FORM,
			[{ match: "us-street", body: {}, ok: false, status: 500 }],
			usConfig({ ui: "badge" }),
		);
		const result = await verify(page);
		expect(result?.type).toBe("error");
		await expect(page.locator(".smartyAddress__verifyBadge")).toHaveCount(0);
		await expect(page.locator(".smartyAddress__verifyAnnouncer")).toContainText(
			"temporarily unavailable",
		);
		expect(await verifyBeforeSubmit(page)).toBe(true);
	});
});

test.describe("International verification (Epic 4)", () => {
	const INTL_FORM = `
		<input id="street" value="221B Baker St" />
		<input id="city" value="London" />
		<input id="zip" value="NW1 6XE" />`;

	test("Type 1 international renders a verified badge", async ({ page }) => {
		await loadPlugin(
			page,
			INTL_FORM,
			[
				{
					match: "international-street",
					body: [
						{
							address1: "221B Baker St",
							components: { locality: "London", postal_code: "NW1 6XE", country_iso3: "GBR" },
							analysis: {
								verification_status: "Verified",
								address_precision: "DeliveryPoint",
								max_address_precision: "DeliveryPoint",
								changes: {},
							},
						},
					],
				},
			],
			{
				embeddedKey: "test-key",
				streetSelector: "#street",
				localitySelector: "#city",
				postalCodeSelector: "#zip",
				country: "GBR",
				autocomplete: { enabled: false },
				verification: { trigger: ["manual"], ui: "badge" },
			},
		);
		const result = await verify(page);
		expect(result?.type).toBe("verified");
		await expect(page.locator(".smartyAddress__verifyBadge_positive")).toHaveText("Verified");
	});
});
