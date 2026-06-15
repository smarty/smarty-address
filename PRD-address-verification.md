# PRD: Address Verification for smarty-address

**Status:** Draft — designs in progress
**Owner:** TBD (Product) · Engineering · Design · QA
**Source:** Scoping plan "Add Address Verification to smarty-address Plugin"

> **Design note:** The UX treatments in this document (correction prompts, status
> badges, panels, ambiguous chooser) are **in-progress**. They will be decided
> against working interactive prototypes (Phase B, step 2), not finalized here.
> Anything marked _provisional_ or _TBD_ is expected to change after prototype review.

---

## 1. Summary

The plugin today wraps Smarty's **autocomplete** APIs (US Autocomplete Pro +
International Autocomplete v2). It helps users _find_ an address and fills form
fields, but never confirms deliverability or returns DPV codes, standardized
components, or corrections.

This project adds **address verification** (Smarty's US Street API + International
Street API) so customers can confirm a final address before submission. The
end-state covers both US and international; releases may be staggered, but neither
is optional in the long run.

## 2. Goals

- Let customers verify a final address and surface deliverability, standardized
  components, and corrections before form submission.
- Support verification **independently** of autocomplete (verification can run
  with no dropdown and no suggestions).
- Ship an architecture that accommodates the full feature target (US +
  international, all triggers, all behaviors, all UI surfaces) without rework,
  even though early releases ship a subset.
- Keep configuration defaults changeable as a one-line change so final default
  decisions can be deferred until there is a working build to test against.

## 3. Non-Goals

- Built-in caching, dedupe, or cost guardrails in v1 — metering is the customer's
  responsibility.
- A blanket fresh-API rewrite. Breaking changes are allowed only where justified
  (usage is low); changes are additive wherever possible.
- Finalizing UX treatments in this document — those are decided via prototype.

## 4. Operating Modes

The plugin must support three modes, selected by which products the customer
enables:

1. **Autocomplete only** — today's behavior.
2. **Verification only** — new. No dropdown, no suggestions; verify free-form or
   pasted addresses on blur/submit/manual.
3. **Both** — new. Autocomplete to find, then verification to confirm.

If neither `autocomplete.enabled` nor `verification.enabled` is `true`, the plugin
warns and effectively no-ops at construction time.

## 5. Decisions (locked)

| Area                      | Decision                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Product scope             | US + International; phased across releases, both required for "done".                                                                          |
| Independence              | Verification must work standalone; triggers and defaults adapt.                                                                                |
| Trigger                   | Configurable: on selection, on submit/blur, and manual `verify()`.                                                                             |
| Behavior on result        | Silent enrichment, inline correction prompt, blocking submission, and hook-only all supported.                                                 |
| UX surface                | Configurable per instance: status badge, ARIA-only, full inline panel, or none.                                                                |
| Free-form typed addresses | In scope — submit/blur trigger must handle them.                                                                                               |
| Metering / cost           | Customer's responsibility; no built-in caching/dedupe in v1.                                                                                   |
| Failure mode              | Fail open by default; configurable to fail closed.                                                                                             |
| Backwards compat          | Additive where possible; breaking changes allowed where justified. Verification default won't be blocked by preserving exact current behavior. |
| Service boundary          | New `VerificationService extends BaseService`, separate from `ApiService` (sharing only auth/transport at most).                               |
| Result storage            | `VerificationResult` is its own top-level structure, not nested in `AutocompleteSuggestion`.                                                   |
| International ordering    | Detail fetch first, then verification, so verify has full components.                                                                          |
| Mockups                   | Working interactive code prototypes, not static design mockups.                                                                                |

## 6. Provisional Defaults

These are **provisional** and must be a one-line change to revise after testing
against a working build.

