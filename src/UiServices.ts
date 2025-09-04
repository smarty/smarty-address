import {EventDispatcher} from "./utils/EventDispatcher.ts";

export class UiService {
	private eventDispatcher: EventDispatcher;
	private searchInputElement: HTMLElement | null = null;
	private streetLineInputElement: HTMLElement | null = null;
	private secondaryInputElement: HTMLElement | null = null;
	private cityInputElement: HTMLElement | null = null;
	private stateInputElement: HTMLElement | null = null;
	private zipcodeInputElement: HTMLElement | null = null;
	private dropdownWrapperElement: HTMLElement | null = null;

	constructor(eventDispatcher:EventDispatcher) {
		this.configureEvents = this.configureEvents.bind(this);

		const eventsMap = [
			{eventName: "SmartyAddress.receivedSmartyAddressConfig", callback: this.configureDomElements},
		];

		this.eventDispatcher = eventDispatcher;
		this.configureEvents(eventsMap);
	}

	configureEvents(eventsMap: Array<{eventName: string, callback: Function}>, target:EventDispatcher | HTMLElement = this.eventDispatcher) {
		eventsMap.forEach(({eventName, callback}) => {
			callback = callback.bind(this);
			target.addEventListener(eventName, callback);
		});
	}

	configureDomElements = (event: Event) => {
		const {
			searchInputSelector,
			streetLineSelector,
			secondarySelector,
			citySelector,
			stateSelector,
			zipcodeSelector,
		} = event.detail;

		this.searchInputElement = searchInputSelector ? findDomElement(searchInputSelector) : null;
		this.streetLineInputElement = streetLineSelector ? findDomElement(streetLineSelector) : null;
		this.secondaryInputElement = secondarySelector ? findDomElement(secondarySelector) : null;
		this.cityInputElement = citySelector ? findDomElement(citySelector) : null;
		this.stateInputElement = stateSelector ? findDomElement(stateSelector) : null;
		this.zipcodeInputElement = zipcodeSelector ? findDomElement(zipcodeSelector) : null;

		const searchInputElement = this.searchInputElement;

		this.configureEvents([{eventName: "input", callback: this.handleSearchInputOnChange}], searchInputElement);

		if (!this.dropdownWrapperElement) {
			this.dropdownWrapperElement = this.createDropdownWrapperElement(this.searchInputElement as HTMLInputElement);
			searchInputElement?.parentNode?.insertBefore(this.dropdownWrapperElement, searchInputElement.nextSibling);
		}

		this.eventDispatcher.dispatch("UiService.configuredDomElements");
	}
	handleSearchInputOnChange(event:Event) {
		this.eventDispatcher.dispatch("UiServices.requestedNewAddressSuggestions", {searchString: event.target?.value});
	}

	createDropdownWrapperElement = (searchInputElement:HTMLInputElement) => {
		const dropdownWrapper = document.createElement("div");
		dropdownWrapper.classList.add("smartyAddress__suggestionsWrapperElement");

		const dropdownElement = this.createDropDownElement();
		dropdownWrapper.appendChild(dropdownElement);

		return dropdownWrapper;
	}

	createDropDownElement = () => {
		const dropdownElement = document.createElement("ul");

		dropdownElement.classList.add("smartyAddress__suggestionsElement");
		dropdownElement.classList.add("smartyAddress__hidden");
		dropdownElement.setAttribute('role', 'listbox');
		dropdownElement.innerHTML ="<li>hello world</li>";

		return dropdownElement;
	}
}

const findDomElement = (selector:string | undefined) => {
	const element: HTMLElement|null = selector ? document.querySelector(selector) : null;

	return element;
};

