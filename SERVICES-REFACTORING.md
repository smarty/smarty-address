# Services Refactoring Plan

This document outlines a plan to reorganize the service architecture for better cohesion and clarity.

## Current Structure

```
services/
  BaseService.ts
  api/
    ApiService.ts              # Thin wrapper, delegates to ApiUtilsService
  autocompleteDropdown/
    AutocompleteDropdownService.ts  # UI orchestration, keyboard handling
    DropdownStateService.ts         # State management
    DropdownDomService.ts           # DOM creation/manipulation
  addressFormUi/
    AddressFormUiService.ts    # Form population
  utils/
    ApiUtilsService.ts         # Actual API logic, error handling
    DomUtilsService.ts         # Generic DOM + dropdown-specific elements
    FormattingService.ts       # Address formatting, CSS generation, colors
```

**Problems:**
- ApiService/ApiUtilsService split is inverted (utils has the real logic)
- Three dropdown services is excessive granularity
- DomUtilsService mixes generic utilities with dropdown-specific code
- "Utils" naming implies secondary importance when these are core services

## Target Structure

```
services/
  BaseService.ts
  ApiService.ts        # All API logic consolidated
  DropdownService.ts   # All dropdown logic consolidated
  FormService.ts       # Form population (renamed)
  DomService.ts        # Generic DOM utilities only
  StyleService.ts      # CSS generation, colors, formatting
```

## Migration Details

### 1. ApiService (consolidated)

**Source files:** `api/ApiService.ts`, `utils/ApiUtilsService.ts`

**Contains:**
- `getAutocompleteApiResults()` - fetch suggestions from API
- `getMatchingResult()` - find matching suggestion in results
- `getApiError()` - map API errors to known error types
- `createErrorResponse()` - create error response objects
- `API_PARAM_MAP` and related constants
- `unknownError` constant
- `knownAutocompleteErrors` array

**Public interface:**
```typescript
class ApiService extends BaseService {
  getAddressSuggestions(searchString: string, selectedAddress?: AddressSuggestion): Promise<AddressSuggestion[]>
  getMatchingResult(suggestions: AddressSuggestion[], selected: AddressSuggestion): AddressSuggestion | undefined
}
```

### 2. DropdownService (consolidated)

**Source files:** `autocompleteDropdown/AutocompleteDropdownService.ts`, `autocompleteDropdown/DropdownStateService.ts`, `autocompleteDropdown/DropdownDomService.ts`

**Contains:**
- State management (open/closed, suggestions, selected index)
- DOM creation (dropdown container, suggestion elements)
- Event handling (keyboard navigation, mouse interactions)
- Positioning and visibility

**Public interface:**
```typescript
class DropdownService extends BaseService {
  // Lifecycle
  init(config: SmartyAddressConfig): void
  destroy(): void

  // State
  isOpen(): boolean
  open(): void
  close(): void
  setSuggestions(suggestions: AddressSuggestion[]): void
  getSelectedSuggestion(): AddressSuggestion | null

  // Navigation
  moveUp(): void
  moveDown(): void
  selectCurrent(): void
}
```

**Internal organization:** Can use private methods or internal helper classes if needed for readability, but exposed as single service.

### 3. FormService (renamed)

**Source file:** `addressFormUi/AddressFormUiService.ts`

**Changes:**
- Rename from `AddressFormUiService` to `FormService`
- Move to `services/FormService.ts`
- No functional changes

**Public interface:**
```typescript
class FormService extends BaseService {
  init(config: SmartyAddressConfig): void
  populateFormWithAddress(address: AddressSuggestion): void
}
```

### 4. DomService (trimmed)

**Source file:** `utils/DomUtilsService.ts`

**Contains (generic utilities only):**
- `findDomElement()` - query selector wrapper
- `setInputValue()` - set input value with events
- `getStateValueForInput()` - handle select vs input for state
- `getStreetLineFormValue()` - compute street line value
- `getRgbaFromCssColor()` - parse CSS color to RGBA
- `getComputedStylesForElement()` - get computed styles
- `createElement()` - create DOM element with attributes

