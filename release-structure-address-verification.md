# Address Verification — Release Structure

**Status:** Proposed
**Companion to:** `PRD-address-verification.md` (source of truth; §-refs below point there)

> **Increments are internal; only Epic 5 is public.** Each epic produces a demoable,
> architecturally-complete increment, but the single **public** release lands at
> Epic 5 (subject to change). "Usable on its own" (PRD §10) means
> _internally demoable and built without rework_ — **not** publicly shipped.
> Only Epic 5 carries public-release obligations (changelog, version bump, docs
> team). Every epic still carries its own internal test coverage.

> **Epic → release map.** R-numbers track _feature scope_ (PRD §10), epics track
> _execution_. The mapping is 1:1 except at the ends: Epic 0 (discovery) → no release ·
> Epics 1–4 → R1–R4 · Epic 5 (hardening + publish) → no new feature scope. There is
> no "R5" — Epic 5 ships no new feature, only the final regression and the once-only
> public-release housekeeping.

---

## Epic 0 — Discovery & API Lock

Pre-build de-risking. Locking the API is the **output** of this epic, not an
input — it depends on resolving the open questions against working prototypes
(PRD §12.2–.3, §9).

- Finish interactive prototypes for problem states (Types 2–7), autocomplete-present
  **and** verification-only; Type 2 shows all three correction treatments side by
  side. Resolve **Q3** (correction-prompt style) and **Q4** (ambiguous-chooser
  fallback) against the prototype review. _(PRD §12.2 — "these are the mockups")_
