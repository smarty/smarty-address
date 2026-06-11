// =====================================================================
// GENERIC RESULT SURFACING — the portable, host-agnostic result UI.
//
// Design contract (mirrors how the plugin's chameleon dropdown already
// behaves: it reads the host input and themes itself rather than imposing
// Smarty's brand):
//
//   1. INHERIT, DON'T IMPOSE.  Root sets `font: inherit` + `color: inherit`,
//      so type face, size and text color always match the host form.
//   2. SEMANTICS LIVE IN THE ICON + ACCENT RULE, NEVER THE TEXT. The only
//      asserted colors are status hues (green / amber / red) carried by the
//      icon, a thin rule and a tint. Headings and body copy stay currentColor
//      so they're legible on a white gov form OR a near-black dashboard.
//   3. TINTS ARE color-mix(... transparent). Backgrounds let the host surface
//      show through — no hard-coded white/gray that breaks in dark mode.
//   4. ACTIONS INHERIT THE HOST ACCENT (--sa-accent), not Smarty blue.
//   5. RADIUS + DENSITY INHERIT (--sa-radius). A square gov field stays
//      square; a pill-rounded SaaS field stays rounded.
//
// Everything below consumes only: inherited font/color, currentColor,
// --sa-accent, --sa-accent-fg, --sa-radius, --sa-field-bg. No design-system
// tokens, no brand hexes. That's what makes it drop into anything.
// =====================================================================

// Status hue per tone. Chosen mid-saturation so the icon reads on both a
// white surface and a near-black one. Everything else is derived from these
// via color-mix, so a host could override --sa-pos/--sa-warn/--sa-neg too.
const GR_HUE = {
  positive: 'var(--sa-pos, #1e9e57)',
  info:     'var(--sa-info, #2a7de1)',
  warning:  'var(--sa-warn, #d2891b)',
  negative: 'var(--sa-neg, #d6485a)',
};
const GR_ICON = { positive: 'check_circle', info: 'info', warning: 'alert', negative: 'alert' };

// tint(): a translucent wash of the status hue. transparent second stop means
// the HOST surface shows through, so it works on light and dark alike.
function tint(tone, pct) { return `color-mix(in srgb, ${GR_HUE[tone]} ${pct}%, transparent)`; }

// =====================================================================
// ANNOTATION LAYER — a meta overlay (toggled globally) that shows WHERE the
// plugin would insert the note in the host DOM. Deliberately styled OUTSIDE
// the host palette (violet "inspector" accent + mono) so it reads as a
// developer overlay, not part of the form.
//   AnnotateContext — global on/off (provided by App, driven by the toggle)
//   AnchorContext   — the resolved anchor for THIS board (provided per board)
// =====================================================================
const ANNOT = '#7c3aed';
const AnnotateContext = React.createContext(false);
const AnchorContext = React.createContext(null);

// Maps a result type to the host field the note anchors to + the real plugin
// selector that locates it. Mirrors the insertion logic discussed: the
// note lands beside the field its result concerns.
function anchorForType(type) {
  if (type.key === 'error') {
    // Silent — nothing rendered; the aria-live region announces from the form root.
    return { key: 'street', selectorName: 'liveRegion', place: 'afterend', note: 'silent · aria-live only' };
  }
  if (type.key === 'ambiguous') {
    // Chooser — sits beneath the street field where the match is unresolved.
    return { key: 'street', selectorName: 'streetSelector', place: 'afterend', note: 'chooser' };
  }
  if (type.key === 'undeliverable') {
    // Undeliverable is fail-open — sits after the last field but never gates submit.
    return { key: 'zip', selectorName: 'postalCodeSelector', place: 'afterend', note: 'non-blocking' };
  }
  if (type.needsInput === 'secondary') {
    // Unit required / unrecognized — anchored to the secondary field.
    return { key: 'secondary', selectorName: 'secondarySelector', place: 'afterend' };
  }
  // Corrections, flagged, plain verified — anchored to the street field.
  return { key: 'street', selectorName: 'streetSelector', place: 'afterend' };
}

// Small violet pill that tags the anchored field.
function AnchorTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35em',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '10px', fontWeight: 600, letterSpacing: '0.02em',
      color: '#fff', background: ANNOT, borderRadius: '999px',
      padding: '0.15em 0.55em 0.15em 0.45em', lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: '#fff' }} />
      note anchors here
    </span>
  );
}

