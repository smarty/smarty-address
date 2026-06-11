// =====================================================================
// GENERIC RESULT SURFACING — confirmation panel + modal patterns.
// Same contract as generic-result.jsx: inherit font/color, semantics in the
// icon + rule only, accent + radius inherited, tints via color-mix.
// Branches keyed to the PRD §7 result KEY (not tone heuristics).
// =====================================================================

// =====================================================================
// PATTERN 4 — CONFIRMATION PANEL  (highest clarity)
// The classic "you entered vs. recommended" chooser, rendered as an inline
// expansion of the form. Auditable; best where a wrong address is expensive.
// =====================================================================
function ResultPanel({ type, branded }) {
  const isError = type.key === 'error';
  const isAmbiguous = type.key === 'ambiguous';
  const isCorrection = type.key === 'corrected';
  const isFlagged = type.key === 'flagged';
  const isUndeliverable = type.key === 'undeliverable';
  const needsUnit = type.needsInput === 'secondary';

  const [sel, setSel] = React.useState('rec');
  const [cand, setCand] = React.useState(0);
  const [unit, setUnit] = React.useState('');

  // Type 8 · ERROR — silent.
  if (isError) return <GAriaOnly text="Address verification is unavailable right now — your address was kept as entered." />;

  let heading, inner;
  if (isAmbiguous) {
    heading = 'More than one match';
    inner = (
      <>
        {type.candidates.map((c, i) => (
          <PanelChoice key={i} selected={cand === i} onClick={() => setCand(i)} tag={`Match ${i + 1}`} addr={c} />
        ))}
        <div style={{ marginTop: '0.8em' }}><GAction primary full>Use selected address</GAction></div>
      </>
    );
  } else if (isUndeliverable) {
    heading = 'No match found';
    inner = (
      <>
        <PanelAddr label="You entered" addr={type.entered} />
        <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.8em', flexWrap: 'wrap' }}>
          <GAction primary>Edit address</GAction>
          <GAction>Use as entered</GAction>
        </div>
      </>
    );
  } else if (isFlagged) {
    heading = 'Deliverable, but flagged';
    inner = (
      <>
        <PanelAddr label="Verified" addr={type.corrected} />
        <div style={{ marginTop: '0.8em' }}><GAction primary full>Use this address</GAction></div>
      </>
    );
  } else if (needsUnit) {
    heading = type.flagUnit ? 'Confirm the unit' : 'Add a unit number';
    inner = (
      <>
        <PanelAddr label="Verified street" addr={{ ...type.entered, secondary: type.flagUnit ? type.entered.secondary : '' }} />
        <div style={{ display: 'flex', gap: '0.5em', marginTop: '0.8em' }}>
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder={type.flagUnit ? type.entered.secondary : 'Apt, suite, unit…'}
            style={{
              flex: 1, minWidth: 0, font: 'inherit', fontSize: '0.95em', padding: '0.6em 0.7em',
              borderRadius: 'var(--sa-radius, 6px)', color: 'inherit',
              background: 'var(--sa-field-bg, color-mix(in srgb, currentColor 4%, transparent))',
              border: '1px solid color-mix(in srgb, currentColor 24%, transparent)', outline: 'none',
            }} />
          <GAction primary>{type.flagUnit ? 'Recheck' : 'Confirm'}</GAction>
        </div>
      </>
    );
  } else if (isCorrection) {
    heading = 'Confirm your address';
    inner = (
      <>
        <PanelChoice selected={sel === 'rec'} onClick={() => setSel('rec')} tag="Recommended" tone="positive"
          addr={type.corrected} changed={type.changed} />
        <PanelChoice selected={sel === 'entered'} onClick={() => setSel('entered')} tag="As you entered"
          addr={type.entered} />
        <div style={{ marginTop: '0.8em' }}><GAction primary full>Use selected address</GAction></div>
      </>
    );
  } else {
    heading = 'Address confirmed';
    inner = (
      <>
        <PanelAddr label="Verified" addr={type.corrected || type.entered} />
        <div style={{ marginTop: '0.8em' }}><GAction primary full>Use this address</GAction></div>
      </>
    );
  }

  return (
    <div style={{
      font: 'inherit', color: 'inherit', marginTop: '0.7em',
      borderRadius: 'var(--sa-radius, 8px)', overflow: 'hidden',
      border: `1px solid ${tint(type.tone, 35)}`, background: tint(type.tone, 6),
    }}>
      <div style={{ display: 'flex', gap: '0.65em', alignItems: 'flex-start', padding: '0.95em 1em 0' }}>
        <StatusGlyph tone={type.tone} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6em' }}>
            <span style={{ fontWeight: 650, fontSize: '1.02em' }}>{heading}</span>
            {branded && <PoweredBy />}
          </div>
          <div style={{ fontSize: '0.9em', opacity: 0.72, lineHeight: 1.45, marginTop: '0.15em' }}>{type.guidance}</div>
        </div>
      </div>
      <div style={{ padding: '0.85em 1em 1em', display: 'flex', flexDirection: 'column', gap: '0.55em' }}>
        {inner}
      </div>
    </div>
  );
}

