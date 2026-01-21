# Utils to Services Refactoring Plan

This document outlines the strategy for making utility functions customizable by converting them into services.

## Overview

Currently, utils are pure functions imported directly by services. This creates tight coupling - overriding a util requires overriding every service that uses it. By converting utils to services, users can override specific utility methods using the same pattern they already use for service overrides.

## Proposed Util Services

Group existing utils into logical service classes:

| Service | Source Utils | Purpose |
|---------|--------------|---------|
| `DomUtilsService` | `domUtils.ts` | DOM element creation, manipulation |
| `FormattingService` | `uiUtils.ts` | Address formatting, text highlighting, CSS generation |
| `ApiUtilsService` | `apiUtils.ts` | API request building, response parsing, error handling |

## Implementation

### 1. Create Util Service Classes

```typescript
// src/services/utils/DomUtilsService.ts
import { BaseService } from "../BaseService";
import { AddressSuggestion } from "../../interfaces";

export class DomUtilsService extends BaseService {
  private instanceId: number;

  constructor(instanceId: number) {
    super();
    this.instanceId = instanceId;
  }

  init() {
    // No config needed for utils
  }

  getSuggestionId(index: number): string {
    return `smarty-suggestion-${this.instanceId}-${index}`;
  }

  createSuggestionElement(
    address: AddressSuggestion,
    searchString: string,
    suggestionId: string
  ): { suggestionElement: HTMLElement } {
    // Move implementation from domUtils.ts
  }

  createSecondarySuggestionElement(
    address: AddressSuggestion,
    searchString: string,
    suggestionId: string
  ): { secondarySuggestionElement: HTMLElement } {
    // Move implementation from domUtils.ts
  }

  // ... other DOM utils
}
```

```typescript
// src/services/utils/FormattingService.ts
import { BaseService } from "../BaseService";
import { AddressSuggestion } from "../../interfaces";

export class FormattingService extends BaseService {
  constructor() {
    super();
  }

  init() {}

  getFormattedAddressSuggestion(
    suggestion: AddressSuggestion,
    isSecondary: boolean = false
  ): string {
    const { street_line, secondary = "", city, state, zipcode } = suggestion;
    const streetText = isSecondary ? "…" : street_line;
    const secondaryText = secondary.length ? ` ${secondary}` : secondary;
    return `${streetText}${secondaryText}, ${city}, ${state} ${zipcode}`;
  }

  createHighlightedTextElements(
    text: string,
    searchString: string
  ): Array<{ text: string; isMatch?: boolean }> {
    // Move implementation from uiUtils.ts
  }

  // ... other formatting utils
}
```

```typescript
// src/services/utils/ApiUtilsService.ts
import { BaseService } from "../BaseService";
import { AddressSuggestion, ApiConfig } from "../../interfaces";

export class ApiUtilsService extends BaseService {
  constructor() {
    super();
  }

  init() {}

  async getAutocompleteApiResults(
    apiConfig: ApiConfig,
    searchString: string,
    selectedAddress: AddressSuggestion | null = null
  ): Promise<AddressSuggestion[]> {
    // Move implementation from apiUtils.ts
  }

  getMatchingResult(
    primarySuggestions: AddressSuggestion[],
    selectedAddress: AddressSuggestion
  ): AddressSuggestion | undefined {
    // Move implementation from apiUtils.ts
  }

  // ... other API utils
}
```

### 2. Update ServiceDependencies Interface

```typescript
// src/services/BaseService.ts
import type { DomUtilsService } from "./utils/DomUtilsService";
import type { FormattingService } from "./utils/FormattingService";
import type { ApiUtilsService } from "./utils/ApiUtilsService";

export interface ServiceDependencies {
  // Existing services
  apiService?: ApiService;
  autocompleteDropdownService?: AutocompleteDropdownService;
  addressFormUiService?: AddressFormUiService;
  dropdownStateService?: DropdownStateService;
  dropdownDomService?: DropdownDomService;

  // Util services
  domUtilsService?: DomUtilsService;
  formattingService?: FormattingService;
  apiUtilsService?: ApiUtilsService;
}
```

### 3. Update Consuming Services

Before:
```typescript
// AutocompleteDropdownService.ts
import { createSuggestionElement, getSuggestionId } from "../../utils/domUtils";

// ... later in the class
const suggestionId = getSuggestionId(instanceId, addressIndex);
const suggestionListElements = createSuggestionElement(address, searchString, suggestionId);
```

After:
```typescript
// AutocompleteDropdownService.ts
// No util imports needed

// ... later in the class
const suggestionId = this.services.domUtilsService!.getSuggestionId(addressIndex);
const suggestionListElements = this.services.domUtilsService!.createSuggestionElement(
  address,
  searchString,
  suggestionId
);
```

