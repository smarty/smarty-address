import {BrowserEventHandler, EventHandler} from "../interfaces.ts";
import {findDomElement} from "../utils/uiUtils.ts";

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

export const watchSearchInputForChanges:EventHandler = ({event, state, setState}) => {
	const searchInputElement = state.searchInputElement;
	searchInputElement.addEventListener("input", (inputEvent:Event) => {
		handleSearchInputOnChange({event: inputEvent, state, setState});
	});
};

export const formatAddressSuggestions:EventHandler = ({event, state, setState}) => {
	const formattedSuggestions = event.detail.suggestions.map(({street_line, secondary, city, state, zipcode}) => {
		return `<li>${street_line}, ${city}, ${state} ${zipcode}</li>`;
	});
	state.eventDispatcher.dispatch("UiService_formattedAddressSuggestions", {formattedSuggestions});
};

export const updateDropdownSuggestions:EventHandler = ({event, state, setState}) => {
	state.dropdownElement.innerHTML = event.detail.formattedSuggestions.join("");
};

const handleSearchInputOnChange: BrowserEventHandler = ({event, state, setState}) => {
	const searchInputValue = event.target?.value;
	const eventName = searchInputValue.length ? "UiService_requestedNewAddressSuggestions" : "UiService_searchInputCleared";
	state.eventDispatcher.dispatch(eventName, {searchString: searchInputValue});

};

export const createDropdownWrapperElement:EventHandler = ({event, state, setState}) => {
	const dropdownWrapperElement = document.createElement("div");
	const dropdownElement = createDropDownElement();
	const poweredBySmartyElement = createPoweredBySmartyElement();
	const searchInputElement = state.searchInputElement;

	dropdownWrapperElement.classList.add("smartyAddress__suggestionsWrapperElement");
	dropdownWrapperElement.appendChild(dropdownElement);
	dropdownWrapperElement.appendChild(poweredBySmartyElement);
	searchInputElement?.parentNode?.insertBefore(dropdownWrapperElement, searchInputElement.nextSibling);

	setState("dropdownWrapperElement", dropdownWrapperElement);
	setState("dropdownElement", dropdownElement);
	setState("poweredBySmartyElement", poweredBySmartyElement);
	state.eventDispatcher.dispatch("UiService_createdEmptyDropdownElement", {dropdownElement});
};

const createDropDownElement = () => {
	const dropdownElement = document.createElement("ul");

	dropdownElement.classList.add("smartyAddress__suggestionsElement");
	dropdownElement.classList.add("smartyAddress__hidden");
	dropdownElement.setAttribute('role', 'listbox');

	return dropdownElement;
};

const createPoweredBySmartyElement = () => {
	const poweredBySmartyElement = document.createElement("div");
	poweredBySmartyElement.classList.add("smartyAddress__poweredBy");
	poweredBySmartyElement.innerHTML = "Address suggestions powered by: Smarty";

	return poweredBySmartyElement;
}

export const notifyDomInitIsComplete:EventHandler = ({event, state, setState}) => {
	state.eventDispatcher.dispatch("UiService_domReadyForAutocomplete");
};

export const loadStylesheet:EventHandler = ({event, state, setState}) => {
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

const openDropdown = () => {

};

const updateDropdown = () => {

};

const highlightAddress = () => {

};

const closeDropdown = () => {

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
	const theme = event.detail?.theme;
	setState("theme", theme);
	state.eventDispatcher.dispatch("UiService_receivedNewTheme");
};

export const updateTheme:EventHandler = ({event, state, setState}) => {
	const dropdownWrapperElement = state.dropdownWrapperElement;

	if (dropdownWrapperElement) {
		dropdownWrapperElement.className = `smartyAddress__suggestionsWrapperElement ${state.theme?.join(" ")}`;
	}
};

const handleHighlightedAddressOnChange = (event) => {

};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};