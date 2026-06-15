# ERD: Address Verification for smarty-address

**Status:** Draft — engineering design derived from `PRD-address-verification.md`
**Source of truth:** `PRD-address-verification.md` (requirements) + `release-structure-address-verification.md` (sequencing). §-refs below point at the PRD unless prefixed `RS§` (release structure).
**Scope of this doc:** the **engineering spike output** the PRD calls for in §12.3 / RS Epic 0 — exact config keys, types, hook contracts, the "current address" abstraction, submission-blocking strategy, staleness behavior, per-country threshold, and CSS variable list. It is the implementation plan that supersedes the scoping plan.

> **What this doc is and isn't.** The PRD owns _what_ and _why_ (and is deliberately non-committal on UX and defaults until prototypes settle). This ERD owns _how_: concrete TypeScript surfaces, control flow, file-by-file changes, and the test matrix. Where the PRD marks something _provisional / TBD / deferred_, this doc encodes it as a **one-line-changeable constant or config default** (§2 goal: defaults are a one-line change) rather than hard-coding it — so locking the API does not require locking the defaults.

---

## 1. Architectural Overview

Verification is an **additive** subsystem alongside autocomplete. It introduces one new service, one new config block, one new family of top-level types, and an optional UI layer. Nothing in the existing autocomplete path changes behaviorally; the only edits to existing files are additive (new config keys, new service registration, new CSS variables).

```
                          SmartyAddress (src/index.ts)
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        │                          │                            │
  ApiService              VerificationService            FormService
 (autocomplete:           (NEW — Street API:          (field population;
  US Pro + Intl v2)        US Street + Intl Street)     correction round-trip)
        │                          │                            │
        └────── shared: auth (embeddedKey), transport (fetch), error taxonomy ──────┘
                                   │
                         CurrentAddress (NEW abstraction)
                    one address-under-work, regardless of source
                                   │
                    VerificationUiService (NEW — badge / aria / panel / chooser)
                         follows DropdownService.announce() aria-live pattern
```

### 1.1 Service boundary (PRD §5 "Service boundary")

`VerificationService extends BaseService` — a **sibling** of `ApiService`, not a subclass. They share only auth (`embeddedKey`) and transport (`fetch`) and the error-name taxonomy. Rationale: the Street APIs are a different request/response shape, a different billing surface, and a different failure-handling contract (fail-open) than autocomplete; coupling them would force the "verification can run with no autocomplete" mode (PRD §4 mode 2) to drag autocomplete machinery it never uses.

Shared transport is extracted into a thin internal helper rather than inherited, so neither service is the other's base:

- **Option chosen:** a free function module `src/services/http/streetTransport.ts` (or reuse a shared `fetchJson` helper) that both services call. Auth key is passed in per-call from each service's own `init()`-stored `embeddedKey`. No shared base beyond `BaseService`.
- **Rejected:** `VerificationService extends ApiService` — violates PRD §5 and the standalone-mode requirement.

### 1.2 New services registered (`SmartyAddress.services`, `src/index.ts`)

| Service                 | Responsibility                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VerificationService`   | Street API calls (US + Intl), response normalization, result **classification** into the §7 taxonomy, behavior dispatch, dedupe, staleness tracking.          |
| `VerificationUiService` | The optional UI surfaces (badge, aria-only, panel, ambiguous chooser). Themed via CSS variables. Follows `DropdownService` DOM-creation + `announce()` style. |

Both are instantiated in the `SmartyAddress` constructor, wired via `setServices()`, and `init(mergedConfig)`'d in `SmartyAddress.init`, exactly like the existing nine services. `ServiceDependencies` (BaseService.ts) and `ServiceClassOverrides` (interfaces.ts) gain `verificationService?` / `VerificationService?` (+ UI) entries so the existing service-override mechanism (CLAUDE.md "Service Overrides") works for verification too.

---

## 2. Operating Modes & Construction (PRD §4)

`SmartyAddress.init` resolves the three modes from config:

```ts
const autocompleteOn = config.autocomplete?.enabled ?? true; // provisional default §6
const verificationOn = config.verification?.enabled ?? true; // PROVISIONAL — see §9 / RS Epic 5 gate
```

- **Neither on** → `validateConfig` warns (`console.warn`) and the plugin no-ops: no listeners attached, no services initialized beyond construction. (PRD §4 last paragraph.)
- **Autocomplete only** → today's path, untouched. `VerificationService.init` is skipped (or inits to an inert state).
- **Verification only** → `DropdownService` is **not** initialized; `VerificationService` + `VerificationUiService` init. No `address_id` anchor exists (Q8); verify operates on free-form/pasted field values.
- **Both** → full path. Selection feeds `CurrentAddress`, which verification consumes.

> **De-skew note (Q5, RS Epic 1).** Today the top-level config _is_ the autocomplete config (`streetSelector`, `embeddedKey`, etc. live at the root — interfaces.ts). We introduce a nested `autocomplete` block AND keep every existing root key working as an alias. `normalizeConfig` (src/utils/configNormalizer) folds root-level autocomplete keys into `config.autocomplete.*`. **Additive only — no existing key is removed or repurposed.** This is the one structural change to the existing surface and it is backward-compatible.

---

## 3. Configuration Schema

New `verification` block on `SmartyAddressConfig` (interfaces.ts). All keys optional; every default is a single constant in `src/constants.ts` (or a `defaultVerificationConfig` literal) so it is a one-line change per §2 / §6.

```ts
export interface VerificationConfig {
	enabled?: boolean; // provisional default true (§6, gated RS Epic 5)

