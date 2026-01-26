# Smarty Address Library - Improvement Plan

This document outlines the issues identified during code review and the plan to address them.

**Note:** Since this library is pre-launch, all changes can be implemented without backward compatibility concerns.

---

## High Priority

### 1. Add Cleanup/Destroy Method

**Problem:** Event listeners and MutationObservers are never removed, causing memory leaks when instances are created/destroyed dynamically.

**Files to modify:**
- `src/services/DropdownService.ts`
- `src/services/BaseService.ts`
- `src/index.ts`

**Implementation:**

1. Add cleanup tracking to `DropdownService`:
   ```typescript
   private cleanupFunctions: (() => void)[] = [];
   ```

2. Store references to all event listeners and observers during setup:
   ```typescript
   const scrollHandler = () => dynamicStylingHandler();
   window.addEventListener("scroll", scrollHandler);
   this.cleanupFunctions.push(() => window.removeEventListener("scroll", scrollHandler));
   ```

3. Add `destroy()` method to `DropdownService`:
   ```typescript
   destroy(): void {
       this.cleanupFunctions.forEach(fn => fn());
       this.cleanupFunctions = [];
       this.dropdownWrapperElement?.remove();
       this.customStylesElement?.remove();
   }
   ```

4. Add abstract `destroy()` to `BaseService` with default no-op

5. Add `destroy()` to `SmartyAddress` class that calls destroy on all services

6. Remove instance from `SmartyAddress.instances` array on destroy

**Tests to add:**
- Verify event listeners are removed after destroy
- Verify DOM elements are removed after destroy
- Verify instance is removed from static instances array

---

### 2. Fix Async Initialization Pattern

**Problem:** Constructor calls async `init()` without awaiting, so users have no way to know when initialization completes.

**Files to modify:**
- `src/index.ts`

**Implementation:**

Use a factory pattern with a private constructor:

```typescript
static async create(config: SmartyAddressConfig): Promise<SmartyAddress> {
    const instance = new SmartyAddress(config);
    await instance.init(config);
    return instance;
}

private constructor(config: SmartyAddressConfig) {
    // Service instantiation (synchronous only)
    // Remove this.init(config) call from constructor
}
```

This ensures users must use `await SmartyAddress.create(config)` and cannot accidentally use the instance before it's ready.

**Tests to add:**
- Verify `create()` resolves after DOM is ready
- Verify form population works immediately after `create()` resolves

---

### 3. Add Null Safety to API Response Parsing

**Problem:** If API returns `{ suggestions: null }`, downstream code will fail.

**Files to modify:**
- `src/services/ApiService.ts`

**Implementation:**

```typescript
private async parseResponse(response: Response): Promise<AutocompleteSuggestion[]> {
    if (response.ok) {
        const data = (await response.json()) as { suggestions?: AutocompleteSuggestion[] | null };
        return data.suggestions ?? [];
    }
    // ... error handling
}
```

**Tests to add:**
- Test with `{ suggestions: null }`
- Test with `{ suggestions: undefined }`
- Test with `{}` (missing suggestions key)

---

## Medium Priority

### 4. Extract DropdownService Concerns

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

### 5. Make Retry Parameters Configurable

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

### 6. Fix Global Document Event Listener

**Problem:** Each instance adds a global `mouseup` listener that's never removed.

**Files to modify:**
- `src/services/DropdownService.ts`

**Implementation:**

```typescript
private handleDocumentMouseUp = () => {
    this.isInteractingWithDropdown = false;
};

private configureDropdownInteractions(): void {
    // ... existing code ...
    document.addEventListener("mouseup", this.handleDocumentMouseUp);
    this.cleanupFunctions.push(() =>
        document.removeEventListener("mouseup", this.handleDocumentMouseUp)
    );
}
```

**Note:** This fix is part of the cleanup/destroy implementation (#1).

---

### 7. Add Integration Tests

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

### 8. Improve Type Safety in normalizeConfig

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

### 9. SSR Compatibility

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

### 10. Fix Minor Type Issues

**Files to modify:**
- `src/services/StyleService.ts:26` - Change `styles: {}` to `styles: Record<string, string>`
- `src/interfaces.ts:98` - Change `Record<string, any>` to `Record<string, unknown>`
- `src/services/FormService.ts:140` - Remove unnecessary optional chaining

---

## Implementation Order

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | #1 (Cleanup), #2 (Async init), #3 (Null safety) | High priority fixes |
| 2 | #6 (Global listener), #10 (Minor types) | Quick wins (included in #1) |
| 3 | #5 (Retry config), #7 (Integration tests) | Configuration & testing |
| 4 | #4 (Extract services) | Larger refactor |
| 5 | #8 (Type safety), #9 (SSR) | Polish |

Since this is pre-launch, all changes can be implemented directly without deprecation periods or backward compatibility shims.

---

## Success Criteria

- [ ] No memory leaks when creating/destroying instances
- [ ] Initialization completes before user interaction is possible
- [ ] API response edge cases handled gracefully
- [ ] All new code has test coverage
- [ ] No TypeScript `any` or unsafe casts in modified code
- [ ] README documents the factory pattern usage
