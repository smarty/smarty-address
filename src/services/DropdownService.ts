import { BaseService } from "./BaseService";
import { AutocompleteSuggestion, NormalizedSmartyAddressConfig } from "../interfaces";
import { CSS_CLASSES, CSS_PREFIXES } from "../constants/cssClasses";
import { getSmartyLogo } from "../utils/getSmartyLogo";
import { ElementConfig } from "./DomService";

export interface UiAutocompleteSuggestionItem {
	address: AutocompleteSuggestion;
	autocompleteSuggestionElement: HTMLElement;
}

export class DropdownService extends BaseService {
	private instanceId: number;
	private config?: NormalizedSmartyAddressConfig;
	private theme: string[] = [];
	private searchInputSelector: string = "";

	private dropdownWrapperElement: HTMLElement | null = null;
	private dropdownElement: HTMLElement | null = null;
	private autocompleteSuggestionsElement: HTMLElement | null = null;
	private customStylesElement: HTMLStyleElement | null = null;
	private announcementElement: HTMLElement | null = null;

	private selectedAddressSearchTerm: string = "";
	private _isDropdownOpen: boolean = false;
	private isInteractingWithDropdown: boolean = false;
	private highlightedAutocompleteSuggestionIndex: number = 0;
	private selectedAutocompleteSuggestionIndex: number = -1;
	private autocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];
	private secondaryAutocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];

	private cleanupFunctions: (() => void)[] = [];
	private mutationObserver: MutationObserver | null = null;

	constructor(instanceId: number) {
		super();
		this.instanceId = instanceId;
	}

	destroy(): void {
		this.cleanupFunctions.forEach((fn) => fn());
		this.cleanupFunctions = [];

		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}

		this.dropdownWrapperElement?.remove();
		this.customStylesElement?.remove();

		this.dropdownWrapperElement = null;
		this.dropdownElement = null;
		this.autocompleteSuggestionsElement = null;
		this.customStylesElement = null;
		this.announcementElement = null;
	}

	init(config: NormalizedSmartyAddressConfig): void {
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
		this.autocompleteSuggestionsElement = elements.autocompleteSuggestionsElement as HTMLElement;
		this.announcementElement = elements.announcementElement as HTMLElement;
	}

	private handleDocumentMouseUp = (): void => {
		this.isInteractingWithDropdown = false;
	};

	private configureDropdownInteractions(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.id = this.getDropdownId();

		const mousedownHandler = () => {
			this.isInteractingWithDropdown = true;
		};
		this.dropdownElement.addEventListener("mousedown", mousedownHandler);
		this.cleanupFunctions.push(() =>
			this.dropdownElement?.removeEventListener("mousedown", mousedownHandler),
		);

		document.addEventListener("mouseup", this.handleDocumentMouseUp);
		this.cleanupFunctions.push(() =>
			document.removeEventListener("mouseup", this.handleDocumentMouseUp),
		);
	}

	private async setupSearchInput(): Promise<void> {
		const searchInputElement = (await this.domService.findDomElementWithRetry(
			this.searchInputSelector,
			this.config?.domWaitTimeoutMs,
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
		if (!event.isTrusted && !this.config?._testMode) return;

		const searchInputValue = (event.target as HTMLInputElement)?.value;
		const selectedAddressSearchTerm = this.getSelectedAddressSearchTerm();

		if (!searchInputValue.startsWith(selectedAddressSearchTerm)) {
			this.setSelectedIndex(-1);
		}

		const mergedAutocompleteSuggestions = this.getMergedAutocompleteSuggestions();
		const currentSelectedIndex = this.getSelectedIndex();
		const selectedAddress = mergedAutocompleteSuggestions[currentSelectedIndex];

		if (searchInputValue.length) {
			if (currentSelectedIndex > -1 && selectedAddress) {
				this.apiService.fetchSecondaryAutocompleteSuggestions(
					searchInputValue,
					selectedAddress.address,
					{
						onSuccess: (autocompleteSuggestions, searchString) =>
							this.processSecondaryAutocompleteSuggestions(autocompleteSuggestions, searchString),
						onError: () => this.handleApiError(),
					},
				);
			} else {
				this.apiService.fetchAutocompleteSuggestions(searchInputValue, {
					onSuccess: (autocompleteSuggestions, searchString) =>
						this.processAutocompleteSuggestions(autocompleteSuggestions, searchString),
					onError: () => this.handleApiError(),
				});
			}
		}
	}

	highlightNewAddress(indexChange: number): number {
		const items = this.getMergedAutocompleteSuggestions();
		const currentIndex = this.getHighlightedIndex();
		const newIndex = (currentIndex + indexChange + items.length) % items.length;

		items.forEach((item: UiAutocompleteSuggestionItem, i: number) => {
			item.autocompleteSuggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
		});

		if (items[newIndex]) {
			this.scrollToHighlightedAutocompleteSuggestion(
				items[newIndex].autocompleteSuggestionElement,
				this.autocompleteSuggestionsElement!,
			);
		}
		this.setHighlightedIndex(newIndex);

		if (items[newIndex]) {
			const autocompleteSuggestionId = items[newIndex].autocompleteSuggestionElement.id;
			this.updateAriaActivedescendant(autocompleteSuggestionId);
		}

		return newIndex;
	}

	handleSelectDropdownItem(addressIndex: number): void {
		const mergedAutocompleteSuggestions = this.getMergedAutocompleteSuggestions();
		const selectedAddress = mergedAutocompleteSuggestions[addressIndex];
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
			this.apiService.fetchSecondaryAutocompleteSuggestions(newSearchTerm, selectedAddress.address, {
				onSuccess: (autocompleteSuggestions, searchString) =>
					this.processSecondaryAutocompleteSuggestions(autocompleteSuggestions, searchString),
				onError: () => this.handleApiError(),
			});
			searchInputElement.focus();
		} else {
			this.formService.populateFormWithAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	processAutocompleteSuggestions(suggestions: AutocompleteSuggestion[], searchString: string): void {
		let filteredAutocompleteSuggestions = suggestions;
		if (this.config?.onAutocompleteSuggestionsReceived) {
			filteredAutocompleteSuggestions = this.config.onAutocompleteSuggestionsReceived(suggestions);
		}

		const autocompleteSuggestionItems = this.createAutocompleteSuggestionItems(
			filteredAutocompleteSuggestions,
			0,
			(address, id) => this.createAutocompleteSuggestionElement(address, searchString, id),
			"autocompleteSuggestionElement",
		);

		this.setAutocompleteSuggestions(autocompleteSuggestionItems);
		this.setSecondaryAutocompleteSuggestions([]);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} address${count === 1 ? "" : "es"} found. Use arrow keys to navigate.`;
		this.displayAutocompleteSuggestions(autocompleteSuggestionItems, autocompleteSuggestionItems, 0, announcement);
	}

	processSecondaryAutocompleteSuggestions(suggestions: AutocompleteSuggestion[], searchString: string): void {
		const baseIndex = this.getAutocompleteSuggestions().length;

		const autocompleteSuggestionItems = this.createAutocompleteSuggestionItems(
			suggestions,
			baseIndex,
			(address, id) => this.createSecondaryAutocompleteSuggestionElement(address, searchString, id),
			"secondaryAutocompleteSuggestionElement",
		);

		this.setSecondaryAutocompleteSuggestions(autocompleteSuggestionItems);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} unit entr${count === 1 ? "y" : "ies"} found. Use arrow keys to navigate.`;
		this.displayAutocompleteSuggestions(
			autocompleteSuggestionItems,
			this.getMergedAutocompleteSuggestions(),
			this.getSelectedIndex() + 1,
			announcement,
		);
	}

	private displayAutocompleteSuggestions(
		newItems: UiAutocompleteSuggestionItem[],
		allItems: UiAutocompleteSuggestionItem[],
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

	private createAutocompleteSuggestionItems(
		suggestions: AutocompleteSuggestion[],
		baseIndex: number,
		createElement: (
			address: AutocompleteSuggestion,
			autocompleteSuggestionId: string,
		) => Record<string, HTMLElement | Text>,
		elementKey: string,
	): UiAutocompleteSuggestionItem[] {
		const selectedAutocompleteSuggestionIndex = this.getSelectedIndex();

		return suggestions.map((address: AutocompleteSuggestion, addressIndex: number): UiAutocompleteSuggestionItem => {
			const autocompleteSuggestionId = this.getAutocompleteSuggestionId(baseIndex + addressIndex);
			const elements = createElement(address, autocompleteSuggestionId);
			const autocompleteSuggestionElement = elements[elementKey] as HTMLElement;

			autocompleteSuggestionElement.addEventListener("click", () => {
				this.handleSelectDropdownItem(addressIndex + selectedAutocompleteSuggestionIndex + 1);
			});

			return { address, autocompleteSuggestionElement };
		});
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
		this.resetSelectionState();
		this.hideDropdown();
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}

	getMergedAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		return this.autocompleteSuggestionResults.toSpliced(
			this.selectedAutocompleteSuggestionIndex + 1,
			0,
			...this.secondaryAutocompleteSuggestionResults,
		);
	}

	getHighlightedIndex(): number {
		return this.highlightedAutocompleteSuggestionIndex;
	}

	setHighlightedIndex(index: number): void {
		this.highlightedAutocompleteSuggestionIndex = index;
	}

	getSelectedIndex(): number {
		return this.selectedAutocompleteSuggestionIndex;
	}

	setSelectedIndex(index: number): void {
		this.selectedAutocompleteSuggestionIndex = index;
	}

	isDropdownOpen(): boolean {
		return this._isDropdownOpen;
	}

	setDropdownOpen(open: boolean): void {
		this._isDropdownOpen = open;
	}

	getAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		return this.autocompleteSuggestionResults;
	}

	setAutocompleteSuggestions(suggestions: UiAutocompleteSuggestionItem[]): void {
		this.autocompleteSuggestionResults = suggestions;
	}

	getSecondaryAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		return this.secondaryAutocompleteSuggestionResults;
	}

	setSecondaryAutocompleteSuggestions(suggestions: UiAutocompleteSuggestionItem[]): void {
		this.secondaryAutocompleteSuggestionResults = suggestions;
	}

	getSelectedAddressSearchTerm(): string {
		return this.selectedAddressSearchTerm;
	}

	setSelectedAddressSearchTerm(term: string): void {
		this.selectedAddressSearchTerm = term;
	}

	resetSelectionState(): void {
		this.selectedAddressSearchTerm = "";
		this.selectedAutocompleteSuggestionIndex = -1;
		this.highlightedAutocompleteSuggestionIndex = 0;
	}

	getDropdownId(): string {
		return `${CSS_PREFIXES.dropdown}${this.instanceId}`;
	}

	getSearchInputElement(): HTMLInputElement | null {
		return this.domService.findDomElement(this.searchInputSelector) as HTMLInputElement | null;
	}

	getAutocompleteSuggestionsElement(): HTMLElement | null {
		return this.autocompleteSuggestionsElement;
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

		this.cleanupFunctions.push(() => {
			searchInputElement.removeEventListener("input", onInput);
			searchInputElement.removeEventListener("keydown", onKeydown);
			searchInputElement.removeEventListener("focusout", onFocusOut);
		});
	}

	updateTheme(newTheme: string[], previousTheme: string[]): void {
		if (this.dropdownWrapperElement) {
			this.updateThemeClass(newTheme, previousTheme, this.dropdownWrapperElement);
		}
	}

	updateDropdownContents(items: UiAutocompleteSuggestionItem[]): void {
		if (this.autocompleteSuggestionsElement) {
			this.autocompleteSuggestionsElement.replaceChildren(...items.map((item) => item.autocompleteSuggestionElement));
		}
	}

	setAriaExpanded(expanded: boolean): void {
		const searchInputElement = this.getSearchInputElement();
		if (searchInputElement) {
			searchInputElement.setAttribute("aria-expanded", expanded ? "true" : "false");
		}
	}

	updateAriaActivedescendant(autocompleteSuggestionId: string | null): void {
		const searchInputElement = this.getSearchInputElement();
		if (searchInputElement) {
			if (autocompleteSuggestionId) {
				searchInputElement.setAttribute("aria-activedescendant", autocompleteSuggestionId);
			} else {
				searchInputElement.removeAttribute("aria-activedescendant");
			}
		}
	}

	createAutocompleteSuggestionElement(
		autocompleteSuggestion: AutocompleteSuggestion,
		searchString: string = "",
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const { entries = 0 } = autocompleteSuggestion;
		const formattedAddress = this.formatService.getFormattedAutocompleteSuggestion(autocompleteSuggestion);
		const highlightedParts = this.formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);
		const entriesLabel = entries > 1 ? `, ${entries} entries available` : "";
		const ariaLabel = `${formattedAddress}${entriesLabel}`;

		return this.buildAutocompleteSuggestionElement(
			highlightedParts,
			JSON.stringify(autocompleteSuggestion),
			ariaLabel,
			entries,
			autocompleteSuggestionId,
		);
	}

	createSecondaryAutocompleteSuggestionElement(
		autocompleteSuggestion: AutocompleteSuggestion,
		searchString: string = "",
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const formattedAddress = this.formatService.getFormattedAutocompleteSuggestion(autocompleteSuggestion, true);
		const fullAddress = this.formatService.getFormattedAutocompleteSuggestion(autocompleteSuggestion, false);
		const highlightedParts = this.formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);

		return this.buildSecondaryAutocompleteSuggestionElement(
			highlightedParts,
			JSON.stringify(autocompleteSuggestion),
			fullAddress,
			autocompleteSuggestionId,
		);
	}

	scrollToHighlightedAutocompleteSuggestion(highlightedElement: HTMLElement, container: HTMLElement): void {
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
		element.classList.remove(CSS_CLASSES.hidden);
	}

	hideElement(element: HTMLElement): void {
		element.classList.add(CSS_CLASSES.hidden);
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

	getAutocompleteSuggestionId(index: number): string {
		return `${CSS_PREFIXES.autocompleteSuggestion}${this.instanceId}_${index}`;
	}

	configureDynamicStyling(dynamicStylingHandler: () => void, searchInputElement: HTMLElement): void {
		dynamicStylingHandler();

		const scrollHandler = () => dynamicStylingHandler();
		const resizeHandler = () => dynamicStylingHandler();

		window.addEventListener("scroll", scrollHandler);
		window.addEventListener("resize", resizeHandler);

		this.cleanupFunctions.push(() => {
			window.removeEventListener("scroll", scrollHandler);
			window.removeEventListener("resize", resizeHandler);
		});

		this.observeAncestorStyleChanges(searchInputElement, dynamicStylingHandler);
	}

	private observeAncestorStyleChanges(element: HTMLElement, callback: () => void): void {
		this.mutationObserver = new MutationObserver(() => callback());
		const options: MutationObserverInit = {
			attributes: true,
			attributeFilter: ["style", "class"],
		};

		let current: HTMLElement | null = element;
		while (current && current !== document.body) {
			this.mutationObserver.observe(current, options);
			current = current.parentElement;
		}

		if (document.body) {
			this.mutationObserver.observe(document.body, options);
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

	private buildAutocompleteDomElements(
		instanceClassname: string,
	): Record<string, HTMLElement | Text> {
		const darkLogoElementClasses = [CSS_CLASSES.smartyLogoDark];
		const lightLogoElementClasses = [CSS_CLASSES.smartyLogoLight];
		const autocompleteSuggestionsElementClasses = [CSS_CLASSES.autocompleteSuggestionsElement];
		const poweredByElementClasses = [CSS_CLASSES.poweredBy];
		const dropdownElementInitialClasses = [CSS_CLASSES.dropdownElement, CSS_CLASSES.hidden];
		const dropdownWrapperElementClasses = [
			CSS_CLASSES.autocompleteSuggestionsWrapperElement,
			instanceClassname,
		];
		const announcementElementClasses = [CSS_CLASSES.srOnly];

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
							"aria-label": "Autocomplete suggestions",
						},
						children: [
							{
								name: "autocompleteSuggestionsElement",
								elementType: "ul",
								className: autocompleteSuggestionsElementClasses,
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

	private buildAutocompleteSuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		autocompleteSuggestionData: string,
		ariaLabel: string,
		entries: number = 0,
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = [CSS_CLASSES.autocompleteAddress];
		const addressWrapperElementClasses = [CSS_CLASSES.addressWrapper];
		const entriesElementClasses = [CSS_CLASSES.autocompleteSuggestionEntries];
		const autocompleteSuggestionElementClasses = [CSS_CLASSES.autocompleteSuggestion];

		const entriesChildren: ElementConfig[] | undefined =
			entries > 1 ? [{ text: `${entries} entries` }] : undefined;

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? [CSS_CLASSES.matchedText] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": autocompleteSuggestionData,
			role: "option",
			"aria-label": ariaLabel,
		};
		if (autocompleteSuggestionId) {
			attributes.id = autocompleteSuggestionId;
		}

		const elementsMap: ElementConfig[] = [
			{
				name: "autocompleteSuggestionElement",
				elementType: "li",
				className: autocompleteSuggestionElementClasses,
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

	private buildSecondaryAutocompleteSuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		autocompleteSuggestionData: string,
		ariaLabel: string,
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = [CSS_CLASSES.autocompleteAddress];
		const addressWrapperElementClasses = [CSS_CLASSES.addressWrapper];
		const secondaryAutocompleteSuggestionElementClasses = [CSS_CLASSES.secondaryAutocompleteSuggestion];

		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? [CSS_CLASSES.matchedText] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": autocompleteSuggestionData,
			role: "option",
			"aria-label": ariaLabel,
		};
		if (autocompleteSuggestionId) {
			attributes.id = autocompleteSuggestionId;
		}

		const elementsMap: ElementConfig[] = [
			{
				name: "secondaryAutocompleteSuggestionElement",
				elementType: "li",
				className: secondaryAutocompleteSuggestionElementClasses,
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