	// WHEN verification fires (§5 "Trigger", §6)
	trigger?: VerificationTrigger[]; // default ["selection", "blur"]
	// "selection" — after an autocomplete pick
	// "blur"      — street/last field loses focus (handles free-form, §4 mode 2)
	// "submit"    — pre-submit hook (Epic 3); await-able
	// "manual"    — only via smartyAddress.verify()

	// WHAT happens per result KIND (§7). Not one global switch.
	onResult?: Partial<Record<VerificationResultKey, VerificationBehavior>>;

	// UI surface (§5 "UX surface", §6)
	ui?: "none" | "aria-only" | "badge" | "panel"; // default per §6: badge/cue

	failureMode?: "fail-open" | "fail-closed"; // default "fail-open" (§6)
	fieldLevelHighlighting?: boolean; // default false / atomic (§6)

	correctionPrompt?: { style?: "inline-note" | "did-you-mean" | "silent-swap" }; // TBD Q3

	// Street API endpoints (parallel to the autocomplete URLs in constants.ts)
	usStreetApiUrl?: string; // default US_STREET_API_URL
	internationalStreetApiUrl?: string; // default INTERNATIONAL_STREET_API_URL

	// Hooks (§9 Q2) — see §7
	onVerified?: (result: VerificationResult) => void | Promise<void>;
	onVerificationFailed?: (error: VerificationError) => void | Promise<void>;
	onCorrectionOffered?: (
		diff: AddressDiff,
		result: VerificationResult,
	) => void | VerificationDecision | Promise<VerificationDecision | void>;
	onBeforeSubmit?: (result: VerificationResult | null) => boolean | Promise<boolean>; // Epic 3; resolve(false) blocks submit
}
```

```ts
type VerificationTrigger = "selection" | "blur" | "submit" | "manual";
type VerificationBehavior =
	| "silent"
	| "apply-and-notify"
	| "prompt"
	| "apply-primary"
	| "warn"
	| "block"
	| "ignore"
	| "first-candidate";
type VerificationResultKey =
	| "verified"
	| "corrected"
	| "missingSecondary"
	| "secondaryNotMatched"
	| "flagged"
	| "ambiguous"
	| "undeliverable"
	| "error";
