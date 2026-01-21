# smarty-address

A lightweight TypeScript library for adding Smarty address autocomplete and validation to any web form.

## Installation

```bash
npm install @smarty-integrations-sandbox/smarty-address
```

## Quick Start

```html
<form>
  <input type="text" id="street" placeholder="Start typing an address..." />
  <input type="text" id="city" />
  <input type="text" id="state" />
  <input type="text" id="zipcode" />
</form>

<script type="module">
  import SmartyAddress from "@smarty-integrations-sandbox/smarty-address";

  new SmartyAddress({
    embeddedKey: "your-smarty-embedded-key",
    streetSelector: "#street",
    citySelector: "#city",
    stateSelector: "#state",
    zipcodeSelector: "#zipcode",
  });
</script>
```

Get your embedded key from the [Smarty dashboard](https://www.smarty.com/account/keys).

## Configuration

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `embeddedKey` | `string` | Your Smarty embedded key |
| `streetSelector` | `string` | CSS selector for street address field |

### Form Field Selectors

These selectors define where the selected address data gets populated:

| Option | Type | Description |
|--------|------|-------------|
| `searchInputSelector` | `string` | CSS selector for the autocomplete input (defaults to `streetSelector`) |
| `secondarySelector` | `string` | CSS selector for secondary address (apt, suite, etc.) |
| `citySelector` | `string` | CSS selector for city field |
| `stateSelector` | `string` | CSS selector for state field |
| `zipcodeSelector` | `string` | CSS selector for ZIP code field |

### API Options

These options control the suggestions returned by the Smarty API:

| Option | Type | Description |
|--------|------|-------------|
| `maxResults` | `number` | Maximum number of suggestions to return |
| `includeOnlyCities` | `string[]` | Only return addresses in these cities |
| `includeOnlyStates` | `string[]` | Only return addresses in these states |
| `includeOnlyZipCodes` | `string[]` | Only return addresses in these ZIP codes |
| `excludeStates` | `string[]` | Exclude addresses in these states |
| `preferCities` | `string[]` | Prefer addresses in these cities |
| `preferStates` | `string[]` | Prefer addresses in these states |
| `preferZipCodes` | `string[]` | Prefer addresses in these ZIP codes |
| `preferRatio` | `number` | Ratio of preferred results (0-100) |
| `preferGeolocation` | `string` | Prefer results near a geolocation |
| `source` | `"postal" \| "all"` | Address data source |

## Lifecycle Hooks

Hooks let you respond to events and customize behavior:

```javascript
new SmartyAddress({
  embeddedKey: "your-key",
  searchInputSelector: "#address-search",

  onAddressSelected: (address) => {
    console.log("User selected:", address);
    // address contains: street_line, secondary, city, state, zipcode, country
  },

  onSuggestionsReceived: (suggestions) => {
    // Filter or modify suggestions before display
    return suggestions.filter((s) => s.state !== "CA");
  },

  onDropdownOpen: () => {
    console.log("Dropdown opened");
  },

  onDropdownClose: () => {
    console.log("Dropdown closed");
  },
});
```

| Hook | Signature | Description |
|------|-----------|-------------|
| `onAddressSelected` | `(address: AddressSuggestion) => void` | Called when user selects an address |
| `onSuggestionsReceived` | `(suggestions: AddressSuggestion[]) => AddressSuggestion[]` | Called when suggestions arrive; return modified array |
| `onDropdownOpen` | `() => void` | Called when dropdown opens |
| `onDropdownClose` | `() => void` | Called when dropdown closes |

## Themes

Four built-in themes are available:

```javascript
import SmartyAddress from "@smarty-integrations-sandbox/smarty-address";

// Default theme (adapts to input colors)
new SmartyAddress({
  theme: SmartyAddress.themes.default,
  // ...
});

// Light theme
new SmartyAddress({
  theme: SmartyAddress.themes.light,
  // ...
});

// Dark theme
new SmartyAddress({
  theme: SmartyAddress.themes.dark,
  // ...
});

// No styling (bring your own CSS)
new SmartyAddress({
  theme: SmartyAddress.themes.none,
  // ...
});
```

## Multiple Instances

Create multiple autocomplete inputs on the same page by instantiating `SmartyAddress` multiple times:

```javascript
const shippingAutocomplete = new SmartyAddress({
  embeddedKey: "your-key",
  searchInputSelector: "#shipping-address",
  streetSelector: "#shipping-street",
  citySelector: "#shipping-city",
  stateSelector: "#shipping-state",
  zipcodeSelector: "#shipping-zip",
});

const billingAutocomplete = new SmartyAddress({
  embeddedKey: "your-key",
  searchInputSelector: "#billing-address",
  streetSelector: "#billing-street",
  citySelector: "#billing-city",
  stateSelector: "#billing-state",
  zipcodeSelector: "#billing-zip",
});
```

Each instance operates independently with isolated state.

## Service Overrides

For advanced customization, you can extend and replace any internal service:

```javascript
import SmartyAddress from "@smarty-integrations-sandbox/smarty-address";

class CustomApiService extends SmartyAddress.services.ApiService {
  // Override methods to customize API behavior
}

class CustomFormService extends SmartyAddress.services.FormService {
  // Override methods to customize form population
}

new SmartyAddress({
  embeddedKey: "your-key",
  searchInputSelector: "#address-search",
  services: {
    ApiService: CustomApiService,
    FormService: CustomFormService,
  },
});
```

### Available Services

| Service | Purpose |
|---------|---------|
| `ApiService` | Handles Smarty API calls and response processing |
| `DropdownService` | Manages dropdown UI, keyboard navigation, and events |
| `FormService` | Populates form fields when an address is selected |
| `DomService` | Generic DOM utilities |
| `StyleService` | Address formatting and styling utilities |

All services extend `BaseService` which provides:
- `setServices(services)` - Receives references to all other services
- `init(config)` - Called with configuration (override as needed)
- `this.services` - Access other services via `this.services.apiService`, etc.

## API Reference

### Static Properties

| Property | Type | Description |
|----------|------|-------------|
| `SmartyAddress.themes` | `object` | Built-in theme presets (`default`, `light`, `dark`, `none`) |
| `SmartyAddress.services` | `object` | Service classes for extension |
| `SmartyAddress.defaultConfig` | `object` | Default configuration values |

### AddressSuggestion Object

The address object passed to hooks contains:

```typescript
interface AddressSuggestion {
  street_line: string;
  secondary?: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  entries?: number;
  metadata?: Record<string, any>;
}
```
