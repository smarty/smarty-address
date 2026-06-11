// Smarty address-verification — the 8 end-user result types.
// THIS IS THE SINGLE SOURCE OF TRUTH and maps 1:1 to PRD §7
// "Result Taxonomy & Behavior". Behavior is keyed to the KIND of result
// Smarty returns, not a single global switch. US uses dpv_match_code +
// footnotes; International uses verification_status + address_precision +
// per-component changes. Behaviors + UI are shared; only the input signal
// differs — so each entry carries both signals plus the PRD's default
// behavior and default UI for that type.
//
// Per-type fields consumed by the renderers:
//   entered / corrected / changed  — the address before/after + changed keys
//   needsInput: 'secondary'        — a unit prompt is part of the resolution
//   flagUnit                       — keep the typed unit but flag it (type 4)
//   candidates                     — multiple matches to choose from (type 6)
//   nonBlocking                    — fail open; never gate submit (types 5,7,8)
//   silent                         — no visible UI; announce via aria-live only (type 8)
//   dpv / intl                     — the raw US + International signals (PRD §7)
//   behavior / ui                  — the PRD default behavior + default UI label

const RESULT_TYPES = [
  {
    n: 1,
    key: 'verified',
    name: 'Verified, unchanged',
    tone: 'positive',
    badge: 'Verified',
    short: 'Deliverable and complete — nothing to fix.',
    guidance: 'This is a complete, deliverable address.',
    needsInput: null,
    entered:   { street: '3214 N University Ave', secondary: '', city: 'Provo', state: 'UT', zip: '84604-4405' },
    corrected: { street: '3214 N University Ave', secondary: '', city: 'Provo', state: 'UT', zip: '84604-4405' },
    changed: [],
    dpv:  'dpv_match_code: Y · vacant: N · no_stat: N · footnotes: —',
    intl: 'verification_status: Verified · precision at country max',
    behavior: 'Accept silently',
    ui: 'Small ✓',
  },
  {
    n: 2,
    key: 'corrected',
    name: 'Verified, corrected',
    tone: 'positive',
    badge: 'Adjusted',
    short: 'Standardized to its official postal form.',
    guidance: 'We adjusted this to match postal records.',
    needsInput: null,
    entered:   { street: '1600 pensylvania ave', secondary: '', city: 'Washington', state: 'DC', zip: '20500' },
    corrected: { street: '1600 Pennsylvania Ave NW', secondary: '', city: 'Washington', state: 'DC', zip: '20500-0003' },
    changed: ['street', 'zip'],
    dpv:  'dpv_match_code: Y · footnotes: A# N# (standardized + ZIP4)',
    intl: 'Verified · changes: Verified-SmallChange / Added',
    behavior: 'Apply correction + show what changed (never silent swap)',
    ui: 'Inline “Adjusted to …” + ✓',
  },
  {
    n: 3,
    key: 'missing-secondary',
    name: 'Missing secondary',
    tone: 'warning',
    badge: 'Needs unit',
    short: 'A unit number is needed here.',
    guidance: 'This building has multiple units — add an apartment or suite number.',
    needsInput: 'secondary',
    entered:   { street: '1745 T St NW', secondary: '', city: 'Washington', state: 'DC', zip: '20009' },
    corrected: { street: '1745 T St NW', secondary: '', city: 'Washington', state: 'DC', zip: '20009-7409' },
    changed: ['zip'],
    dpv:  'dpv_match_code: D · footnotes: N1',
    intl: 'Partial · precision: Premise · sub_building absent',
    behavior: 'Prompt for apt / unit / suite',
    ui: 'Inline secondary prompt',
  },
  {
    n: 4,
    key: 'bad-secondary',
    name: 'Secondary not recognized',
    tone: 'warning',
    badge: 'Check unit',
    short: 'The unit you entered wasn’t recognized.',
    guidance: 'We verified the building but couldn’t confirm “Apt 99”. We’ll keep it — double-check the unit.',
    needsInput: 'secondary',
    flagUnit: true,
    entered:   { street: '1745 T St NW', secondary: 'Apt 99', city: 'Washington', state: 'DC', zip: '20009' },
    corrected: { street: '1745 T St NW', secondary: 'Apt 99', city: 'Washington', state: 'DC', zip: '20009-7409' },
    changed: ['zip'],
    dpv:  'dpv_match_code: S (secondary present, not matched)',
    intl: 'changes.sub_building: Unrecognized',
    behavior: 'Apply primary, flag the unit (don’t drop it)',
    ui: 'Inline “couldn’t verify unit X”',
  },
  {
    n: 5,
    key: 'flagged',
    name: 'Deliverable but flagged',
    tone: 'warning',
    badge: 'Deliverable · flagged',
    short: 'Deliverable, but USPS flags it (vacant / no-stat).',
    guidance: 'This address is deliverable, but USPS currently lists it as vacant. You can continue.',
    needsInput: null,
    nonBlocking: true,
    entered:   { street: '405 Maple St', secondary: '', city: 'Springfield', state: 'IL', zip: '62704' },
    corrected: { street: '405 Maple St', secondary: '', city: 'Springfield', state: 'IL', zip: '62704-1820' },
    changed: ['zip'],
    dpv:  'dpv_match_code: Y · dpv_vacant: Y (or footnote R7)',
    intl: '— No equivalent · USPS-specific, cannot fire internationally',
    behavior: 'Warn, fail open',
    ui: 'Inline caution, non-blocking',
  },
  {
    n: 6,
    key: 'ambiguous',
    name: 'Ambiguous',
    tone: 'warning',
    badge: 'Multiple matches',
    short: 'More than one address matches — choose one.',
    guidance: 'More than one address matches what you typed. Pick the right one.',
    needsInput: null,
    entered:   { street: '120 Center St', secondary: '', city: 'Provo', state: 'UT', zip: '84601' },
    corrected: null,
    changed: [],
    candidates: [
      { street: '120 W Center St', secondary: '', city: 'Provo', state: 'UT', zip: '84601-4402' },
      { street: '120 E Center St', secondary: '', city: 'Provo', state: 'UT', zip: '84606-3108' },
      { street: '120 N Center St', secondary: '', city: 'Provo', state: 'UT', zip: '84601-2877' },
    ],
    dpv:  'multiple candidates returned',
    intl: 'verification_status: Ambiguous',
    behavior: 'Prompt user to choose',
    ui: 'Chooser (lightweight fallback in verification-only mode)',
  },
  {
    n: 7,
    key: 'undeliverable',
    name: 'Undeliverable / invalid',
    tone: 'negative',
    badge: 'Undeliverable',
    short: 'No match found — likely a typo.',
    guidance: 'We couldn’t find this address. Double-check it — or submit as entered.',
    needsInput: null,
    nonBlocking: true,
    entered:   { street: '999 Nowhere Rd', secondary: '', city: 'Faketown', state: 'AZ', zip: '00000' },
    corrected: null,
    changed: [],
    dpv:  'dpv_match_code: N · zero candidates',
    intl: 'verification_status: None · address_precision: None',
    behavior: 'Warn, fail open (allow submit)',
    ui: 'Inline warning, non-blocking',
  },
  {
    n: 8,
    key: 'error',
    name: 'Error',
    tone: 'negative',
    badge: 'Service error',
    short: 'Network / auth / quota error — verification didn’t run.',
    guidance: 'Verification is temporarily unavailable. Submitting is allowed (fail-open default).',
    needsInput: null,
    nonBlocking: true,
    silent: true,
    entered:   { street: '742 Evergreen Terrace', secondary: '', city: 'Springfield', state: 'OR', zip: '97477' },
    corrected: null,
    changed: [],
    dpv:  'network / auth / quota failure',
    intl: 'Same — network / auth / quota failure',
    behavior: 'Governed by failureMode (fail-open default)',
    ui: 'ARIA-only, silent',
  },
];

const FIELD_LABELS = {
  street: 'Street address',
  secondary: 'Apt / suite',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
};

// One-line formatter for an address object.
function fmtAddress(a) {
  if (!a) return '';
  const l1 = [a.street, a.secondary].filter(Boolean).join(', ');
  const l2 = `${a.city}, ${a.state} ${a.zip}`;
  return `${l1} · ${l2}`;
}

Object.assign(window, { RESULT_TYPES, FIELD_LABELS, fmtAddress });
