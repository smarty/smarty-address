1. Add Service-Level Tests

Currently only utility functions are tested (72 tests). The three services have zero test coverage:
- ApiService - untested
- AutocompleteDropdownService - untested (352 lines of complex logic)
- AddressFormUiService - untested

2. Centralize CSS Class Names

There's a TODO in the code for this. Class names like "smartyAddress__hidden" are scattered throughout. Create a constants file:
export const CSS_CLASSES = {
hidden: 'smartyAddress__hidden',
matchedText: 'smartyAddress__matchedText',
// ...
} as const;

Medium Priority

3. Split domUtils.ts (648 lines)

This utility file is too large. Split by concern:
- domElements.ts - Element creation/manipulation
- domStyles.ts - Styling and CSS utilities
- domAccessibility.ts - ARIA and accessibility helpers

4. Decouple ApiService ↔ AutocompleteDropdownService

These have bidirectional dependencies - ApiService calls methods on AutocompleteDropdownService directly. Consider using:
- Callbacks passed to API methods, or
- An event emitter pattern

5. Add State Machine for Dropdown

Replace scattered state variables (dropdownIsOpen, highlightedSuggestionIndex, selectedSuggestionIndex) with a proper state machine pattern for clearer state transitions.

Low Priority

6. Configuration Validation

Add early validation for required fields like embeddedKey at init time, rather than failing later at API call time.
