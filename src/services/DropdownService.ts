import { BaseService } from "./BaseService";
import { AddressSuggestion, SmartyAddressConfig, UiSuggestionItem } from "../interfaces";
import { getSmartyLogo } from "../utils/getSmartyLogo";
import { ElementConfig } from "./DomService";

export class DropdownService extends BaseService {
	private instanceId: number;
	private config?: SmartyAddressConfig;
	private theme: string[] = [];
	private searchInputSelector: string = "";

	private dropdownWrapperElement: HTMLElement | null = null;
	private dropdownElement: HTMLElement | null = null;
	private suggestionsElement: HTMLElement | null = null;
	private customStylesElement: HTMLStyleElement | null = null;
	private announcementElement: HTMLElement | null = null;

	private selectedAddressSearchTerm: string = "";
	private dropdownIsOpen: boolean = false;
	private isInteractingWithDropdown: boolean = false;
	private highlightedSuggestionIndex: number = 0;
	private selectedSuggestionIndex: number = -1;
	private addressSuggestionResults: UiSuggestionItem[] = [];
	private secondaryAddressSuggestionResults: UiSuggestionItem[] = [];

	constructor(instanceId: number) {
		super();
		this.instanceId = instanceId;
	}

	init(config: SmartyAddressConfig): void {
		this.config = config;

		const previousTheme = this.theme;
		const newTheme = config?.theme;
		this.theme = newTheme;

		if (previousTheme !== this.theme && this.dropdownWrapperElement) {
			this.updateThemeClass(newTheme, previousTheme, this.dropdownWrapperElement);
		}

		this.searchInputSelector = config.searchInputSelector ?? config.streetSelector ?? "";
		this.setupDom();
	}

	async setupDom(): Promise<void> {
		const instanceClassname = this.styleService.getInstanceClassName(this.instanceId);
		const elements = this.buildAutocompleteDomElements(instanceClassname);

		this.appendElementsToDocument(elements);
		this.storeElementReferences(elements);
		this.configureDropdownInteractions();

		if (elements.dropdownWrapperElement instanceof HTMLElement) {
			this.updateThemeClass(this.theme, [], elements.dropdownWrapperElement);
		}

		await this.setupSearchInput();
	}

	private appendElementsToDocument(elements: Record<string, HTMLElement | Text>): void {
		const { customStylesElement, dropdownWrapperElement } = elements;

		if (dropdownWrapperElement) {
			document.body.appendChild(dropdownWrapperElement);
		}

		const head = document.getElementsByTagName("head")[0];
		if (head && customStylesElement) {
			head.appendChild(customStylesElement);
		}
	}

	private storeElementReferences(elements: Record<string, HTMLElement | Text>): void {
		this.customStylesElement = elements.customStylesElement as HTMLStyleElement;
		this.dropdownWrapperElement = elements.dropdownWrapperElement as HTMLElement;
		this.dropdownElement = elements.dropdownElement as HTMLElement;
		this.suggestionsElement = elements.suggestionsElement as HTMLElement;
		this.announcementElement = elements.announcementElement as HTMLElement;
	}

	private configureDropdownInteractions(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.id = this.getDropdownId();
		this.dropdownElement.addEventListener("mousedown", () => {
			this.isInteractingWithDropdown = true;
		});
		document.addEventListener("mouseup", () => {
			this.isInteractingWithDropdown = false;
		});
	}

	private async setupSearchInput(): Promise<void> {
		const searchInputElement = (await this.domService.findDomElementWithRetry(
			this.searchInputSelector,
		)) as HTMLInputElement | null;

		if (!searchInputElement) {
			console.error(
				`Failed to find search input element with selector "${this.searchInputSelector}".`,
			);
			return;
		}

		this.attachEventListeners(
			(e) => this.handleSearchInputOnChange(e),
			(e) => this.handleAutocompleteKeydown(e),
			(e) => this.handleSearchInputFocusOut(e),
		);

		const dynamicStylingHandler = () =>
			this.styleService.updateDynamicStyles(
				this.customStylesElement as HTMLStyleElement,
				searchInputElement,
				this.instanceId,
			);

		this.configureDynamicStyling(dynamicStylingHandler, searchInputElement);
	}

