# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build**: `npm run build` - Compiles TypeScript and copies assets to dist/
- **Dev server**: `npm run dev` - Starts Vite dev server on port 5176
- **Run all tests**: `npm test`
- **Run a single test file**: `npm test -- path/to/file.test.ts`
- **Format code**: `npx prettier --write .`

## Architecture

This is a TypeScript library for Smarty address autocomplete and validation. The main entry point is the `SmartyAddress` class exported from `src/index.ts`.

### Class-Based Service Architecture

The codebase uses ES6 classes for all services. Each service extends `BaseService` from `src/services/BaseService.ts`, which provides:

- Cross-service dependency management via `setServices()`
- Access to other services through typed protected getters (e.g., `this.apiService`, `this.formService`)
- A default no-op `init(config)` method (override in subclasses that need initialization)

Services are instantiated in the `SmartyAddress` constructor and wired together with their dependencies.

### Services

All services are located at `src/services/`:

1. **ApiService** (`ApiService.ts`): Handles all Smarty API calls including address suggestions, error handling, and API parameter mapping
2. **DropdownService** (`DropdownService.ts`): Dropdown UI orchestration, DOM creation, and event handling
3. **DropdownStateService** (`DropdownStateService.ts`): Dropdown state management (open/close, selected items, suggestion tracking)
4. **KeyboardNavigationService** (`KeyboardNavigationService.ts`): Keyboard navigation within the dropdown (arrow keys, enter, escape)
5. **FormService** (`FormService.ts`): Populates form fields when an address is selected
6. **DomService** (`DomService.ts`): Generic DOM utilities for element creation, manipulation, and form value handling
7. **StyleService** (`StyleService.ts`): CSS generation, dynamic style calculation, and style block formatting
8. **FormatService** (`FormatService.ts`): Address formatting for display and text highlighting for search matches
9. **ColorService** (`ColorService.ts`): Color conversion utilities (RGB/HSL), CSS color parsing, and percentage conversions

### Key Patterns

- All services are standard ES6 classes extending `BaseService`
- Services that need configuration override `init(config)`
- Services communicate via typed getters (e.g., `this.apiService.method()`)
- Multiple `SmartyAddress` instances are tracked via `instanceId` for isolation
- Themes are CSS variable arrays defined in `src/themes.ts`
- **All CSS property values in `assets/styles/theme.ts` must use CSS variables** (`var(--smartyAddress__...)`) — never hardcode raw values. CSS variables are defined across files in `assets/styles/`: `base.ts` (defaults unlikely to be overridden), `colors.ts`, `spacing.ts`, `misc.ts` (typography, positioning). Create new variables in the appropriate file so themes have total control of styling
- Configuration is merged with `defaultConfig` at instantiation
- Avoid code comments; prefer self-documenting code with clear naming

### Coding Style

- **Early returns over nesting**: Use guard clauses (`if (!condition) return;`) instead of wrapping method bodies in conditionals
- **Immutable patterns**: Prefer `const` with ternary over `let` with conditional reassignment
- **Extract complex conditions**: Multi-part boolean expressions should be named variables (e.g., `const isConfigMissing = !x || !y;`)
- **Name domain-specific magic numbers**: Extract as constants (e.g., `LIGHT_MODE_BREAKPOINT = 50`), but keep universally understood values inline (`"#000"`, `"#fff"`)
- **Push back on subjective feedback**: Not all review suggestions require action; defend choices with rationale when appropriate
- **Investigate before fixing "bugs"**: What looks like a bug may be intentional; understand full context before changing

### Figma

- The mockups use large values (e.g. 32px text, 1200px frames). Do NOT assume a 2x scale factor — always confirm before deriving CSS values proportionally from Figma dimensions.
- After making UI changes based on Figma designs, use Playwright to visually verify the result in the browser before considering the task done.

### Customization Options

Users can customize the library in two ways:

1. **Lifecycle Hooks** (config options):
   - `onAddressSelected(address)` - Called when an address is selected
   - `onAutocompleteSuggestionsReceived(suggestions)` - Called when suggestions are received, can modify/filter results
   - `onDropdownOpen()` - Called when dropdown opens
   - `onDropdownClose()` - Called when dropdown closes

2. **Service Overrides** (advanced):
   - Extend any service class (e.g., `class CustomApiService extends SmartyAddress.services.ApiService`)
   - Pass custom service classes via config: `services: { ApiService: CustomApiService }`
   - This allows complete control over service behavior