// Caption strip shown above the note when annotations are on — names the
// selector + insertAdjacentElement call the plugin would use.
function AnchorCaption({ anchor }) {
  if (!anchor) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5em', flexWrap: 'wrap',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '11px', lineHeight: 1.5, color: ANNOT,
      marginTop: '0.7em', marginBottom: '-0.1em',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 15, height: 15, flexShrink: 0,
      }} aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ANNOT} strokeWidth="2">
          <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill={ANNOT} stroke="none" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" strokeLinecap="round" />
        </svg>
      </span>
      <span><b style={{ fontWeight: 700 }}>{anchor.selectorName}</b> · insertAdjacentElement(<span style={{ color: '#0b7a4b' }}>'{anchor.place}'</span>)
        {anchor.note ? <span style={{ opacity: 0.7 }}> — {anchor.note}</span> : null}</span>
    </div>
  );
}

// =====================================================================
// ATOMS
// =====================================================================

// Status glyph in a soft tinted disc. Disc + icon are the only saturated color.
function StatusGlyph({ tone, size = 34 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: tint(tone, 16),
    }}>
      <Icon name={GR_ICON[tone]} size={Math.round(size * 0.58)} style={{ color: GR_HUE[tone] }} />
    </span>
  );
}

// Inherited-accent action button. Primary fills with the host accent;
// secondary is a hairline using currentColor. No brand color anywhere.
function GAction({ children, primary, danger, onClick, full }) {
  const base = {
    appearance: 'none', font: 'inherit', fontWeight: 600, fontSize: '0.92em',
    lineHeight: 1, cursor: 'pointer', padding: '0.7em 1.05em',
    borderRadius: 'var(--sa-radius, 6px)', transition: 'opacity .12s, background .12s',
    width: full ? '100%' : 'auto', textAlign: 'center', whiteSpace: 'nowrap',
  };
  if (primary) {
    return (
      <button onClick={onClick} style={{
        ...base, border: '1px solid transparent',
        background: danger ? GR_HUE.negative : 'var(--sa-accent, currentColor)',
        color: danger ? '#fff' : 'var(--sa-accent-fg, #fff)',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>{children}</button>
    );
  }
  return (
    <button onClick={onClick} style={{
      ...base, background: 'transparent', color: 'inherit',
      border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 7%, transparent)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{children}</button>
  );
}

// Address one-liner. Changed tokens are marked with the positive hue via
// underline + weight — NOT a highlight fill (yellow fills die on dark hosts).
function GDiff({ addr, changed = [], muted }) {
  if (!addr) return null;
  const tok = (k, txt) => {
    const on = changed.includes(k);
    return (
      <span key={k} style={{
        fontWeight: on ? 700 : 'inherit',
        textDecoration: on ? 'underline' : 'none',
        textDecorationColor: on ? GR_HUE.positive : 'transparent',
        textUnderlineOffset: '2px', textDecorationThickness: '2px',
        color: 'inherit',
      }}>{txt}</span>
    );
  };
  return (
    <span style={{
      fontSize: '0.95em', lineHeight: 1.5,
      color: muted ? 'color-mix(in srgb, currentColor 55%, transparent)' : 'inherit',
    }}>
      {tok('street', addr.street)}
      {addr.secondary ? <>, {tok('secondary', addr.secondary)}</> : null}
      {', '}{tok('city', addr.city)}, {tok('state', addr.state)} {tok('zip', addr.zip)}
    </span>
  );
}

// "USPS standardized" style label row used inside notes/panels.
function GFieldLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.7em', fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.35em',
    }}>{children}</div>
  );
}

// Optional, opt-in attribution. Off by default — many hosts won't want it.
function PoweredBy() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4em',
      fontSize: '0.66em', letterSpacing: '0.08em', textTransform: 'uppercase',
      opacity: 0.45, fontWeight: 600,
    }}>
      verified by smarty
    </span>
  );
}

