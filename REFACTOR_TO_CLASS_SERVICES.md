# Refactor: Replace Custom Service Pattern with Class-Based Services

## Why This Refactor?

**Current problems:**
- Custom service pattern is non-standard and unfamiliar to most developers
- Difficult for users to override or hook into functionality

**Goals:**
1. **Simplicity**: Use standard ES6 classes everyone understands
2. **Modularity**: Easy to override services via subclassing or composition
3. **Hookability**: Expose lifecycle callbacks for common customizations

**Result:** More maintainable, more customizable, industry-standard architecture.

---

## Step 1: Create Base Service Class

**File:** `src/services/BaseService.ts` (new file)

```typescript
export interface ServiceDependencies {
  apiService?: ApiService;
  autocompleteDropdownService?: AutocompleteDropdownService;
  addressFormUiService?: AddressFormUiService;
}

export abstract class BaseService {
  protected services: ServiceDependencies = {};

  // Called after all services are instantiated
  setServices(services: ServiceDependencies) {
    this.services = services;
  }
}
```

**Why:**
- Provides common structure for all services
- Handles cross-service communication via `services` property
- Allows circular references without constructor issues

---

## Step 2: Convert ApiService to Class

**File:** `src/services/api/ApiService.ts`

**Before pattern:**
```typescript
const initialState = { apiKey: "", autocompleteApiUrl: "" };
const serviceHandlers = { init, fetchAddressSuggestions };
const utils = { getAutocompleteApiResults };
export const apiService = { initialState, serviceHandlers, utils };
```

**After pattern:**
```typescript
import { BaseService } from '../BaseService';
import { SmartyAddressConfig, ApiConfig } from '../../interfaces';
import { getAutocompleteApiResults, getMatchingResult } from '../../utils/apiUtils';
import { API_PARAM_KEYS } from '../../utils/apiUtils';

export class ApiService extends BaseService {
  private embeddedKey: string = '';
  private autocompleteApiUrl: string = '';
  private apiParams: Record<string, any> = {};

  init(config: SmartyAddressConfig) {
    this.embeddedKey = config.embeddedKey;
    this.autocompleteApiUrl = config.autocompleteApiUrl;

    API_PARAM_KEYS.forEach((param) => {
      if (config[param] !== undefined) {
        this.apiParams[param] = config[param];
      }
    });
  }

  getApiConfig(): ApiConfig {
    return {
      embeddedKey: this.embeddedKey,
      autocompleteApiUrl: this.autocompleteApiUrl,
      ...this.apiParams,
    };
  }

  async fetchAddressSuggestions(searchString: string) {
    try {
      const apiConfig = this.getApiConfig();
      const suggestions = await getAutocompleteApiResults(apiConfig, searchString);
      this.services.autocompleteDropdownService?.formatAddressSuggestions(suggestions, searchString);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.services.autocompleteDropdownService?.handleAutocompleteError(errorMessage);
    }
  }

  async fetchSecondaryAddressSuggestions(searchString: string, selectedAddress: any) {
    try {
      const apiConfig = this.getApiConfig();
      const primarySuggestions = await getAutocompleteApiResults(apiConfig, searchString);
      const newSelectedAddress = getMatchingResult(primarySuggestions, selectedAddress);
      const suggestions = newSelectedAddress
        ? await getAutocompleteApiResults(apiConfig, searchString, newSelectedAddress)
        : [];

      this.services.autocompleteDropdownService?.formatSecondaryAddressSuggestions(suggestions, searchString);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.services.autocompleteDropdownService?.handleAutocompleteSecondaryError(errorMessage);
    }
  }
}
```