```

### 3.1 Per-type behavior defaults (PRD §7 taxonomy + per-type override shape)

These map 1:1 to `design/verification/app/result-types.jsx` (the locked §7 source of truth). Defaults live in `defaultVerificationConfig.onResult`:

| `VerificationResultKey` | Type # | Default behavior          | Allowed overrides            | Release                      |
| ----------------------- | ------ | ------------------------- | ---------------------------- | ---------------------------- |
| `verified`              | 1      | `silent`                  | —                            | R1                           |
| `corrected`             | 2      | `apply-and-notify`        | `silent` · `prompt`          | R1                           |
| `missingSecondary`      | 3      | `prompt`                  | `ignore`                     | R1                           |
| `secondaryNotMatched`   | 4      | `prompt`                  | `apply-primary` · `ignore`   | R1                           |
| `flagged`               | 5      | `warn`                    | `silent`                     | R1                           |
| `ambiguous`             | 6      | `prompt`                  | `first-candidate` · `ignore` | **R2**                       |
| `undeliverable`         | 7      | `warn`                    | `block` · `silent`           | R1 (warn) / **R3** (`block`) |
| `error`                 | 8      | governed by `failureMode` | —                            | R1                           |

> **Validation guard.** `validateConfig` rejects a `block` override on any type before Epic 3 ships it, and rejects `ui: "panel"` / `onResult.ambiguous` before Epic 2 — with a clear "not yet supported in this version" warning rather than silent no-op. This keeps each release self-contained (RS "usable on its own") without pretending to support unbuilt behaviors.

---

## 4. Type System (PRD §8)

New top-level types in `src/interfaces.ts` (the PRD §14 designated home). `VerificationResult` is **its own top-level structure, not nested in `AutocompleteSuggestion`** (PRD §5 "Result storage").

```ts
// Deliverability, normalized across US + Intl into one enum the behavior
// dispatcher keys on. Raw signals preserved in `.raw` for debugging/hooks.
export type DeliverabilityCode =
	| "deliverable" // type 1/2
	| "deliverable-missing-secondary" // type 3
	| "deliverable-bad-secondary" // type 4
	| "deliverable-flagged" // type 5
	| "ambiguous" // type 6
	| "undeliverable" // type 7
	| "unknown"; // type 8 (error)

export interface AddressDiff {
	// field key -> {from, to}; only changed fields present.
	// honors verification.fieldLevelHighlighting (atomic vs per-field).
	changes: Partial<Record<AddressField, { from: string; to: string }>>;
	changedFields: AddressField[];
}
type AddressField =
	| "street"
	| "secondary"
	| "locality"
	| "administrativeArea"
	| "postalCode"
	| "country";

export interface VerificationResult {
	type: VerificationResultKey; // the §7 classification (drives behavior)
	code: DeliverabilityCode;
	entered: CurrentAddress; // what the user had
	corrected: CurrentAddress | null; // standardized form (null for 6/7/8)
	diff: AddressDiff | null; // entered -> corrected
	candidates?: CurrentAddress[]; // type 6 only
	nonBlocking: boolean; // types 5,7,8 -> never gate submit
	raw: UsStreetResult | InternationalStreetResult; // untouched API payload
	source: "us" | "international";
}

export interface VerificationError {
	kind: "network" | "auth" | "quota" | "parse" | "unknown";
	message: string;
	failureMode: "fail-open" | "fail-closed";
	cause?: unknown;
}

// Result of a hook/chooser deciding what to do with a correction/candidate.
export interface VerificationDecision {
	action: "accept" | "reject" | "choose";
	chosen?: CurrentAddress; // for action "choose" (ambiguous/did-you-mean)
}
```

### 4.1 The "current address" abstraction (PRD §8, §9 Q6)

A single concept for _the address being worked with_, regardless of where it came from. This is the seam that lets verification run identically in all three modes.

```ts
export interface CurrentAddress {
	street: string;
	secondary: string;
	locality: string; // city
	administrativeArea: string; // state / region / province
	postalCode: string;
	country: string; // resolved ISO code

	origin: "autocomplete" | "free-form" | "verification";
	address_id?: string; // present only when origin === "autocomplete" (Intl anchor)
	verifiedAt?: number; // set after a successful verify; cleared on staleness
}
```

- **Why a new type rather than reuse `AutocompleteSuggestion`:** `AutocompleteSuggestion` (interfaces.ts:119) is shaped by the autocomplete responses (`street_line`, `entries`, `metadata`) and only exists when a dropdown ran. Verification must work from raw form fields with no suggestion. `CurrentAddress` is the normalization target for **all** sources; adapters convert into it:
  - `fromSuggestion(s: AutocompleteSuggestion): CurrentAddress`
  - `fromFormFields(selectors, domService): CurrentAddress` — reads the configured `*Selector` fields (verification-only / free-form path, Q8).
  - `fromVerification(r: VerificationResult): CurrentAddress` — the corrected address becomes the new current address.
- **FormService coupling (Q6):** `FormService.populateFormWithAddress` currently takes an `AutocompleteSuggestion` (FormService.ts:120). We add `populateFormWithCurrentAddress(addr: CurrentAddress)` (or generalize the existing method to accept either via an adapter). Corrections round-trip through here (PRD §14). `getStreetFormValue` / single-field handling already exist and are reused.

---

## 5. VerificationService — API & Control Flow

### 5.1 Public surface

```ts
class VerificationService extends BaseService {
	init(config: NormalizedSmartyAddressConfig): void; // stores embeddedKey, urls, verification cfg

