# Address form layouts

_Started 2026-06-04 19:34 UTC_

---

## User

These designs are pretty specific to a single UI layout (though I appreciate the different themes and design systems). The plugin needs to work across a wide variety of platforms, frameworks, design systems, and various UI implementations. Add some variety to the address form layouts to better reflect how the plugin would work on various sites.

## Assistant

_[tool: list_files]_

_[tool: local_ls]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: update_todos]_

This is a great catch. Right now all five hosts share the *exact same* field arrangement (street / apt / city-state-zip stacked) — only the paint changes. Real sites structure address forms very differently. Let me give each host its own genuine **layout**, not just its own theme.

Let me lay out the plan and rewrite `hosts.jsx` with a flexible layout system.

_[tool: write_file]_

_[tool: str_replace_edit]_

Now update the artboard sizes and subtitle in `generic-main.jsx` to fit the new varied layouts.

_[tool: update_todos]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

All five layouts render correctly and are genuinely distinct. The checkout CTA was slightly clipped at the tallest result state — let me give a few boards more headroom so the submit button is always visible when stepping to the bulkier result types.

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Each host in **Section 1** now has its own genuine address-form *structure*, not just its own paint:

- **E-commerce checkout** — the full Shopify-style form: country, first/last name pair, optional company, address + apartment, city/state/ZIP, phone — the address fields buried amid unrelated ones.
- **Material / SaaS** — autocomplete-first: a single "Start typing your address…" search box as the entry point, with structured fields below for review.
- **Dark dashboard** — a dense 2-column grid packing the whole address into two rows.
- **Bootstrap admin** — the "Address line 1 / line 2" convention with a country select.
- **Bare / legacy gov** — a numbered, fully-stacked serif form with a native state dropdown.

Under the hood `HostFields` is now layout-driven (rows of field descriptors, with `select` / `search` / text kinds and address-bound vs. decorative fields), so the portable result UI still slots in and inherits each shell correctly. The neutral host in Section 2 keeps the plain layout so that section stays about the *pattern*, not the form.

## User

Apply comment

## Assistant

_[tool: local_ls]_

_[tool: read_file]_

Good question — and since you've got the actual plugin codebase mounted, let me ground the answer in how it really works rather than guess.

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

Good question — and the mounted plugin source answers it concretely. Here's how it actually works today, and what that implies for the result note.

## What the plugin already knows

The integrator hands the plugin a set of **CSS selectors**, one per address field, in the config:

- `streetSelector`, `secondarySelector`, `localitySelector`, `administrativeAreaSelector`, `postalCodeSelector` (and an optional `searchInputSelector`).

`FormService.init()` stores those, and `DomService.findDomElement()` is just a `document.querySelector(selector)`. For forms that render late (SPAs, modals), `findDomElementWithRetry()` watches `document.body` with a `MutationObserver` until the field appears. So at the moment a result comes back, the plugin already holds a live reference to **every relevant field element** — that's the anchor.

## How placement works for the existing dropdown

The autocomplete dropdown is the precedent for the result note. Notably, `DropdownService` does **not** inject itself into the form's DOM flow:

1. It `document.body.appendChild()`s the dropdown wrapper.
2. It positions it as an **overlay against the search input's bounding rect** (`StyleService.updateDynamicStyles`, driven off the input element).
3. It keeps that position in sync by re-running on `scroll`, `resize`, and an ancestor-walking `MutationObserver` on `style`/`class` changes.

That design is deliberate: appending to `body` + absolute positioning means the plugin **never disturbs the host's grid/flex layout** — which matters enormously here, because (as the varied boards show) it has no idea whether it's inside a Bootstrap card, a 2-column dark grid, or a serif gov stack.

## So, for the result note, two viable strategies

