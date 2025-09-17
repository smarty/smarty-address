import {BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces.ts";
import {createDomElement, findDomElement} from "../utils/uiUtils.ts";


export const findInputElements:EventHandler = ({event, state, setState}) => {
	const {
		searchInputSelector,
		streetLineSelector,
		secondarySelector,
		citySelector,
		stateSelector,
		zipcodeSelector,
	} = event.detail;

	setState("searchInputElement", searchInputSelector ? findDomElement(searchInputSelector) : null);
	setState("streetLineInputElement", streetLineSelector ? findDomElement(streetLineSelector) : null);
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
			break;
		case 'Escape':
			event.preventDefault();
			closeDropdown(state.dropdownElement);
			break;
	}
};


export const formatAddressSuggestions:EventHandler = ({event, state:uiState}) => {
	const addressSuggestions = event.detail.suggestions.map((suggestion):UiSuggestionItem => {
		const {street_line, city, state, zipcode} = suggestion;
		const suggestionString = `${street_line}, ${city}, ${state} ${zipcode}`;
		const textNode = document.createTextNode(suggestionString);
		const suggestionElement = createDomElement("li", ["smartyAddress__suggestion"], [textNode]);
		suggestionElement.setAttribute("data-address", JSON.stringify(suggestion));

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
	};

	stylesElement.innerHTML = formatStyleBlock(`.smartyAddress__color_dynamic.${getInstanceClassName(state.instanceId)}`, dynamicStyleValues);;
}

const formatStyleBlock = (selector:string, styles:{}) => {
	const stylesString = Object.entries(styles).map(([property, value]) => `${property}: ${value};`).join("\n");
	return `${selector} {\n${stylesString}\n}`;
};

const getColorBrightness = (color:string) => {
	const DEFAULT_BRIGHTNESS = 255;
	const match = color.match(/\d+/g);
	if (!match) return DEFAULT_BRIGHTNESS;

	const [r, g, b] = match.map(Number);

	const brightness = (0.299 * r + 0.587 * g + 0.114 * b);

	return brightness;
};

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

const getInstanceClassName = (instanceId:number) => {
	return `smartyAddress__instance_${instanceId}`;
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
	smartyLogoElement.setAttribute("src", "/img/smarty-logo-blue.svg");
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

const highlightNewAddress = (items:UiSuggestionItem[], currentIndex, setState, indexChange) => {
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
	const theme = event.detail?.theme;
	setState("theme", theme);
	state.eventDispatcher.dispatch("UiService_receivedNewTheme", {previousTheme});
};

export const updateTheme:EventHandler = ({event, state}) => {
	const previousTheme = event.detail?.previousTheme ?? [];
	const dropdownWrapperElement = state.dropdownWrapperElement;

	if (dropdownWrapperElement) {
		dropdownWrapperElement.classList.remove(...previousTheme);
		dropdownWrapperElement.classList.add(...state.theme);
	}
};

const getElementStyles = (element:HTMLElement) => {
	return {
		"color": window.getComputedStyle(element).color,
		"backgroundColor": window.getComputedStyle(element).backgroundColor,
	};
};

const handleHighlightedAddressOnChange = (event) => {

};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};