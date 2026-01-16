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

3. Improve Error User Feedback

Errors are logged to console but users get no feedback - the dropdown just closes silently. Consider adding error states to the dropdown UI.

Medium Priority

4. Split domUtils.ts (648 lines)

This utility file is too large. Split by concern:
- domElements.ts - Element creation/manipulation
- domStyles.ts - Styling and CSS utilities
- domAccessibility.ts - ARIA and accessibility helpers

5. Decouple ApiService ↔ AutocompleteDropdownService

These have bidirectional dependencies - ApiService calls methods on AutocompleteDropdownService directly. Consider using:
- Callbacks passed to API methods, or
- An event emitter pattern

6. Add State Machine for Dropdown

Replace scattered state variables (dropdownIsOpen, highlightedSuggestionIndex, selectedSuggestionIndex) with a proper state machine pattern for clearer state transitions.

7. Cache DOM References

findDomElement() is called repeatedly during event handling. Cache the reference after initial lookup.

Low Priority

8. Configuration Validation

Add early validation for required fields like embeddedKey at init time, rather than failing later at API call time.

9. Resolve TODOs

There are 6 TODOs in the code including dynamically updating version from package.json and cross-browser testing notes.