	// The one manual / standalone entry point (PRD §8 "standalone verify()").
	// Exposed on the instance as smartyAddress.verify(address?).
	async verify(address?: CurrentAddress | Partial<CurrentAddress>): Promise<VerificationResult>;

	// Internal trigger entry points (wired by the orchestrator):
	async verifyCurrent(trigger: VerificationTrigger): Promise<VerificationResult | null>;

	classify(
		raw: UsStreetResult | InternationalStreetResult,
		entered: CurrentAddress,
	): VerificationResult;
	isStale(addr: CurrentAddress): boolean;
}
```

`smartyAddress.verify(address?)` is added as a public method on the `SmartyAddress` class (`src/index.ts`) that delegates to `verificationService.verify`. When `address` is omitted it reads current form fields via the `fromFormFields` adapter.

### 5.2 Street API request contract

New constants in `src/constants.ts` (parallel to the existing autocomplete URLs):

```ts
export const US_STREET_API_URL = "https://us-street.api.smarty.com/street-address";
export const INTERNATIONAL_STREET_API_URL = "https://international-street.api.smarty.com/verify";
```

Both authenticate with the same embedded-key mechanism as autocomplete (`auth-id` / `key` query param + the existing `USER_AGENT` string from ApiService.ts:17). Reuse the `USER_AGENT` constant.

- **US Street:** single GET, candidate array response. Key response fields consumed (§7): `analysis.dpv_match_code`, `analysis.dpv_vacant`, `analysis.dpv_no_stat`, `analysis.footnotes`, `analysis.dpv_cmra`, the standardized `components` + `delivery_line_1`/`last_line`.
- **International Street:** GET; response carries `analysis.verification_status`, `analysis.address_precision`, `analysis.max_address_precision`, and per-component `analysis.changes.*`.

### 5.3 International ordering (PRD §5 "International ordering")

Detail fetch **first**, then verify — so verification has full components. In "both" mode an autocomplete international selection already triggers `ApiService.fetchInternationalAddressDetail` (ApiService.ts:241); the resulting fully-populated `CurrentAddress` (with `address_id`) is what `VerificationService.verify` receives. Sequencing:

```
selection (intl) → ApiService.fetchInternationalAddressDetail → CurrentAddress(full)
                 → VerificationService.verify → International Street API
```

### 5.4 Classification (`classify`) — the heart of §7

Pure function: raw API payload + entered address → `VerificationResult`. Two branch tables, one per `source`, both emitting the same `VerificationResultKey`. Logic transcribed directly from §7 / result-types.jsx:

**US** (`dpv_match_code` + footnotes):

| Condition                                                                                                      | → type                    |
| -------------------------------------------------------------------------------------------------------------- | ------------------------- |
| zero candidates **or** `dpv_match_code === "N"`                                                                | `undeliverable` (7)       |
| `dpv_match_code ∈ {Y,S,D}` **and** (`dpv_vacant==="Y"` ∥ `dpv_no_stat==="Y"` ∥ footnote `R7`)                  | `flagged` (5)             |
| `dpv_match_code === "D"` (footnote `N1`)                                                                       | `missingSecondary` (3)    |
| `dpv_match_code === "S"`                                                                                       | `secondaryNotMatched` (4) |
| multiple candidates returned                                                                                   | `ambiguous` (6)           |
| `dpv_match_code ∈ {Y,S,D}` **and** correction footnotes present (`A#`,`B#`,`M#`,`N#`,`L#`/`K#`, or ZIP4 added) | `corrected` (2)           |
| `dpv_match_code === "Y"`, no correction footnotes, components match, not vacant/no-stat                        | `verified` (1)            |

> Order matters: evaluate `undeliverable` → `flagged` → secondary cases → `ambiguous` → `corrected` → `verified`. Encode as ordered guard clauses (CLAUDE.md "early returns over nesting"). Footnote parsing → a named helper `parseUsFootnotes(s): Set<string>`; the footnote-class lists become named constants (CLAUDE.md "name magic numbers").

**International** (`verification_status` + `address_precision` + `changes`):