// Generic ARIA-only state (Type 8 · error). The user sees nothing; this dashed
// strip is a PROTOTYPE-ONLY rendering of what the aria-live region announces,
// plus a reminder that submit proceeds (fail-open). Host palette, no brand.
function GAriaOnly({ text }) {
  return (
    <div role="status" style={{
      font: 'inherit', color: 'inherit', marginTop: '0.6em', display: 'flex', gap: '0.6em',
      padding: '0.75em 0.9em', borderRadius: 'var(--sa-radius, 6px)',
      border: '1px dashed color-mix(in srgb, currentColor 30%, transparent)',
      background: 'color-mix(in srgb, currentColor 3%, transparent)',
    }}>
      <Icon name="chat" size={16} style={{ opacity: 0.5, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.66em', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.55, marginBottom: '0.4em' }}>
          Nothing shown · aria-live="polite"
        </div>
        <div style={{ fontSize: '0.9em', lineHeight: 1.45 }}>“{text}”</div>
        <div style={{ fontSize: '0.82em', opacity: 0.6, marginTop: '0.35em' }}>Fail-open — submit proceeds.</div>
      </div>
    </div>
  );
}

// Generic candidate chooser (Type 6 · ambiguous). Works with no dropdown —
// the lightweight verification-only fallback (PRD Q4). Inherits host accent.
function GChooser({ candidates, sel, onSel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', marginTop: '0.7em' }}>
      {candidates.map((c, i) => {
        const on = sel === i;
        return (
          <button key={i} onClick={() => onSel(i)} style={{
            appearance: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
            display: 'flex', gap: '0.6em', alignItems: 'center', width: '100%',
            padding: '0.6em 0.7em', borderRadius: 'var(--sa-radius, 6px)',
            background: on ? tint('positive', 9) : 'var(--sa-field-bg, color-mix(in srgb, currentColor 3%, transparent))',
            border: `1.5px solid ${on ? 'var(--sa-accent, currentColor)' : 'color-mix(in srgb, currentColor 16%, transparent)'}`,
            transition: 'border .12s, background .12s',
          }}>
            <span style={{
              width: 15, height: 15, borderRadius: 999, flexShrink: 0,
              border: `2px solid ${on ? 'var(--sa-accent, currentColor)' : 'color-mix(in srgb, currentColor 35%, transparent)'}`,
              background: on ? 'var(--sa-accent, currentColor)' : 'transparent',
              boxShadow: on ? 'inset 0 0 0 3px var(--sa-field-bg, #fff)' : 'none',
            }} />
            <GDiff addr={c} />
          </button>
        );
      })}
    </div>
  );
}

// =====================================================================
// PATTERN 1 — INLINE NOTE  (the universal default)
// A block that sits directly beneath the field. Lowest assumptions about
// host layout; works in one-column and two-column forms alike.
// =====================================================================
function ResultNote({ type, branded }) {
  const isError = type.key === 'error';
  const isAmbiguous = type.key === 'ambiguous';
  const isCorrection = type.key === 'corrected';
  const isFlagged = type.key === 'flagged';
  const isUndeliverable = type.key === 'undeliverable';
  const needsUnit = type.needsInput === 'secondary';
  const [unit, setUnit] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const annotate = React.useContext(AnnotateContext);
  const anchor = React.useContext(AnchorContext);

  // Type 8 · ERROR — silent. No visible note; aria-live announces.
  if (isError) {
    return (
      <>
        {annotate && anchor && <AnchorCaption anchor={anchor} />}
        <GAriaOnly text="Address verification is unavailable right now — your address was kept as entered." />
      </>
    );
  }

  let heading, sub, body;
  if (isUndeliverable) {
    heading = 'We couldn’t verify this address';
    sub = type.guidance;
    body = (
      <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.85em', flexWrap: 'wrap' }}>
        <GAction primary>Edit address</GAction>
        <GAction>Keep as entered</GAction>
      </div>
    );
  } else if (isAmbiguous) {
    heading = 'More than one match';
    sub = type.guidance;
    body = (
      <>
        <GChooser candidates={type.candidates} sel={sel} onSel={setSel} />
        <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.7em' }}>
          <GAction primary>Use selected</GAction>
        </div>
      </>
    );
  } else if (needsUnit) {
    heading = type.flagUnit ? 'We couldn’t verify the unit' : 'Add a unit number';
    sub = type.guidance;
    body = (
      <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.85em' }}>
        <input value={unit} onChange={e => setUnit(e.target.value)} placeholder={type.flagUnit ? type.entered.secondary : 'Apt, suite, unit…'}
          style={{
            flex: 1, minWidth: 0, font: 'inherit', fontSize: '0.95em', padding: '0.6em 0.7em',
            borderRadius: 'var(--sa-radius, 6px)', color: 'inherit',
            background: 'var(--sa-field-bg, color-mix(in srgb, currentColor 4%, transparent))',
            border: '1px solid color-mix(in srgb, currentColor 24%, transparent)', outline: 'none',
          }} />
        <GAction primary>{type.flagUnit ? 'Recheck' : 'Confirm'}</GAction>
      </div>
    );
  } else if (isCorrection) {
    heading = 'Adjusted to the standard address';
    sub = 'Updated to the official postal format.';
    body = (
      <div style={{ marginTop: '0.85em' }}>
        <GFieldLabel>Recommended</GFieldLabel>
        <GDiff addr={type.corrected} changed={type.changed} />
        <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.85em', flexWrap: 'wrap' }}>
          <GAction primary>Use recommended</GAction>
          <GAction>Keep mine</GAction>
        </div>
      </div>
    );
  } else if (isFlagged) {
    heading = 'Deliverable, but flagged';
    sub = type.guidance;
    body = null;
  } else {
    heading = 'Address verified';
    sub = type.guidance;
    body = null;
  }

  return (
    <>
    {annotate && anchor && <AnchorCaption anchor={anchor} />}
    <div role="status" style={{
      font: 'inherit', color: 'inherit', marginTop: '0.6em',
      display: 'flex', gap: '0.7em', padding: '0.85em 0.95em',
      borderRadius: 'var(--sa-radius, 6px)',
      background: tint(type.tone, 9),
      borderLeft: `3px solid ${GR_HUE[type.tone]}`,
      outline: annotate && anchor ? `1px dashed ${ANNOT}` : 'none',
      outlineOffset: '2px',
    }}>
      <StatusGlyph tone={type.tone} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6em' }}>
          <span style={{ fontWeight: 650, fontSize: '0.98em' }}>{heading}</span>
          {branded && <PoweredBy />}
        </div>
        {sub && <div style={{ fontSize: '0.9em', lineHeight: 1.45, opacity: 0.72, marginTop: '0.2em' }}>{sub}</div>}
        {body}
      </div>
    </div>
    </>
  );
}

// =====================================================================
// PATTERN 2 — INLINE STATUS PILL  (lowest friction)
// A tiny chip rendered next to / under the field. For corrections it shows
// the new value inline; only no-match escalates wording.
// =====================================================================
function ResultPill({ type, branded }) {
  const isError = type.key === 'error';
  const isAmbiguous = type.key === 'ambiguous';
  const isCorrection = type.key === 'corrected';
  const isUndeliverable = type.key === 'undeliverable';
  const isFlagged = type.key === 'flagged';
  const [sel, setSel] = React.useState(null);

  // Type 8 · ERROR — silent.
  if (isError) return <GAriaOnly text="Address verification is unavailable right now — your address was kept as entered." />;

  const label = {
    verified: 'Verified', corrected: 'Adjusted',
    'missing-secondary': 'Unit required', 'bad-secondary': 'Check unit',
    flagged: 'Deliverable · flagged', ambiguous: 'Multiple matches',
    undeliverable: 'Undeliverable',
  }[type.key] || type.badge;

  return (
    <div style={{ font: 'inherit', color: 'inherit', marginTop: '0.55em', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.45em', alignSelf: 'flex-start',
        padding: '0.32em 0.7em 0.32em 0.45em', borderRadius: 999,
        background: tint(type.tone, 14), fontSize: '0.85em', fontWeight: 600,
      }}>
        <Icon name={GR_ICON[type.tone]} size={15} style={{ color: GR_HUE[type.tone] }} />
        {label}
      </span>
      {isCorrection && (
        <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'baseline', gap: '0.5em', flexWrap: 'wrap' }}>
          <GDiff addr={type.corrected} changed={type.changed} />
          <button style={{
            appearance: 'none', background: 'none', border: 'none', font: 'inherit',
            fontSize: '0.92em', fontWeight: 600, padding: 0, cursor: 'pointer',
            color: 'var(--sa-accent, currentColor)', textDecoration: 'underline', textUnderlineOffset: '2px',
          }}>Undo</button>
        </div>
      )}
      {isAmbiguous && (
        <>
          <GChooser candidates={type.candidates} sel={sel} onSel={setSel} />
          <span style={{ alignSelf: 'flex-start' }}><GAction primary>Use selected</GAction></span>
        </>
      )}
      {isFlagged && <span style={{ fontSize: '0.88em', opacity: 0.72 }}>Deliverable — this won’t block submit.</span>}
      {isUndeliverable && <span style={{ fontSize: '0.88em', opacity: 0.72 }}>Check for typos, or submit as entered.</span>}
      {branded && <PoweredBy />}
    </div>
  );
}

