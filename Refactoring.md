1. Split AutocompleteDropdownService (352 lines)

This service is doing too much - it's a "God object" handling DOM setup, event handling, state management, rendering, and accessibility. Consider splitting into:
- DropdownDomService - DOM element creation and management
- DropdownStateService - State management (open/close, highlighted index, results)
- DropdownEventService - Event listeners and handlers

2. Add Service-Level Tests

Currently only utility functions are tested (72 tests). The three services have zero test coverage:
- ApiService - untested
- AutocompleteDropdownService - untested (352 lines of complex logic)
- AddressFormUiService - untested

3. Centralize CSS Class Names

There's a TODO in the code for this. Class names like "smartyAddress__hidden" are scattered throughout. Create a constants file:
export const CSS_CLASSES = {
hidden: 'smartyAddress__hidden',
matchedText: 'smartyAddress__matchedText',
// ...
} as const;

4. Improve Error User Feedback

Errors are logged to console but users get no feedback - the dropdown just closes silently. Consider adding error states to the dropdown UI.

Medium Priority

5. Split domUtils.ts (648 lines)

This utility file is too large. Split by concern:
- domElements.ts - Element creation/manipulation
- domStyles.ts - Styling and CSS utilities
- domAccessibility.ts - ARIA and accessibility helpers

6. Decouple ApiService ↔ AutocompleteDropdownService

These have bidirectional dependencies - ApiService calls methods on AutocompleteDropdownService directly. Consider using:
- Callbacks passed to API methods, or
- An event emitter pattern

7. Add State Machine for Dropdown

Replace scattered state variables (dropdownIsOpen, highlightedSuggestionIndex, selectedSuggestionIndex) with a proper state machine pattern for clearer state transitions.

8. Cache DOM References

findDomElement() is called repeatedly during event handling. Cache the reference after initial lookup.

Low Priority

9. Configuration Validation

Add early validation for required fields like embeddedKey at init time, rather than failing later at API call time.

10. Resolve TODOs

There are 6 TODOs in the code including dynamically updating version from package.json and cross-browser testing notes.
