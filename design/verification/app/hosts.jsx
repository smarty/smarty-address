// =====================================================================
// HOST ENVIRONMENTS — five deliberately different form designs the plugin
// might be dropped into. Each sets its OWN font, text color, surface,
// accent (--sa-accent / --sa-accent-fg), corner radius (--sa-radius) and
// field background (--sa-field-bg) on its root — AND its own field LAYOUT.
//
// The point: real address forms don't agree on structure. Some use
// "Address line 1 / 2", some "Street + Apt", some a single autocomplete
// search box, some a dense 2-column grid, some a numbered gov stack — and
// they wrap the address fields in unrelated fields (name, company, country,
// phone). The plugin's generic result UI has to slot into ALL of them, so
// these shells exercise that spread. Nothing Smarty-branded lives here.
//
// Layout is data: theme.layout is an array of ROWS; each row is an array of
// field descriptors. A descriptor keyed to an address field (street /
// secondary / city / state / zip) is bound to the live result values and
// picks up the "changed" highlight; anything marked `decorative` is just
// realistic surrounding chrome (name, company, country, phone).
// =====================================================================

const ADDR_KEYS = ['street', 'secondary', 'city', 'state', 'zip'];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY'];
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Mexico'];

// One field. Visual identity (border, radius, font, label treatment) comes
// from the theme; structure comes from the descriptor.
function HostField({ fld, values, theme, changed }) {
  const l = theme.label;
  const annotate = React.useContext(AnnotateContext);
  const anchor = React.useContext(AnchorContext);
  const isAddr = (ADDR_KEYS.includes(fld.k) || fld.combined) && !fld.decorative;
  // A single combined field is the anchor target for ANY address-keyed result.
  const isAnchor = annotate && anchor && isAddr && (anchor.key === fld.k || fld.combined);
  const oneLine = (a) => `${a.street}${a.secondary ? ' ' + a.secondary : ''}, ${a.city}, ${a.state} ${a.zip}`;
  const val = fld.combined ? oneLine(values) : (isAddr ? (values[fld.k] ?? '') : (fld.sample ?? ''));
  const isChanged = isAddr && (fld.combined ? changed.length > 0 : changed.includes(fld.k));
  const base = {
    ...theme.field.style,
    borderColor: isChanged
      ? 'color-mix(in srgb, var(--sa-accent) 55%, ' + theme.field.style.borderColor + ')'
      : theme.field.style.borderColor,
    ...(isAnchor ? { outline: `2px dashed ${ANNOT}`, outlineOffset: '2px' } : null),
  };

  let control;
  if (fld.kind === 'select') {
    control = (
      <select defaultValue={val} style={{ ...base, appearance: 'auto', cursor: 'pointer', width: '100%' }}>
        {(fld.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (fld.kind === 'search') {
    control = (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Icon name="search" size={16} style={{ position: 'absolute', left: '0.75em', opacity: 0.5, pointerEvents: 'none' }} />
        <input defaultValue={val} placeholder={fld.ph}
          style={{ ...base, paddingLeft: '2.3em', width: '100%' }} />
      </div>
    );
  } else if (fld.kind === 'combined') {
    control = (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Icon name="pin" size={16} style={{ position: 'absolute', left: '0.85em', opacity: 0.45, pointerEvents: 'none' }} />
        <input defaultValue={val} placeholder={fld.ph}
          style={{ ...base, paddingLeft: '2.5em', width: '100%' }} />
      </div>
    );
  } else {
    control = <input defaultValue={val} placeholder={fld.ph} style={base} />;
  }

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: l.gap, flex: fld.flex || '1 1 auto', minWidth: 0 }}>
      {fld.label && (
        <span style={{ ...l.style, display: 'flex', alignItems: 'center', gap: '0.5em', flexWrap: 'wrap' }}>
          <span>{fld.label}{fld.optional && <span style={{ opacity: 0.5, fontWeight: 400 }}> (optional)</span>}</span>
          {isAnchor && <AnchorTag />}
        </span>
      )}
      {control}
      {fld.hint && <span style={{ fontSize: '0.78em', opacity: 0.5, marginTop: '0.15em' }}>{fld.hint}</span>}
    </label>
  );
}

// Render a theme's layout (array of rows). Single-field rows stack full
// width; multi-field rows lay out side by side with the theme's gap.
function HostFields({ values, theme, changed = [] }) {
  const layout = theme.layout || DEFAULT_LAYOUT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.fieldGap }}>
      {layout.map((row, i) =>
        row.length === 1 ? (
          <HostField key={i} fld={row[0]} values={values} theme={theme} changed={changed} />
        ) : (
          <div key={i} style={{ display: 'flex', gap: theme.fieldGap }}>
            {row.map((fld, j) => <HostField key={j} fld={fld} values={values} theme={theme} changed={changed} />)}
          </div>
        )
      )}
    </div>
  );
}