**Moves to DropdownService:**
- `createSuggestionElement()` - dropdown-specific
- `createDropdownElement()` - dropdown-specific
- `updateDynamicStyles()` - dropdown-specific
- All dropdown positioning logic

**Moves to StyleService:**
- Color conversion utilities

**Public interface:**
```typescript
class DomService extends BaseService {
  findDomElement(selector: string | null): HTMLElement | null
  setInputValue(element: HTMLInputElement, value: string): void
  getStateValueForInput(element: HTMLInputElement | HTMLSelectElement, state: string): string
  getStreetLineFormValue(elements: FormElements, address: AddressSuggestion): string
  createElement<K extends keyof HTMLElementTagNameMap>(tag: K, attributes?: Record<string, string>): HTMLElementTagNameMap[K]
}
```

### 5. StyleService (new)

**Source files:** `utils/FormattingService.ts`, parts of `utils/DomUtilsService.ts`

**Contains:**
- `getFormattedAddressSuggestion()` - format address for display
- `createHighlightedTextElements()` - text highlighting
- `formatStyleBlock()` - CSS block generation
- `convertStylesObjectToCssBlock()` - styles object to CSS
- `getInstanceClassName()` - generate instance-specific class name
- `rgbToHsl()` - color conversion
- `getHslFromColorString()` - parse color to HSL
- `getMergedAddressSuggestions()` - merge primary and secondary suggestions

**Public interface:**
```typescript
class StyleService extends BaseService {
  formatAddress(suggestion: AddressSuggestion, isSecondary?: boolean): string
  highlightText(text: string, searchString: string): HighlightedTextElement[]
  generateCssBlock(selector: string, styles: Record<string, string>): string
  getInstanceClassName(instanceId: number): string
  parseColorToHsl(colorString: string): HslColor
  mergeSuggestions(primary: UiSuggestionItem[], secondary: UiSuggestionItem[], insertIndex: number): UiSuggestionItem[]
}
```

## Implementation Steps

### Phase 1: Create new consolidated services

1. [ ] Create `services/ApiService.ts` (new consolidated version)
   - Copy logic from both current ApiService and ApiUtilsService
   - Update to use `this.services.domService` etc.

2. [ ] Create `services/StyleService.ts`
   - Move formatting methods from FormattingService
   - Move color conversion from DomUtilsService
   - Update method names for clarity

3. [ ] Create `services/DomService.ts`
   - Copy only generic DOM utilities from DomUtilsService
   - Remove dropdown-specific and color methods

4. [ ] Create `services/DropdownService.ts`
   - Consolidate all three dropdown services
   - Include dropdown-specific DOM creation
   - Organize with clear sections (state, DOM, events)

5. [ ] Create `services/FormService.ts`
   - Rename from AddressFormUiService
   - Update service references

### Phase 2: Update BaseService and interfaces

6. [ ] Update `BaseService.ts`
   - Update ServiceDependencies interface with new service names
   - Remove old service types

7. [ ] Update `interfaces.ts`
   - Update ServiceClassOverrides with new service names

### Phase 3: Update SmartyAddress entry point

8. [ ] Update `index.ts`
   - Import new services
   - Update static `services` object
   - Update service instantiation and wiring

### Phase 4: Update tests

9. [ ] Update/consolidate test files to match new structure
   - Merge API-related tests
   - Merge dropdown-related tests
   - Rename form service tests

### Phase 5: Cleanup

10. [ ] Delete old service files
    - `services/api/` directory
    - `services/autocompleteDropdown/` directory
    - `services/addressFormUi/` directory
    - `services/utils/` directory

11. [ ] Update CLAUDE.md with new architecture

12. [ ] Run full test suite and fix any issues

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large PR is hard to review | Can split into phases if needed |
| Test coverage gaps after consolidation | Review test coverage before and after |
| Circular dependencies | Plan import graph carefully, use interfaces |

## Open Questions

1. Should DropdownService be split into DropdownService + DropdownStateService for testability?
2. Should we keep the `utils/` directory for truly generic utilities?
