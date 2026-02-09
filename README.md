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

  const autocomplete = await SmartyAddress.create({
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
| `streetSelector` | `string` | CSS selector for street address field (also used as the autocomplete input unless `searchInputSelector` is provided) |

### Form Field Selectors

These selectors define where the selected address data gets populated:

| Option | Type | Description |
|--------|------|-------------|
| `searchInputSelector` | `string` | CSS selector for the autocomplete input. Only needed when the autocomplete input is a different element from where the street address will be populated (e.g., a unified search field that populates separate street/city/state fields) |
| `secondarySelector` | `string` | CSS selector for secondary address (apt, suite, etc.) |
| `citySelector` | `string` | CSS selector for city field |
| `stateSelector` | `string` | CSS selector for state field |
| `zipcodeSelector` | `string` | CSS selector for ZIP code field |

#### International Naming

For international address forms, you can use alternative names that align with Smarty's international API conventions:

| US Name | International Alternative |
|---------|--------------------------|
| `citySelector` | `localitySelector` |
| `stateSelector` | `administrativeAreaSelector`, `regionSelector`, `provinceSelector` |
| `zipcodeSelector` | `postalCodeSelector`, `postcodeSelector`, `zipSelector` |

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

#### International Naming

API filter options also accept international alternatives:

| US Name | International Alternative |
|---------|--------------------------|
| `includeOnlyCities` | `includeOnlyLocalities` |
| `includeOnlyStates` | `includeOnlyAdministrativeAreas` |
| `includeOnlyZipCodes` | `includeOnlyPostalCodes` |
| `excludeStates` | `excludeAdministrativeAreas` |
| `preferCities` | `preferLocalities` |
| `preferStates` | `preferAdministrativeAreas` |
| `preferZipCodes` | `preferPostalCodes` |

## Lifecycle Hooks

Hooks let you respond to events and customize behavior:

```javascript
const autocomplete = await SmartyAddress.create({
  embeddedKey: "your-key",
  streetSelector: "#street",

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
const autocomplete = await SmartyAddress.create({
  theme: SmartyAddress.themes.default,
  // ...
});

// Light theme
const autocomplete = await SmartyAddress.create({
  theme: SmartyAddress.themes.light,
  // ...
});

// Dark theme
const autocomplete = await SmartyAddress.create({
  theme: SmartyAddress.themes.dark,
  // ...
});

// No styling (bring your own CSS)
const autocomplete = await SmartyAddress.create({
  theme: SmartyAddress.themes.none,
  // ...
});
```

### Custom Themes

Themes are arrays of CSS class names applied to the plugin components. Each class defines CSS variables that control the plugin's appearance (see `assets/styles/` for examples). Create a custom theme by providing your own array:

```javascript
const autocomplete = await SmartyAddress.create({
  theme: ["my-dropdown-theme", "my-color-scheme"],
  // ...
});
```

You can also extend a built-in theme:

```javascript
const autocomplete = await SmartyAddress.create({
  theme: [...SmartyAddress.themes.dark, "my-custom-overrides"],
  // ...
});
```

## Multiple Instances

Create multiple autocomplete inputs on the same page by creating multiple `SmartyAddress` instances:

```javascript
const shippingAutocomplete = await SmartyAddress.create({
  embeddedKey: "your-key",
  searchInputSelector: "#shipping-address",
  streetSelector: "#shipping-street",
  citySelector: "#shipping-city",
  stateSelector: "#shipping-state",
  zipcodeSelector: "#shipping-zip",
});

const billingAutocomplete = await SmartyAddress.create({
  embeddedKey: "your-key",
  searchInputSelector: "#billing-address",
  streetSelector: "#billing-street",
  citySelector: "#billing-city",
  stateSelector: "#billing-state",
  zipcodeSelector: "#billing-zip",
});
```

Each instance operates independently with isolated state.

## Cleanup

When you no longer need an autocomplete instance (e.g., when navigating away in a single-page application), call `destroy()` to clean up event listeners and DOM elements:

```javascript
const autocomplete = await SmartyAddress.create({
  embeddedKey: "your-key",
  streetSelector: "#street",
});

// Later, when done with the autocomplete:
autocomplete.destroy();
```

This removes all event listeners, disconnects observers, and removes injected DOM elements to prevent memory leaks.

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

const autocomplete = await SmartyAddress.create({
  embeddedKey: "your-key",
  streetSelector: "#street",
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
| `DomService` | Generic DOM utilities for element creation, manipulation, and form value handling |
| `StyleService` | CSS generation, dynamic style calculation, and style block formatting |
| `FormatService` | Address formatting for display and text highlighting for search matches |
| `ColorService` | Color conversion utilities (RGB/HSL), CSS color parsing, and percentage conversions |

All services extend `BaseService` which provides:
- `setServices(services)` - Receives references to all other services
- `init(config)` - Called with configuration (override as needed)
- Typed protected getters (e.g., `this.apiService`, `this.formService`) to access other services

## API Reference

### Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `SmartyAddress.create` | `(config: SmartyAddressConfig) => Promise<SmartyAddress>` | Creates and initializes a new autocomplete instance |

### Instance Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `destroy` | `() => void` | Removes all event listeners, observers, and DOM elements |

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
