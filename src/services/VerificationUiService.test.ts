/**
 * @jest-environment jsdom
 */
import { VerificationUiService } from "./VerificationUiService";
import { DomService } from "./DomService";
import { CSS_CLASSES } from "../constants/cssClasses";
import type { CurrentAddress, VerificationResult } from "../interfaces";

const address: CurrentAddress = {
	street: "3214 N University Ave",
	secondary: "",
	locality: "Provo",
	administrativeArea: "UT",
	postalCode: "84604-4405",
	country: "USA",
	origin: "verification",
};

const result = (overrides: Partial<VerificationResult> = {}): VerificationResult => ({
	type: "verified",
	code: "deliverable",
	entered: { ...address, postalCode: "84604" },
	corrected: address,
	diff: null,
	nonBlocking: false,
	raw: null,
	source: "us",
	...overrides,
});

function setup() {
	document.body.innerHTML = `<input id="street" value="x" />`;
	const domService = new DomService();
	const ui = new VerificationUiService();
	const services = { domService, verificationUiService: ui };
	ui.setServices(services);
	domService.setServices(services);
	ui.init({ streetSelector: "#street" } as never);
	return ui;
}

describe("VerificationUiService", () => {
	it("badge surface renders the cue next to the street field", () => {
		const ui = setup();
		ui.render(result(), "silent", { ui: "badge" });
		const badge = document.querySelector(`.${CSS_CLASSES.verifyBadge}`);
		expect(badge?.textContent).toBe("Verified");
		expect(document.querySelector("#street")?.nextElementSibling).toBe(badge);
	});

	it("aria-only surface announces but renders no badge", () => {
		const ui = setup();
		ui.render(result({ type: "corrected" }), "apply-and-notify", { ui: "aria-only" });
		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).toBeNull();
		const announcer = document.querySelector(`.${CSS_CLASSES.verifyAnnouncer}`);
		expect(announcer?.getAttribute("aria-live")).toBe("polite");
		expect(announcer?.textContent).toContain("Adjusted");
	});

	it("none surface renders nothing and does not announce", () => {
		const ui = setup();
		ui.render(result(), "silent", { ui: "none" });
		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).toBeNull();
		expect(document.querySelector(`.${CSS_CLASSES.verifyAnnouncer}`)).toBeNull();
	});

	it("error (Type 8) is always aria-only regardless of configured surface", () => {
		const ui = setup();
		ui.render(result({ type: "error", corrected: null }), "ignore", { ui: "badge" });
		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).toBeNull();
		expect(document.querySelector(`.${CSS_CLASSES.verifyAnnouncer}`)?.textContent).toContain(
			"temporarily unavailable",
		);
	});

	it("clear() removes a previously rendered badge", () => {
		const ui = setup();
		ui.render(result(), "silent", { ui: "badge" });
		ui.clear();
		expect(document.querySelector(`.${CSS_CLASSES.verifyBadge}`)).toBeNull();
	});
});
