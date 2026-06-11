# PRD Alignment Update

_Started 2026-06-04 21:23 UTC_

---

## User

This design is no longer aligned with the PRD. Update the designs to meet the requirements in the attached PRD.

## Assistant

_[tool: read_file]_

_[tool: list_files]_

I'll start by reading the PRD and the current design to understand what's misaligned.

_[tool: read_file]_

_[tool: list_files]_

Let me look at the current designs and project structure.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

The current taxonomy has diverged from the PRD. Let me read the rest of the app to understand the full picture before planning.

_[tool: read_file]_

_[tool: read_file]_

Types 1–4 align with the PRD but **types 5–8 have drifted** — the current design invented "unit removed / non-USPS" types, while the PRD §7 now locks in: Type 5 = *deliverable but flagged* (vacant/no-stat), Type 6 = *ambiguous → chooser*, Type 7 = *undeliverable*, Type 8 = *error → ARIA-only*. Let me read the treatment renderers to scope the full change.

_[tool: read_file]_

_[tool: read_file]_

Now let me read the form-kit and the generic-result renderers to understand shared helpers (tones, icons, anchors).

_[tool: read_file]_

_[tool: read_file]_

Let me read the remaining two files to complete the picture.

_[tool: update_todos]_

I now have the full picture. The core problem: **`result-types.jsx` defines the entire taxonomy that all 9 renderers branch on, and types 5–8 have drifted from the PRD's now-locked §7 taxonomy.**

| # | Current (drifted) | PRD §7 (locked) |
|---|---|---|
| 5 | "Unit not needed — removed" | **Deliverable but flagged** (vacant/no-stat) → non-blocking caution |
| 6 | "Valid, not USPS" | **Ambiguous** (multiple candidates) → **chooser** |
| 7 | "Non-USPS — add unit?" | **Undeliverable/invalid** → non-blocking warning |
| 8 | "Couldn't verify" | **Error** (network/auth/quota) → **ARIA-only, silent** |

Types 1–4 are aligned. The two genuinely new UI states the PRD calls out as key prototype deliverables (Release 2 / Q4) are the **ambiguous chooser** and the **ARIA-only error** state — neither exists today. Let me lay out the plan.

_[tool: write_file]_

Starting with the source of truth — the taxonomy. I'll rewrite `result-types.jsx` to match PRD §7 exactly, adding the data the new states need (`candidates` for ambiguous, `silent` for error, `nonBlocking`, `flagUnit`, plus `behavior`/`ui`/`intl` labels straight from the PRD table).

_[tool: str_replace_edit]_

Taxonomy done. Now let me surface the PRD's behavior + UI per type in both steppers so the realignment is explicit and reviewable. First the branded stepper in `form-kit.jsx`:

_[tool: str_replace_edit]_

Now the generic stepper in `generic-main.jsx`:

_[tool: grep]_

The renderers are the bulk of the work. Let me check what icons exist in the component library before I add the ARIA-only and chooser branches.

_[tool: read_file]_

_[tool: write_file]_