	handleSearchInputFocusOut(event: FocusEvent): void {
		if (this.isInteractingWithDropdown) return;

		const relatedTarget = event.relatedTarget as Node | null;
		const searchInputElement = this.getSearchInputElement();
		const isWithinDropdown = relatedTarget && this.dropdownElement?.contains(relatedTarget);
		const isWithinInput = relatedTarget && searchInputElement?.contains(relatedTarget);

		if (!isWithinDropdown && !isWithinInput) {
			this.closeDropdown();
		}
	}

	handleAutocompleteKeydown(event: KeyboardEvent): void {
		const pressedKey = event.key;
		const dropdownIsOpen = this.isDropdownOpen();

		if (dropdownIsOpen) {
			const handledKeys: Record<string, () => void> = {
				ArrowDown: () => this.highlightNewAddress(1),
				ArrowUp: () => this.highlightNewAddress(-1),
				Enter: () => this.handleSelectDropdownItem(this.getHighlightedIndex()),
				Escape: () => this.closeDropdown(),
			};

			if (handledKeys[pressedKey]) {
				handledKeys[pressedKey]();
				event.preventDefault();
			}
		}
	}

	handleSearchInputOnChange(event: Event): void {
		if (!event.isTrusted) return;

		const searchInputValue = (event.target as HTMLInputElement)?.value;
		const selectedAddressSearchTerm = this.getSelectedAddressSearchTerm();

		if (!searchInputValue.startsWith(selectedAddressSearchTerm)) {
			this.setSelectedIndex(-1);
		}

		const mergedAddressSuggestions = this.getMergedSuggestions();
		const currentSelectedIndex = this.getSelectedIndex();
		const selectedAddress = mergedAddressSuggestions[currentSelectedIndex];

		if (searchInputValue.length) {
			if (currentSelectedIndex > -1 && selectedAddress) {
				this.apiService.fetchSecondaryAddressSuggestions(
					searchInputValue,
					selectedAddress.address,
					{
						onSuccess: (suggestions, searchString) =>
							this.formatSecondaryAddressSuggestions(suggestions, searchString),
						onError: () => this.handleApiError(),
					},
				);
			} else {
				this.apiService.fetchAddressSuggestions(searchInputValue, {
					onSuccess: (suggestions, searchString) =>
						this.formatAddressSuggestions(suggestions, searchString),
					onError: () => this.handleApiError(),
				});
			}
		}
	}

	highlightNewAddress(indexChange: number): number {
		const items = this.getMergedSuggestions();
		const currentIndex = this.getHighlightedIndex();
		const newIndex = (currentIndex + indexChange + items.length) % items.length;

		items.forEach((item: UiSuggestionItem, i: number) => {
			item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
		});

		if (items[newIndex]) {
			this.scrollToHighlightedSuggestion(
				items[newIndex].suggestionElement,
				this.suggestionsElement!,
			);
		}
		this.setHighlightedIndex(newIndex);

		if (items[newIndex]) {
			const suggestionId = items[newIndex].suggestionElement.id;
			this.updateAriaActivedescendant(suggestionId);
		}

		return newIndex;
	}

