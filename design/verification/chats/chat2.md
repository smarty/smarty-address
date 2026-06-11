# Generic Plugin Architecture

_Started 2026-06-03 23:40 UTC_

---

## User

These designs are pretty specific to a single UI, but the plugin needs to work across a wide variety of platforms, frameworks, design systems, and various UI implementations. Create some more generic solutions.

## Assistant

_[tool: list_files]_

_[tool: local_ls]_

I'll start by exploring what's already in the project and the attached folder to understand the context.

_[tool: read_file]_

_[tool: local_read]_

Let me explore the existing design and the plugin's source code.

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

Let me look at the existing app design files to understand what's been built so far.

_[tool: view_image]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: local_read]_

Let me read the treatment files and the plugin's theming approach to understand the design vocabulary and the real constraints.

_[tool: local_ls]_

_[tool: local_ls]_

_[tool: view_image]_

Let me look at the plugin's actual injected UI — the styles and dropdown — since that's what really renders across host sites.

_[tool: view_image]_

_[tool: local_read]_

_[tool: local_ls]_

_[tool: local_read]_

_[tool: local_copy_to_project]_

Let me see what the plugin's injected dropdown actually looks like in a real host page.

_[tool: view_image]_

_[tool: view_image]_

_[tool: questions_v2]_

This is really clarifying. I can see the whole picture now:

- The **plugin already ships a "chameleon" autocomplete dropdown** that reads the host input's colors and adapts (dark form → dark dropdown, light form → light dropdown), with a small "powered by smarty" mark.
- But the **`Address Verification.html` result-surfacing treatments** (badge / note / panel / modal for the 8 result types) were all designed *inside one beautiful, fully Smarty-branded checkout* — fixed blue buttons, smarty logo, specific type. That's the mismatch you're flagging: real installs are Shopify, WordPress, gov portals, Bootstrap admin panels, dark SaaS dashboards — the result UI can't assume any of that.

So the real design problem is: **how does the plugin surface a verification result generically, so it looks native in any host form?** Before I build, a focused round of questions so I pick the right direction.

## User

Questions timed out; go with defaults

## Assistant

_[tool: read_file]_

_[tool: read_file]_

The user didn't answer, so I'll go with sensible defaults and decide the direction myself. Let me read the remaining design files to fully absorb the existing vocabulary before I build the generic version.

_[tool: read_file]_

_[tool: read_file]_

Now let me read the result types data and the HTML loader to see how it's all assembled.

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

Let me read the HTML loader fully and check the lib/fonts for the token system.

_[tool: read_file]_

_[tool: read_file]_

Let me check the components library (icons, SmartyDot) and the CSS tokens.

_[tool: read_file]_

_[tool: local_read]_

_[tool: local_read]_

Now let me check the design-canvas API and the plugin's theming/ColorService so my "chameleon" demo is faithful to how the plugin actually adapts.

_[tool: update_todos]_

I now have a complete picture. Here's the problem and my plan:

**The mismatch:** The existing treatments are all rendered inside one fully Smarty-branded checkout (`CheckoutShell` — smarty logo, blue `#0066FF` buttons, TT Hoves font, pill radius). But the plugin injects into *arbitrary* host forms. The plugin's own dropdown already solves this with a "chameleon" approach (reads the host input color via canvas→HSL, themes itself). The result UI needs the same discipline.

**My generic design principles** (derived from how the dropdown already behaves):
1. **Inherit, don't impose** — `font: inherit`, `color: inherit`, read host accent + radius via CSS vars.
2. **Semantics live in the icon + accent rule, never the text** — green/amber/red carry meaning; headings/body use `currentColor` so they stay legible on light *or* dark hosts.
3. **Tints via `color-mix(... transparent)`** so backgrounds show the host surface through — dark-mode safe.
4. **Actions inherit the host accent**, not Smarty blue.

**Deliverable:** a design canvas proving portability — the *same* generic result component rendered inside 5 distinct host design systems, plus a library of the portable surfacing patterns.Let me build the generic result component first — this is the heart of the deliverable.

_[tool: write_file]_

_[tool: update_todos]_

Now the panel and modal patterns — the higher-clarity / more-forceful options.

_[tool: write_file]_

_[tool: update_todos]_

_[tool: write_file]_

Now the 5 host shells — each with its own font, accent, radius, and density. The proof is that the identical result component inherits each one.

_[tool: update_todos]_

_[tool: write_file]_

Now the assembly — the board component (with result-type stepper) and the two-section canvas.

_[tool: update_todos]_

