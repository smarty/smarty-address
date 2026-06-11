// =====================================================================
// ASSEMBLY — proves the generic result UI is portable.
//
//   Section 1 · "One component, any host" — the SAME <ResultNote> rendered
//     inside five unrelated host designs. Each board is pinned to a different
//     representative result type, so one glance shows both the spread of
//     result types AND that the component inherits each host's look.
//
//   Section 2 · "The portable pattern set" — the five surfacing patterns
//     (pill → note → popover → panel → modal) in one neutral host, ordered
//     by escalating force, each with its own result-type stepper.
// =====================================================================

// Neutral host for the pattern-comparison section — quiet so the pattern,
// not the chrome, is what differs board to board.
const neutralTheme = {
  root: {
    fontFamily: 'Inter, system-ui, sans-serif', color: '#1f2328', background: '#ffffff',
    '--sa-accent': '#2563eb', '--sa-accent-fg': '#ffffff', '--sa-radius': '8px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.75em',
  titleStyle: { fontSize: '1.2em', fontWeight: 600 },
  label: { gap: '0.3em', style: { fontSize: '0.78em', fontWeight: 500, color: '#656d76' } },
  field: { style: {
    font: 'inherit', fontSize: '0.95em', padding: '0.6em 0.8em', color: 'inherit',
    background: '#fff', border: '1px solid #d0d5dd', borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.7em 1em', fontSize: '0.95em', fontWeight: 600,
  },
};
function NeutralHost({ values, changed, children }) {
  return (
    <div style={{ ...neutralTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <HostTitle theme={neutralTheme} sub="Plugin renders the result in-flow here">Shipping address</HostTitle>
      <HostFields values={values} theme={neutralTheme} changed={changed} />
      {children}
      <HostCTA theme={neutralTheme} label="Continue" />
    </div>
  );
}

// Compact result-type switcher. Neutral dark strip that sits above each host
// card (outside it, so it never inherits the host theme). Uses the status
// hue per type for the active chip.
function MiniStepper({ n, setN }) {
  const t = RESULT_TYPES[n];
  const hue = { positive: '#1e9e57', info: '#2a7de1', warning: '#d2891b', negative: '#d6485a' }[t.tone];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 10, background: '#11151c', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7d8694' }}>Smarty result type</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#aab3bf' }}>{n + 1} / 8</span>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {RESULT_TYPES.map((r, i) => {
          const on = i === n;
          const h = { positive: '#1e9e57', info: '#2a7de1', warning: '#d2891b', negative: '#d6485a' }[r.tone];
          return (
            <button key={r.n} onClick={() => setN(i)} title={r.name} style={{
              flex: 1, height: 28, borderRadius: 6, cursor: 'pointer',
              border: on ? `1.5px solid ${h}` : '1.5px solid transparent',
              background: on ? h : 'rgba(255,255,255,0.07)',
              color: on ? '#fff' : '#aab3bf', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              transition: 'all .12s',
            }}>{r.n}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: hue, flexShrink: 0 }} />
        <b style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{t.n}. {t.name}</b>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ fontSize: 11.5, lineHeight: '16px', color: '#fff' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7d8694', marginRight: 7 }}>Do</span>
          {t.behavior}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: '16px', color: '#aab3bf', display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7d8694', flexShrink: 0 }}>UI</span>
          <span>{t.ui}</span>
        </div>
      </div>
    </div>
  );
}

function BoardFrame({ children }) {
  return (
    <div style={{ height: '100%', boxSizing: 'border-box', background: '#e9ecf1', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {children}
    </div>
  );
}

// ---- Section 1 board: one host, the inline-note pattern -------------
function HostBoard({ host, initial, branded }) {
  const [n, setN] = React.useState(initial || 0);
  const Host = host.Comp;
  const type = RESULT_TYPES[n];
  const anchor = anchorForType(type);
  return (
    <BoardFrame>
      <MiniStepper n={n} setN={setN} />
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 18px rgba(20,30,50,0.07)' }}>
        <AnchorContext.Provider value={anchor}>
          <Host key={n} values={type.entered} changed={type.changed}>
            <ResultNote type={type} branded={branded} />
          </Host>
        </AnchorContext.Provider>
      </div>
    </BoardFrame>
  );
}

const PATTERN_RENDER = { pill: ResultPill, note: ResultNote, popover: ResultPopover, panel: ResultPanel };

// ---- Section 2 board: one pattern, neutral host ---------------------
function PatternBoard({ pattern, initial, branded }) {
  const [n, setN] = React.useState(initial != null ? initial : 1);
  const [open, setOpen] = React.useState(true);
  const type = RESULT_TYPES[n];
  const isModal = pattern === 'modal';
  const Pattern = PATTERN_RENDER[pattern];
  return (
    <BoardFrame>
      <MiniStepper n={n} setN={(v) => { setN(v); setOpen(true); }} />
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 18px rgba(20,30,50,0.07)' }}>
        <NeutralHost key={n} values={type.entered} changed={type.changed}>
          {!isModal && <Pattern type={type} branded={branded} />}
          {isModal && !open && (
            <div style={{ marginTop: '0.7em', fontSize: '0.85em', color: '#656d76', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <button onClick={() => setOpen(true)} style={{
                appearance: 'none', font: 'inherit', fontWeight: 600, cursor: 'pointer', color: '#2563eb',
                background: 'none', border: 'none', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2,
              }}>Re-open dialog</button>
              gates the Continue button.
            </div>
          )}
        </NeutralHost>
        {isModal && open && (
          <div style={{ ...neutralTheme.root, background: 'transparent', position: 'absolute', inset: 0 }}>
            <ResultModal type={type} branded={branded} onClose={() => setOpen(false)} />
          </div>
        )}
      </div>
    </BoardFrame>
  );
}

// =====================================================================
// DECISION BOARDS — the two UX choices Epic 0 must lock against the
// prototypes (PRD §9 Q3 + Q4). Unlike the pattern boards above, each
// scenario here is PINNED (no stepper): the point is to compare treatments
// of a SINGLE result, not to step the taxonomy. Each card names the config
// value it maps to so the lock translates straight into the API.
// =====================================================================

const T2_CORRECTED = RESULT_TYPES.find((r) => r.key === 'corrected'); // Type 2
const T6_AMBIGUOUS = RESULT_TYPES.find((r) => r.key === 'ambiguous'); // Type 6

// Frames one option: a dark header (name + the config value it maps to +
// optional "recommended" flag) above the live host card, with a tradeoff
// line. Mirrors MiniStepper's chrome so it sits cleanly beside the others.
function DecisionCard({ name, config, tradeoff, pick, children }) {
  return (
    <BoardFrame>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, background: '#11151c', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{name}</span>
          {pick && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0d1117', background: '#2ecd6f', borderRadius: 999, padding: '2px 7px' }}>Recommended default</span>}
        </div>
        <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: '#7bd9a5' }}>{config}</code>
        <div style={{ fontSize: 11.5, lineHeight: '16px', color: '#aab3bf' }}>{tradeoff}</div>
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 18px rgba(20,30,50,0.07)' }}>
        {children}
      </div>
    </BoardFrame>
  );
}

// ---- Q3 · Type 2 correction treatments ------------------------------
// Treatment A — SILENT SWAP. The corrected value is applied with no signal
// beyond a generic check; the user never learns the address was changed.
// (PRD §7 rules this out for corrections — shown so the team sees why.)
function T2Silent() {
  return (
    <div role="status" style={{ marginTop: '0.6em', display: 'inline-flex', alignItems: 'center', gap: '0.45em', font: 'inherit', color: 'inherit' }}>
      <Icon name="check_circle" size={16} style={{ color: GR_HUE.positive }} />
      <span style={{ fontSize: '0.88em', opacity: 0.7 }}>Verified</span>
    </div>
  );
}

// Treatment B — INLINE NOTE (apply-and-notify). Applies the fix so the user
// isn't blocked, then shows exactly what changed with an Undo.
function T2InlineNote() {
  return (
    <div role="status" style={{
      font: 'inherit', color: 'inherit', marginTop: '0.6em', display: 'flex', gap: '0.7em',
      padding: '0.85em 0.95em', borderRadius: 'var(--sa-radius, 6px)',
      background: tint('positive', 9), borderLeft: `3px solid ${GR_HUE.positive}`,
    }}>
      <StatusGlyph tone="positive" size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: '0.98em' }}>Adjusted to the standard address</div>
        <div style={{ fontSize: '0.9em', opacity: 0.72, marginTop: '0.2em' }}>Updated to the official postal format.</div>
        <div style={{ marginTop: '0.6em' }}><GDiff addr={T2_CORRECTED.corrected} changed={T2_CORRECTED.changed} /></div>
        <button style={{ appearance: 'none', background: 'none', border: 'none', font: 'inherit', fontSize: '0.9em', fontWeight: 600, padding: 0, marginTop: '0.55em', cursor: 'pointer', color: 'var(--sa-accent, currentColor)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Undo</button>
      </div>
    </div>
  );
}

// Treatment C — DID-YOU-MEAN prompt. Nothing is applied until the user picks
// between the standardized version and what they entered.
function T2DidYouMean() {
  const [sel, setSel] = React.useState('rec');
  return (
    <div style={{
      font: 'inherit', color: 'inherit', marginTop: '0.6em',
      borderRadius: 'var(--sa-radius, 8px)', overflow: 'hidden',
      border: `1px solid ${tint('positive', 35)}`, background: tint('positive', 6),
    }}>
      <div style={{ display: 'flex', gap: '0.65em', alignItems: 'flex-start', padding: '0.95em 1em 0' }}>
        <StatusGlyph tone="positive" size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: '1.0em' }}>Did you mean this address?</div>
          <div style={{ fontSize: '0.9em', opacity: 0.72, marginTop: '0.15em' }}>We found a standardized version — choose which to use.</div>
        </div>
      </div>
      <div style={{ padding: '0.85em 1em 1em', display: 'flex', flexDirection: 'column', gap: '0.55em' }}>
        <PanelChoice selected={sel === 'rec'} onClick={() => setSel('rec')} tag="Recommended" tone="positive" addr={T2_CORRECTED.corrected} changed={T2_CORRECTED.changed} />
        <PanelChoice selected={sel === 'entered'} onClick={() => setSel('entered')} tag="As you entered" addr={T2_CORRECTED.entered} />
        <div style={{ marginTop: '0.3em' }}><GAction primary full>Use selected address</GAction></div>
      </div>
    </div>
  );
}

// ---- Q4 · ambiguous chooser, autocomplete-present mode --------------
// When a dropdown is already running, the ambiguous candidates re-populate
// it — the user picks from the same surface they were searching in. Mocked
// to mirror the plugin's existing chameleon dropdown (inherits host accent).
function DropdownChooserMock({ candidates }) {
  const [hi, setHi] = React.useState(0);
  return (
    <div style={{ marginTop: '-0.1em', font: 'inherit', color: 'inherit' }}>
      <div style={{
        borderRadius: 'var(--sa-radius, 8px)', overflow: 'hidden',
        background: 'var(--sa-field-bg, #fff)',
        border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
      }}>
        <div style={{ padding: '0.5em 0.8em', fontSize: '0.72em', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.55, borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)' }}>
          Did you mean?
        </div>
        {candidates.map((c, i) => (
          <button key={i} onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)} onClick={() => setHi(i)} style={{
            appearance: 'none', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.6em', width: '100%', border: 'none',
            padding: '0.6em 0.8em', background: hi === i ? tint('info', 12) : 'transparent',
          }}>
            <Icon name="pin" size={15} style={{ opacity: 0.5, flexShrink: 0 }} />
            <GDiff addr={c} />
          </button>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.4em 0.8em', borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)' }}>
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}

// =====================================================================
function App() {
  const [annotate, setAnnotate] = React.useState(true);
  return (
    <AnnotateContext.Provider value={annotate}>
      <DesignCanvas>
      <DCSection
        id="portability"
        title="One component, any host — the adaptive result UI"
        subtitle="The identical inline-note component is dropped into seven unrelated host designs — each with its OWN field layout, not just its own paint: a full checkout form, an autocomplete-first SaaS flow, a dense dark grid, the Address line 1/2 convention, a numbered gov stack, a single combined-address field, and a form with no unit field at all. It inherits each host's font, color, accent and radius; the only colors it asserts are the status icon + rule. Each board is pinned to a different result type — step any board with the switcher.">
        <DCArtboard id="h-checkout"  label="E-commerce checkout (full form) · corrected"  width={470} height={985}>
          <HostBoard host={HOSTS[0]} initial={1} />
        </DCArtboard>
        <DCArtboard id="h-material"  label="Material / SaaS (autocomplete-first) · verified" width={450} height={840}>
          <HostBoard host={HOSTS[1]} initial={0} />
        </DCArtboard>
        <DCArtboard id="h-dark"      label="Dark dashboard (2-col grid) · deliverable but flagged"   width={460} height={740}>
          <HostBoard host={HOSTS[2]} initial={4} />
        </DCArtboard>
        <DCArtboard id="h-bootstrap" label="Bootstrap admin (Address line 1/2) · ambiguous chooser" width={460} height={900}>
          <HostBoard host={HOSTS[3]} initial={5} />
        </DCArtboard>
        <DCArtboard id="h-bare"      label="Bare / legacy gov (numbered stack) · undeliverable" width={450} height={840}>
          <HostBoard host={HOSTS[4]} initial={6} />
        </DCArtboard>
        <DCArtboard id="h-single"    label="Single-field one-box (combined address) · corrected" width={450} height={680}>
          <HostBoard host={HOSTS[5]} initial={1} />
        </DCArtboard>
        <DCArtboard id="h-nosec"     label="No secondary field (apt on street line) · needs unit" width={460} height={800}>
          <HostBoard host={HOSTS[6]} initial={2} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="patterns"
        title="The portable pattern set — escalating force"
        subtitle="Five ways to surface the same result, in one neutral host so only the pattern differs. From lowest friction (a chip) to most forceful (a blocking dialog). Every pattern follows the same contract — inherit the host, semantics in the icon only. Step the result type per board.">
        <DCArtboard id="p-pill"    label="1 · Status pill — lowest friction"   width={430} height={680}>
          <PatternBoard pattern="pill" initial={1} />
        </DCArtboard>
        <DCArtboard id="p-note"    label="2 · Inline note — the default"       width={430} height={720}>
          <PatternBoard pattern="note" initial={1} />
        </DCArtboard>
        <DCArtboard id="p-popover" label="3 · Anchored popover — when no room" width={430} height={720}>
          <PatternBoard pattern="popover" initial={1} />
        </DCArtboard>
        <DCArtboard id="p-panel"   label="4 · Confirmation panel — most clear" width={430} height={820}>
          <PatternBoard pattern="panel" initial={5} />
        </DCArtboard>
        <DCArtboard id="p-modal"   label="5 · Modal — most forceful"           width={430} height={780}>
          <PatternBoard pattern="modal" initial={2} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="q3"
        title="Decision · Q3 — Type 2 correction-prompt style"
        subtitle="One corrected result (1600 pensylvania ave → 1600 Pennsylvania Ave NW, +ZIP4) surfaced three ways. This is the PRD §9 Q3 choice: how the plugin handles a standardization it's confident about. Same form, same correction — only the treatment differs. PRD §7 locks one rule up front: a correction is never applied silently, so the middle option is the recommended default.">
        <DCArtboard id="q3-silent" label="A · Silent swap — apply, show nothing" width={430} height={700}>
          <DecisionCard name="Silent swap" config='onResult.corrected: "silent"'
            tradeoff="Lowest friction, zero interruption — but the user never learns their address changed. PRD §7 explicitly rules this out for corrections.">
            <NeutralHost values={T2_CORRECTED.corrected} changed={[]}><T2Silent /></NeutralHost>
          </DecisionCard>
        </DCArtboard>
        <DCArtboard id="q3-note" label="B · Inline note — apply + show what changed" width={430} height={760}>
          <DecisionCard name="Inline “Adjusted to…” note" config='onResult.corrected: "apply-and-notify"' pick
            tradeoff="Applies the fix so the user isn't blocked, but shows exactly what changed with an Undo. Honors the PRD rule at the lowest friction that still informs.">
            <NeutralHost values={T2_CORRECTED.corrected} changed={T2_CORRECTED.changed}><T2InlineNote /></NeutralHost>
          </DecisionCard>
        </DCArtboard>
        <DCArtboard id="q3-dym" label="C · Did-you-mean — ask before applying" width={430} height={820}>
          <DecisionCard name="Did-you-mean prompt" config='onResult.corrected: "prompt"'
            tradeoff="Most explicit — nothing changes until the user picks. Highest clarity for high-stakes forms, but adds a required interaction to every standardized address.">
            <NeutralHost values={T2_CORRECTED.entered} changed={[]}><T2DidYouMean /></NeutralHost>
          </DecisionCard>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="q4"
        title="Decision · Q4 — Ambiguous chooser, in both modes"
        subtitle="One ambiguous result (120 Center St, Provo → three candidates) in the plugin's two operating modes. When autocomplete is running, the result reuses the dropdown the user is already in; in verification-only mode there is no dropdown, so the plugin renders its own inline chooser. PRD §9 Q4 is to design that verification-only fallback — the right card.">
        <DCArtboard id="q4-ac" label="Autocomplete-present · reuse the dropdown" width={440} height={740}>
          <DecisionCard name="Autocomplete-present" config="mode: autocomplete + verification"
            tradeoff="A dropdown is already running, so the ambiguous candidates re-populate it — the user picks from the same surface they were searching in.">
            <NeutralHost values={T6_AMBIGUOUS.entered}><DropdownChooserMock candidates={T6_AMBIGUOUS.candidates} /></NeutralHost>
          </DecisionCard>
        </DCArtboard>
        <DCArtboard id="q4-vo" label="Verification-only · inline fallback (the Q4 deliverable)" width={440} height={820}>
          <DecisionCard name="Verification-only fallback" config="mode: verification only"
            tradeoff="No dropdown exists, so the plugin renders its own inline chooser beneath the field — the lightweight fallback Q4 calls for. Also the path for free-form / pasted addresses.">
            <NeutralHost values={T6_AMBIGUOUS.entered}><ResultNote type={T6_AMBIGUOUS} /></NeutralHost>
          </DecisionCard>
        </DCArtboard>
      </DCSection>
      </DesignCanvas>
      <AnnotateToggle on={annotate} setOn={setAnnotate} />
    </AnnotateContext.Provider>
  );
}

// Fixed meta control (sibling of the canvas, so canvas pan/zoom never eats
// its clicks). Toggles the anchor-annotation layer on the Section-1 boards.
function AnnotateToggle({ on, setOn }) {
  return (
    <div style={{
      position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', border: '1px solid rgba(20,20,40,0.1)',
      boxShadow: '0 6px 24px rgba(20,30,50,0.16)', borderRadius: 999,
      padding: '7px 8px 7px 14px', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#1f2328', whiteSpace: 'nowrap' }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: ANNOT, flexShrink: 0 }} />
        DOM anchor points
      </span>
      <button
        onClick={() => setOn((v) => !v)}
        role="switch" aria-checked={on} aria-label="Toggle DOM anchor annotations"
        style={{
          appearance: 'none', border: 'none', cursor: 'pointer', padding: 0,
          width: 38, height: 22, borderRadius: 999, position: 'relative',
          background: on ? ANNOT : '#cfd4dc', transition: 'background .15s',
        }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18,
          borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left .15s',
        }} />
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
