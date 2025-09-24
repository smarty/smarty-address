import {BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces.ts";
import {
	createDomElement,
	findDomElement,
	formatStyleBlock,
	getColorBrightness,
	getElementStyles,
	getInstanceClassName
} from "../utils/uiUtils.ts";


export const findInputElements:EventHandler = ({event, state, setState}) => {
	const {
		searchInputSelector,
		streetSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = event.detail;
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
	searchInputElement.addEventListener("input", (inputEvent:Event) => {
		handleSearchInputOnChange({event: inputEvent, state, setState});
	});

	searchInputElement.addEventListener("focusout", () => {
		closeDropdown(state.dropdownElement);
	});

	searchInputElement.addEventListener("keydown", (inputEvent:Event) => {
		handleAutocompleteKeydown({event: inputEvent, state, setState});
	});
};

export const handleAutocompleteKeydown:EventHandler = ({event, state, setState}) => {
	const items = state.addressSuggestionResults;
	const currentIndex = state.highlightedSuggestionIndex;

	switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, setState, 1);
			break;
		case 'ArrowUp':
			event.preventDefault();
			highlightNewAddress(items, currentIndex, setState, -1);
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
			closeDropdown(state.dropdownElement);
			break;
	}
};

export const handleSelectDropdownItem:EventHandler = ({event, state:uiState, setState}) => {
	const selectedAddress = event.detail.selectedAddress;
	const {street_line, secondary = "", city, state:addressState, zipcode, entries = 0} = selectedAddress.address;
	const searchInputElement = uiState.searchInputElement;

	if (entries > 1) {
		const newSearchTerm = `${street_line} ${secondary}`;

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
		if (uiState.secondaryInputElement) {
			uiState.secondaryInputElement.value = secondary;
		}
		uiState.cityInputElement.value = city;
		uiState.stateInputElement.value = addressState;
		uiState.zipcodeInputElement.value = zipcode;

		closeDropdown(uiState.dropdownElement);
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
	const backgroundColorBrightness = getColorBrightness(customStyles.backgroundColor);
	const hoverMixColor = backgroundColorBrightness > 128 ? "#000" : "#fff";
	const hoverMixPercentage = backgroundColorBrightness > 128 ? "92%" : "85%";

	const dynamicStyleValues = {
		"--smartyAddress__text-base-primary-color": customStyles.color,
		"--smartyAddress__surface-base-primary-color": customStyles.backgroundColor,
		"--smartyAddress__color-mix-percentage": hoverMixPercentage,
		"--smartyAddress__surface-inverse-extreme-color": hoverMixColor,
		"--smartyAddress__surface-base-primary-inverse-color": customStyles.color,
	};

	stylesElement.innerHTML = formatStyleBlock(`.smartyAddress__color_dynamic.${getInstanceClassName(state.instanceId)}`, dynamicStyleValues);;
}

export const updateDropdownSuggestions:EventHandler = ({event, state, setState}) => {
	const addressSuggestions = event.detail.addressSuggestions;
	const suggestionElements = addressSuggestions.map(({suggestionElement}) => suggestionElement);
	setState("addressSuggestionResults", addressSuggestions);
	highlightNewAddress(state.addressSuggestionResults, 0, setState, 0);
	state.suggestionsElement.replaceChildren(...suggestionElements);
	openDropdown(state.dropdownElement);
};

const handleSearchInputOnChange: BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});
};

export const buildDomElements:EventHandler = ({state, setState}) => {
	const instanceClass = getInstanceClassName(state.instanceId);
	const smartyLogoElement = createDomElement("img", ["smartyAddress__smartyLogo"]);
	const poweredByText = document.createTextNode("Powered by");
	const suggestionsElement = createDomElement("ul", ["smartyAddress__suggestionsElement"]);
	const poweredBySmartyElement = createDomElement("div", ["smartyAddress__poweredBy"], [poweredByText, smartyLogoElement]);
	const dropdownElement = createDomElement("div", ["smartyAddress__dropdownElement", "smartyAddress__hidden"], [suggestionsElement, poweredBySmartyElement]);
	const dropdownWrapperElement = createDomElement("div", ["smartyAddress__suggestionsWrapperElement", instanceClass], [dropdownElement]);
	const searchInputElement = state.searchInputElement;

	dropdownElement.setAttribute("role", "listbox");
	smartyLogoElement.setAttribute("src", state.smartyLogoDark);
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

const highlightNewAddress = (items:UiSuggestionItem[], currentIndex:number, setState, indexChange:number) => {
	const newIndex = (currentIndex + indexChange + items.length) % items.length;
	setState("highlightedSuggestionIndex", newIndex);
	items.forEach((item, i) => {
		item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
	});
};

const openDropdown = (dropdownElement) => {
	dropdownElement.classList.replace("smartyAddress__hidden", "smartyAddress__open");
};

const closeDropdown = (dropdownElement) => {
	dropdownElement.classList.replace("smartyAddress__open", "smartyAddress__hidden");
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