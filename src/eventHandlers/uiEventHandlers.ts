import {BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces.ts";
import {
	createDomElement,
	findDomElement,
	formatStyleBlock,
	getColorBrightness,
	getElementStyles,
	getInstanceClassName,
	scrollToHighlightedSuggestion,
	showElement,
	hideElement,
	getHslFromRgbColor,
} from "../utils/uiUtils.ts";

// TODO: Handle case when there are no results returned

export const findInputElements:EventHandler = ({event, state, setState}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = event.detail;
	// TODO: default "searchInputSelector" to "streetSelector" (or vice versa)
	setState("searchInputElement", searchInputSelector ? findDomElement(searchInputSelector) : null);
	setState("streetLineInputElement", streetSelector ? findDomElement(streetSelector) : null);
	setState("secondaryInputElement", secondarySelector ? findDomElement(secondarySelector) : null);
	setState("cityInputElement", citySelector ? findDomElement(citySelector) : null);
	setState("stateInputElement", stateSelector ? findDomElement(stateSelector) : null);
	setState("zipcodeInputElement", zipcodeSelector ? findDomElement(zipcodeSelector) : null);

	state.eventDispatcher.dispatch("UiService_foundInputElements");
};

export const watchSearchInputForChanges:EventHandler = ({state, setState}) => {
	const searchInputElement = state.searchInputElement;
	// TODO: Add event listeners for other DOM elements
	searchInputElement.addEventListener("input", (inputEvent:Event) => {
		handleSearchInputOnChange({event: inputEvent, state, setState});
	});

	searchInputElement.addEventListener("focusout", () => {
		// TODO: Re-enable this later
		// closeDropdown(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (inputEvent:Event) => {
		handleAutocompleteKeydown({event: inputEvent, state, setState});
	});
};

export const handleAutocompleteKeydown:EventHandler = ({event, state, setState}) => {
	// TODO: Handle scrolling within the dropdown as the user arrows up/down
	const items = state.addressSuggestionResults ?? [];
	const currentIndex = state.highlightedSuggestionIndex;

	// TODO: Only run these actions if the dropdown is open
	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, state, setState, 1);
			break;
		case 'ArrowUp':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, state, setState, -1);
			break;
		case 'Enter':
			event.preventDefault();
			const selectedAddress = items[state.highlightedSuggestionIndex];
			if (selectedAddress) {
				state.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress});
			}
			break;
		case 'Escape':
			event.preventDefault();
			hideElement(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem:EventHandler = ({event, state:uiState, setState}) => {
	// TODO: Figure out what to do when the form only has a subset of possible fields (e.g. no secondary, nothing except street address, no zip code, etc.)
	const selectedAddress = event.detail.selectedAddress;
	const {street_line, secondary = "", city, state:addressState, zipcode, entries = 0} = selectedAddress.address;
	const searchInputElement = uiState.searchInputElement;

	if (entries > 1) {
		const newSearchTerm = `${street_line} ${secondary}`;
		// TODO: Set selectedAddress to state so subsequent typing by the user doesn't "revert" back out to a broader search
		// TODO: How do users "back out" of the secondary address search?

		searchInputElement.value = newSearchTerm;
		uiState.eventDispatcher.dispatch(
			"UiService_requestedNewAddressSuggestions",
			{
				searchString: newSearchTerm,
				selectedAddress: selectedAddress.address,
			}
		);
	} else {
		setState("selectedAddress", selectedAddress);

		uiState.streetLineInputElement.value = street_line;
		// TODO: Handle logic around secondaries better
		if (uiState.secondaryInputElement) {
			uiState.secondaryInputElement.value = secondary;
		}
		uiState.cityInputElement.value = city;
		uiState.stateInputElement.value = addressState;
		uiState.zipcodeInputElement.value = zipcode;

		// TODO: Add verification so we can get the full zip code
		hideElement(uiState.dropdownElement);
	}
};

export const formatAddressSuggestions:EventHandler = ({event, state:uiState}) => {
	const addressSuggestions = event.detail.suggestions.map((suggestion, index):UiSuggestionItem => {
		const {street_line, secondary = "", city, state, zipcode, entries = 0} = suggestion;
		const suggestionString = `${street_line} ${secondary}, ${city}, ${state} ${zipcode}`;
		const entriesString = entries > 1 ? `${entries} entries` : "";
		const suggestionTextNode = document.createTextNode(suggestionString);
		const entriesTextNode = document.createTextNode(entriesString);
		const addressElement = createDomElement("div", ["smartyAddress__autocompleteAddress"], [suggestionTextNode]);
		const entriesElement = createDomElement("div", ["smartyAddress__suggestionEntries"], [entriesTextNode]);
		const suggestionElement = createDomElement("li", ["smartyAddress__suggestion"], [addressElement, entriesElement]);
		suggestionElement.setAttribute("data-address", JSON.stringify(suggestion));
		suggestionElement.addEventListener("click", () => {
			uiState.eventDispatcher.dispatch("UiService_addressSelected", {selectedAddress: uiState.addressSuggestionResults[index]});
		});

		return {
			address: suggestion,
			suggestionElement,
		};
	});
	uiState.eventDispatcher.dispatch("UiService_formattedAddressSuggestions", {addressSuggestions});
};

export const setCustomStyles:EventHandler = ({event, state, setState}) => {
	if (!state.customStylesElement) {
		const newStylesElement = document.createElement("style");
		const head  = document.getElementsByTagName('head')[0];
		head.appendChild(newStylesElement);
		setState("customStylesElement", newStylesElement);
	}

	const stylesElement = state.customStylesElement;
	const customStyles = getElementStyles(state.searchInputElement);

	const {hue, saturation, lightness} = getHslFromRgbColor(customStyles.backgroundColor);
	const isLightMode = lightness  > 50;
	const useBlueLogo = lightness  > 75;

	const highlightLightness = isLightMode ? lightness - 10 : lightness + 10;
	const scrollbarLightness = isLightMode ? lightness - 20 : lightness + 20;
	const highlightColor = `hsl(${hue} ${saturation}% ${highlightLightness}%)`;
	const scrollbarColor = `hsl(${hue} ${saturation}% ${scrollbarLightness}%)`;
	const hoverMixColor = isLightMode ? "#000" : "#fff";
	const colorContrastLow1 = isLightMode ? "92%" : "85%";
	const colorContrastMedium1 = isLightMode ? "80%" : "65%";
	const colorContrastHigh1 = isLightMode ? "70%" : "55%";

	// TODO: Need to define all the missing vars here (see colors.css)
	const dynamicColorStyles = {
		"--smartyAddress__text-basePrimaryColor": customStyles.color,
		"--smartyAddress__surfaceBasePrimaryColor": customStyles.backgroundColor,
		"--smartyAddress__surfaceBaseSecondaryColor": highlightColor,
		"--smartyAddress__surfaceBaseTertiaryColor": scrollbarColor,
		"--smartyAddress__textAccentColor": "Highlight",
		"--smartyAddress__colorContrastLow1": colorContrastLow1,
		"--smartyAddress__colorContrastMedium1": colorContrastMedium1,
		"--smartyAddress__colorContrastHigh1": colorContrastHigh1,
		"--smartyAddress__surfaceInverseExtremeColor": hoverMixColor,
		"--smartyAddress__surfaceBasePrimaryInverseColor": customStyles.color,
		"--smartyAddress__logoDarkDisplay": useBlueLogo ? "block" : "none",
		"--smartyAddress__logoLightDisplay": useBlueLogo ? "none" : "block",
		"--smartyAddress__largeShadow1": "0 12px 24px 0 rgba(4, 34, 75, 0.10)",
		"--smartyAddress__largeShadow2": "0 20px 40px 0 rgba(21, 27, 35, 0.06)",
	};

	stylesElement.innerHTML = formatStyleBlock(`.smartyAddress__color_dynamic.${getInstanceClassName(state.instanceId)}`, dynamicColorStyles);
}

// TODO: Does this really need its own event or can we just merge it with formatAddressSuggestions?
export const updateDropdownSuggestions:EventHandler = ({event, state, setState}) => {
	const addressSuggestions = event.detail.addressSuggestions;
	const suggestionItems = addressSuggestions ?? [];
	const suggestionElements = suggestionItems.map(({suggestionElement}) => suggestionElement);
	setState("addressSuggestionResults", suggestionItems);
	state.suggestionsElement.replaceChildren(...suggestionElements);

	if(suggestionItems.length) {
		highlightNewAddress(suggestionItems, 0, state, setState, 0);
	}

	showElement(state.dropdownElement);
};

// TODO: Compare with the AI-generated plugin to see what we can leverage from it
const handleSearchInputOnChange:BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

// TODO: Split this out into smaller functions
export const buildDomElements:EventHandler = ({state, setState}) => {
	const instanceClass = getInstanceClassName(state.instanceId);
	const smartyLogoDarkElement = createDomElement("img", ["smartyAddress__smartyLogoDark"]);
	const smartyLogoLightElement = createDomElement("img", ["smartyAddress__smartyLogoLight"]);
	const poweredByText = document.createTextNode("Powered by");
	const suggestionsElement = createDomElement("ul", ["smartyAddress__suggestionsElement"]);
	const poweredBySmartyElement = createDomElement("div", ["smartyAddress__poweredBy"], [poweredByText, smartyLogoDarkElement, smartyLogoLightElement]);
	const dropdownElement = createDomElement("div", ["smartyAddress__dropdownElement", "smartyAddress__hidden"], [suggestionsElement, poweredBySmartyElement]);
	const dropdownWrapperElement = createDomElement("div", ["smartyAddress__suggestionsWrapperElement", instanceClass], [dropdownElement]);
	const searchInputElement = state.searchInputElement;

	dropdownElement.setAttribute("role", "listbox");
	smartyLogoDarkElement.setAttribute("src", state.smartyLogoDark);
	smartyLogoLightElement.setAttribute("src", state.smartyLogoLight);
	searchInputElement?.parentNode?.insertBefore(dropdownWrapperElement, searchInputElement.nextSibling);

	setState("dropdownWrapperElement", dropdownWrapperElement);
	setState("dropdownElement", dropdownElement);
	setState("suggestionsElement", suggestionsElement);
	setState("poweredBySmartyElement", poweredBySmartyElement);

	state.eventDispatcher.dispatch("UiService_builtDomElements", {dropdownElement});
};

export const notifyDomInitIsComplete:EventHandler = ({state}) => {
	state.eventDispatcher.dispatch("UiService_domReadyForAutocomplete");
};

const updateDropdown = () => {

};

// TODO: Figure out how to simplify the params in this function (e.g. merge indexes, eliminate state/setState params)
// TODO: After this gets cleaned up, it should also be moved into uiUtils.ts
const highlightNewAddress = (items:UiSuggestionItem[], currentIndex:number, state, setState, indexChange:number) => {
	const newIndex = (currentIndex + indexChange + items.length) % items.length;
	setState("highlightedSuggestionIndex", newIndex);

	items.forEach((item, i) => {
		item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
	});

	scrollToHighlightedSuggestion(items[newIndex].suggestionElement, state.suggestionsElement);
};

// e.g. for secondaries
const expandDropdown = () => {

};

const populateForm = () => {

};

const displayError = () => {

};

const displaySuccess = () => {

};

// TODO: Handle config modifications generically instead of having specific handlers for each config element
export const setThemeFromConfig:EventHandler = ({event, state, setState}) => {
	const previousTheme = state.theme;
	setState("theme", event.detail?.theme);
	setState("smartyLogoDark", event.detail?.smartyLogoDark);
	setState("smartyLogoLight", event.detail?.smartyLogoLight);

	if (previousTheme !== state.theme) {
		state.eventDispatcher.dispatch("UiService_receivedNewTheme", {previousTheme});
	}
};

export const updateTheme:EventHandler = ({event, state}) => {
	const previousTheme = event.detail?.previousTheme ?? [];
	const dropdownWrapperElement = state.dropdownWrapperElement;

	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...state.theme);
	}
};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};
