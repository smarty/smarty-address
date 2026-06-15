# Epic 0 — Discovery & API Lock: Status

**Companion to:** `release-structure-address-verification.md` (Epic 0),
`PRD-address-verification.md` (§9, §12), `ERD-address-verification.md`.

Epic 0 de-risks the build before R1. Its primary output — the engineering spike
/ implementation plan with exact config keys, types, hook contracts, the
"current address" abstraction, submission-blocking strategy, staleness behavior,
per-country threshold, and CSS variable list — **is the ERD**, which is the
locked API contract that Epics 1–4 were built against.

## Exit criteria

| Exit criterion                                               | Status                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API locked**                                               | ⚠️ **Locked with caveats.** The type/config/hook surfaces are fixed (`interfaces.ts`, `defaultVerificationConfig`) and exercised by Epics 1–4 — but Q2 (hook signatures) and Q3 (correction-prompt style) are implemented as proposals, not Product/UX-confirmed, and the prototype review the release structure calls for has not happened. Changes are expected to be additive. |
| **Q1–Q9 resolved**                                           | ⚠️ **Q5–Q9 (engineering) resolved** in the ERD and implemented. **Q1–Q3 are NOT resolved** — deferred to Product (Q1, Q2) and UX prototype review (Q3); encoded as one-line-changeable defaults so the lock didn't require locking them. Q4 resolved (chooser fallback built).                                                                                                    |
| **Representative test matrix chosen + documented (Q11–Q13)** | ✅ `acceptance/README.md` — anchor cells + intentionally-untested combinations. Gap list maintained as cells land; the ERD §11 "international country-switch" anchor cell is now automated.                                                                                                                                                                                       |
| **CI test harness in place**                                 | ✅ Playwright harness (`acceptance/`, `playwright.config.ts`, `npm run test:acceptance`) wired into CI; runnable in real Chromium.                                                                                                                                                                                                                                                |

## Open-question dispositions

| Q   | Area                                                                          | Disposition                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Recommended defaults                                                          | **Deferred to Product.** Encoded as one-line-changeable `defaultVerificationConfig` (constants.ts §9). No code lock.                                                                                                                            |
| Q2  | Hook signatures (`onVerified`, `onVerificationFailed`, `onCorrectionOffered`) | **Proposed + implemented** as async-capable signatures (ERD §7, `interfaces.ts`). Confirm with Product; signatures are additive.                                                                                                                |
| Q3  | Correction-prompt style (Type 2)                                              | **Deferred to UX prototype.** `verification.correctionPrompt.style` config exists but is left unset pending prototype review (`design/verification/`). Default behavior is `apply-and-notify`.                                                  |
| Q4  | Ambiguous chooser in verification-only mode                                   | **Resolved (lightweight fallback built).** `VerificationUiService.renderChooser` is a no-dropdown candidate picker (Epic 2). Visual polish pending prototype review.                                                                            |
| Q5  | De-skew config keys                                                           | ✅ **Resolved + shipped:** nested `autocomplete` block + root-key aliases, additive (`configNormalizer`).                                                                                                                                       |
| Q6  | "Current address" abstraction                                                 | ✅ **Resolved + shipped:** `CurrentAddress` + adapters; FormService round-trip.                                                                                                                                                                 |
| Q7  | Submission blocking across frameworks                                         | ✅ **Strategy resolved + shipped:** await-able `verifyBeforeSubmit()` primary; best-effort native `<form>` interception. Cross-framework manual validation is the Epic 3 exit criterion (see matrix gaps).                                      |
| Q8  | Verification-only sequencing                                                  | ✅ **Resolved + shipped:** `fromFormFields` adapter; blur/submit/manual triggers.                                                                                                                                                               |
| Q9  | Staleness / re-verification                                                   | ✅ **Resolved + shipped:** invalidate-on-edit (default), `staleness` switch for revalidate.                                                                                                                                                     |
| Q10 | Per-country `max_address_precision`                                           | **Approach implemented; gates R4.** `classifyInternational` compares `address_precision` to the per-response `max_address_precision` (fallback: Premise minimum). **Still to confirm against live international responses** before public ship. |
| Q11 | Reference-scenario list                                                       | ⚠️ **Not yet expanded.** PRD §11 remains the starting list; expansion requires the product/customer input the PRD calls for. `acceptance/README.md` maps which §11 scenarios are automated vs. documented gaps.                                 |
| Q12 | Hosted vs local Playwright                                                    | ✅ **Decided:** local Chromium in CI by default; hosted reserved for sandboxed framework hosts.                                                                                                                                                 |
| Q13 | Config-matrix testability                                                     | ✅ Representative cells chosen; untested combinations documented (no silent gaps).                                                                                                                                                              |

## Deferred to Epic 5 (public ship)

- **`verification.enabled` default + embedded-key billing behavior** — the single
  highest-blast-radius decision. Deliberately a one-line change confirmed with
  Product at the public ship (RS Epic 5), not locked here. The
  `defaultVerificationConfig.enabled` field makes flipping it a one-line edit.
