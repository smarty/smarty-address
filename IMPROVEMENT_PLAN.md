# Smarty Address Library - Improvement Plan

This document outlines the issues identified during code review and the plan to address them.

**Note:** Since this library is pre-launch, all changes can be implemented without backward compatibility concerns.

---

## Medium Priority

### 1. Extract DropdownService Concerns

**Problem:** DropdownService is 809 lines with multiple responsibilities.

**Files to create:**
- `src/services/DropdownStateService.ts` - State management (indices, suggestions arrays)
- `src/services/KeyboardNavigationService.ts` - Keyboard event handling
- `src/services/DropdownDomService.ts` - DOM creation and manipulation

**Implementation:**

1. Create `DropdownStateService`:
   - Move state properties: `highlightedAutocompleteSuggestionIndex`, `selectedAutocompleteSuggestionIndex`, etc.
   - Move getters/setters for state
   - Move `getMergedAutocompleteSuggestions()`

2. Create `KeyboardNavigationService`:
   - Move `handleAutocompleteKeydown()`
   - Move `highlightNewAddress()`
   - Move `scrollToHighlightedAutocompleteSuggestion()`

3. Keep in `DropdownService`:
   - High-level orchestration
   - Event listener attachment
   - Public API methods

4. Update `BaseService` with new service getters

5. Update `SmartyAddress` to instantiate new services

**Tests to add:**
- Unit tests for each extracted service
- Integration test verifying services work together

---

### 2. Make Retry Parameters Configurable

**Problem:** 5-second retry window (50 attempts × 100ms) is hardcoded.

**Files to modify:**
- `src/interfaces.ts`
- `src/services/DomService.ts`
- `src/services/DropdownService.ts`

**Implementation:**

1. Add to `SmartyAddressConfig`:
   ```typescript
   domRetryAttempts?: number;
   domRetryDelayMs?: number;
   ```

2. Pass config to `DomService.init()`:
   ```typescript
   init(config: NormalizedSmartyAddressConfig) {
       this.maxRetryAttempts = config.domRetryAttempts ?? 50;
       this.retryDelayMs = config.domRetryDelayMs ?? 100;
   }
   ```

3. Use instance properties in `findDomElementWithRetry()`

**Tests to add:**
- Test with custom retry values
- Test that default values work unchanged

---

### 3. Add Integration Tests

**Problem:** No tests for full user interaction flows.

**Files to create:**
- `src/__tests__/integration/userFlow.test.ts`
- `src/__tests__/integration/keyboardNavigation.test.ts`
- `src/__tests__/integration/formPopulation.test.ts`

**Test scenarios to cover:**

1. **Basic flow:**
   - User types in search input
   - Suggestions appear
   - User clicks suggestion
   - Form fields populate

2. **Keyboard navigation:**
   - Arrow down selects next item
   - Arrow up selects previous item
   - Enter selects highlighted item
   - Escape closes dropdown

3. **Secondary suggestions (units):**
   - Select address with multiple entries
   - Secondary suggestions appear
   - Select unit
   - Form populates with unit

4. **Multiple instances:**
   - Two instances on same page
   - Actions on one don't affect the other

---

## Low Priority

### 4. Improve Type Safety in normalizeConfig

**Problem:** Double cast bypasses TypeScript.

**Files to modify:**
- `src/utils/configNormalizer.ts`

**Implementation:**

```typescript
export function normalizeConfig(config: SmartyAddressConfig): NormalizedSmartyAddressConfig {
    const normalized: Partial<NormalizedSmartyAddressConfig> = {};

    // Type-safe property assignment
    normalized.embeddedKey = config.embeddedKey;
    normalized.streetSelector = config.streetSelector;
    normalized.autocompleteApiUrl = config.autocompleteApiUrl;
    normalized.theme = config.theme;

    // Handle selector aliases
    normalized.localitySelector = config.localitySelector ?? config.citySelector;
    normalized.administrativeAreaSelector =
        config.administrativeAreaSelector ?? config.stateSelector ?? config.regionSelector ?? config.provinceSelector;
    // ... etc

    return normalized as NormalizedSmartyAddressConfig;
}
```

**Alternative:** Use a schema validation library like Zod for runtime validation.

---

### 5. SSR Compatibility

**Problem:** Static initializer injects styles on class load.

**Files to modify:**
- `src/index.ts`
- `src/utils/appUtils.ts`

**Implementation:**

```typescript
static {
    if (typeof document !== 'undefined') {
        defineStyles();
    }
}
```

Or defer to first instantiation:
```typescript
private static stylesInitialized = false;

constructor(config: SmartyAddressConfig) {
    if (!SmartyAddress.stylesInitialized && typeof document !== 'undefined') {
        defineStyles();
        SmartyAddress.stylesInitialized = true;
    }
    // ...
}
```

---

### 6. Fix Minor Type Issues

**Files to modify:**
- `src/services/StyleService.ts:26` - Change `styles: {}` to `styles: Record<string, string>`
- `src/interfaces.ts:98` - Change `Record<string, any>` to `Record<string, unknown>`
- `src/services/FormService.ts:140` - Remove unnecessary optional chaining

---

## Implementation Order

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | #2 (Retry config), #3 (Integration tests) | Configuration & testing |
| 2 | #1 (Extract services) | Larger refactor |
| 3 | #4 (Type safety), #5 (SSR), #6 (Minor types) | Polish |

Since this is pre-launch, all changes can be implemented directly without deprecation periods or backward compatibility shims.

---

## Success Criteria

- [x] No memory leaks when creating/destroying instances
- [x] Initialization completes before user interaction is possible
- [x] API response edge cases handled gracefully
- [ ] All new code has test coverage
- [ ] No TypeScript `any` or unsafe casts in modified code
- [ ] README documents the factory pattern usage