function PanelAddr({ label, addr }) {
  return (
    <div style={{
      padding: '0.7em 0.8em', borderRadius: 'var(--sa-radius, 6px)',
      background: 'var(--sa-field-bg, color-mix(in srgb, currentColor 4%, transparent))',
      border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
    }}>
      <GFieldLabel>{label}</GFieldLabel>
      <GDiff addr={addr} />
    </div>
  );
}

function PanelChoice({ selected, onClick, tag, tone = 'positive', addr, changed }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
      display: 'flex', gap: '0.65em', alignItems: 'flex-start', width: '100%',
      padding: '0.7em 0.8em', borderRadius: 'var(--sa-radius, 6px)',
      background: selected ? tint(tone, 10) : 'var(--sa-field-bg, color-mix(in srgb, currentColor 3%, transparent))',
      border: `1.5px solid ${selected ? GR_HUE[tone] : 'color-mix(in srgb, currentColor 16%, transparent)'}`,
      transition: 'border .12s, background .12s',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 999, marginTop: '0.15em', flexShrink: 0,
        border: `2px solid ${selected ? GR_HUE[tone] : 'color-mix(in srgb, currentColor 35%, transparent)'}`,
        background: selected ? GR_HUE[tone] : 'transparent',
        boxShadow: selected ? 'inset 0 0 0 3px var(--sa-field-bg, #fff)' : 'none',
      }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'inline-block', marginBottom: '0.35em', padding: '0.15em 0.6em', borderRadius: 999,
          fontSize: '0.68em', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          background: tint(tone, 16),
        }}>{tag}</span>
        <div><GDiff addr={addr} changed={changed || []} /></div>
      </span>
    </button>
  );
}

