# Address Verification — Acceptance Test Harness

Playwright harness standing up the verification acceptance matrix (RS Epic 0,
PRD §12.4 / §13, Open Questions **Q11–Q13**). Specs drive the **built IIFE
bundle** (`dist/smarty-address.iife.js`) in a real Chromium browser with an
in-page `fetch` mock returning canned Street API payloads, then assert the
resulting DOM / submit decision.

## Running

```bash
npm run test:acceptance          # builds the bundle, then runs Playwright
# or, against an existing build:
npx playwright test
```

First-time setup downloads the browser: `npx playwright install chromium`.

## The matrix (Q13)

The full space is **trigger × behavior × ui × 8 result-types × 5+ frameworks** —
far too large to run exhaustively (PRD §9 Q13). We pick representative anchor
cells deliberately and **document the intentionally-untested combinations
below** so there are no silent coverage gaps.

### Covered cells (this harness)

| # | Scenario | Trigger | UI | Result types | Notes |
|---|---|---|---|---|---|
| 1 | Vanilla verification-only | `manual` | `badge` | 1, 2, 7 | US Street; correction round-trips to the form |
| 2 | Blocking submission (Epic 3) | `manual` (`verifyBeforeSubmit`) | — | 7 (`block`) | undeliverable→block gates the submit |
| 3 | Native `<form>` interception (Epic 3) | `submit` | `badge` | 2, 7 (`block`) | real trusted click: pass → deferred re-submit; block → submission held |
| 4 | Ambiguous chooser (Epic 2) | `manual` | `panel` | 6 | chooser → pick candidate → form filled |
| 5 | Edit-after-verify staleness (Q9) | `manual` | `badge` | 1 | trusted edit clears the ✓ |
| 6 | Service error fail-open (Type 8) | `manual` | `badge`→aria | 8 | aria-only; submit allowed |
| 7 | International (Epic 4) | `manual` | `badge` | 1 | International Street API, GBR |
| 8 | Country switch mid-flow (Epic 4) | `manual` | `badge` | 1 | `countrySelector` flip re-routes US API → International API (strict per-endpoint mock) |

The in-page fetch mock has **no fallback**: a request to an unmocked endpoint
fails the test, so endpoint-routing bugs cannot pass silently.

Unit-level coverage (Jest) complements this with the **full** classification
tables (all 8 US rows + all international rows incl. the Q10 max-precision
boundary), dedupe fingerprinting, behavior dispatch per type, and config
de-skew / validation. See `src/services/Verification*.test.ts`,
`src/services/verificationEpic{2,3,4}.test.ts`, `src/utils/*.test.ts`.

### Intentionally untested here (documented gaps — Q13)

These combinations are **not** exercised by the automated browser harness yet.
They are deliberate omissions, not oversights:

- **Framework hosts** — React controlled inputs, Angular reactive forms (FormGroup),
  Vue 3 `v-model`, Shopify checkout extension (sandboxed iframe), WooCommerce /
  WordPress multi-instance. The harness validates the framework-agnostic core in
  vanilla DOM (incl. native `<form>` interception against a real trusted click);
  **per-framework validation has not been performed yet** — it remains the open
  Epic 3 exit criterion and must be recorded here when done. The supported
  blocking path (`await verifyBeforeSubmit()`) is framework-independent by
  construction.
- **`selection` + `blur` triggers in-browser** — covered at the unit level
  (selection wiring, dedupe of the selection→blur double-call incl. merged
  street+unit fields, single-field blur); the acceptance specs use the
  deterministic `manual` trigger to avoid coupling to the autocomplete dropdown.
  **Autocomplete-present verification (a live dropdown selection feeding
  verify) is not exercised in-browser at all.**
- **Types 3 (missing secondary), 4 (secondary not matched), and 5 (flagged)
  in-browser** — unit-covered only (classification + dispatch + prompt copy);
  no acceptance cell renders their UI in a real browser.
- **`failureMode: "fail-closed"` and quota/auth (4xx) errors in-browser** —
  the acceptance harness exercises only the network-500 fail-open path; the
  fail-closed gate and error-kind mapping are unit-covered.
- **`apply-and-notify` vs `prompt` vs `silent` per type** — the dispatch matrix
  is exhaustively covered in unit tests; the harness spot-checks the default
  behaviors only.
- **International types 2/3/6/7 in-browser** — unit-covered only; the
  acceptance intl cells are Type 1 (static GBR + country switch).
- **PRD §11 scenarios not yet automated anywhere** — multi-step wizard (verify
  on step transition), secondary-unit selection then verify, WooCommerce /
  Shopify / WordPress hosts. Single-field combined address is unit-covered
  (blur trigger) but has no acceptance cell.
- **Live API responses** — all Street responses here are mocked. The per-release
  manual run (PRD §13) exercises a real embedded key (deliverable, corrected,
  undeliverable, network error, international) and is the source of truth for
  **Q10** (per-country `max_address_precision`) before R4.
- **`fieldLevelHighlighting`** — atomic-only in v1 (PRD §6); per-field highlight
  is out of scope until proven.

## Hosted vs local (Q12)

Default: **local** Playwright/Chromium in CI (this harness). Hosted runners are
reserved for framework hosts that can't run locally (e.g. a Shopify/Wix sandbox),
to be added when those framework cells are automated.