// The conventional fallback: Street / Apt / City-State-ZIP. Used by the
// neutral host so the pattern section stays about the pattern, not the form.
const DEFAULT_LAYOUT = [
  [{ k: 'street', label: 'Street address' }],
  [{ k: 'secondary', label: 'Apt / suite', ph: 'Optional' }],
  [
    { k: 'city', label: 'City', flex: '1.5 1 0' },
    { k: 'state', label: 'State', flex: '0.6 1 0' },
    { k: 'zip', label: 'ZIP', flex: '0.9 1 0' },
  ],
];

function HostCTA({ theme, label }) {
  return (
    <button style={{
      appearance: 'none', font: 'inherit', cursor: 'pointer', width: '100%',
      marginTop: '1.1em', ...theme.cta,
    }}>{label}</button>
  );
}

// Title row used by most hosts.
function HostTitle({ children, sub, theme }) {
  return (
    <div style={{ marginBottom: '1.1em' }}>
      <div style={theme.titleStyle}>{children}</div>
      {sub && <div style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '0.25em' }}>{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------
// 1 · BARE / LEGACY GOV — unstyled defaults. Serif, square fields, the
//     classic browser look. LAYOUT: a numbered, fully-stacked form — every
//     field full width, state as a native <select>, the way a 2008-era
//     government mailing form reads.
// ---------------------------------------------------------------------
const bareTheme = {
  root: {
    fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a', background: '#ffffff',
    '--sa-accent': '#1a3e72', '--sa-accent-fg': '#ffffff', '--sa-radius': '0px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.7em',
  titleStyle: { fontSize: '1.5em', fontWeight: 700 },
  label: { gap: '0.25em', style: { fontSize: '0.85em', fontWeight: 400 } },
  field: { style: {
    font: 'inherit', fontSize: '1em', padding: '0.4em 0.5em', color: 'inherit',
    background: '#fff', border: '1px solid #767676', borderRadius: 0, outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#1a3e72', color: '#fff', border: '1px solid #102a52', borderRadius: 0,
    padding: '0.6em 1em', fontSize: '1em', fontWeight: 700,
  },
  layout: [
    [{ k: 'street', label: '1. Street address' }],
    [{ k: 'secondary', label: '2. Apartment, suite, unit, etc. (if applicable)' }],
    [{ k: 'city', label: '3. City or town' }],
    [{ k: 'state', label: '4. State', kind: 'select', options: US_STATES }],
    [{ k: 'zip', label: '5. ZIP Code' }],
  ],
};
function BareHost({ values, changed, children }) {
  return (
    <div style={{ ...bareTheme.root, padding: '1.6em 1.7em', minHeight: '100%', boxSizing: 'border-box' }}>
      <HostTitle theme={bareTheme} sub="Section B — Mailing address">Address Information</HostTitle>
      <HostFields values={values} theme={bareTheme} changed={changed} />
      {children}
      <HostCTA theme={bareTheme} label="Submit application" />
    </div>
  );
}

// ---------------------------------------------------------------------
// 2 · BOOTSTRAP ADMIN — system font, #0d6efd primary, 6px radius. LAYOUT:
//     the "Address line 1 / line 2" convention with a country select on top
//     — the internal-CRUD-tool default that most form builders ship.
// ---------------------------------------------------------------------
const bsTheme = {
  root: {
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#212529', background: '#ffffff',
    '--sa-accent': '#0d6efd', '--sa-accent-fg': '#ffffff', '--sa-radius': '6px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.8em',
  titleStyle: { fontSize: '1.3em', fontWeight: 600 },
  label: { gap: '0.35em', style: { fontSize: '0.82em', fontWeight: 500, color: '#212529' } },
  field: { style: {
    font: 'inherit', fontSize: '0.95em', padding: '0.5em 0.75em', color: 'inherit',
    background: '#fff', border: '1px solid #ced4da', borderRadius: '6px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '0.6em 1em', fontSize: '0.95em', fontWeight: 500,
  },
  layout: [
    [{ k: 'country', decorative: true, kind: 'select', label: 'Country', options: COUNTRIES, sample: 'United States' }],
    [{ k: 'street', label: 'Address line 1' }],
    [{ k: 'secondary', label: 'Address line 2', optional: true }],
    [
      { k: 'city', label: 'City', flex: '1.4 1 0' },
      { k: 'state', label: 'State / Province', kind: 'select', options: US_STATES, flex: '1 1 0' },
      { k: 'zip', label: 'Postal code', flex: '1 1 0' },
    ],
  ],
};
function BootstrapHost({ values, changed, children }) {
  return (
    <div style={{ ...bsTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        border: '1px solid #dee2e6', borderRadius: '8px', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{ padding: '0.9em 1.2em', borderBottom: '1px solid #dee2e6', fontWeight: 600 }}>Customer address</div>
        <div style={{ padding: '1.2em' }}>
          <HostFields values={values} theme={bsTheme} changed={changed} />
          {children}
          <HostCTA theme={bsTheme} label="Save changes" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3 · MATERIAL / MODERN SAAS (light) — Roboto, M3 purple accent. LAYOUT:
//     autocomplete-first. A single search field is the primary entry point
//     ("start typing"), with the structured fields below for review/edit —
//     the pattern most modern checkout/onboarding flows use.
// ---------------------------------------------------------------------
const mdTheme = {
  root: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif', color: '#1c1b1f', background: '#fdfcff',
    '--sa-accent': '#6750a4', '--sa-accent-fg': '#ffffff', '--sa-radius': '10px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.9em',
  titleStyle: { fontSize: '1.35em', fontWeight: 500, letterSpacing: '-0.01em' },
  label: { gap: '0.3em', style: { fontSize: '0.78em', fontWeight: 500, color: '#6750a4', letterSpacing: '0.02em' } },
  field: { style: {
    font: 'inherit', fontSize: '0.95em', padding: '0.7em 0.85em', color: 'inherit',
    background: '#fff', border: '1.5px solid #cac4d0', borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#6750a4', color: '#fff', border: 'none', borderRadius: '999px',
    padding: '0.8em 1em', fontSize: '0.95em', fontWeight: 500, letterSpacing: '0.02em',
  },
  layout: [
    [{ k: 'addr_search', decorative: true, kind: 'search', label: 'Find address', ph: 'Start typing your address…', hint: 'Autocomplete fills the fields below', sample: '' }],
    [{ k: 'street', label: 'Street address' }],
    [{ k: 'secondary', label: 'Apt, suite, unit', optional: true }],
    [
      { k: 'city', label: 'City', flex: '1.5 1 0' },
      { k: 'state', label: 'State', flex: '0.7 1 0' },
      { k: 'zip', label: 'ZIP', flex: '1 1 0' },
    ],
  ],
};
function MaterialHost({ values, changed, children }) {
  return (
    <div style={{ ...mdTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: '#fff', borderRadius: '18px', padding: '1.5em',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 6px 18px rgba(103,80,164,0.08)',
      }}>
        <HostTitle theme={mdTheme} sub="Step 2 of 4 · Delivery details">Where should we ship?</HostTitle>
        <HostFields values={values} theme={mdTheme} changed={changed} />
        {children}
        <HostCTA theme={mdTheme} label="Continue" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 4 · DARK DASHBOARD — near-black surface, light text, blue accent. LAYOUT:
//     a dense 2-column grid that packs the whole address into two rows — the
//     stress test for color-mix tints AND for a tight admin layout where the
//     result UI must fit between rows.
// ---------------------------------------------------------------------
const darkTheme = {
  root: {
    fontFamily: 'Inter, system-ui, sans-serif', color: '#e6edf3', background: '#0d1117',
    '--sa-accent': '#388bfd', '--sa-accent-fg': '#ffffff', '--sa-radius': '8px',
    '--sa-field-bg': '#161b22', '--sa-pop-bg': '#161b22',
  },
  fieldGap: '0.8em',
  titleStyle: { fontSize: '1.25em', fontWeight: 600 },
  label: { gap: '0.35em', style: { fontSize: '0.8em', fontWeight: 500, color: '#8b949e' } },
  field: { style: {
    font: 'inherit', fontSize: '0.92em', padding: '0.55em 0.75em', color: 'inherit',
    background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#388bfd', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.65em 1em', fontSize: '0.92em', fontWeight: 600,
  },
  layout: [
    [
      { k: 'street', label: 'Street', flex: '2 1 0' },
      { k: 'secondary', label: 'Unit', flex: '1 1 0' },
    ],
    [
      { k: 'city', label: 'City', flex: '1.5 1 0' },
      { k: 'state', label: 'State', flex: '0.7 1 0' },
      { k: 'zip', label: 'ZIP', flex: '1 1 0' },
    ],
  ],
};
function DarkHost({ values, changed, children }) {
  return (
    <div style={{ ...darkTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '1.4em',
      }}>
        <HostTitle theme={darkTheme} sub="Account → Billing address">Billing address</HostTitle>
        <HostFields values={values} theme={darkTheme} changed={changed} />
        {children}
        <HostCTA theme={darkTheme} label="Update address" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 5 · E-COMMERCE CHECKOUT (Shopify-ish) — system font, dark charcoal CTA.
//     LAYOUT: the full shipping form — country, name pair, optional company,
//     address + apartment, city/state/zip, phone. The address fields live
//     amid a half-dozen unrelated ones, exactly like a real checkout.
// ---------------------------------------------------------------------
const coTheme = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#202223', background: '#ffffff',
    '--sa-accent': '#1a1a1a', '--sa-accent-fg': '#ffffff', '--sa-radius': '8px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.75em',
  titleStyle: { fontSize: '1.2em', fontWeight: 600 },
  label: { gap: '0.3em', style: { fontSize: '0.78em', fontWeight: 500, color: '#6d7175' } },
  field: { style: {
    font: 'inherit', fontSize: '0.95em', padding: '0.65em 0.8em', color: 'inherit',
    background: '#fff', border: '1px solid #8c9196', borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.85em 1em', fontSize: '1em', fontWeight: 600,
  },
  layout: [
    [{ k: 'country', decorative: true, kind: 'select', label: 'Country / Region', options: COUNTRIES, sample: 'United States' }],
    [
      { k: 'first', decorative: true, label: 'First name', sample: 'Jordan' },
      { k: 'last', decorative: true, label: 'Last name', sample: 'Avery' },
    ],
    [{ k: 'company', decorative: true, label: 'Company', optional: true, sample: '' }],
    [{ k: 'street', label: 'Address' }],
    [{ k: 'secondary', label: 'Apartment, suite, etc.', optional: true }],
    [
      { k: 'city', label: 'City', flex: '1.5 1 0' },
      { k: 'state', label: 'State', kind: 'select', options: US_STATES, flex: '1 1 0' },
      { k: 'zip', label: 'ZIP code', flex: '1 1 0' },
    ],
    [{ k: 'phone', decorative: true, label: 'Phone', optional: true, sample: '(801) 555-0142' }],
  ],
};
function CheckoutHost({ values, changed, children }) {
  return (
    <div style={{ ...coTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1em' }}>
        <div style={coTheme.titleStyle}>Shipping address</div>
        <span style={{ fontSize: '0.78em', color: '#6d7175', display: 'flex', alignItems: 'center', gap: '0.4em' }}>
          <Icon name="lock" size={13} /> Secure
        </span>
      </div>
      <HostFields values={values} theme={coTheme} changed={changed} />
      {children}
      <HostCTA theme={coTheme} label="Continue to shipping" />
    </div>
  );
}

// ---------------------------------------------------------------------
// 6 · SINGLE-FIELD (autocomplete one-box) — emerald accent, soft card.
//     LAYOUT: the entire address lives in ONE combined field — the
//     delivery-app / maps pattern. There is no street/city/zip breakdown
//     and no secondary field at all; the plugin must surface its result
//     against a single input. (PRD §11: "single-field combined address".)
// ---------------------------------------------------------------------
const singleTheme = {
  root: {
    fontFamily: 'Inter, system-ui, sans-serif', color: '#0b1f17', background: '#f1faf5',
    '--sa-accent': '#0e9f6e', '--sa-accent-fg': '#ffffff', '--sa-radius': '12px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.9em',
  titleStyle: { fontSize: '1.3em', fontWeight: 600, letterSpacing: '-0.01em' },
  label: { gap: '0.35em', style: { fontSize: '0.8em', fontWeight: 600, color: '#0e7a55' } },
  field: { style: {
    font: 'inherit', fontSize: '1em', padding: '0.85em 0.9em', color: 'inherit',
    background: '#fff', border: '1.5px solid #cfe8dd', borderRadius: '12px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#0e9f6e', color: '#fff', border: 'none', borderRadius: '12px',
    padding: '0.85em 1em', fontSize: '1em', fontWeight: 600,
  },
  layout: [
    [{ k: 'combined', combined: true, kind: 'combined', label: 'Delivery address', ph: 'Start typing your address…' }],
  ],
};
function SingleHost({ values, changed, children }) {
  return (
    <div style={{ ...singleTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '1.6em',
        boxShadow: '0 1px 3px rgba(11,31,23,0.06), 0 10px 30px rgba(14,159,110,0.09)',
      }}>
        <HostTitle theme={singleTheme} sub="One field — we’ll confirm it before checkout">Where are we delivering?</HostTitle>
        <HostFields values={values} theme={singleTheme} changed={changed} />
        {children}
        <HostCTA theme={singleTheme} label="Confirm address" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 7 · NO SECONDARY FIELD — indigo accent, compact card. LAYOUT: street +
//     city/state/zip with the apartment/suite folded INTO the street line
//     (no dedicated unit input). Stress-tests how the plugin prompts for a
//     unit when the host has nowhere to put one. (PRD §11 / Types 3–4.)
// ---------------------------------------------------------------------
const nosecTheme = {
  root: {
    fontFamily: 'Inter, system-ui, sans-serif', color: '#1e2430', background: '#f6f7fb',
    '--sa-accent': '#4f46e5', '--sa-accent-fg': '#ffffff', '--sa-radius': '8px', '--sa-field-bg': '#ffffff',
  },
  fieldGap: '0.85em',
  titleStyle: { fontSize: '1.2em', fontWeight: 600 },
  label: { gap: '0.3em', style: { fontSize: '0.78em', fontWeight: 500, color: '#5b6472' } },
  field: { style: {
    font: 'inherit', fontSize: '0.95em', padding: '0.6em 0.8em', color: 'inherit',
    background: '#fff', border: '1px solid #d5d9e2', borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  } },
  cta: {
    background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.7em 1em', fontSize: '0.95em', fontWeight: 600,
  },
  layout: [
    [{ k: 'email', decorative: true, label: 'Email', sample: 'jordan@example.com' }],
    [{ k: 'street', label: 'Street address', hint: 'Include apartment, suite, or unit on this line' }],
    [
      { k: 'city', label: 'City', flex: '1.6 1 0' },
      { k: 'state', label: 'State', kind: 'select', options: US_STATES, flex: '0.9 1 0' },
      { k: 'zip', label: 'ZIP', flex: '1 1 0' },
    ],
  ],
};
function NoSecondaryHost({ values, changed, children }) {
  return (
    <div style={{ ...nosecTheme.root, padding: '1.5em', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: '#fff', border: '1px solid #e6e9f0', borderRadius: '12px', padding: '1.4em',
        boxShadow: '0 1px 2px rgba(30,36,48,0.05)',
      }}>
        <HostTitle theme={nosecTheme} sub="No separate apartment / unit field">Billing details</HostTitle>
        <HostFields values={values} theme={nosecTheme} changed={changed} />
        {children}
        <HostCTA theme={nosecTheme} label="Save &amp; continue" />
      </div>
    </div>
  );
}

const HOSTS = [
  { id: 'checkout',  name: 'E-commerce checkout',  Comp: CheckoutHost },
  { id: 'material',  name: 'Material / SaaS',       Comp: MaterialHost },
  { id: 'dark',      name: 'Dark dashboard',        Comp: DarkHost },
  { id: 'bootstrap', name: 'Bootstrap admin',       Comp: BootstrapHost },
  { id: 'bare',      name: 'Bare / legacy gov',     Comp: BareHost },
  { id: 'single',    name: 'Single-field (one box)', Comp: SingleHost },
  { id: 'nosec',     name: 'No secondary field',    Comp: NoSecondaryHost },
];

Object.assign(window, {
  HostField, HostFields, HostCTA, HostTitle, DEFAULT_LAYOUT, US_STATES, COUNTRIES,
  BareHost, BootstrapHost, MaterialHost, DarkHost, CheckoutHost, SingleHost, NoSecondaryHost, HOSTS,
});