// =====================================================================
// PATTERN 5 — MODAL PROMPT  (most forceful)
// Verification gates "continue": a centered dialog interrupts to confirm a
// correction, collect a unit, choose among matches, or force acknowledgement
// of an unverified address. A silent error shows no dialog (fail-open) —
// represented here, in-prototype, by the aria-only strip.
// =====================================================================
function ResultModal({ type, branded, onClose }) {
  const isError = type.key === 'error';
  const isAmbiguous = type.key === 'ambiguous';
  const isCorrection = type.key === 'corrected';
  const isFlagged = type.key === 'flagged';
  const isUndeliverable = type.key === 'undeliverable';
  const needsUnit = type.needsInput === 'secondary';
  const [unit, setUnit] = React.useState('');
  const [cand, setCand] = React.useState(0);

  let title, sub, addrBlock, btns;
  if (isError) {
    title = 'No dialog shown';
    sub = 'Errors are silent — verification failed and submit proceeds (fail-open).';
    addrBlock = <GAriaOnly text="Address verification is unavailable right now — your address was kept as entered." />;
    btns = <GAction primary onClick={onClose}>OK</GAction>;
  } else if (isAmbiguous) {
    title = 'Which address did you mean?';
    sub = type.guidance;
    addrBlock = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
        {type.candidates.map((c, i) => (
          <PanelChoice key={i} selected={cand === i} onClick={() => setCand(i)} tag={`Match ${i + 1}`} addr={c} />
        ))}
      </div>
    );
    btns = <GAction primary onClick={onClose}>Use selected address</GAction>;
  } else if (isCorrection) {
    title = 'Confirm your address';
    sub = 'Updated to the official postal format.';
    addrBlock = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
        <PanelAddr label="Recommended" addr={type.corrected} />
        <PanelAddr label="As you entered" addr={type.entered} />
      </div>
    );
    btns = <><GAction primary onClick={onClose}>Use recommended</GAction><GAction onClick={onClose}>Use mine</GAction></>;
  } else if (needsUnit) {
    title = type.flagUnit ? 'Check the unit number' : 'A unit number is required';
    sub = type.guidance;
    addrBlock = (
      <div>
        <PanelAddr label="Verified street" addr={{ ...type.entered, secondary: type.flagUnit ? type.entered.secondary : '' }} />
        <input value={unit} onChange={e => setUnit(e.target.value)} placeholder={type.flagUnit ? type.entered.secondary : 'Apt, suite, unit…'} autoFocus
          style={{
            width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: '0.95em', marginTop: '0.6em',
            padding: '0.7em 0.8em', borderRadius: 'var(--sa-radius, 6px)', color: 'inherit',
            background: 'var(--sa-field-bg, color-mix(in srgb, currentColor 4%, transparent))',
            border: `1px solid ${GR_HUE[type.tone]}`, outline: 'none',
          }} />
      </div>
    );
    btns = <GAction primary onClick={onClose}>Confirm &amp; continue</GAction>;
  } else if (isFlagged) {
    title = 'Deliverable, but flagged';
    sub = type.guidance;
    addrBlock = <PanelAddr label="Verified" addr={type.corrected} />;
    btns = <><GAction primary onClick={onClose}>Continue anyway</GAction><GAction onClick={onClose}>Edit</GAction></>;
  } else if (isUndeliverable) {
    title = 'We couldn’t verify this address';
    sub = type.guidance;
    addrBlock = <PanelAddr label="You entered" addr={type.entered} />;
    btns = <><GAction primary onClick={onClose}>Edit address</GAction><GAction onClick={onClose}>Submit anyway</GAction></>;
  } else {
    title = 'Address verified';
    sub = type.guidance;
    addrBlock = <PanelAddr label="Verified" addr={type.corrected || type.entered} />;
    btns = <GAction primary onClick={onClose}>Looks good</GAction>;
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.2em', background: 'rgba(8,12,20,0.5)', font: 'inherit', color: 'inherit',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 360, borderRadius: 'calc(var(--sa-radius, 8px) * 1.6)',
        background: 'var(--sa-field-bg, var(--sa-pop-bg, #fff))',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: '1.25em',
      }}>
        <div style={{ display: 'flex', gap: '0.65em', alignItems: 'flex-start', marginBottom: '0.9em' }}>
          <StatusGlyph tone={type.tone} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.08em', lineHeight: 1.25 }}>{title}</div>
            <div style={{ fontSize: '0.9em', opacity: 0.72, lineHeight: 1.45, marginTop: '0.2em' }}>{sub}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            appearance: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
            opacity: 0.5, padding: 2, marginTop: -2,
          }}><Icon name="close" size={20} /></button>
        </div>
        {addrBlock}
        <div style={{ display: 'flex', gap: '0.5em', marginTop: '1em' }}>{btns}</div>
        {branded && <div style={{ marginTop: '0.85em', textAlign: 'center' }}><PoweredBy /></div>}
      </div>
    </div>
  );
}

Object.assign(window, { ResultPanel, PanelAddr, PanelChoice, ResultModal });