| Condition                                                                                                   | → type                    |
| ----------------------------------------------------------------------------------------------------------- | ------------------------- |
| `verification_status === "None"` ∥ `address_precision === "None"`                                           | `undeliverable` (7)       |
| `verification_status === "Ambiguous"`                                                                       | `ambiguous` (6)           |
| `changes.sub_building === "Unrecognized"`                                                                   | `secondaryNotMatched` (4) |
| `verification_status === "Partial"` **and** `address_precision === "Premise"` **and** `sub_building` absent | `missingSecondary` (3)    |
| `verification_status === "Verified"` **and** any `changes.* ∈ {Verified-SmallChange, Added}`                | `corrected` (2)           |
| `verification_status === "Verified"` **and** precision reached country max (Q10)                            | `verified` (1)            |

> **Type 5 (`flagged`) cannot fire internationally** — it is USPS-specific (§7 note, result-types.jsx:104). The intl branch never emits it.

> **Q10 — per-country `max_address_precision` (gates R4 / RS Epic 4).** Type 1 means _reached the country's max precision_, **not** a hard `DeliveryPoint`. `classify` compares `address_precision` against `max_address_precision` from the **same response** rather than a hard-coded `"DeliveryPoint"`. This keeps good addresses in lower-coverage countries out of Types 3/7. Engineering resolution: read `max_address_precision` off each response; no static per-country table needed. If a response omits it, fall back to a precision-rank table (`None < ... < DeliveryPoint`) and treat `>= Premise` as verified-for-country, logging the gap. **This is the R4 entry gate — confirm against live intl responses during the spike before locking.**

### 5.5 Behavior dispatch

`classify` produces `type`; the orchestrator looks up `config.verification.onResult[type]` (falling back to the §3.1 default) and dispatches:

| Behavior           | Effect                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `silent`           | apply corrected address to form (if any); no UI; fire `onVerified`.                      |
| `apply-and-notify` | apply + show non-blocking note of the diff ("Adjusted to …"); fire `onVerified`.         |
| `prompt`           | surface UI asking the user to confirm/supply (secondary / did-you-mean); await decision. |
| `apply-primary`    | apply corrected primary, keep+flag the entered unit (type 4); don't drop it.             |
| `warn`             | non-blocking caution; allow submit; fire `onVerified`.                                   |
| `block`            | (Epic 3) gate submit via `onBeforeSubmit` resolving false.                               |
| `first-candidate`  | (type 6) auto-pick candidate[0]; apply.                                                  |
| `ignore`           | no-op beyond recording the result.                                                       |

Type 8 (`error`) bypasses `onResult` and is governed by `failureMode`: **fail-open** → record, fire `onVerificationFailed`, allow submit, UI aria-only/silent (result-types.jsx:158); **fail-closed** → additionally block submit (Epic 3 semantics).

### 5.6 Triggers, dedupe, staleness

- **Wiring:** an orchestrator (in `SmartyAddress` or a small `VerificationOrchestrator`) attaches listeners per `config.verification.trigger`:
  - `selection` → hook into the existing selection path (where `onAddressSelected` fires).
  - `blur` → listener on `streetSelector` (and last address field) — this is the free-form/paste path (PRD §4 mode 2, §5 "Free-form").
  - `submit` → the await-able pre-submit hook (Epic 3, §6).
  - `manual` → only `verify()`.
- **Minimal in-memory dedupe (PRD §6, RS Epic 1):** `VerificationService` caches the last verified `CurrentAddress` fingerprint (normalized string of the 6 fields + country). A trigger whose fingerprint matches the last in-flight/completed verify is a no-op. This kills the documented `["selection","blur"]` double-call (selection then the blur it causes). **No persistent cache, no cross-field dedupe** — metering is the customer's job (§3 non-goal). Fingerprint cache is per-instance, cleared on `destroy()`.
- **Staleness / re-verification (PRD §9 Q9):** after a successful verify, `CurrentAddress.verifiedAt` is set and the verified fingerprint stored. On any edit to a watched field (`input`/`change` on the address selectors), compare the new fingerprint to the verified one:
  - **Resolution (recommend): invalidate, don't auto-re-fire.** Clear the ✓ / badge, drop `verifiedAt`, mark stale. Re-verification happens on the next configured trigger (blur/submit) — not on every keystroke. Rationale: silently re-firing on edit spends billable Street calls per keystroke with no dedupe protection (§3) and fights the user mid-edit. This is the safer default and a one-line switch (`verification.staleness?: "invalidate" | "revalidate"`, default `"invalidate"`) if product wants the other behavior.