### 4. Wire Up in SmartyAddress Constructor

```typescript
// src/index.ts
export class SmartyAddress {
  constructor(config: SmartyAddressConfig) {
    const instanceId = SmartyAddress.instanceCount++;

    // Instantiate util services (allow overrides from config)
    const DomUtilsServiceClass = config.services?.DomUtilsService ?? DomUtilsService;
    const FormattingServiceClass = config.services?.FormattingService ?? FormattingService;
    const ApiUtilsServiceClass = config.services?.ApiUtilsService ?? ApiUtilsService;

    const domUtilsService = new DomUtilsServiceClass(instanceId);
    const formattingService = new FormattingServiceClass();
    const apiUtilsService = new ApiUtilsServiceClass();

    // Instantiate other services...

    // Wire dependencies
    const services = {
      domUtilsService,
      formattingService,
      apiUtilsService,
      // ... other services
    };

    Object.values(services).forEach(service => service.setServices(services));
  }
}
```

## User Override Examples

### Example 1: Custom Address Formatting

```typescript
// User wants addresses formatted differently
class CustomFormattingService extends SmartyAddress.services.FormattingService {
  getFormattedAddressSuggestion(suggestion, isSecondary = false) {
    // Format as "City, State - Street Address"
    const { street_line, city, state, zipcode } = suggestion;
    return `${city}, ${state} - ${street_line} ${zipcode}`;
  }
}

new SmartyAddress({
  embeddedKey: "xxx",
  services: {
    FormattingService: CustomFormattingService
  }
});
```

### Example 2: Custom Suggestion Element Styling

```typescript
// User wants custom DOM structure for suggestions
class CustomDomUtilsService extends SmartyAddress.services.DomUtilsService {
  createSuggestionElement(address, searchString, suggestionId) {
    const li = document.createElement("li");
    li.id = suggestionId;
    li.className = "my-custom-suggestion";

    // Custom structure with icon
    li.innerHTML = `
      <span class="icon">📍</span>
      <span class="address-text">${address.street_line}, ${address.city}</span>
    `;

    return { suggestionElement: li };
  }
}

new SmartyAddress({
  embeddedKey: "xxx",
  services: {
    DomUtilsService: CustomDomUtilsService
  }
});
```

### Example 3: Custom API Error Handling

```typescript
// User wants custom error messages or logging
class CustomApiUtilsService extends SmartyAddress.services.ApiUtilsService {
  async getAutocompleteApiResults(apiConfig, searchString, selectedAddress) {
    try {
      return await super.getAutocompleteApiResults(apiConfig, searchString, selectedAddress);
    } catch (error) {
      // Send to custom error tracking
      myErrorTracker.capture(error);

      // Show user-friendly message
      showToast("Address lookup temporarily unavailable");

      throw error;
    }
  }
}
```

## Exposing Services for Extension

Update the main export to expose util service classes:

```typescript
// src/index.ts
import { DomUtilsService } from "./services/utils/DomUtilsService";
import { FormattingService } from "./services/utils/FormattingService";
import { ApiUtilsService } from "./services/utils/ApiUtilsService";

export class SmartyAddress {
  static services = {
    // Existing
    ApiService,
    AutocompleteDropdownService,
    AddressFormUiService,

    // Util services
    DomUtilsService,
    FormattingService,
    ApiUtilsService,
  };
}
```

## Migration Steps

1. Create `src/services/utils/` directory
2. Create `DomUtilsService.ts`, `FormattingService.ts`, `ApiUtilsService.ts`
3. Move function implementations from util files to service methods
4. Update `BaseService.ts` with new service types
5. Update `SmartyAddress` constructor to instantiate and wire util services
6. Update consuming services to use `this.services.xxxUtilsService`
7. Export util service classes on `SmartyAddress.services`
8. Keep original util files temporarily for backwards compatibility (deprecated)
9. Update documentation with override examples

## Considerations

### Pure Functions That Don't Need Override

Some utils may never need customization (e.g., `convertDecimalToPercentage`). These can remain as private helper functions within services or as non-exported module-level functions.

### Util Services Accessing Other Services

Because util services extend `BaseService`, they have access to `this.services`. This allows utils to call other services if needed:

```typescript
class FormattingService extends BaseService {
  formatWithTheme(text: string) {
    // Can access other services
    const theme = this.services.themeService?.getCurrentTheme();
    // ...
  }
}
```

### Testing

Util services can be tested in isolation by instantiating them directly and calling `setServices()` with mocks, following the same pattern as other services.