- Confirm recommended defaults with Product; resolve **Q1, Q2**. _(Exception: the
  `verification.enabled` default + embedded-key billing behavior stays a deferred
  one-line decision, gated at Epic 5's public ship rather than locked here — PRD §6.)_
- Engineering spike against the prototypes: resolve **Q5–Q9**. Output: implementation
  plan with exact config keys, types, hook contracts, the "current address"
  abstraction, submission-blocking strategy, staleness behavior, CSS variable list.
  _(PRD §12.3)_
- Customer scenario walkthroughs — dry-run the config against §11 scenarios; adjust
  for awkward fits. _(PRD §12.5)_
- **Lock the API.**
- Stand up the acceptance-test harness (Playwright) and commit to CI **before any
  release**: expand the §11 scenario list (**Q11**), decide hosted-vs-local
  (**Q12**), and **pick the representative matrix cells** (trigger × behavior × UI ×
  result type × framework), documenting which combinations are intentionally
  untested — no silent coverage gaps (**Q13**). _(PRD §12.4)_

**Exit criteria:** API locked; **Q1–Q9** resolved; representative test matrix chosen
and documented (**Q11–Q13**); CI test harness in place.

---

## Epic 1 — R1: Framework + US Verification (defaults only)

The foundation plus the default happy path. _(PRD §10 R1 — Types 1–5; `silent`,
`hook-only`, `apply-and-notify`/`prompt` behaviors; `aria-only` + `badge` UI.)_

> **Scope note:** R1 also carries **Type 8** (error → `failureMode` dispatch) and
> **Type 7's _default_ behavior** (warn, fail-open, non-blocking), even though
> PRD §10 lists only "Types 1–5." Both are foundational, not deferrable: every
> `verify()` call can fail (Type 8), and a US flow must define _some_ behavior for
> an undeliverable address from day one (Type 7 warn). Epic 3 later adds only the
> `block` **override** on top of the Type 7 default built here — it does not
> introduce Type 7.

- Build verification foundation: `VerificationService extends BaseService`, new
  top-level types (`VerificationResult`, `VerificationError`, `AddressDiff`,
  `DeliverabilityCode`), the "current address" abstraction. _(PRD §8)_
- **De-skew the config surface (Q5 implementation):** add verification-neutral
  config keys alongside the autocomplete-first keys, keeping the old keys as
  aliases. Additive only. This lands here because every later epic builds on the
  config surface; Epic 0 resolves the _plan_ (Q5), Epic 1 ships it. _(PRD §9 Q5)_
- Build core UI elements: `badge` + `aria-only` surfaces.
- Write core business logic: result taxonomy Types 1–5, plus **Type 7 (warn,
  non-blocking)** and **Type 8 (error)**; per-type behavior dispatch governed by
  `failureMode`.
- **Trigger handling + minimal in-memory dedupe:** wire all triggers (selection,
  blur, manual `verify()`) and add the minimal in-memory dedupe so the default
  `["selection", "blur"]` doesn't fire a second billable call on the blur that
  follows a selection. _(PRD §6 — "revisit minimal in-memory dedupe before release")_
- Implement staleness / re-verification behavior — invalidate or re-trigger when the
  user edits a field after a successful verify (per the **Q9** resolution). _(PRD §9 Q9)_
- Wire up US functionality (defaults only), **in both autocomplete-present and
  verification-only modes** — verification-only (no dropdown, no `address_id`
  anchor; verify free-form/pasted addresses on blur/submit/manual) is a primary
  operating mode (PRD §4 mode 2) and ships in R1, per the **Q8** resolution. Only
  the `panel` UI and the Type 6 chooser's verification-only fallback are deferred
  to Epic 2. _(PRD §4, §9 Q8)_
- Internal test coverage for the above.

**Exit criteria:** US default flow demoable end-to-end in **both** autocomplete-present
and verification-only modes; Types 1–5, 7 (warn), and 8 covered; dedupe prevents the
selection→blur double-call; staleness behavior verified; internal tests green.

---

## Epic 2 — R2: Panel UI + Ambiguous Chooser

Non-default UI surfaces. _(PRD §10 R2 — `panel` UI + Type 6, incl. the
verification-only fallback, Q4.)_

- Build `panel` UI surface.
- Add Type 6 (ambiguous) business logic + the chooser, including the
  verification-only (no-dropdown) fallback.
- Wire up.
- Internal test coverage.

**Exit criteria:** Panel + ambiguous chooser demoable in both autocomplete-present
and verification-only modes.

---

## Epic 3 — R3: Blocking Submission + Pre-Submit Hook

**Highest-risk epic.** Cross-framework submission interception. Isolated on purpose.
_(PRD §10 R3, §9 Q7.)_

- Build the await-able pre-submit lifecycle hook.
- Add the `block` **override** on top of the Type 7 default (warn) built in Epic 1 —
  undeliverable → block, configurable per type. Type 7 itself is not introduced here.
- Validate across vanilla, React, Angular, Vue, and non-`<form>` hosts (Q7).
- Wire up.
- Internal test coverage across the framework matrix.

**Exit criteria:** Blocking submission verified across all target frameworks.

---

## Epic 4 — R4: International Verification

The last feature increment. Completes the full feature target (US + international).
_(PRD §10 R4.)_

**Gating entry criterion:** resolve **Q10** (per-country `max_address_precision`;
how Type 3/4/7 boundaries shift below `DeliveryPoint`) — explicitly flagged as
gating the international release.

- Update UI elements to support international.
- Add international business logic (detail fetch → verify ordering per §5).
- Wire up international functionality.
- Internal test coverage for the international cells (first-time testing, not
  regression — these rows have never run before this epic).

**Exit criteria:** International flow demoable end-to-end; international result types
covered; internal tests green.

---

## Epic 5 — Final Hardening + Public Release

The single public-release increment. Carries the cross-cutting regression and the
once-only housekeeping bundle, decoupled from international feature work so a Q10
slip in Epic 4 can't silently swallow the release checklist. _(PRD §10, §12.7, §13.)_

**Entry criterion:** Epics 1–4 complete (full feature target built and individually
demoable).

**Public-ship gate — confirm the `verification.enabled` default + billing behavior.**
This is the single highest-blast-radius decision and it only bites at the public
ship, so it gates _here_, not in Epic 0. If verification shares the autocomplete
embedded key, defaulting `verification.enabled: true` means autocomplete-only
customers begin firing billable Street API calls on a version bump (PRD §6). Confirm
the final default and the embedded-key billing story with Product before publish —
this is deliberately deferred as a one-line change (PRD §6) rather than locked
against an unbuilt system in Epic 0.

- **Final regression + integration hardening** — full-matrix sweep across the
  representative cells (trigger × behavior × UI × 8 result types × frameworks),
  run together for the first time. _(PRD §13, Q13.)_ Regression for the
  US/domestic cells already exercised in Epics 1–3; the international cells from
  Epic 4 get their dedicated coverage there, so this sweep validates them **in
  combination** with the rest of the matrix rather than in isolation.
- Final code review across the full feature surface.
- **Public-release housekeeping (once):** README double-check; changelog in
  `smarty/changelog` at `plugins/smarty-address-js.md`; version bump in both
  `package.json` and `src/constants.ts` `APP_VERSION`; submit to docs team.
  _(PRD §12.7.)_

**Exit criteria:** `verification.enabled` default + billing behavior confirmed with
Product; full matrix green; final review clean; public release shipped.
