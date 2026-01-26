# Refactoring Opportunities

## High Priority

### StyleService - Split Mixed Concerns

StyleService currently combines three distinct responsibilities:

| Concern | Methods |
|---------|---------|
| **Address Formatting** | `getFormattedAddressSuggestion`, `createHighlightedTextElements` |
| **CSS Generation** | `convertStylesObjectToCssBlock`, `formatStyleBlock`, `updateDynamicStyles`, `calculatePositionStyles`, `calculateColorStyles`, `deriveSurfaceColors` |
| **Color Utilities** | `rgbToHsl`, `calculateHue`, `calculateSaturation`, `getRgbaFromCssColor`, `getHslFromColorString`, `getNearestStyledElement`, `convertDecimalToPercentage` |

**Recommendation**:
- Keep `StyleService` for CSS generation and dynamic styling
- Move address formatting methods to a new `FormatService` or into `FormService`
- Extract color utilities to `src/utils/colorUtils.ts` as pure functions

## Medium Priority

### DomService - Separate Generic vs Application-Specific

Mixes generic DOM utilities with autocomplete-specific builders:

| Type | Methods |
|------|---------|
| **Generic DOM** | `findDomElement`, `findDomElementWithRetry`, `createDomElement`, `setInputValue`, `getElementStyles`, `buildElementsFromMap` |
| **Autocomplete-Specific** | `buildAutocompleteDomElements`, `buildSuggestionElement`, `buildSecondarySuggestionElement` |

**Recommendation**:
- Keep generic methods in `DomService`
- Move autocomplete element builders to `DropdownService` or a new `AutocompleteElementBuilder` utility

### Centralize CSS Class Names

Class names like `"smartyAddress__hidden"` are scattered throughout the codebase (e.g., `DropdownService.ts` lines 556-560). Create a constants file:

```typescript
// src/constants/cssClasses.ts
export const CSS_CLASSES = {
  hidden: 'smartyAddress__hidden',
  matchedText: 'smartyAddress__matchedText',
  // ...
} as const;
```

## Low Priority

### FormService - Extract State Abbreviations Constant

The `STATE_ABBREVIATIONS` constant (60+ lines) is embedded in `FormService.ts`.

**Recommendation**: Move to `src/constants/stateAbbreviations.ts`

## Notes

### DropdownService - Controller Pattern (No Action Needed)

DropdownService is large but intentionally acts as a coordinator handling both dropdown state management and UI/DOM operations. This is acceptable for a controller pattern. If it grows significantly further, consider extracting a `DropdownStateService`.
