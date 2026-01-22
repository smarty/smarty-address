# Service Architecture Refactoring Plan

## Overview

This plan improves service organization by establishing clearer boundaries and moving code to more appropriate locations.

## Changes

### 1. Move DOM Creation from DropdownService → DomService

**Files affected:** `src/services/DropdownService.ts`, `src/services/DomService.ts`

Move these methods:
- `buildAutocompleteDomElements()`
- `buildElementsFromMap()`
- `createSuggestionElement()`
- Related helper methods for element creation

**Rationale:** DOM creation belongs in DOM utilities, not orchestration.

### 2. Move Dynamic Styling from DropdownService → StyleService

**Files affected:** `src/services/DropdownService.ts`, `src/services/StyleService.ts`

Move these methods:
- `updateDynamicStyles()`
- `getNearestStyledElement()`

**Rationale:** Styling concerns should be centralized in StyleService.

### 3. Move STATE_ABBREVIATIONS from DomService → FormService

**Files affected:** `src/services/DomService.ts`, `src/services/FormService.ts`

Move:
- `STATE_ABBREVIATIONS` constant
- `getStateValueForInput()` method

**Rationale:** This data is only used by FormService for populating form fields.

### 4. Move getMergedAddressSuggestions from StyleService → DropdownService

**Files affected:** `src/services/StyleService.ts`, `src/services/DropdownService.ts`

Move:
- `getMergedAddressSuggestions()` method

**Rationale:** This is orchestration logic (managing suggestion lists), not styling.

## Expected Outcome

After refactoring:
- **DropdownService**: Focused on orchestration, event handling, state management
- **DomService**: Generic DOM utilities + element creation
- **StyleService**: All styling, formatting, and color utilities
- **FormService**: Form population + state abbreviation handling
- **ApiService**: Unchanged (already well-scoped)