	handleSelectDropdownItem(addressIndex: number): void {
		const mergedAddressSuggestions = this.getMergedSuggestions();
		const selectedAddress = mergedAddressSuggestions[addressIndex];
		if (!selectedAddress) return;

		if (this.config?.onAddressSelected) {
			this.config.onAddressSelected(selectedAddress.address);
		}

		const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
		const searchInputElement = this.getSearchInputElement();
		this.setSelectedIndex(addressIndex);

		if (entries > 1 && searchInputElement) {
			const newSearchTerm = `${street_line} ${secondary}`;
			this.setSelectedAddressSearchTerm(newSearchTerm);
			searchInputElement.value = newSearchTerm;
			this.apiService.fetchSecondaryAddressSuggestions(
				newSearchTerm,
				selectedAddress.address,
				{
					onSuccess: (suggestions, searchString) =>
						this.formatSecondaryAddressSuggestions(suggestions, searchString),
					onError: () => this.handleApiError(),
				},
			);
			searchInputElement.focus();
		} else {
			this.formService.populateFormWithAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string): void {
		let filteredSuggestions = suggestions;
		if (this.config?.onSuggestionsReceived) {
			filteredSuggestions = this.config.onSuggestionsReceived(suggestions);
		}

		const suggestionItems = this.mapSuggestionsToItems(
			filteredSuggestions,
			0,
			(address, id) => this.createSuggestionElement(address, searchString, id),
			"suggestionElement",
		);

		this.setAddressSuggestions(suggestionItems);
		this.setSecondarySuggestions([]);

		const count = suggestionItems.length;
		const announcement = `${count} address${count === 1 ? "" : "es"} found. Use arrow keys to navigate.`;
		this.displaySuggestions(suggestionItems, suggestionItems, 0, announcement);
	}

	formatSecondaryAddressSuggestions(suggestions: AddressSuggestion[], searchString: string): void {
		const baseIndex = this.getAddressSuggestions().length;

		const suggestionItems = this.mapSuggestionsToItems(
			suggestions,
			baseIndex,
			(address, id) => this.createSecondarySuggestionElement(address, searchString, id),
			"secondarySuggestionElement",
		);

		this.setSecondarySuggestions(suggestionItems);

		const count = suggestionItems.length;
		const announcement = `${count} unit entr${count === 1 ? "y" : "ies"} found. Use arrow keys to navigate.`;
		this.displaySuggestions(suggestionItems, this.getMergedSuggestions(), this.getSelectedIndex() + 1, announcement);
	}

	private displaySuggestions(
		newItems: UiSuggestionItem[],
		allItems: UiSuggestionItem[],
		initialHighlightIndex: number,
		announcement: string,
	): void {
		this.updateDropdownContents(allItems);

		if (newItems.length) {
			this.setHighlightedIndex(initialHighlightIndex);
			this.highlightNewAddress(0);
		}

		this.announce(announcement);
		this.openDropdown();
	}

	private mapSuggestionsToItems(
		suggestions: AddressSuggestion[],
		baseIndex: number,
		createElement: (
			address: AddressSuggestion,
			suggestionId: string,
		) => Record<string, HTMLElement | Text>,
		elementKey: string,
	): UiSuggestionItem[] {
		const selectedSuggestionIndex = this.getSelectedIndex();

		return suggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionId = this.getSuggestionId(baseIndex + addressIndex);
				const elements = createElement(address, suggestionId);
				const suggestionElement = elements[elementKey] as HTMLElement;

				suggestionElement.addEventListener("click", () => {
					this.handleSelectDropdownItem(addressIndex + selectedSuggestionIndex + 1);
				});

				return { address, suggestionElement };
			},
		);
	}

	handleApiError(): void {
		this.closeDropdown();
	}

	openDropdown(): void {
		this.setAriaExpanded(true);
		this.setDropdownOpen(true);
		this.showDropdown();
		if (this.config?.onDropdownOpen) {
			this.config.onDropdownOpen();
		}
	}

	closeDropdown(): void {
		this.setAriaExpanded(false);
		this.updateAriaActivedescendant(null);
		this.setDropdownOpen(false);
		this.reset();
		this.hideDropdown();
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}

	getMergedSuggestions(): UiSuggestionItem[] {
		return this.addressSuggestionResults.toSpliced(
			this.selectedSuggestionIndex + 1,
			0,
			...this.secondaryAddressSuggestionResults,
		);
	}

	getHighlightedIndex(): number {
		return this.highlightedSuggestionIndex;
	}

	setHighlightedIndex(index: number): void {
		this.highlightedSuggestionIndex = index;
	}

	getSelectedIndex(): number {
		return this.selectedSuggestionIndex;
	}

	setSelectedIndex(index: number): void {
		this.selectedSuggestionIndex = index;
	}

	isDropdownOpen(): boolean {
		return this.dropdownIsOpen;
	}

	setDropdownOpen(open: boolean): void {
		this.dropdownIsOpen = open;
	}

	getAddressSuggestions(): UiSuggestionItem[] {
		return this.addressSuggestionResults;
	}

	setAddressSuggestions(suggestions: UiSuggestionItem[]): void {
		this.addressSuggestionResults = suggestions;
	}

	getSecondarySuggestions(): UiSuggestionItem[] {
		return this.secondaryAddressSuggestionResults;
	}

	setSecondarySuggestions(suggestions: UiSuggestionItem[]): void {
		this.secondaryAddressSuggestionResults = suggestions;
	}

	getSelectedAddressSearchTerm(): string {
		return this.selectedAddressSearchTerm;
	}

	setSelectedAddressSearchTerm(term: string): void {
		this.selectedAddressSearchTerm = term;
	}

	reset(): void {
		this.selectedAddressSearchTerm = "";
		this.selectedSuggestionIndex = -1;
		this.highlightedSuggestionIndex = 0;
	}

	getDropdownId(): string {
		return `smartyAddress__dropdown_${this.instanceId}`;
	}

	getSearchInputElement(): HTMLInputElement | null {
		return this.domService.findDomElement(
			this.searchInputSelector,
		) as HTMLInputElement | null;
	}

	getSuggestionsElement(): HTMLElement | null {
		return this.suggestionsElement;
	}

	getInstanceId(): number {
		return this.instanceId;
	}

	showDropdown(): void {
		if (this.dropdownElement) {
			this.showElement(this.dropdownElement);
		}
	}

	hideDropdown(): void {
		if (this.dropdownElement) {
			this.hideElement(this.dropdownElement);
		}
	}

	announce(message: string): void {
		if (this.announcementElement) {
			this.announcementElement.textContent = message;
		}
	}

	attachEventListeners(
		onInput: (e: Event) => void,
		onKeydown: (e: KeyboardEvent) => void,
		onFocusOut: (e: FocusEvent) => void,
	): void {
		const searchInputElement = this.getSearchInputElement();
		if (!searchInputElement) return;

		this.configureSearchInputForAutocomplete(searchInputElement, this.getDropdownId());

		searchInputElement.addEventListener("input", onInput);
		searchInputElement.addEventListener("keydown", onKeydown);
		searchInputElement.addEventListener("focusout", onFocusOut);
	}

	updateTheme(newTheme: string[], previousTheme: string[]): void {
		if (this.dropdownWrapperElement) {
			this.updateThemeClass(newTheme, previousTheme, this.dropdownWrapperElement);
		}
	}

	updateDropdownContents(items: UiSuggestionItem[]): void {
		if (this.suggestionsElement) {
			this.suggestionsElement.replaceChildren(...items.map((item) => item.suggestionElement));
		}
	}

	setAriaExpanded(expanded: boolean): void {
		const searchInputElement = this.getSearchInputElement();
		if (searchInputElement) {
			searchInputElement.setAttribute("aria-expanded", expanded ? "true" : "false");
		}
	}

	updateAriaActivedescendant(suggestionId: string | null): void {
		const searchInputElement = this.getSearchInputElement();
		if (searchInputElement) {
			if (suggestionId) {
				searchInputElement.setAttribute("aria-activedescendant", suggestionId);
			} else {
				searchInputElement.removeAttribute("aria-activedescendant");
			}
		}
	}

	createSuggestionElement(
		suggestion: AddressSuggestion,
		searchString: string = "",
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const { entries = 0 } = suggestion;
		const formattedAddress = this.formatService.getFormattedAddressSuggestion(suggestion);
		const highlightedParts = this.formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);
		const entriesLabel = entries > 1 ? `, ${entries} entries available` : "";
		const ariaLabel = `${formattedAddress}${entriesLabel}`;

		return this.buildSuggestionElement(
			highlightedParts,
			JSON.stringify(suggestion),
			ariaLabel,
			entries,
			suggestionId,
		);
	}

	createSecondarySuggestionElement(
		suggestion: AddressSuggestion,
		searchString: string = "",
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const formattedAddress = this.formatService.getFormattedAddressSuggestion(
			suggestion,
			true,
		);
		const fullAddress = this.formatService.getFormattedAddressSuggestion(
			suggestion,
			false,
		);
		const highlightedParts = this.formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);

		return this.buildSecondarySuggestionElement(
			highlightedParts,
			JSON.stringify(suggestion),
			fullAddress,
			suggestionId,
		);
	}

	scrollToHighlightedSuggestion(highlightedElement: HTMLElement, container: HTMLElement): void {
		const elementTop = highlightedElement.offsetTop;
		const elementBottom = elementTop + highlightedElement.offsetHeight;
		const containerTop = container.scrollTop;
		const containerBottom = containerTop + container.offsetHeight;

		if (elementTop < containerTop) {
			container.scrollTop = elementTop;
		} else if (elementBottom > containerBottom) {
			container.scrollTop = elementBottom - container.offsetHeight;
		}
	}

	showElement(element: HTMLElement): void {
		element.classList.remove("smartyAddress__hidden");
	}

	hideElement(element: HTMLElement): void {
		element.classList.add("smartyAddress__hidden");
	}

	configureSearchInputForAutocomplete(
		searchInputElement: HTMLInputElement,
		dropdownId?: string,
	): void {
		searchInputElement.setAttribute("autocomplete", "smarty");
		searchInputElement.setAttribute("aria-autocomplete", "list");
		searchInputElement.setAttribute("role", "combobox");
		searchInputElement.setAttribute("aria-expanded", "false");
		if (dropdownId) {
			searchInputElement.setAttribute("aria-owns", dropdownId);
			searchInputElement.setAttribute("aria-controls", dropdownId);
		}
	}

	getSuggestionId(index: number): string {
		return `smartyAddress__suggestion_${this.instanceId}_${index}`;
	}

	configureDynamicStyling(dynamicStylingHandler: Function, searchInputElement: HTMLElement): void {
		dynamicStylingHandler();
		window.addEventListener("scroll", () => dynamicStylingHandler());
		window.addEventListener("resize", () => dynamicStylingHandler());
		this.observeAncestorStyleChanges(searchInputElement, dynamicStylingHandler);
	}

	private observeAncestorStyleChanges(element: HTMLElement, callback: Function): void {
		const observer = new MutationObserver(() => callback());
		const options: MutationObserverInit = {
			attributes: true,
			attributeFilter: ["style", "class"],
		};

		let current: HTMLElement | null = element;
		while (current && current !== document.body) {
			observer.observe(current, options);
			current = current.parentElement;
		}

		if (document.body) {
			observer.observe(document.body, options);
		}
	}

	updateThemeClass(
		newTheme: string[],
		previousTheme: string[] = [],
		dropdownWrapperElement: HTMLElement,
	): void {
		if (dropdownWrapperElement) {
			dropdownWrapperElement.classList.remove(...previousTheme);
			dropdownWrapperElement.classList.add(...newTheme);
		}
	}

	private buildAutocompleteDomElements(instanceClassname: string): Record<string, HTMLElement | Text> {
		const darkLogoElementClasses = ["smartyAddress__smartyLogoDark"];
		const lightLogoElementClasses = ["smartyAddress__smartyLogoLight"];
		const suggestionsElementClasses = ["smartyAddress__suggestionsElement"];
		const poweredByElementClasses = ["smartyAddress__poweredBy"];
		const dropdownElementInitialClasses = [
			"smartyAddress__dropdownElement",
			"smartyAddress__hidden",
		];
		const dropdownWrapperElementClasses = [
			"smartyAddress__suggestionsWrapperElement",
			instanceClassname,
		];
		const announcementElementClasses = ["smartyAddress__srOnly"];

		const elementsMap: ElementConfig[] = [
			{ name: "customStylesElement", elementType: "style" },
			{
				name: "dropdownWrapperElement",
				elementType: "div",
				className: dropdownWrapperElementClasses,
				children: [
					{
						name: "announcementElement",
						elementType: "div",
						className: announcementElementClasses,
						attributes: {
							"aria-live": "polite",
							"aria-atomic": "true",
						},
					},
					{
						name: "dropdownElement",
						elementType: "div",
						className: dropdownElementInitialClasses,
						attributes: {
							role: "listbox",
							"aria-label": "Address suggestions",
						},
						children: [
							{
								name: "suggestionsElement",
								elementType: "ul",
								className: suggestionsElementClasses,
							},
							{
								name: "poweredBySmartyElement",
								elementType: "div",
								className: poweredByElementClasses,
								attributes: { "aria-hidden": "true" },
								children: [
									{ text: "Powered by" },
									{
										elementType: "img",
										className: darkLogoElementClasses,
										attributes: {
											src: getSmartyLogo("#0066FF"),
											alt: "",
											"aria-hidden": "true",
										},
									},
									{
										elementType: "img",
										className: lightLogoElementClasses,
										attributes: {
											src: getSmartyLogo("#FFFFFF"),
											alt: "",
											"aria-hidden": "true",
										},
									},
								],
							},
						],
					},
				],
			},
		];

		return this.domService.buildElementsFromMap(elementsMap);
	}

	private buildSuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		suggestionData: string,
		ariaLabel: string,
		entries: number = 0,
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const entriesElementClasses = ["smartyAddress__suggestionEntries"];
		const suggestionElementClasses = ["smartyAddress__suggestion"];

		const entriesChildren: ElementConfig[] | undefined =
			entries > 1 ? [{ text: `${entries} entries` }] : undefined;

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": suggestionData,
			role: "option",
			"aria-label": ariaLabel,
		};
		if (suggestionId) {
			attributes.id = suggestionId;
		}

		const elementsMap: ElementConfig[] = [
			{
				name: "suggestionElement",
				elementType: "li",
				className: suggestionElementClasses,
				attributes,
				children: [
					{
						elementType: "div",
						className: addressWrapperElementClasses,
						children: [
							{
								name: "addressElement",
								elementType: "div",
								className: addressElementClasses,
								children: addressChildren,
							},
							{
								name: "entriesElement",
								elementType: "div",
								className: entriesElementClasses,
								children: entriesChildren,
							},
						],
					},
				],
			},
		];

		return this.domService.buildElementsFromMap(elementsMap);
	}

	private buildSecondarySuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		suggestionData: string,
		ariaLabel: string,
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const secondarySuggestionElementClasses = ["smartyAddress__secondarySuggestion"];

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": suggestionData,
			role: "option",
			"aria-label": ariaLabel,
		};
		if (suggestionId) {
			attributes.id = suggestionId;
		}

		const elementsMap: ElementConfig[] = [
			{
				name: "secondarySuggestionElement",
				elementType: "li",
				className: secondarySuggestionElementClasses,
				attributes,
				children: [
					{
						elementType: "div",
						className: addressWrapperElementClasses,
						children: [
							{
								name: "addressElement",
								elementType: "div",
								className: addressElementClasses,
								children: addressChildren,
							},
						],
					},
				],
			},
		];

		return this.domService.buildElementsFromMap(elementsMap);
	}
}
