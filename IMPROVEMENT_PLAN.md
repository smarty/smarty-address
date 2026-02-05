# Smarty Address Library - Improvement Plan

This document outlines the issues identified during code review and the plan to address them.

**Note:** Since this library is pre-launch, all changes can be implemented without backward compatibility concerns.

---

## Medium Priority

### 1. Extract DropdownService Concerns ✅ COMPLETED

**Problem:** DropdownService is 809 lines with multiple responsibilities.

**Files created:**

- `src/services/DropdownStateService.ts` - State management (indices, suggestions arrays)
- `src/services/KeyboardNavigationService.ts` - Keyboard event handling

**Implementation completed:**

1. Created `DropdownStateService`:
   - Moved state properties: `highlightedAutocompleteSuggestionIndex`, `selectedAutocompleteSuggestionIndex`, etc.
   - Moved getters/setters for state
   - Moved `getMergedAutocompleteSuggestions()`

2. Created `KeyboardNavigationService`:
   - Moved `handleAutocompleteKeydown()`
   - Moved `highlightNewAddress()`
   - Moved `scrollToHighlightedAutocompleteSuggestion()`

3. Kept in `DropdownService`:
   - High-level orchestration
   - Event listener attachment
   - Public API methods (delegating to new services)

4. Updated `BaseService` with new service getters

5. Updated `SmartyAddress` to instantiate new services

**Tests added:**

- `src/services/DropdownStateService.test.ts` - 14 tests
- `src/services/KeyboardNavigationService.test.ts` - 13 tests

---

### 2. Replace Retry Loop with MutationObserver ✅ COMPLETED

**Problem:** Polling loop (50 attempts × 100ms) is inefficient for waiting on dynamically-added elements (e.g., React components).

**Why MutationObserver is better:**

- Event-driven: detects elements instantly when added (no polling delay)
- Zero CPU usage while waiting (no setTimeout loops)
- Standard browser API for observing DOM changes

**Files modified:**

- `src/interfaces.ts` - Added `domWaitTimeoutMs?: number`
- `src/services/DomService.ts` - Replaced polling loop with MutationObserver
- `src/services/DropdownService.ts` - Updated to pass config timeout

**Tests added:**

- `src/services/DomService.test.ts` - 4 new tests for MutationObserver behavior

---

### 3. Add Integration Tests ✅ COMPLETED

**Problem:** No tests for full user interaction flows.

**Files created:**

- `src/__tests__/integration/userFlow.test.ts` - 6 tests
- `src/__tests__/integration/keyboardNavigation.test.ts` - 7 tests
- `src/__tests__/integration/formPopulation.test.ts` - 9 tests
- `src/__tests__/integration/multipleInstances.test.ts` - 4 tests

**Additional changes:**

- Added `_testMode?: boolean` to config to bypass `event.isTrusted` check for programmatic events
- Created `jest.setup.ts` with canvas mock for jsdom environment
- Updated `jest.config.js` to use setup file
- Suppressed expected console.error in ApiService tests

**Test scenarios covered:**

1. **Basic flow:** ✅
   - User types in search input
   - Suggestions appear
   - User clicks suggestion
   - Form fields populate

2. **Keyboard navigation:** ✅
   - Arrow down selects next item
   - Arrow up selects previous item
   - Enter selects highlighted item
   - Escape closes dropdown

3. **Secondary suggestions (units):** ✅
   - Select address with multiple entries
   - Secondary fetch triggers
   - Dropdown stays open for unit selection

4. **Multiple instances:** ✅
   - Two instances on same page
   - Actions on one don't affect the other

---

## Low Priority

### 4. Improve Type Safety in normalizeConfig ✅ COMPLETED

**Problem:** Double cast bypasses TypeScript.

**Files modified:**

- `src/utils/configNormalizer.ts`

**Implementation:** Removed the double cast (`as unknown as`) and replaced with single cast (`as NormalizedSmartyAddressConfig`).

---

### 5. SSR Compatibility ✅ COMPLETED

**Problem:** Static initializer injects styles on class load.

**Files modified:**

- `src/index.ts`

**Implementation:** Added `typeof document !== "undefined"` guard around `defineStyles()` call in static initializer.

---

### 6. Fix Minor Type Issues ✅ COMPLETED

**Files modified:**

- `src/services/StyleService.ts:30` - Changed `styles: {}` to `styles: Record<string, string>`
- `src/interfaces.ts:116` - Changed `Record<string, any>` to `Record<string, unknown>`
- `src/services/FormService.ts:140` - Removed unnecessary optional chaining

---

## Implementation Order

| Phase | Tasks                                         | Status       |
| ----- | --------------------------------------------- | ------------ |
| 1     | #2 (MutationObserver), #3 (Integration tests) | ✅ Completed |
| 2     | #1 (Extract services)                         | ✅ Completed |
| 3     | #4 (Type safety), #5 (SSR), #6 (Minor types)  | ✅ Completed |

Since this is pre-launch, all changes can be implemented directly without deprecation periods or backward compatibility shims.

---

## Success Criteria

- [x] No memory leaks when creating/destroying instances
- [x] Initialization completes before user interaction is possible
- [x] API response edge cases handled gracefully
- [x] All new code has test coverage (177 tests, including 26 integration tests)
- [x] No TypeScript `any` or unsafe casts in modified code
- [x] README documents the factory pattern usage