**A. Overlay (most consistent with today's code)** — anchor to the field by its configured selector, append to `body`, position against `getBoundingClientRect()`, sync on scroll/resize/mutation. Zero assumptions about the host container. Best for the popover and modal patterns.

**B. In-flow sibling** — `anchorEl.insertAdjacentElement('afterend', note)`, where `anchorEl` is the field-group the result concerns:
- *correction / standardization* → after the **street** field (or its labeled wrapper)
- *missing/bad unit* → after the **secondary** field
- *not found / blocking* → after the **last** address field or just before the form's submit button

In-flow reads more naturally (it pushes content down instead of floating), but it's the riskier one — it can land inside a flex row or a `<label>` wrapper and break alignment, so it needs a small heuristic: walk up from the matched input to its labeled container before inserting.

**The honest tradeoff:** the inline-note pattern you commented on is the one case that *wants* in-flow placement (B) but is also the one most exposed to host-layout surprises — which is exactly why a config escape hatch (an explicit `resultContainerSelector`, falling back to "after the street field's wrapper") is the robust answer. Everything more forceful (popover/modal) should reuse the existing body-overlay machinery (A).

Want me to add a small annotation layer to the design showing, per host, which element the note anchors to?

## User

Yes

## Assistant

_[tool: read_file]_

Let me build a toggleable annotation layer. I'll wire two React contexts (a global on/off and a per-board anchor), highlight the anchor field, and caption the note with the real plugin selector + insertion call.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now wire the caption into `ResultNote` and export the new symbols:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now make `HostField` highlight the anchored field:

_[tool: str_replace_edit]_

Now wire the global toggle in `App` and the per-board anchor provider in `HostBoard`:Now close the provider and add the fixed toggle. Let me see the end of `App`:

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

The toggle renders. Now let me verify the annotations on a board by focusing one:

_[tool: save_screenshot]_

_[tool: eval_js]_

Excellent — the checkout board shows it cleanly: the **Address** field gets the dashed ring + "note anchors here" tag, and the note is captioned `streetSelector · insertAdjacentElement('afterend')`. Let me confirm the anchor *moves* with the result type. I'll step this board to "needs unit" (→ secondary) and "not found" (→ postal):

_[tool: save_screenshot]_

_[tool: eval_js]_

The focus overlay duplicates board state, so stepping there is unreliable. Let me verify the anchor logic directly against all result types instead:

_[tool: eval_js]_

All 8 result types resolve correctly — `street`/`secondary`/`postalCode` selectors as appropriate, and the street case is confirmed visually. Let me close the overlay and finalize.

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. I added a toggleable **DOM anchor annotation layer** to the Section 1 boards:

- **Per-board anchor resolution** — `anchorForType()` maps each result type to the real plugin field/selector: corrections → `streetSelector`, unit issues → `secondarySelector`, blocking "not found" → `postalCodeSelector`. It re-resolves live as you step a board's result type.
- **On the form** — the anchored field gets a violet dashed ring and a "note anchors here" pill, so you can see exactly which input the note attaches to in each layout.
- **On the note** — a violet monospace caption names the actual insertion call, e.g. `streetSelector · insertAdjacentElement('afterend')`, tying it back to how the mounted plugin already locates fields by configured selector.
- **Toggle** — a fixed bottom-center "DOM anchor points" switch (on by default) shows/hides the whole layer, rendered as a canvas sibling so pan/zoom never eats its clicks.

The violet "inspector" styling is deliberately outside every host palette so it reads as a dev overlay, not part of the form.

## User

Verifier agent check completed

## Assistant

The verifier confirmed the annotation layer renders correctly — anchored field highlight, note caption, and the working toggle all check out. Everything's in place.

## User

Apply comment

## Assistant

_[tool: str_replace_edit]_

Good call — the copy shouldn't presume the user is shipping anything, and it shouldn't claim USPS confirmation for addresses USPS doesn't even serve. Let me simplify all the messaging to be goal-neutral and only reference USPS where it's actually the distinguishing fact.

_[tool: grep]_

Now fix the remaining presumptive copy in the result components themselves:

_[tool: read_file]_

The host titles ("Shipping address", "Where should we ship?") are the *host sites'* own copy — they should stay, since they show the plugin landing in varied real contexts. It's the plugin's own messaging that needs to be neutral. Let me read the panel/modal file and fix the remaining presumptive lines:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

Let me check the panel portion of that file for any other presumptive labels:

_[tool: show_html]_

Now let me verify the updated copy renders. Reload and focus the checkout board (corrected → standardization sub):

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

The plugin's messaging is now goal-neutral: the verified state reads **"Address verified — This is a complete, valid address."** with no shipping or USPS assumption. (The "Shipping address" / "Continue to shipping" copy around it belongs to the *host* checkout site, which is correct — that's the context the plugin dropped into.)

I revised all eight result types and the note/popover/panel/modal components the same way:
- Dropped "ready to ship", "deliver", "your mail still arrives", "Ship anyway", "Shipping to".
- Dropped USPS claims where they don't apply — "confirmed by USPS", "match USPS records", "USPS requires…to deliver" became plain "valid address", "standard format", "needs a unit number".
- Kept USPS *only* where it's the actual distinguishing fact — the non-postal types still say "not a USPS address" / "isn't in the USPS database", since that's precisely what makes them different.

_[tool: done]_

Done — messaging simplified across all result types and surfaces, no console errors. The plugin's voice is now goal-neutral (no shipping/delivery assumptions), and USPS is referenced only for the non-postal cases where it's the actual distinguishing fact.

