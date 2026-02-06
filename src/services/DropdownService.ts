import { BaseService } from "./BaseService";
import { AutocompleteSuggestion, NormalizedSmartyAddressConfig } from "../interfaces";
import { CSS_CLASSES, CSS_PREFIXES } from "../constants/cssClasses";
import { getSmartyLogo } from "../utils/getSmartyLogo";
import { ElementConfig } from "./DomService";
import { UiAutocompleteSuggestionItem } from "./DropdownStateService";

export type { UiAutocompleteSuggestionItem } from "./DropdownStateService";

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

		this.keyboardNavigationService.setCallbacks({
			onSelectItem: (index: number) => this.handleSelectDropdownItem(index),
			onClose: () => this.closeDropdown(),
			getAutocompleteSuggestionsElement: () => this.autocompleteSuggestionsElement,
			updateAriaActivedescendant: (id: string | null) => this.updateAriaActivedescendant(id),
		});

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
		this.dropdownStateService.setIsInteractingWithDropdown(false);
	};

	private configureDropdownInteractions(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.id = this.getDropdownId();

		const mousedownHandler = () => {
			this.dropdownStateService.setIsInteractingWithDropdown(true);
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
		if (this.dropdownStateService.getIsInteractingWithDropdown()) return;

		const relatedTarget = event.relatedTarget as Node | null;
		const searchInputElement = this.getSearchInputElement();
		const isWithinDropdown = relatedTarget && this.dropdownElement?.contains(relatedTarget);
		const isWithinInput = relatedTarget && searchInputElement?.contains(relatedTarget);

		if (!isWithinDropdown && !isWithinInput) {
			this.closeDropdown();
		}
	}

	handleAutocompleteKeydown(event: KeyboardEvent): void {
		this.keyboardNavigationService.handleAutocompleteKeydown(event);
	}

	handleSearchInputOnChange(event: Event): void {
		if (!event.isTrusted && !this.config?._testMode) return;

		const searchInputValue = (event.target as HTMLInputElement)?.value;
		const selectedAddressSearchTerm = this.dropdownStateService.getSelectedAddressSearchTerm();

		if (!searchInputValue.startsWith(selectedAddressSearchTerm)) {
			this.dropdownStateService.setSelectedIndex(-1);
		}

		const mergedAutocompleteSuggestions =
			this.dropdownStateService.getMergedAutocompleteSuggestions();
		const currentSelectedIndex = this.dropdownStateService.getSelectedIndex();
		const selectedAddress = mergedAutocompleteSuggestions[currentSelectedIndex];

		if (!searchInputValue.length) return;

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

	highlightNewAddress(indexChange: number): number {
		return this.keyboardNavigationService.highlightNewAddress(indexChange);
	}

	handleSelectDropdownItem(addressIndex: number): void {
		const mergedAutocompleteSuggestions =
			this.dropdownStateService.getMergedAutocompleteSuggestions();
		const selectedAddress = mergedAutocompleteSuggestions[addressIndex];
		if (!selectedAddress) return;

		if (this.config?.onAddressSelected) {
			this.config.onAddressSelected(selectedAddress.address);
		}

		const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
		const searchInputElement = this.getSearchInputElement();
		this.dropdownStateService.setSelectedIndex(addressIndex);

		const hasSecondaries = entries > 1;
		if (hasSecondaries && searchInputElement) {
			const newSearchTerm = `${street_line} ${secondary}`;
			this.dropdownStateService.setSelectedAddressSearchTerm(newSearchTerm);
			searchInputElement.value = newSearchTerm;
			this.apiService.fetchSecondaryAutocompleteSuggestions(
				newSearchTerm,
				selectedAddress.address,
				{
					onSuccess: (autocompleteSuggestions, searchString) =>
						this.processSecondaryAutocompleteSuggestions(autocompleteSuggestions, searchString),
					onError: () => this.handleApiError(),
				},
			);
			searchInputElement.focus();
		} else {
			this.formService.populateFormWithAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	processAutocompleteSuggestions(
		suggestions: AutocompleteSuggestion[],
		searchString: string,
	): void {
		const filteredAutocompleteSuggestions = this.config?.onAutocompleteSuggestionsReceived
			? this.config.onAutocompleteSuggestionsReceived(suggestions)
			: suggestions;

		const autocompleteSuggestionItems = this.createAutocompleteSuggestionItems(
			filteredAutocompleteSuggestions,
			0,
			(address, id) => this.createAutocompleteSuggestionElement(address, searchString, id),
			"autocompleteSuggestionElement",
		);

		this.dropdownStateService.setAutocompleteSuggestions(autocompleteSuggestionItems);
		this.dropdownStateService.setSecondaryAutocompleteSuggestions([]);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} address${count === 1 ? "" : "es"} found. Use arrow keys to navigate.`;
		this.displayAutocompleteSuggestions(
			autocompleteSuggestionItems,
			autocompleteSuggestionItems,
			0,
			announcement,
		);
	}

	processSecondaryAutocompleteSuggestions(
		suggestions: AutocompleteSuggestion[],
		searchString: string,
	): void {
		const baseIndex = this.dropdownStateService.getAutocompleteSuggestions().length;

		const autocompleteSuggestionItems = this.createAutocompleteSuggestionItems(
			suggestions,
			baseIndex,
			(address, id) => this.createSecondaryAutocompleteSuggestionElement(address, searchString, id),
			"secondaryAutocompleteSuggestionElement",
		);

		this.dropdownStateService.setSecondaryAutocompleteSuggestions(autocompleteSuggestionItems);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} unit entr${count === 1 ? "y" : "ies"} found. Use arrow keys to navigate.`;
		this.displayAutocompleteSuggestions(
			autocompleteSuggestionItems,
			this.dropdownStateService.getMergedAutocompleteSuggestions(),
			this.dropdownStateService.getSelectedIndex() + 1,
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
			this.dropdownStateService.setHighlightedIndex(initialHighlightIndex);
			this.keyboardNavigationService.highlightNewAddress(0);
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
		const selectedAutocompleteSuggestionIndex = this.dropdownStateService.getSelectedIndex();

		return suggestions.map(
			(address: AutocompleteSuggestion, addressIndex: number): UiAutocompleteSuggestionItem => {
				const autocompleteSuggestionId = this.getAutocompleteSuggestionId(baseIndex + addressIndex);
				const elements = createElement(address, autocompleteSuggestionId);
				const autocompleteSuggestionElement = elements[elementKey] as HTMLElement;

				autocompleteSuggestionElement.addEventListener("click", () => {
					this.handleSelectDropdownItem(addressIndex + selectedAutocompleteSuggestionIndex + 1);
				});

				return { address, autocompleteSuggestionElement };
			},
		);
	}

	handleApiError(): void {
		this.closeDropdown();
	}

	openDropdown(): void {
		this.setAriaExpanded(true);
		this.dropdownStateService.setDropdownOpen(true);
		this.showDropdown();
		if (this.config?.onDropdownOpen) {
			this.config.onDropdownOpen();
		}
	}

	closeDropdown(): void {
		this.setAriaExpanded(false);
		this.updateAriaActivedescendant(null);
		this.dropdownStateService.setDropdownOpen(false);
		this.dropdownStateService.resetSelectionState();
		this.hideDropdown();
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}

	getMergedAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		return this.dropdownStateService.getMergedAutocompleteSuggestions();
	}

	setSelectedIndex(index: number): void {
		this.dropdownStateService.setSelectedIndex(index);
	}

	setAutocompleteSuggestions(suggestions: UiAutocompleteSuggestionItem[]): void {
		this.dropdownStateService.setAutocompleteSuggestions(suggestions);
	}

	setSecondaryAutocompleteSuggestions(suggestions: UiAutocompleteSuggestionItem[]): void {
		this.dropdownStateService.setSecondaryAutocompleteSuggestions(suggestions);
	}

	resetSelectionState(): void {
		this.dropdownStateService.resetSelectionState();
	}

	getDropdownId(): string {
		return `${CSS_PREFIXES.dropdown}${this.instanceId}`;
	}

	getSearchInputElement(): HTMLInputElement | null {
		return this.domService.findDomElement(this.searchInputSelector) as HTMLInputElement | null;
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

	updateDropdownContents(items: UiAutocompleteSuggestionItem[]): void {
		if (this.autocompleteSuggestionsElement) {
			this.autocompleteSuggestionsElement.replaceChildren(
				...items.map((item) => item.autocompleteSuggestionElement),
			);
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
		if (!searchInputElement) return;

		if (autocompleteSuggestionId) {
			searchInputElement.setAttribute("aria-activedescendant", autocompleteSuggestionId);
		} else {
			searchInputElement.removeAttribute("aria-activedescendant");
		}
	}

	createAutocompleteSuggestionElement(
		autocompleteSuggestion: AutocompleteSuggestion,
		searchString: string = "",
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const { entries = 0 } = autocompleteSuggestion;
		const formattedAddress =
			this.formatService.getFormattedAutocompleteSuggestion(autocompleteSuggestion);
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
		const formattedAddress = this.formatService.getFormattedAutocompleteSuggestion(
			autocompleteSuggestion,
			true,
		);
		const fullAddress = this.formatService.getFormattedAutocompleteSuggestion(
			autocompleteSuggestion,
			false,
		);
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

	scrollToHighlightedAutocompleteSuggestion(
		highlightedElement: HTMLElement,
		container: HTMLElement,
	): void {
		this.keyboardNavigationService.scrollToHighlightedAutocompleteSuggestion(
			highlightedElement,
			container,
		);
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

	configureDynamicStyling(
		dynamicStylingHandler: () => void,
		searchInputElement: HTMLElement,
	): void {
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
		const secondaryAutocompleteSuggestionElementClasses = [
			CSS_CLASSES.secondaryAutocompleteSuggestion,
		];

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
