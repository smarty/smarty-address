import {EventHandler} from "./interfaces.ts";
import {defineService} from "./utils/services.ts";

const configureDomElements: EventHandler = (event, state, setState) => {
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

	const searchInputElement = state.searchInputElement;

	searchInputElement.addEventListener("input", state.eventHandlerWrapper(handleSearchInputOnChange));

	if (!state.dropdownWrapperElement) {
		state.dropdownWrapperElement = createDropdownWrapperElement(state.searchInputElement as HTMLInputElement);
		searchInputElement?.parentNode?.insertBefore(state.dropdownWrapperElement, searchInputElement.nextSibling);
	}

	state.eventDispatcher.dispatch("UiService.configuredDomElements");
}

const handleSearchInputOnChange: EventHandler = (event, state) => {
	state.eventDispatcher.dispatch("UiServices.requestedNewAddressSuggestions", {searchString: event.target?.value});
};

const createDropdownWrapperElement = () => {
	const dropdownWrapper = document.createElement("div");
	dropdownWrapper.classList.add("smartyAddress__suggestionsWrapperElement");
	dropdownWrapper.appendChild(createDropDownElement());

	return dropdownWrapper;
};

const createDropDownElement = () => {
	const dropdownElement = document.createElement("ul");

	dropdownElement.classList.add("smartyAddress__suggestionsElement");
	dropdownElement.classList.add("smartyAddress__hidden");
	dropdownElement.setAttribute('role', 'listbox');

	return dropdownElement;
};

const updateAutocompleteResults:EventHandler = (event, state, setState) => {
	const formattedSuggestions = event.detail.suggestions.map(({street_line, secondary, city, state, zipcode}) => {
		return `<li>${street_line}, ${city}, ${state} ${zipcode}</li>`;
	});
	state.dropdownWrapperElement.innerHTML = formattedSuggestions.join("");
};

export const UiService = defineService({
	configureDomElements,
	updateAutocompleteResults,
}, {
	searchInputElement: null,
	streetLineInputElement: null,
	secondaryInputElement: null,
	cityInputElement: null,
	stateInputElement: null,
	zipcodeInputElement: null,
}, (state, eventHandlers) => {
	state.eventDispatcher.addEventListener("SmartyAddress.receivedSmartyAddressConfig", eventHandlers.configureDomElements);
	state.eventDispatcher.addEventListener("ApiServices.receivedAddressSuggestions", eventHandlers.updateAutocompleteResults);
});


const openDropdown = () => {

};

const updateDropdown = () => {

};

const highlightAddress = () => {

};

const closeDropdown = () => {

};

const expandDropdown = () => {

};

const populateForm = () => {

};

const displayError = () => {

};

const displaySuccess = () => {

};

const updateTheme = () => {

};

const handleHighlightedAddressOnChange = (event) => {

};

const handleAddressOnSelect = (event) => {

};

const handleDropdownOnBlur = (event) => {

};

const findDomElement = (selector: string | undefined) => {
	const element: HTMLElement | null = selector ? document.querySelector(selector) : null;

	return element;
};
