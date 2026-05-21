import { BaseService } from "./BaseService";
import { AutocompleteSuggestion, NormalizedSmartyAddressConfig } from "../interfaces";
import { CSS_CLASSES, CSS_PREFIXES } from "../constants/cssClasses";
import { getChevronSvg } from "../utils/getChevronIcon";
import { getSmartyLogo } from "../utils/getSmartyLogo";
import { ElementConfig } from "./DomService";
import { INITIAL_VISIBLE_SECONDARIES, UiAutocompleteSuggestionItem } from "./DropdownStateService";

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
	private dynamicStylingHandler: (() => void) | null = null;

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
		this.dynamicStylingHandler = null;
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

		this.getService("keyboardNavigationService").setCallbacks({
			onSelectItem: (index: number) => this.handleSelectDropdownItem(index),
			onClose: () => this.closeDropdown(),
			getAutocompleteSuggestionsElement: () => this.autocompleteSuggestionsElement,
			updateAriaActivedescendant: (id: string | null) => this.updateAriaActivedescendant(id),
		});

		this.setupDom();
	}

	async setupDom(): Promise<void> {
		const instanceClassname = this.getService("styleService").getInstanceClassName(this.instanceId);
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
		this.getService("dropdownStateService").setIsInteractingWithDropdown(false);
	};

	private configureDropdownInteractions(): void {
		if (!this.dropdownElement) return;

		this.dropdownElement.id = this.getDropdownId();

		const mousedownHandler = () => {
			this.getService("dropdownStateService").setIsInteractingWithDropdown(true);
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
		const searchInputElement = (await this.getService("domService").findDomElementWithRetry(
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
			(e) => this.getService("keyboardNavigationService").handleAutocompleteKeydown(e),
			(e) => this.handleSearchInputFocusOut(e),
		);

		this.dynamicStylingHandler = () =>
			this.getService("styleService").updateDynamicStyles(
				this.customStylesElement as HTMLStyleElement,
				searchInputElement,
				this.instanceId,
			);

		this.configureDynamicStyling(this.dynamicStylingHandler, searchInputElement);
	}

	handleSearchInputFocusOut(event: FocusEvent): void {
		if (this.getService("dropdownStateService").getIsInteractingWithDropdown()) return;

		const relatedTarget = event.relatedTarget as Node | null;
		const searchInputElement = this.getSearchInputElement();
		const isWithinDropdown = relatedTarget && this.dropdownElement?.contains(relatedTarget);
		const isWithinInput = relatedTarget && searchInputElement?.contains(relatedTarget);

		if (!isWithinDropdown && !isWithinInput) {
			this.closeDropdown();
		}
	}

	handleSearchInputOnChange(event: Event): void {
		if (!event.isTrusted && !this.config?._testMode) return;

		const stateService = this.getService("dropdownStateService");
		const searchInputValue = (event.target as HTMLInputElement)?.value;
		const selectedAddressSearchTerm = stateService.getSelectedAddressSearchTerm();

		if (!searchInputValue.startsWith(selectedAddressSearchTerm)) {
			stateService.setSelectedIndex(-1);
		}

		const mergedAutocompleteSuggestions = stateService.getMergedAutocompleteSuggestions();
		const currentSelectedIndex = stateService.getSelectedIndex();
		const selectedAddress = mergedAutocompleteSuggestions[currentSelectedIndex];

		if (!searchInputValue.length) return;

		const apiService = this.getService("apiService");
		if (currentSelectedIndex > -1 && selectedAddress) {
			apiService.fetchSecondaryAutocompleteSuggestions(searchInputValue, selectedAddress.address, {
				onSuccess: (autocompleteSuggestions, searchString) =>
					this.processSecondaryAutocompleteSuggestions(autocompleteSuggestions, searchString),
				onError: () => this.handleApiError(),
			});
		} else {
			apiService.fetchAutocompleteSuggestions(searchInputValue, {
				onSuccess: (autocompleteSuggestions, searchString) =>
					this.processAutocompleteSuggestions(autocompleteSuggestions, searchString),
				onError: () => this.handleApiError(),
			});
		}
	}

	handleSelectDropdownItem(addressIndex: number): void {
		const stateService = this.getService("dropdownStateService");
		const mergedAutocompleteSuggestions = stateService.getMergedAutocompleteSuggestions();
		const selectedAddress = mergedAutocompleteSuggestions[addressIndex];
		if (!selectedAddress) return;

		if (selectedAddress.isShowAllControl) {
			this.expandAllSecondaries();
			return;
		}

		if (this.config?.onAddressSelected) {
			this.config.onAddressSelected(selectedAddress.address);
		}

		const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
		const searchInputElement = this.getSearchInputElement();
		const primaryIndex = stateService.getAutocompleteSuggestions().indexOf(selectedAddress);
		const resolvedIndex = primaryIndex !== -1 ? primaryIndex : addressIndex;

		const hasSecondaries = entries > 1;
		const isAlreadyExpanded =
			hasSecondaries &&
			stateService.getSelectedIndex() === resolvedIndex &&
			stateService.getSecondaryAutocompleteSuggestions().length > 0;

		if (isAlreadyExpanded) {
			this.collapseSecondaries();
			return;
		}

		stateService.setSelectedIndex(resolvedIndex);

		if (hasSecondaries && searchInputElement) {
			const newSearchTerm = `${street_line} ${secondary}`;
			stateService.setSelectedAddressSearchTerm(newSearchTerm);
			searchInputElement.value = newSearchTerm;
			this.getService("apiService").fetchSecondaryAutocompleteSuggestions(
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
			this.getService("formService").populateFormWithAddress(selectedAddress.address);
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

		const stateService = this.getService("dropdownStateService");
		stateService.setAutocompleteSuggestions(autocompleteSuggestionItems);
		stateService.setSecondaryAutocompleteSuggestions([]);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} address${count === 1 ? "" : "es"} found.${count > 1 ? " Use the arrow keys to move through the results." : ""}`;
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
		const stateService = this.getService("dropdownStateService");
		const baseIndex = stateService.getAutocompleteSuggestions().length;

		const autocompleteSuggestionItems = this.createAutocompleteSuggestionItems(
			suggestions,
			baseIndex,
			(address, id) => this.createSecondaryAutocompleteSuggestionElement(address, searchString, id),
			"secondaryAutocompleteSuggestionElement",
		);

		stateService.setSecondaryAutocompleteSuggestions(autocompleteSuggestionItems);
		stateService.setSecondariesExpanded(false);

		const showAllItem =
			autocompleteSuggestionItems.length > INITIAL_VISIBLE_SECONDARIES
				? this.createShowAllElement(autocompleteSuggestionItems.length)
				: null;
		stateService.setShowAllItem(showAllItem);

		const count = autocompleteSuggestionItems.length;
		const announcement = `${count} unit entr${count === 1 ? "y" : "ies"} found.${count > 1 ? " Use the arrow keys to move through the results." : ""}`;
		this.displayAutocompleteSuggestions(
			autocompleteSuggestionItems,
			stateService.getMergedAutocompleteSuggestions(),
			stateService.getSelectedIndex() + 1,
			announcement,
		);

		this.scrollSelectedPrimaryToTop();

		if (autocompleteSuggestionItems.length > 0) {
			this.flipChevronUp(stateService);
		} else {
			this.flipChevronDown(stateService);
		}
	}

	private displayAutocompleteSuggestions(
		newItems: UiAutocompleteSuggestionItem[],
		allItems: UiAutocompleteSuggestionItem[],
		initialHighlightIndex: number,
		announcement: string,
	): void {
		this.updateDropdownContents(allItems);

		if (newItems.length) {
			this.getService("dropdownStateService").setHighlightedIndex(initialHighlightIndex);
			this.getService("keyboardNavigationService").highlightNewAddress(0);
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
		return suggestions.map(
			(address: AutocompleteSuggestion, addressIndex: number): UiAutocompleteSuggestionItem => {
				const autocompleteSuggestionId = this.getAutocompleteSuggestionId(baseIndex + addressIndex);
				const elements = createElement(address, autocompleteSuggestionId);
				const autocompleteSuggestionElement = elements[elementKey] as HTMLElement;

				autocompleteSuggestionElement.addEventListener("click", () => {
					const merged = this.getService("dropdownStateService").getMergedAutocompleteSuggestions();
					const mergedIndex = merged.findIndex(
						(item) => item.autocompleteSuggestionElement === autocompleteSuggestionElement,
					);
					if (mergedIndex !== -1) this.handleSelectDropdownItem(mergedIndex);
				});

				return { address, autocompleteSuggestionElement };
			},
		);
	}

	handleApiError(): void {
		this.closeDropdown();
	}

	openDropdown(): void {
		this.dynamicStylingHandler?.();
		this.setAriaExpanded(true);
		this.getService("dropdownStateService").setDropdownOpen(true);
		this.showDropdown();
		if (this.config?.onDropdownOpen) {
			this.config.onDropdownOpen();
		}
	}

	closeDropdown(): void {
		this.setAriaExpanded(false);
		this.updateAriaActivedescendant(null);
		const stateService = this.getService("dropdownStateService");
		stateService.setDropdownOpen(false);
		stateService.resetSelectionState();
		this.hideDropdown();
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}

	getDropdownId(): string {
		return `${CSS_PREFIXES.dropdown}${this.instanceId}`;
	}

	getSearchInputElement(): HTMLInputElement | null {
		return this.getService("domService").findDomElement(
			this.searchInputSelector,
		) as HTMLInputElement | null;
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
		const formatService = this.getService("formatService");
		const { entries = 0 } = autocompleteSuggestion;
		const formattedAddress =
			formatService.getFormattedAutocompleteSuggestion(autocompleteSuggestion);
		const highlightedParts = formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);
		const entriesLabel = entries > 1 ? `, ${entries} units available` : "";
		const ariaLabel = `${formattedAddress}${entriesLabel}`;

		return this.buildSuggestionElement(
			highlightedParts,
			JSON.stringify(autocompleteSuggestion),
			ariaLabel,
			{
				elementName: "autocompleteSuggestionElement",
				cssClass: CSS_CLASSES.autocompleteSuggestion,
				entries,
			},
			autocompleteSuggestionId,
		);
	}

	createSecondaryAutocompleteSuggestionElement(
		autocompleteSuggestion: AutocompleteSuggestion,
		searchString: string = "",
		autocompleteSuggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const formatService = this.getService("formatService");
		const formattedAddress = formatService.getFormattedAutocompleteSuggestion(
			autocompleteSuggestion,
			true,
		);
		const fullAddress = formatService.getFormattedAutocompleteSuggestion(
			autocompleteSuggestion,
			false,
		);
		const highlightedParts = formatService.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);

		return this.buildSuggestionElement(
			highlightedParts,
			JSON.stringify(autocompleteSuggestion),
			fullAddress,
			{
				elementName: "secondaryAutocompleteSuggestionElement",
				cssClass: CSS_CLASSES.secondaryAutocompleteSuggestion,
			},
			autocompleteSuggestionId,
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

	private createShowAllElement(totalCount: number): UiAutocompleteSuggestionItem {
		const elementsMap: ElementConfig[] = [
			{
				name: "showAllElement",
				elementType: "li",
				className: [CSS_CLASSES.showAllSecondaries],
				attributes: {
					role: "option",
					"aria-label": "Show all units",
				},
				children: [
					{
						elementType: "div",
						className: [CSS_CLASSES.addressWrapper],
						children: [{ text: `\u2026 Show all ${totalCount}` }],
					},
				],
			},
		];

		const elements = this.getService("domService").buildElementsFromMap(elementsMap);
		const showAllElement = elements.showAllElement as HTMLElement;

		showAllElement.addEventListener("click", () => this.expandAllSecondaries());

		return {
			address: { street_line: "", city: "", state: "", zipcode: "", country: "" },
			autocompleteSuggestionElement: showAllElement,
			isShowAllControl: true,
		};
	}

	private expandAllSecondaries(): void {
		const stateService = this.getService("dropdownStateService");
		stateService.setSecondariesExpanded(true);
		stateService.setShowAllItem(null);

		this.flipChevronUp(stateService);
		this.updateDropdownContents(stateService.getMergedAutocompleteSuggestions());
		this.getService("keyboardNavigationService").highlightNewAddress(0);

		const count = stateService.getSecondaryAutocompleteSuggestions().length;
		this.announce(`Showing all ${count} units.`);
	}

	private collapseSecondaries(): void {
		const stateService = this.getService("dropdownStateService");
		this.flipChevronDown(stateService);
		stateService.setSecondaryAutocompleteSuggestions([]);
		stateService.setSecondariesExpanded(false);
		stateService.setShowAllItem(null);
		stateService.setSelectedIndex(-1);
		stateService.setSelectedAddressSearchTerm("");
		this.updateDropdownContents(stateService.getMergedAutocompleteSuggestions());
		this.getService("keyboardNavigationService").highlightNewAddress(0);
		this.announce("Units collapsed.");
	}

	private flipChevronUp(
		stateService: ReturnType<typeof this.getService<"dropdownStateService">>,
	): void {
		const chevron = this.getSelectedChevron(stateService);
		if (chevron) chevron.classList.add(CSS_CLASSES.entriesChevronUp);
	}

	private flipChevronDown(
		stateService: ReturnType<typeof this.getService<"dropdownStateService">>,
	): void {
		const chevron = this.getSelectedChevron(stateService);
		if (chevron) chevron.classList.remove(CSS_CLASSES.entriesChevronUp);
	}

	private getSelectedChevron(
		stateService: ReturnType<typeof this.getService<"dropdownStateService">>,
	): Element | null {
		const merged = stateService.getMergedAutocompleteSuggestions();
		const selectedItem = merged[stateService.getSelectedIndex()];
		return (
			selectedItem?.autocompleteSuggestionElement.querySelector(`.${CSS_CLASSES.entriesChevron}`) ??
			null
		);
	}

	private scrollSelectedPrimaryToTop(): void {
		const stateService = this.getService("dropdownStateService");
		const merged = stateService.getMergedAutocompleteSuggestions();
		const selectedIndex = stateService.getSelectedIndex();
		const selectedItem = merged[selectedIndex];

		if (!selectedItem || !this.autocompleteSuggestionsElement) return;

		const container = this.autocompleteSuggestionsElement;
		if (typeof container.scrollTo === "function") {
			container.scrollTo({
				top: selectedItem.autocompleteSuggestionElement.offsetTop,
				behavior: "smooth",
			});
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
											src: getSmartyLogo("#151b23", "#0066FF"),
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

		return this.getService("domService").buildElementsFromMap(elementsMap);
	}

	private buildSuggestionElement(
		highlightedParts: Array<{ text: string; isMatch?: boolean }>,
		suggestionData: string,
		ariaLabel: string,
		config: { elementName: string; cssClass: string; entries?: number },
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? [CSS_CLASSES.matchedText] : [],
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

		const wrapperChildren: ElementConfig[] = [
			{
				name: "addressElement",
				elementType: "div",
				className: [CSS_CLASSES.autocompleteAddress],
				children: addressChildren,
			},
		];

		const entries = config.entries ?? 0;
		if (entries > 1) {
			wrapperChildren.push({
				name: "entriesElement",
				elementType: "div",
				className: [CSS_CLASSES.autocompleteSuggestionEntries],
				children: [
					{ text: `+${entries} units` },
					{
						name: "chevronElement",
						elementType: "span",
						className: [CSS_CLASSES.entriesChevron],
						attributes: { "aria-hidden": "true" },
					},
				],
			});
		}

		const elementsMap: ElementConfig[] = [
			{
				name: config.elementName,
				elementType: "li",
				className: [config.cssClass],
				attributes,
				children: [
					{
						elementType: "div",
						className: [CSS_CLASSES.addressWrapper],
						children: wrapperChildren,
					},
				],
			},
		];

		const elements = this.getService("domService").buildElementsFromMap(elementsMap);

		if (elements.chevronElement instanceof HTMLElement) {
			elements.chevronElement.innerHTML = getChevronSvg();
		}

		return elements;
	}
}