Now the HTML loader. Note: the canvas itself shouldn't pull in the Smarty brand CSS as a global default — but I do need `Icon`, `RESULT_TYPES`, and the design-canvas. I'll keep `colors_and_type.css` only for the canvas chrome/fonts, since the host shells set their own fonts explicitly.

_[tool: write_file]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Excellent — the inheritance is working: checkout gets the dark CTA, Material gets the purple pill accent, the dark dashboard keeps light text with a blue accent, semantics stay in the icon + rule. Let me check the console and the rest of the canvas (bare/bootstrap hosts + section 2).Clean. Let me view the bare/bootstrap hosts and section 2 by panning the canvas.

_[tool: save_screenshot]_

_[tool: eval_js]_

`save_path` is the right param. Let me find how the canvas pans so I can inspect the other boards.

_[tool: eval_js]_

There's a per-artboard "Focus" button that opens a fullscreen overlay. Let me focus the bare-gov board and the section-2 pattern boards to inspect them.

_[tool: save_screenshot]_

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

The bare/gov host is perfect proof: serif font, square corners (radius 0), navy accent buttons, red semantics only in the icon + rule — all inherited. One bug: the stepper's result-type name wraps and clips (e.g. "Couldn't verify" → "verify" cut off). Let me make it a single truncated line, then check section 2.Now let me close the focus overlay and inspect the section-2 patterns (popover, panel, modal).

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: eval_js]_

Popover looks great — caret, green-underlined changed tokens, host-accent buttons. Let me advance to the modal pattern.

_[tool: save_screenshot]_

_[tool: eval_js]_

Confirmation panel looks great — radio choices, recommended vs. entered, green selection. One more arrow to the modal.

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

Found a real bug: the modal renders mostly empty — only the icon shows. The modal is rendered as a sibling *outside* `NeutralHost`, so it inherits color/font from the focus overlay (light text → invisible on the white dialog) and `--sa-field-bg` is undefined. I'll wrap the modal in the neutral host's own style context so it's self-sufficient everywhere.

_[tool: show_html]_

_[tool: eval_js]_

_[tool: save_screenshot]_

_[tool: str_replace_edit]_

The modal renders correctly now. But there's a logic bug: result type 3 ("Missing apt/suite — required") shows the "confirm recommended" flow instead of the unit-input flow. In `ResultModal` I check `hasRec` before `needsUnit`, but the note/panel patterns check `needsUnit` first. Since type 3's ZIP also changed, `hasRec` is true and wins. Let me fix the ordering to match.

_[tool: show_html]_

Now let me reload and confirm the stepper no longer clips and section 1 looks clean.

_[tool: delete_file]_

The stepper truncates cleanly now and all three hosts demonstrate the inheritance beautifully — especially the dark dashboard (light text via `currentColor`, amber semantic icon + rule, host-blue action buttons, tint showing the dark surface through). Let me clean up temp screenshots and finalize.

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

The original treatments were beautiful but assumed a fully Smarty-branded checkout — the exact thing a cross-platform plugin can't do. I rebuilt them around the plugin's own "chameleon" philosophy.

**`Generic Result Surfacing.html`** — a design canvas in two sections:

**1 · One component, any host.** The *same* inline-note component dropped into 5 unrelated host designs — e-commerce checkout, Material/SaaS, dark dashboard, Bootstrap admin, bare/legacy gov. It inherits each host's font, text color, accent and corner radius. The dark dashboard is the proof: light text, host-blue buttons, amber icon — all correct, zero Smarty styling.

**2 · The portable pattern set.** Five surfacing patterns by escalating force — status pill → inline note → anchored popover → confirmation panel → blocking modal — in one neutral host so only the pattern differs. Each board has an 8-result-type stepper.

The design contract that makes it portable:
- **Inherit, don't impose** — `font: inherit`, `color: inherit`, host accent + radius via CSS vars (`--sa-accent`, `--sa-radius`, `--sa-field-bg`).
- **Semantics live in the icon + rule only** — headings/body stay `currentColor`, so they're legible on white or near-black.
- **Tints via `color-mix(… transparent)`** — the host surface shows through; dark-mode safe.
- **Actions inherit the host accent**, never Smarty blue. Attribution is opt-in (off by default).

Original `Address Verification.html` is untouched. Two follow-ups if useful: (1) wire these to the live plugin's color-reading (`ColorService`) so `--sa-accent`/`--sa-radius` are sniffed from the host field automatically, and (2) add a Tweaks panel to toggle branding and swap hosts live.