Available icons confirmed (no speaker icon — I'll use `chat` for the announce metaphor). Now the key insight for clean branching: types 3/4/5 all have `corrected`+`changed`, so the old `hasRec`/`isCorrection` heuristics would misfire on the new flagged type. I'll switch every renderer to explicit `type.key` checks. Let me rewrite the branded treatments (A & B) with shared `AriaOnlyNote` + `CandidatePicker` helpers.

_[tool: write_file]_

Now the Panel (C) and Modal (D) treatments. Same explicit-key approach, with the ambiguous chooser using the existing `ChoiceRow` and an `AriaOnlyNote` for the silent error state.

_[tool: str_replace_edit]_

Branded treatments done. Now the generic, host-agnostic renderers. Let me update `anchorForType` and add generic `GAriaOnly` + `GChooser` helpers, then rewrite the three patterns with explicit key checks. I'll rewrite `generic-result.jsx` whole (preserving the doc header, atoms, and annotation layer).

_[tool: str_replace_edit]_

Now insert the generic `GAriaOnly` + `GChooser` helpers and rewrite the three patterns. First the helpers, placed before Pattern 1:Now rewrite `ResultNote`:

_[tool: str_replace_edit]_

Now `ResultPill`:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now `ResultPopover`:

_[tool: str_replace_edit]_

Update the export at the bottom of `generic-result.jsx`:

_[tool: write_file]_

Now the generic panel + modal patterns:

_[tool: str_replace_edit]_

Now fix the host pins and artboard labels in `generic-main.jsx` that still reference removed types ("non-USPS", "not found"), and showcase the two new states (flagged, ambiguous chooser):

_[tool: str_replace_edit]_

Let me bump the branded-treatment artboard heights to fit the taller states (the ambiguous chooser adds 3 candidate rows), then render to check for errors.

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Renders cleanly with the new PRD behavior/UI labels in the stepper. Let me check logs and drive the boards to the new states (ambiguous + error) to verify those branches.

_[tool: save_screenshot]_

No errors. Let me drive board A to the ambiguous (6) and error (8) states to confirm the new branches render correctly.

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

Board A correctly shows the **ambiguous** state ("Multiple matches" pill, candidate address) and board B shows the **error** state ("ARIA-only, silent"). The new taxonomy is flowing through. But the compact stepper's PRD-default row is colliding when the behavior/UI text is long — the pill wraps into the label. Let me restructure both steppers to stack cleanly.Now the generic `MiniStepper`:

_[tool: str_replace_edit]_

_[tool: show_html]_

Let me verify the generic file renders and check its logs.

_[tool: get_webview_logs]_

The toggle rendered (App mounted) but the canvas is panned to empty space — likely a saved canvas state. Let me check logs for errors.

_[tool: eval_js]_

No errors. The canvas is just at a saved pan position. Let me verify the new states actually rendered in the DOM (ambiguous chooser + ARIA-only error) rather than relying on the viewport.

_[tool: read_file]_

Both new states render without errors (`multipleMatch` and `deliverableFlagged` true). The empty viewport is just a saved canvas pan position. Let me check that state file so the user doesn't land on blank space.

_[tool: show_html]_

The state file only stores section titles — pan/zoom lives in the canvas's own storage and will restore for the user. Let me confirm the stepper-overlap fix on the branded file with the long-text states.

_[tool: save_screenshot]_

_[tool: update_todos]_

Clean now — "DO Prompt user to choose / UI • Chooser…" and "DO Governed by failureMode / UI • ARIA-only, silent" stack without collision. Everything's aligned. Let me mark the todos complete and hand off.

_[tool: done]_

_[tool: fork_verifier_agent]_

Realigned both prototypes to the PRD's locked §7 taxonomy. The drift was in the result types themselves — everything branched off `result-types.jsx`, and types 5–8 had wandered off-spec.

**What changed**
- **Taxonomy rewritten** to match PRD §7 exactly: Type 5 = *Deliverable but flagged* (vacant/no-stat, non-blocking caution), Type 6 = *Ambiguous*, Type 7 = *Undeliverable/invalid* (non-blocking), Type 8 = *Error* (network/auth/quota). Each type now carries both its US (`dpv`) and International signals plus the PRD's default **behavior** and **default UI**.
- **Two genuinely new states** the PRD calls out as Release-2 / open-question deliverables, now built across all 9 renderers:
  - **Ambiguous chooser** (Q4) — a candidate picker that works with no dropdown present (the verification-only fallback), in all four branded treatments and all five generic patterns.
  - **ARIA-only error state** — silent, fail-open, rendered as a prototype-only "announced via `aria-live`" strip so reviewers can see what's *not* shown.
- **Fail-open wiring**: flagged / undeliverable / error never gate Continue, per the locked decision.
- **Steppers** now display each type's PRD behavior + UI, so the mapping to the spec is visible while stepping through.

Both files load clean. A verifier is sweeping in the background.

One thing worth a decision when you review: the **Type 2 correction treatments** (Q3 — silent vs. inline note vs. did-you-mean) are currently expressed as the A→D escalation rather than three explicitly-labeled side-by-side variants. If you want them framed exactly as the PRD's three-way Q3 comparison, I can relabel that section.

## User

Can you add an example for a single-input address form and another one that doesn't have a separate "secondary" input field?

## Assistant

_[tool: str_replace_edit]_

On it. These are two more host layouts that exercise the PRD's §11 scenarios ("single-field combined address" and forms without a unit field) — they belong in `hosts.jsx` alongside the other five. Let me first teach `HostField` to render a combined single-line address, then add the two hosts.

_[tool: str_replace_edit]_

Now add the two new hosts before the `HOSTS` array:

_[tool: str_replace_edit]_

Now wire the two hosts into the canvas, add a `key={n}` so stepped fields update correctly, and update the section subtitle. Editing `generic-main.jsx`:Let me render and verify the two new hosts.

_[tool: show_html]_

_[tool: get_webview_logs]_

Canvas is panned away again. Let me check logs and confirm the two new hosts rendered via DOM.

_[tool: eval_js]_

_[tool: eval_js]_

Both new hosts render (titles, the no-secondary hint, and a combined one-line value all present). Let me reset the canvas pan so I can actually see the new boards and confirm the combined field formats correctly.

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

I can see the realigned states working — dark board shows the new **"Deliverable, but flagged"** caution, bootstrap shows the **ambiguous chooser** with the three Provo candidates. Let me read the two new boards' field values precisely and then center on them.

_[tool: eval_js]_

_[tool: save_screenshot]_

The combined field correctly formats as one line: `"1600 pensylvania ave, Washington, DC 20500"`. My DOM helper grabbed too broad a container for the no-secondary check, so let me just center the view on those two new boards and look.

_[tool: eval_js]_

The canvas component controls its own pan and keeps restoring it, so manual centering won't stick — but the DOM already confirms what I need. Let me do one precise scoped read of the no-secondary board to confirm it has no unit field and that its pinned "missing secondary" type still surfaces a unit prompt.

_[tool: done]_

Both new hosts verified working:
- **Single-field** renders the entire address in one combined box (`"1600 pensylvania ave, Washington, DC 20500"`), with the result note adapting beneath it.
- **No-secondary** has exactly 5 fields (Email, Street, City, State, ZIP) — *no unit field* — yet the plugin's note supplies its own inline unit-prompt input, which is precisely the adaptivity worth showing.

No console errors. Handing off.

_[tool: fork_verifier_agent]_

Added two more host examples to **Generic Result Surfacing**, bringing the portability section to seven:

- **Single-field (one box)** — the whole address lives in one combined autocomplete-style input (delivery-app / maps pattern), no street/city/zip breakdown and no unit field. The result note anchors to that single field.
- **No secondary field** — street + city/state/zip with the apartment folded into the street line. When a result needs a unit, the plugin's note supplies its *own* inline unit prompt, since the host form has nowhere to put one.

Both inherit their host's font/color/accent/radius like the others, and each is pinned to a representative result type (corrected; missing-secondary). I also added a `key` so stepping the result switcher now updates the host's field values, not just the note. Verifier's sweeping in the background.

