/**
 * @jest-environment jsdom
 */
import { VerificationService } from "./VerificationService";
import { VerificationUiService } from "./VerificationUiService";
import { FormService } from "./FormService";
import { DomService } from "./DomService";
import { CSS_CLASSES } from "../constants/cssClasses";
import type { VerificationConfig } from "../interfaces";

const candidate = (analysis: Record<string, string>, components: Record<string, string> = {}) => ({
	delivery_line_1: "120 W Center St",
	last_line: "Provo UT 84601",
	components: { city_name: "Provo", state_abbreviation: "UT", zipcode: "84601", ...components },
	analysis,
});

const ambiguousCandidates = [
	candidate({ dpv_match_code: "Y", footnotes: "" }, { plus4_code: "4402" }),
	{
		...candidate({ dpv_match_code: "Y", footnotes: "" }, { plus4_code: "3108" }),
		delivery_line_1: "120 E Center St",
	},
];

const correctedCandidate = candidate(
	{ dpv_match_code: "Y", footnotes: "A#N#" },
	{ plus4_code: "4402" },
);

const FORM_HTML = `
	<form>
		<input id="street" value="120 Center St" />
		<input id="city" value="Provo" />
		<input id="state" value="UT" />
		<input id="zip" value="84601" />
	</form>`;

const okFetch = (data: unknown): typeof fetch =>
	(async () => ({ ok: true, status: 200, json: async () => data })) as unknown as typeof fetch;

function setup(verification: VerificationConfig = {}) {
	document.body.innerHTML = FORM_HTML;
	const domService = new DomService();
	const formService = new FormService();
	const verificationUiService = new VerificationUiService();
	const verificationService = new VerificationService();
	const services = { domService, formService, verificationUiService, verificationService };
	Object.values(services).forEach((service) => service.setServices(services));

	const config = {
		embeddedKey: "key",
		streetSelector: "#street",
		localitySelector: "#city",
		administrativeAreaSelector: "#state",
		postalCodeSelector: "#zip",
		autocompleteApiUrl: "",
		internationalAutocompleteApiUrl: "",
		theme: [],
		verification,
	} as never;

	formService.init(config);
	verificationUiService.init(config);
	verificationService.init(config);
	return { verificationService };
}

describe("Epic 2 — panel surface", () => {
	it("renders a full panel with the correction message", async () => {
		const { verificationService } = setup({ ui: "panel" });
		verificationService.setFetch(okFetch([correctedCandidate]));
		await verificationService.verifyCurrent("manual");

		const panel = document.querySelector(`.${CSS_CLASSES.verifyPanel}`);
		expect(panel).not.toBeNull();
		expect(panel?.querySelector(`.${CSS_CLASSES.verifyPanelMessage}`)?.textContent).toContain(
			"Adjusted",
		);
	});
});

describe("Epic 2 — ambiguous chooser (Type 6)", () => {
	it("renders a chooser listing every candidate", async () => {
		const { verificationService } = setup();
		verificationService.setFetch(okFetch(ambiguousCandidates));
		const result = await verificationService.verifyCurrent("manual");

		expect(result?.type).toBe("ambiguous");
		const options = document.querySelectorAll(`.${CSS_CLASSES.verifyChooserOption}`);
		expect(options).toHaveLength(2);
	});

	it("applies the picked candidate to the form and dismisses the chooser", async () => {
		const { verificationService } = setup();
		verificationService.setFetch(okFetch(ambiguousCandidates));
		await verificationService.verifyCurrent("manual");

		const options = document.querySelectorAll<HTMLButtonElement>(
			`.${CSS_CLASSES.verifyChooserOption}`,
		);
		options[1].click();

		expect((document.querySelector("#street") as HTMLInputElement).value).toBe("120 E Center St");
		expect(document.querySelector(`.${CSS_CLASSES.verifyChooser}`)).toBeNull();
	});

	it("first-candidate override auto-applies candidate[0] with no chooser", async () => {
		const { verificationService } = setup({ onResult: { ambiguous: "first-candidate" } });
		verificationService.setFetch(okFetch(ambiguousCandidates));
		await verificationService.verifyCurrent("manual");

		expect((document.querySelector("#street") as HTMLInputElement).value).toBe("120 W Center St");
		expect(document.querySelector(`.${CSS_CLASSES.verifyChooserOption}`)).toBeNull();
	});

	it("a customer onCorrectionOffered decision overrides the built-in chooser", async () => {
		const chosen = {
			street: "120 N Center St",
			secondary: "",
			locality: "Provo",
			administrativeArea: "UT",
			postalCode: "84601-2877",
			country: "USA",
			origin: "verification" as const,
		};
		const onCorrectionOffered = jest.fn().mockResolvedValue({ action: "choose", chosen });
		const { verificationService } = setup({ onCorrectionOffered });
		verificationService.setFetch(okFetch(ambiguousCandidates));
		await verificationService.verifyCurrent("manual");

		expect(onCorrectionOffered).toHaveBeenCalled();
		expect((document.querySelector("#street") as HTMLInputElement).value).toBe("120 N Center St");
		expect(document.querySelector(`.${CSS_CLASSES.verifyChooserOption}`)).toBeNull();
	});
});