// =====================================================================
// PATTERN 3 — ANCHORED POPOVER  (floats from the field)
// For when there's no room below the field — it overlays. Same content as
// the note, with a little caret. Anchored by the host wrapper (position).
// =====================================================================
function ResultPopover({ type, branded }) {
  const isError = type.key === 'error';
  const isAmbiguous = type.key === 'ambiguous';
  const isCorrection = type.key === 'corrected';
  const isFlagged = type.key === 'flagged';
  const isUndeliverable = type.key === 'undeliverable';
  const needsUnit = type.needsInput === 'secondary';
  const [sel, setSel] = React.useState(null);

  // Type 8 · ERROR — silent, never floats.
  if (isError) return <GAriaOnly text="Address verification is unavailable right now — your address was kept as entered." />;

  let heading, sub;
  if (isUndeliverable) { heading = 'No match found'; sub = 'Check for typos, or submit as entered.'; }
  else if (isAmbiguous) { heading = 'Which address did you mean?'; sub = type.guidance; }
  else if (needsUnit) { heading = type.flagUnit ? 'Check the unit' : 'Add a unit number'; sub = type.guidance; }
  else if (isCorrection) { heading = 'Use the standardized address?'; sub = null; }
  else if (isFlagged) { heading = 'Deliverable, but flagged'; sub = type.guidance; }
  else { heading = 'Address verified'; sub = type.guidance; }

  return (
    <div style={{ position: 'relative', font: 'inherit', color: 'inherit', marginTop: '0.7em', maxWidth: 360 }}>
      <span style={{
        position: 'absolute', top: -7, left: 18, width: 12, height: 12, transform: 'rotate(45deg)',
        background: 'var(--sa-field-bg, var(--sa-pop-bg, #fff))',
        borderTop: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
        borderLeft: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
      }} />
      <div style={{
        position: 'relative', borderRadius: 'var(--sa-radius, 8px)',
        background: 'var(--sa-field-bg, var(--sa-pop-bg, #fff))',
        border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: '0.9em 1em',
      }}>
        <div style={{ display: 'flex', gap: '0.6em', alignItems: 'flex-start' }}>
          <StatusGlyph tone={type.tone} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 650, fontSize: '0.98em' }}>{heading}</div>
            {sub && <div style={{ fontSize: '0.88em', opacity: 0.72, marginTop: '0.15em', lineHeight: 1.4 }}>{sub}</div>}
            {isCorrection && (
              <div style={{ marginTop: '0.55em' }}>
                <GDiff addr={type.corrected} changed={type.changed} />
              </div>
            )}
            {isAmbiguous && <GChooser candidates={type.candidates} sel={sel} onSel={setSel} />}
            <div style={{ display: 'flex', gap: '0.45em', marginTop: '0.8em', flexWrap: 'wrap' }}>
              {isUndeliverable
                ? <><GAction primary>Edit</GAction><GAction>Keep</GAction></>
                : isAmbiguous
                ? <GAction primary>Use selected</GAction>
                : needsUnit
                ? <GAction primary>{type.flagUnit ? 'Recheck unit' : 'Add unit'}</GAction>
                : isCorrection
                ? <><GAction primary>Use it</GAction><GAction>Keep mine</GAction></>
                : isFlagged
                ? <><GAction primary>Continue</GAction><GAction>Edit</GAction></>
                : <GAction primary>Got it</GAction>}
            </div>
          </div>
        </div>
        {branded && <div style={{ marginTop: '0.7em', textAlign: 'right' }}><PoweredBy /></div>}
      </div>
    </div>
  );
}

Object.assign(window, {
  GR_HUE, GR_ICON, tint, StatusGlyph, GAction, GDiff, GFieldLabel, PoweredBy,
  GAriaOnly, GChooser,
  ResultNote, ResultPill, ResultPopover,
  AnnotateContext, AnchorContext, anchorForType, AnchorTag, AnchorCaption, ANNOT,
});
