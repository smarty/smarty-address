import {BrowserEventHandler, EventHandler, UiSuggestionItem} from "../interfaces.ts";
import {createDomElement, findDomElement} from "../utils/uiUtils.ts";

const STYLESHEET_HREF = "/styles/theme.css";

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
};

export const formatAddressSuggestions:EventHandler = ({event, state}) => {
	const formattedSuggestions = event.detail.suggestions.map(({street_line, city, state, zipcode}) => {
		return `<li class="smartyAddress__suggestion">${street_line}, ${city}, ${state} ${zipcode}</li>`;
	});
	state.eventDispatcher.dispatch("UiService_formattedAddressSuggestions", {formattedSuggestions});
};

export const updateDropdownSuggestions:EventHandler = ({event, state}) => {
	state.suggestionsElement.innerHTML = event.detail.formattedSuggestions.join("");
	openDropdown(state.dropdownElement);
};

const handleSearchInputOnChange: BrowserEventHandler = ({event, state}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});

};

export const createDropdownWrapperElement:EventHandler = ({state, setState}) => {
	const smartyLogoElement = createDomElement("img", ["smartyAddress__smartyLogo"]);
	const poweredByText = document.createTextNode("Predicted address suggestions powered by");
	const suggestionsElement = createDomElement("ul", ["smartyAddress__suggestionsElement"]);
	const poweredBySmartyElement = createDomElement("div", ["smartyAddress__poweredBy"], [poweredByText, smartyLogoElement]);
	const dropdownElement = createDomElement("div", ["smartyAddress__dropdownElement", "smartyAddress__hidden"], [suggestionsElement, poweredBySmartyElement]);
	const dropdownWrapperElement = createDomElement("div", ["smartyAddress__suggestionsWrapperElement"], [dropdownElement]);
	const searchInputElement = state.searchInputElement;

	dropdownElement.setAttribute("role", "listbox");
	smartyLogoElement.setAttribute("src", "/img/smarty-logo-blue.svg");
	searchInputElement?.parentNode?.insertBefore(dropdownWrapperElement, searchInputElement.nextSibling);

	setState("dropdownWrapperElement", dropdownWrapperElement);
	setState("dropdownElement", dropdownElement);
	setState("suggestionsElement", suggestionsElement);
	setState("poweredBySmartyElement", poweredBySmartyElement);

	state.eventDispatcher.dispatch("UiService_createdEmptyDropdownElement", {dropdownElement});
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
		dropdownWrapperElement.classList.add("smartyAddress__suggestionsWrapperElement", ...state.theme);
	}
};

export const loadStylesheet:EventHandler = ({state}) => {
	const matchingStylesheets = Array.from(document.getElementsByTagName("link")).filter(link => link.rel === "stylesheet" && link.href === STYLESHEET_HREF);

	if (!matchingStylesheets.length) {
		const head  = document.getElementsByTagName('head')[0];
		const linkElement  = document.createElement('link');
		linkElement.rel  = 'stylesheet';
		linkElement.type = 'text/css';
		linkElement.href = STYLESHEET_HREF;
		linkElement.onload = () => {
			state.eventDispatcher.dispatch("UiService_stylesheetLoaded");
		};
		head.appendChild(linkElement);
	}
};

const handleHighlightedAddressOnChange = (event) => {

};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};