---

## 6. Submission Blocking (Epic 3 / RS, PRD §9 Q7)

**Highest-risk area; isolated to its own release.** The plugin cannot reliably intercept native form submission across vanilla, React, Angular, Vue, and non-`<form>` checkouts by hijacking the `submit` event. Strategy:

- **Primary: an await-able `onBeforeSubmit` the integrator calls.** Customers `await smartyAddress.verifyBeforeSubmit()` (or `await onBeforeSubmit hook`) in their own submit handler; it returns a boolean (`true` = ok to submit). This works identically in every framework because the integrator owns the gate. Documented as the supported blocking path.
- **Best-effort native interception (vanilla `<form>` only):** when a real `<form>` is present and `block` is configured, attach a capturing `submit` listener that `preventDefault()`s, runs verify, and re-submits on pass. Documented as best-effort; SPA/non-form hosts must use the await-able method.
- `block` behavior and `failureMode: "fail-closed"` both route through this gate. Before Epic 3, `validateConfig` rejects `block` (§3.1 guard).

Cross-framework validation against the §11 host matrix is the Epic 3 exit criterion (RS Epic 3).

---

## 7. Hook Contracts (PRD §9 Q2)

All hooks are **async-capable** (return `void | Promise<void>` or a decision) to support customer-side modal flows (Q2). The orchestrator `await`s them.