| Config                                | Default                                                             | Rationale / Risk                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autocomplete.enabled`                | `true`                                                              | Matches existing behavior.                                                                                                                                                                                           |
| `verification.enabled`                | `true` _(provisional)_                                              | Part of the value prop. **Risk:** if verification shares the autocomplete embedded key, defaulting on means autocomplete-only customers begin firing billable Street API calls on a version bump. Decision deferred. |
| `verification.trigger`                | `["selection", "blur"]`                                             | **Note:** with no dedupe in v1, a blur right after a selection fires a second call. Revisit minimal in-memory dedupe before release.                                                                                 |
| `verification.behavior`               | Result-type dependent (see taxonomy)                                | Not a single global setting; each type overridable.                                                                                                                                                                  |
| `verification.ui`                     | Confidence cue on success (small ✓), escalating for problem results | UI specifics pending prototype.                                                                                                                                                                                      |
| `verification.failureMode`            | `"fail-open"`                                                       | Don't block users when Smarty is unreachable.                                                                                                                                                                        |
| `verification.fieldLevelHighlighting` | `false` (atomic)                                                    | Field-level highlighting is fragile across diverse forms; treat address as a unit until proven.                                                                                                                      |
| `verification.correctionPrompt.style` | **TBD**                                                             | Needs visual review (prototype) before decision.                                                                                                                                                                     |

## 7. Result Taxonomy & Behavior

Behavior is keyed to the _kind_ of result Smarty returns, not a single global
switch. Each type has a sensible default that customers can override per type.
US uses `dpv_match_code` + `footnotes`; International uses
`analysis.verification_status` + `address_precision` + per-component `changes`.
Behaviors and UI are shared; only the input signal differs.

> **Canonical encoding.** This taxonomy is also encoded as data in
> `design/verification/app/result-types.jsx` (its self-declared single source of
> truth) and transcribed into classification logic in ERD §3.1 / §5.4. Treat
> `result-types.jsx` as canonical when the three drift; update it first.

| #   | Type                     | US signal                                                                                           | International signal                                                                         | Default behavior                                             | Default UI _(provisional)_                               |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 1   | Verified, unchanged      | `dpv_match_code: Y`, no correction footnotes, components match, `dpv_vacant: N`, `dpv_no_stat: N`   | `verification_status: Verified`, precision at country max, all `changes = Verified-NoChange` | Accept silently                                              | Small ✓                                                  |
| 2   | Verified, corrected      | Deliverable (Y/S/D) but `footnotes` show standardization (`A#`, `B#`, `M#`, `N#`, `L#`/`K#`; +ZIP4) | `Verified` with `changes` = `Verified-SmallChange`/`Added`                                   | Apply correction **+ show what changed** (never silent swap) | Inline "Adjusted to …" + ✓                               |
| 3   | Missing secondary        | `dpv_match_code: D` (footnote `N1`)                                                                 | `Partial`, `address_precision: Premise`, `sub_building` absent                               | Prompt for apt/unit/suite                                    | Inline secondary prompt                                  |
| 4   | Secondary not recognized | `dpv_match_code: S`                                                                                 | `changes.sub_building: Unrecognized`                                                         | Apply primary, flag the unit (don't drop it)                 | Inline "couldn't verify unit X"                          |
| 5   | Deliverable but flagged  | `dpv_match_code: Y` with `dpv_vacant: Y`/`dpv_no_stat: Y` (or footnote `R7`)                        | _No equivalent — USPS-specific; cannot fire internationally_                                 | Warn, fail open                                              | Inline caution, non-blocking                             |
| 6   | Ambiguous                | Multiple candidates                                                                                 | `verification_status: Ambiguous`                                                             | Prompt user to choose                                        | Chooser (lightweight fallback in verification-only mode) |
| 7   | Undeliverable / invalid  | Zero candidates or `dpv_match_code: N`                                                              | `verification_status: None` and/or `address_precision: None`                                 | Warn, fail open (allow submit)                               | Inline warning, non-blocking                             |
| 8   | Error                    | Network / auth / quota failure                                                                      | Same                                                                                         | Governed by `failureMode` (fail-open default)                | ARIA-only, silent                                        |

> **International "verified" is relative to the country.** `address_precision`
> is capped per country by `max_address_precision`; some countries can never
> reach `DeliveryPoint`. Type 1 must mean _reached the country's max precision_,
> not a hard `DeliveryPoint` check — otherwise good addresses in lower-coverage
> countries get mis-classified as Type 3 or Type 7. (See Open Question Q10.)

**Per-type override shape:** finalized in **ERD §3 (config schema) and §3.1
(per-type behavior defaults)**. The override keys and allowed values there are the
canonical contract.

**Open design tensions (resolve via prototype):**

- _Type 2 correction transparency_ — silent swap vs. inline note vs. did-you-mean prompt (see Q3).
- _Type 6 ambiguous in verification-only mode_ — needs a lightweight chooser/prompt fallback (see Q4).
- _Type 7 undeliverable_ — the global `failureMode` is fail-open, but some checkout
  customers will want undeliverable specifically to **block**. Reinforces the need
  for per-type overrides.

## 8. Architecture

Specced in full in **`ERD-address-verification.md` §1–§10** (the engineering spike
output this section originally sketched): service boundary (§1), config schema
(§3), type system incl. the "current address" abstraction (§4), `VerificationService`
control flow (§5), submission blocking (§6), hook contracts (§7), UI layer + CSS
variables (§8), and the file-by-file change map (§10).

## 9. Open Questions (must resolve before locking the API)

**Product**

1. Confirm the recommended defaults with product before locking the API.
2. Exact hook signatures for `onVerified`, `onVerificationFailed`,
   `onCorrectionOffered`; async-vs-sync return semantics (likely async to support
   customer-side modal flows).

**UX** 3. Correction prompt style (Type 2): inline "Adjusted to …" note vs. did-you-mean
prompt vs. silent swap — decided against prototypes. 4. Ambiguous chooser (Type 6) in verification-only mode — design the lightweight
fallback when no dropdown is running.

**Engineering** _(Q5–Q9 resolved in the ERD; dispositions summarized in ERD §13.)_ 5. De-skew autocomplete-first config keys / README; add verification-neutral keys
alongside existing ones (keep old as aliases). Additive only.
**Resolved — ERD §2 + §13:** nested `autocomplete` block + root-key aliases. 6. "Current address" abstraction shared across autocomplete, free-form, and prior
verification; affects hook signatures and FormService coupling.
**Resolved — ERD §4.1:** `CurrentAddress` + source adapters. 7. Submission blocking across frameworks (vanilla, React, Angular, Vue, non-`<form>`);
likely an await-able pre-submit method rather than form interception.
**Resolved (strategy) — ERD §6:** await-able method primary, best-effort native
for vanilla `<form>`; cross-framework validation is the Epic 3 exit criterion. 8. Verification-only call sequencing — when it fires without an `address_id` anchor.
**Resolved — ERD §5.6:** `fromFormFields` adapter; blur/submit/manual triggers. 9. Re-verification / staleness when the user edits a field after a successful
verify: invalidate (clear ✓, require re-verify) vs. silently re-trigger.
**Resolved (recommend) — ERD §5.6:** invalidate-on-edit, re-verify on next
trigger; `staleness` switch for the alternative. 10. Per-country "verified" threshold given `max_address_precision`; how Type 3/4/7
boundaries shift below `DeliveryPoint`. Gates the international release.
**Approach in ERD §5.4** (compare precision to per-response `max_address_precision`);
**still open** — confirm against live international responses before R4.

**Testing** 11. Expand the reference-scenario list (see §11) with product/customer input. 12. Hosted vs. local Playwright harness; rock-solid coverage likely needs CI-driven
Playwright across the matrix. 13. Config-matrix testability: trigger × behavior × UI × 8 result types × 5+
frameworks is too large to cover exhaustively. Pick representative cells
deliberately and document untested combinations — no silent coverage gaps.

## 10. Phased Releases

Phasing is sequencing only; the R1 architecture must already accommodate R2–R4
without rework. Each release must be **releasable on its own** — architecturally
complete and functionally self-contained, so any release _could_ ship publicly.

The **current plan** is a single public release at R4, so public-release
housekeeping (changelog, version bump, docs team — §12.7) is done once, at that
point, not per release. This is a sequencing choice, not a constraint: if the plan
changes to ship an earlier release publicly, that release's housekeeping is done at
that time. Per-release internal test coverage applies throughout regardless (§13).
A pre-build discovery phase precedes R1 — prototypes, the engineering spike, and
API lock (§12.1–.5).

- **Release 1 — Framework + US verification.** All triggers; `silent`, `hook-only`,
  `apply-and-notify`/`prompt` behaviors; `aria-only` + `badge` UI. Covers
  Types 1, 2, 3, 4, and 5.
- **Release 2 — `panel` UI + Type 6 (ambiguous chooser)**, including the
  verification-only fallback.
- **Release 3 — `block` behavior + the await-able pre-submit method.** Highest-risk
  release — cross-framework submission interception (Q7); sequenced on its own.
- **Release 4 — International verification.** Gated on **Q10** (per-country
  `max_address_precision`). R4 completes the feature target; under the current
  single-public-release plan it is the last increment before going public. The
  final comprehensive regression sweep across the §13 matrix and the §12.7
  housekeeping may be executed either as part of R4 or as a separate post-R4
  hardening step — see the companion release-structure doc (Epic 5), which sequences
  them on their own so a Q10 slip can't stall the release checklist.

## 11. Test Scenarios (starting list — expand before locking)

Vanilla HTML (autocomplete + verification); vanilla verification-only (paste +
submit); WooCommerce checkout (multi-field, country switcher); Shopify checkout
extension (sandboxed iframe); WordPress with multiple instances; React SPA
(controlled inputs); Angular reactive forms (FormGroup); Vue 3 (v-model);
multi-step wizard (verify on step transition); single-field combined address;
secondary unit selection then verify; international with country switching
mid-flow; network failure mid-verification; quota/auth error; user edits form
after a successful verification (the test for Q9).

## 12. Phase B Workflow

1. **PRD finalization (Product)** — confirm defaults; resolve Q1, Q2.
2. **Working prototypes (Eng + Design)** — interactive prototypes of problem
   states (Types 2–7) against the dev server, autocomplete-present and
   verification-only. Type 2 shows all three correction treatments side by side
   (Q3); include the Q4 ambiguous-chooser fallback. **These are the mockups.**
3. **Engineering spike** — resolve Q6–Q10 against prototypes. Output: an
   implementation plan superseding the scoping plan, with exact config keys,
   types, hook contracts, the "current address" abstraction, submission-blocking
   strategy, staleness behavior, per-country threshold, and CSS variable list.
4. **Test scenario expansion (QA + Eng)** — expand §11; build a Playwright
   harness per scenario; commit to CI before any verification release.
5. **Customer scenario walkthroughs** — dry-run the config against every §11
   scenario before production code; adjust the API for awkward fits.
6. **Phased build & release** per §10.
7. **Per-public-release housekeeping** — done for each _actual_ public release
   (currently a single one at R4; §10): README updates; changelog in the
   `smarty/changelog` repo at `plugins/smarty-address-js.md`; version bump in both
   `package.json` and `src/constants.ts` `APP_VERSION`.

## 13. Verification & Acceptance

- Unit tests per service + CI Playwright matrix across §11 scenarios (Q11–Q13).
- Per release: end-to-end manual run via `npm run dev` against a real embedded
  key — deliverable, corrected, undeliverable, network error, international.
- Screenshots saved under `.playwright-mcp/` for each new UI state.

## 14. Critical Files (background reading)

- `src/services/ApiService.ts` — auth, request building, error handling;
  international detail flow (`fetchInternationalAddressDetail`).
- `src/services/FormService.ts` — field population; corrections round-trip here.
- `src/services/DropdownService.ts` — `aria-live` `announce()` region and
  `handleSelectDropdownItem`; new UI should follow this style.
- `src/services/BaseService.ts` — pattern the new `VerificationService` must follow.
- `src/interfaces.ts` — `SmartyAddressConfig`, `ApiConfig`,
  `AutocompleteSuggestion`; new verification types added here.
- `src/index.ts` — service registration and `SmartyAddress.services` exports.
- `assets/styles/colors.ts`, `misc.ts`, `theme.ts` — new CSS values must be
  variables in the appropriate file.