**Key changes:**
1. Delete `apiHandlers.ts` - move functions into class methods
2. Change `initialState` → private class properties
3. Change `utils` → direct imports (they're just functions)
4. Change handler signature from `({ state, setState, services, utils }, customProps)` → `(normalParams)`
5. Access other services via `this.services.serviceName?.method()`

**Delete these files:**
- `src/services/api/apiHandlers.ts`

---

## Step 3: Convert AutocompleteDropdownService to Class

**File:** `src/services/autocompleteDropdown/AutocompleteDropdownService.ts`

**Pattern (abbreviated - full implementation follows same pattern as ApiService):**

```typescript
import { BaseService } from '../BaseService';
import { SmartyAddressConfig, AddressSuggestion, UiSuggestionItem } from '../../interfaces';
import {
  buildAutocompleteDomElements,
  configureDynamicStyling,
  // ... import all utils from domUtils
} from '../../utils/domUtils';
import { getInstanceClassName, getMergedAddressSuggestions } from '../../utils/uiUtils';

export class AutocompleteDropdownService extends BaseService {
  private instanceId: number;
  private theme: string[] = [];
  private searchInputSelector: string = '';

  private dropdownWrapperElement: HTMLElement | null = null;
  private dropdownElement: HTMLElement | null = null;
  private suggestionsElement: HTMLElement | null = null;
  private poweredBySmartyElement: HTMLElement | null = null;

  private selectedAddressSearchTerm: string = '';
  private dropdownIsOpen: boolean = false;
  private highlightedSuggestionIndex: number = 0;
  private selectedSuggestionIndex: number = -1;
  private addressSuggestionResults: UiSuggestionItem[] = [];
  private secondaryAddressSuggestionResults: UiSuggestionItem[] = [];
  private customStylesElement: HTMLElement | null = null;

  constructor(instanceId: number) {
    super();
    this.instanceId = instanceId;
  }

  init(config: SmartyAddressConfig) {
    this.theme = config.theme;
    this.searchInputSelector = config.searchInputSelector || config.streetSelector || '';
    this.setupDom(config);
    this.watchSearchInputForChanges();
  }

  setupDom(config: SmartyAddressConfig) {
    // Move logic from setupDom handler
    const elements = buildAutocompleteDomElements(this.instanceId);
    this.dropdownWrapperElement = elements.dropdownWrapperElement;
    this.dropdownElement = elements.dropdownElement;
    this.suggestionsElement = elements.suggestionsElement;
    this.poweredBySmartyElement = elements.poweredBySmartyElement;

    updateThemeClass(this.dropdownWrapperElement, this.theme);
    configureDynamicStyling(this.theme, this.instanceId);
    // ...
  }

  watchSearchInputForChanges() {
    const searchInputElement = findDomElement(this.searchInputSelector) as HTMLInputElement;
    if (!searchInputElement) return;

    configureSearchInputForAutocomplete(searchInputElement);

    searchInputElement.addEventListener("input", (e) => this.handleSearchInputOnChange(e));
    searchInputElement.addEventListener("keydown", (e) => this.handleAutocompleteKeydown(e));
  }

  handleAutocompleteKeydown(event: KeyboardEvent) {
    const pressedKey = event.key;
    if (this.dropdownIsOpen) {
      const handledKeys: Record<string, () => void> = {
        ArrowDown: () => this.highlightNewAddress(1),
        ArrowUp: () => this.highlightNewAddress(-1),
        Enter: () => this.handleSelectDropdownItem(this.highlightedSuggestionIndex),
        Escape: () => this.closeDropdown(),
      };

      if (handledKeys[pressedKey]) {
        event.preventDefault();
        handledKeys[pressedKey]();
      }
    }
  }

  handleSearchInputOnChange(event: Event) {
    const searchInput = event.target as HTMLInputElement;
    const searchString = searchInput.value;

    if (searchString.length === 0) {
      this.closeDropdown();
      return;
    }

    this.services.apiService?.fetchAddressSuggestions(searchString);
  }

  formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
    // Move logic from handler
    this.addressSuggestionResults = suggestions.map(address => ({
      address,
      suggestionElement: createSuggestionElement(address, searchString, this.instanceId)
    }));

    this.updateDropdownDisplay();
    this.openDropdown();
  }

  handleSelectDropdownItem(index: number) {
    const allSuggestions = getMergedAddressSuggestions(
      this.addressSuggestionResults,
      this.secondaryAddressSuggestionResults
    );

    const selectedItem = allSuggestions[index];
    if (!selectedItem) return;

    this.selectedSuggestionIndex = index;
    this.selectedAddressSearchTerm = /* ... */;

    if (selectedItem.address.entries && selectedItem.address.entries > 0) {
      // Has secondaries - fetch them
      this.services.apiService?.fetchSecondaryAddressSuggestions(
        this.selectedAddressSearchTerm,
        selectedItem.address
      );
    } else {
      // No secondaries - populate form
      this.services.addressFormUiService?.populateAddressForm(selectedItem.address);
      this.closeDropdown();
    }
  }

  // ... all other methods following same pattern

  private updateDropdownDisplay() {
    const allSuggestions = getMergedAddressSuggestions(
      this.addressSuggestionResults,
      this.secondaryAddressSuggestionResults
    );
    updateDropdownContents(this.suggestionsElement, allSuggestions);
  }

  openDropdown() {
    if (this.dropdownWrapperElement) {
      showElement(this.dropdownWrapperElement);
      this.dropdownIsOpen = true;
    }
  }

  closeDropdown() {
    if (this.dropdownWrapperElement) {
      hideElement(this.dropdownWrapperElement);
      this.dropdownIsOpen = false;
    }
  }

  // ... more methods
}
```

**Key changes:**
1. Delete `autocompleteDropdownHandlers.ts` - move all functions into class methods
2. Convert all state properties to private class properties
3. Event listeners call class methods directly: `(e) => this.handleKeydown(e)`
4. Utils become direct function calls (import from domUtils/uiUtils)

**Delete these files:**
- `src/services/autocompleteDropdown/autocompleteDropdownHandlers.ts`

---

## Step 4: Convert AddressFormUiService to Class

**File:** `src/services/addressFormUi/AddressFormUiService.ts`

Follow same pattern as ApiService - straightforward conversion since this service is simpler.

**Delete these files:**
- `src/services/addressFormUi/AddressFormUiHandlers.ts`

---

## Step 5: Update SmartyAddress Main Class

**File:** `src/index.ts`

**Before:**
```typescript
setupServices = (config: SmartyAddressConfig) => {
  Object.entries(config.services).forEach(([name, serviceDefinition]) => {
    const serviceHandlers = initService(name, serviceDefinition, this.instanceId);
    if (serviceHandlers.init) {
      serviceHandlers.init(config);
    }
  });
};
```

**After:**
```typescript
import { ApiService } from "./services/api/ApiService";
import { AutocompleteDropdownService } from "./services/autocompleteDropdown/AutocompleteDropdownService";
import { AddressFormUiService } from "./services/addressFormUi/AddressFormUiService";

export default class SmartyAddress {
  static defaultConfig: DefaultSmartyAddressConfig = {
    embeddedKey: "",
    theme: themes.default,
    autocompleteApiUrl: US_AUTOCOMPLETE_PRO_API_URL,
  };

  static themes = themes;

  // Expose service classes for user overrides
  static services = {
    ApiService,
    AutocompleteDropdownService,
    AddressFormUiService,
  };

  private static instances: SmartyAddress[] = [];
  private instanceId: number;

  // Service instances for this plugin instance
  private apiService: ApiService;
  private autocompleteDropdownService: AutocompleteDropdownService;
  private addressFormUiService: AddressFormUiService;

  constructor(config: SmartyAddressConfig) {
    SmartyAddress.instances.push(this);
    this.instanceId = SmartyAddress.instances.length;

    // Allow user to override service classes
    const ApiServiceClass = config.services?.ApiService || ApiService;
    const DropdownServiceClass = config.services?.AutocompleteDropdownService || AutocompleteDropdownService;
    const FormServiceClass = config.services?.AddressFormUiService || AddressFormUiService;

    // Instantiate services
    this.apiService = new ApiServiceClass();
    this.autocompleteDropdownService = new DropdownServiceClass(this.instanceId);
    this.addressFormUiService = new FormServiceClass();

    // Wire up cross-service dependencies
    const services = {
      apiService: this.apiService,
      autocompleteDropdownService: this.autocompleteDropdownService,
      addressFormUiService: this.addressFormUiService,
    };

    this.apiService.setServices(services);
    this.autocompleteDropdownService.setServices(services);
    this.addressFormUiService.setServices(services);

    this.init(config);
  }

  init = async (config: SmartyAddressConfig) => {
    const mergedConfig = {
      ...SmartyAddress.defaultConfig,
      ...config,
    };

    // Initialize each service
    this.apiService.init(mergedConfig);
    this.autocompleteDropdownService.init(mergedConfig);
    this.addressFormUiService.init(mergedConfig);
  };
}
```

**Key changes:**
1. Remove `setupServices` method
2. Directly instantiate service classes
3. Wire up dependencies via `setServices()`
4. Call `init()` on each service
5. Expose service classes on static `services` property for user overrides

---

## Step 6: Update Config Interface

**File:** `src/interfaces.ts`

**Remove these interfaces:**
```typescript
export interface ServiceHandler<TProps extends ServiceHandlerProps = ServiceHandlerProps> { ... }
export interface ServiceHandlerMap { ... }
export interface WrappedServiceHandler { ... }
export interface ServiceHandlerProps<TUtils = ServiceDefinitionUtils, TState = AbstractStateObject> { ... }
export interface ServiceDefinition<TUtils = ServiceDefinitionUtils, TState = AbstractStateObject> { ... }
export interface ServiceDefinitionUtils { ... }
export interface ServiceDefinitionMap { ... }
export interface ServicesObject { ... }
export interface ServiceHandlersObject { ... }
```

**Add these interfaces:**
```typescript
import { ApiService } from './services/api/ApiService';
import { AutocompleteDropdownService } from './services/autocompleteDropdown/AutocompleteDropdownService';
import { AddressFormUiService } from './services/addressFormUi/AddressFormUiService';

export interface ServiceClassOverrides {
  ApiService?: typeof ApiService;
  AutocompleteDropdownService?: typeof AutocompleteDropdownService;
  AddressFormUiService?: typeof AddressFormUiService;
}
```

**Update config interfaces:**
```typescript
export interface DefaultSmartyAddressConfig extends ApiConfig {
  theme: string[];
}

export interface SmartyAddressConfig extends DefaultSmartyAddressConfig {
  embeddedKey: string;
  searchInputSelector: string;
  streetLineSelector?: string;
  secondarySelector?: string;
  citySelector?: string;
  stateSelector?: string;
  zipcodeSelector?: string;

  // Allow service class overrides
  services?: ServiceClassOverrides;

  // Lifecycle hooks (add in Step 7)
  onAddressSelected?: (address: AddressSuggestion) => void;
  onSuggestionsReceived?: (suggestions: AddressSuggestion[]) => AddressSuggestion[];
  onDropdownOpen?: () => void;
  onDropdownClose?: () => void;
}
```

---

## Step 7: Add Lifecycle Hook Support

Add callback hooks to service methods for common customization needs.

**File:** `src/services/autocompleteDropdown/AutocompleteDropdownService.ts`

```typescript
export class AutocompleteDropdownService extends BaseService {
  private config?: SmartyAddressConfig;

  init(config: SmartyAddressConfig) {
    this.config = config; // Store config for hooks
    // ... rest of init
  }

  formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
    // Allow user to filter/modify suggestions
    if (this.config?.onSuggestionsReceived) {
      suggestions = this.config.onSuggestionsReceived(suggestions);
    }

    this.addressSuggestionResults = suggestions.map(address => ({
      address,
      suggestionElement: createSuggestionElement(address, searchString, this.instanceId)
    }));

    this.updateDropdownDisplay();
    this.openDropdown();
  }

  handleSelectDropdownItem(index: number) {
    const allSuggestions = getMergedAddressSuggestions(
      this.addressSuggestionResults,
      this.secondaryAddressSuggestionResults
    );

    const selectedItem = allSuggestions[index];
    if (!selectedItem) return;

    // Call hook before processing
    if (this.config?.onAddressSelected) {
      this.config.onAddressSelected(selectedItem.address);
    }

    // ... rest of selection logic
  }

  openDropdown() {
    if (this.dropdownWrapperElement) {
      showElement(this.dropdownWrapperElement);
      this.dropdownIsOpen = true;

      if (this.config?.onDropdownOpen) {
        this.config.onDropdownOpen();
      }
    }
  }

  closeDropdown() {
    if (this.dropdownWrapperElement) {
      hideElement(this.dropdownWrapperElement);
      this.dropdownIsOpen = false;

      if (this.config?.onDropdownClose) {
        this.config.onDropdownClose();
      }
    }
  }
}
```

**Why:** Provides simple hooks for 80% of use cases without requiring subclassing.

---

## Step 8: Delete Old Service Factory

**Delete these files:**
- `src/utils/serviceFactory.ts`

**Why:** No longer needed - services are instantiated directly.

---

## Step 9: Update Tests

Update any test files that import or use the old service pattern.

**Pattern changes in tests:**
- Old: `const wrappedHandler = initService('apiService', apiService, 1)`
- New: `const service = new ApiService()`

---

## Step 10: Update Documentation

**File:** `README.md` or create `CUSTOMIZATION.md`

Add examples of:

1. **Basic usage** (unchanged)
2. **Using lifecycle hooks:**
```typescript
const plugin = new SmartyAddress({
  embeddedKey: "...",
  streetSelector: "#street",
  onAddressSelected: (address) => {
    console.log('Selected:', address);
    analytics.track('address_selected', address);
  },
  onSuggestionsReceived: (suggestions) => {
    // Filter out restricted cities
    return suggestions.filter(s => s.city !== "Restricted City");
  }
});
```

3. **Overriding a service:**
```typescript
class CustomApiService extends SmartyAddress.services.ApiService {
  async fetchAddressSuggestions(searchString: string) {
    console.log('Fetching:', searchString);
    return super.fetchAddressSuggestions(searchString);
  }
}

const plugin = new SmartyAddress({
  embeddedKey: "...",
  streetSelector: "#street",
  services: {
    ApiService: CustomApiService
  }
});
```

---

## Migration Checklist

- [ ] Step 1: Create BaseService class
- [ ] Step 2: Convert ApiService to class, delete apiHandlers.ts
- [ ] Step 3: Convert AutocompleteDropdownService to class, delete handlers file
- [ ] Step 4: Convert AddressFormUiService to class, delete handlers file
- [ ] Step 5: Update SmartyAddress main class to instantiate services
- [ ] Step 6: Update interfaces.ts, remove old service interfaces
- [ ] Step 7: Add lifecycle hook support to services
- [ ] Step 8: Delete serviceFactory.ts
- [ ] Step 9: Update tests
- [ ] Step 10: Update documentation
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - builds successfully
- [ ] Test in `index.html` - basic usage still works
- [ ] Test custom service override in `index.html`
- [ ] Test lifecycle hooks in `index.html`

---

## Benefits After Refactor

1. **Simpler:** Standard ES6 classes, no custom factory pattern
2. **More customizable:** Users can subclass or use hooks
3. **Better TypeScript:** Full type safety for service methods
4. **Better debugging:** Clear stack traces, no factory wrapper
5. **Industry standard:** Familiar pattern to all developers