| Hook                   | Fires when                              | Signature                                                 | Return semantics                                                                                                                                 |
| ---------------------- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onVerified`           | every completed verify (any type 1–7)   | `(r: VerificationResult) => void \| Promise<void>`        | awaited; return ignored.                                                                                                                         |
| `onVerificationFailed` | type 8 / `VerificationError`            | `(e: VerificationError) => void \| Promise<void>`         | awaited; return ignored.                                                                                                                         |
| `onCorrectionOffered`  | types 2/3/4/6 when behavior is `prompt` | `(diff, r) => VerificationDecision \| void \| Promise<…>` | if it returns a `VerificationDecision`, that overrides the built-in UI (lets customers supply their own modal). `void` → built-in UI handles it. |
| `onBeforeSubmit`       | `submit` trigger (Epic 3)               | `(r \| null) => boolean \| Promise<boolean>`              | `false` blocks submission.                                                                                                                       |

Existing autocomplete hooks (`onAddressSelected`, etc., interfaces.ts:86) are untouched. Verification hooks live on the same config object.

---

## 8. UI Layer (`VerificationUiService`)

Follows the `DropdownService` pattern: DOM creation in JS, an `aria-live` announcement region (DropdownService.ts:449 `announce()`), themed entirely via CSS variables. **No raw CSS values** — all values reference `var(--smartyAddress__…)` (CLAUDE.md). UI specifics are pending prototype review (§6, Q3/Q4) — this service is built so each surface is swappable without touching classification/dispatch.

### 8.1 Surfaces (config `verification.ui`)

| Surface           | Release | Description                                                                                                                |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `none`            | R1      | no visible UI; hooks/form-population only.                                                                                 |
| `aria-only`       | R1      | screen-reader announcements via the `announce()` region; no visible element. (Type 8 always uses this regardless of `ui`.) |
| `badge`           | R1      | small status cue near the field — ✓ (type 1/2), caution (3/4/5), warning (7).                                              |
| `panel`           | **R2**  | full inline panel: shows diff ("Adjusted to …"), secondary prompt, caution text.                                           |
| ambiguous chooser | **R2**  | candidate picker; in verification-only mode a **lightweight fallback** (no dropdown infra) — Q4.                           |

### 8.2 New CSS variables (PRD §12.3 deliverable, §14)

Declared in the appropriate `assets/styles/` file per CLAUDE.md (defaults in `base.ts`, palette in `colors.ts`, spacing in `spacing.ts`, typography/positioning in `misc.ts`), consumed in `theme.ts`. Provisional set (finalize against prototype):

- `colors.ts`: `--smartyAddress__verifyPositive`, `--smartyAddress__verifyWarning`, `--smartyAddress__verifyNegative`, `--smartyAddress__verifyBadgeBg`, `--smartyAddress__verifyBadgeText`.
- `spacing.ts`: `--smartyAddress__verifyBadgeGap`, `--smartyAddress__verifyPanelPadding`.
- `misc.ts`: `--smartyAddress__verifyBadgeFontSize`, `--smartyAddress__verifyBadgeRadius`, `--smartyAddress__verifyPanelShadow`, `--smartyAddress__verifyIconSize`.

Tones map to the `tone` field already in result-types.jsx (`positive`/`warning`/`negative`).

---

## 9. Provisional Defaults — Encoding (PRD §6)

Every default below is a single field in a `defaultVerificationConfig` literal (or `constants.ts`), changeable in one line per §2:

```ts
export const defaultVerificationConfig: Required<Pick<VerificationConfig,
  "enabled" | "trigger" | "ui" | "failureMode" | "fieldLevelHighlighting">> & {...} = {
  enabled: true,                          // PROVISIONAL — gated at RS Epic 5 public ship
  trigger: ["selection", "blur"],
  ui: "badge",
  failureMode: "fail-open",
  fieldLevelHighlighting: false,          // atomic
  onResult: { /* §3.1 table */ },
  // correctionPrompt.style: TBD (Q3) — left unset until prototype
};
```

> **`verification.enabled` billing risk (PRD §6, RS Epic 5 gate).** If verification shares the autocomplete embedded key, defaulting `enabled: true` means autocomplete-only customers start firing billable Street API calls on a version bump. **This decision is deliberately deferred to a one-line change confirmed with Product at the public ship (RS Epic 5), not locked in the API.** The code must make flipping this default a single-line edit — which the `defaultVerificationConfig` literal guarantees.

---

## 10. File-by-File Change Map

| File                                                       | Change                                                                                                                                                                                                                                                                     | Release             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `src/interfaces.ts`                                        | Add `VerificationConfig`, `VerificationResult`, `VerificationError`, `AddressDiff`, `DeliverabilityCode`, `CurrentAddress`, `VerificationDecision`, enums; add `verification?` to `SmartyAddressConfig`; add `verificationService?`/`verificationUiService?` to overrides. | R1                  |
| `src/services/BaseService.ts`                              | Add `verificationService?` + `verificationUiService?` to `ServiceDependencies`.                                                                                                                                                                                            | R1                  |
| `src/services/VerificationService.ts`                      | **New.** Street calls, `classify`, dispatch, dedupe, staleness.                                                                                                                                                                                                            | R1 (intl branch R4) |
| `src/services/VerificationUiService.ts`                    | **New.** badge/aria (R1), panel/chooser (R2), intl (R4).                                                                                                                                                                                                                   | R1+                 |
| `src/services/http/streetTransport.ts`                     | **New.** Shared auth/fetch/error helper (§1.1).                                                                                                                                                                                                                            | R1                  |
| `src/services/FormService.ts`                              | Add `populateFormWithCurrentAddress` (corrections round-trip, Q6).                                                                                                                                                                                                         | R1                  |
| `src/index.ts`                                             | Register new services in `SmartyAddress.services`; instantiate + wire + `init`; add public `verify()` and `verifyBeforeSubmit()`; mode resolution (§2).                                                                                                                    | R1 (submit R3)      |
| `src/utils/configNormalizer.ts`                            | De-skew: fold root autocomplete keys into `autocomplete.*` as aliases; normalize `verification` block.                                                                                                                                                                     | R1                  |
| `src/utils/appUtils.ts` (`validateConfig`)                 | neither-mode-on warning; reject unsupported behaviors per release (§3.1 guard).                                                                                                                                                                                            | R1                  |
| `src/constants.ts`                                         | `US_STREET_API_URL`, `INTERNATIONAL_STREET_API_URL`, `defaultVerificationConfig`, footnote-class constants.                                                                                                                                                                | R1 (intl url R4)    |
| `assets/styles/{colors,spacing,misc,base}.ts` + `theme.ts` | New CSS variables (§8.2).                                                                                                                                                                                                                                                  | R1 (panel vars R2)  |

---

## 11. Test Strategy (PRD §11, §13, Q11–Q13)

- **Unit:** `classify` is a pure function — exhaustive table tests for all 8 US rows and all intl rows (incl. the Q10 max-precision boundary and the "type 5 can't fire intl" guard). Dedupe fingerprinting; staleness invalidation; behavior dispatch per type.
- **Playwright matrix (CI, RS Epic 0 stands up the harness before any release):** the full space is `trigger × behavior × ui × 8 result-types × 5+ frameworks` — **too large to run exhaustively (Q13)**. Pick representative cells deliberately and **document the intentionally-untested combinations in the harness README — no silent coverage gaps.** Suggested anchor cells:
  - vanilla autocomplete+verify, `badge`, types 1/2/3/7 (R1)
  - vanilla verification-only (paste→blur), types 2/3/7 (R1, Q8)
  - React controlled + Angular reactive + Vue v-model, `panel`, type 6 (R2)
  - blocking submit across all frameworks (R3, Q7)
  - international country-switch mid-flow, types 1/2/3 (R4)
  - network/quota/auth error → fail-open vs fail-closed (R1, type 8)
  - edit-after-verify staleness (R1, Q9)
- **Per-public-release manual run (PRD §13):** `npm run dev` against a real embedded key — deliverable, corrected, undeliverable, network error, international. Screenshots saved under `.playwright-mcp/` per new UI state.
- **Hosted vs local harness (Q12):** decide in Epic 0; default to local Playwright in CI, hosted only if a framework host (Shopify/Wix sandbox) can't run locally.

---

## 12. Release / Epic Alignment (RS source)

This ERD is built so the R1 architecture accommodates R2–R4 with no rework (PRD §10). Mapping of ERD sections to epics:

| Epic / Release                              | ERD sections that land                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Epic 0** — Discovery & API lock           | Resolve Q3/Q4 (prototype), Q10 (live intl responses, §5.4), Q1/Q2; confirm this ERD's type/config surfaces; stand up §11 harness.       |
| **Epic 1 / R1** — Framework + US (defaults) | §1–§5 (US branch), §5.6 (dedupe + staleness), §7 hooks (minus `onBeforeSubmit`), §8 badge/aria, de-skew (§2 note), types 1–5,7(warn),8. |
| **Epic 2 / R2** — Panel + ambiguous         | §8 panel + chooser, type 6, `onResult.ambiguous`.                                                                                       |
| **Epic 3 / R3** — Blocking + pre-submit     | §6 fully, `block` override + `fail-closed`, `onBeforeSubmit`, framework matrix.                                                         |
| **Epic 4 / R4** — International             | §5.3 ordering, §5.4 intl branch (Q10 gate), intl UI.                                                                                    |
| **Epic 5** — Hardening + public ship        | full §11 matrix sweep; `verification.enabled` default + billing confirmed (§9); §12.7 housekeeping.                                     |

---

## 13. Open Questions — Engineering Disposition

| Q      | PRD area                       | Disposition in this ERD                                                                                                                   |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Q1     | defaults                       | Deferred to Product (Epic 0); encoded as one-line defaults (§9).                                                                          |
| Q2     | hook signatures                | **Proposed** async-capable signatures (§7); confirm with Product.                                                                         |
| Q3     | correction prompt style        | `correctionPrompt.style` config left unset pending prototype (§3, §8).                                                                    |
| Q4     | ambiguous chooser (verif-only) | Lightweight fallback in `VerificationUiService` (§8.1); design in Epic 0/2.                                                               |
| Q5     | de-skew config                 | **Resolved:** nested `autocomplete` block + root-key aliases, additive (§2).                                                              |
| Q6     | current-address abstraction    | **Resolved:** `CurrentAddress` + adapters; `FormService` round-trip (§4.1).                                                               |
| Q7     | submission blocking            | **Resolved (strategy):** await-able method primary; best-effort native for vanilla (§6); validate Epic 3.                                 |
| Q8     | verif-only sequencing          | **Resolved:** `fromFormFields` adapter, no `address_id` anchor; blur/submit/manual (§5.6).                                                |
| Q9     | staleness                      | **Resolved (recommend):** invalidate-on-edit, re-verify on next trigger; `staleness` switch for the alternative (§5.6).                   |
| Q10    | per-country precision          | **Resolved (approach):** compare `address_precision` to per-response `max_address_precision`; gates R4, confirm vs live responses (§5.4). |
| Q11–13 | testing                        | Matrix + documented untested cells (§11).                                                                                                 |

---

## 14. Out of Scope (PRD §3)

No built-in caching/dedupe beyond the minimal in-flight fingerprint (§5.6); no cost guardrails; no fresh-API rewrite (additive only); UX/default _finalization_ (owned by prototype + Product, not this ERD).
