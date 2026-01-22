import { BaseService } from "./BaseService";
import { AddressSuggestion, SmartyAddressConfig, UiSuggestionItem } from "../interfaces";
import { getSmartyLogo } from "../utils/getSmartyLogo";

interface ElementConfig {
	name?: string;
	text?: string;
	elementType?: string;
	className?: string[];
	attributes?: Record<string, string>;
	children?: ElementConfig[] | undefined;
}

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
		const instanceClassname = this.services.styleService!.getInstanceClassName(this.instanceId);
		const elements = this.buildAutocompleteDomElements(instanceClassname);
		const { customStylesElement, dropdownWrapperElement } = elements;

		if (dropdownWrapperElement) {
			document.body.appendChild(dropdownWrapperElement);
		}
		const head = document.getElementsByTagName("head")[0];
		if (head && customStylesElement) {
			head.appendChild(customStylesElement);
		}

		this.customStylesElement = elements.customStylesElement as HTMLStyleElement;
		this.dropdownWrapperElement = elements.dropdownWrapperElement as HTMLElement;
		this.dropdownElement = elements.dropdownElement as HTMLElement;
		this.suggestionsElement = elements.suggestionsElement as HTMLElement;
		this.announcementElement = elements.announcementElement as HTMLElement;

		if (this.dropdownElement) {
			this.dropdownElement.id = this.getDropdownId();
			this.dropdownElement.addEventListener("mousedown", () => {
				this.isInteractingWithDropdown = true;
			});
			document.addEventListener("mouseup", () => {
				this.isInteractingWithDropdown = false;
			});
		}

		if (dropdownWrapperElement instanceof HTMLElement) {
			this.updateThemeClass(this.theme, [], dropdownWrapperElement);
		}

		const searchInputElement = (await this.services.domService!.findDomElementWithRetry(
			this.searchInputSelector,
		)) as HTMLInputElement | null;

		if (searchInputElement) {
			this.attachEventListeners(
				(e) => this.handleSearchInputOnChange(e),
				(e) => this.handleAutocompleteKeydown(e),
				(e) => this.handleSearchInputFocusOut(e),
			);

			const dynamicStylingHandler = () =>
				this.updateDynamicStyles(
					this.customStylesElement as HTMLStyleElement,
					searchInputElement,
				);

			this.configureDynamicStyling(dynamicStylingHandler, searchInputElement);
		} else {
			console.error(
				`Failed to find search input element with selector "${this.searchInputSelector}".`,
			);
		}
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
				this.services.apiService?.fetchSecondaryAddressSuggestions(
					searchInputValue,
					selectedAddress.address,
					{
						onSuccess: (suggestions, searchString) =>
							this.formatSecondaryAddressSuggestions(suggestions, searchString),
						onError: (errorMessage) => this.handleAutocompleteSecondaryError(errorMessage),
					},
				);
			} else {
				this.services.apiService?.fetchAddressSuggestions(searchInputValue, {
					onSuccess: (suggestions, searchString) =>
						this.formatAddressSuggestions(suggestions, searchString),
					onError: (errorMessage) => this.handleAutocompleteError(errorMessage),
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
			this.scrollToHighlightedSuggestion(items[newIndex].suggestionElement, this.suggestionsElement!);
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
			this.services.apiService?.fetchSecondaryAddressSuggestions(
				newSearchTerm,
				selectedAddress.address,
				{
					onSuccess: (suggestions, searchString) =>
						this.formatSecondaryAddressSuggestions(suggestions, searchString),
					onError: (errorMessage) => this.handleAutocompleteSecondaryError(errorMessage),
				},
			);
			searchInputElement.focus();
		} else {
			this.services.formService?.populateFormWithAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string): void {
		let filteredSuggestions = suggestions;
		if (this.config?.onSuggestionsReceived) {
			filteredSuggestions = this.config.onSuggestionsReceived(suggestions);
		}

		const selectedSuggestionIndex = this.getSelectedIndex();

		const suggestionItems = filteredSuggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + selectedSuggestionIndex + 1);
				};

				const suggestionId = this.getSuggestionId(addressIndex);
				const suggestionListElements = this.createSuggestionElement(
					address,
					searchString,
					suggestionId,
				);
				const suggestionElement = suggestionListElements["suggestionElement"] as HTMLElement;
				suggestionElement.addEventListener("click", suggestionOnClickHandler);

				return {
					address,
					suggestionElement,
				};
			},
		);

		this.setAddressSuggestions(suggestionItems);
		this.setSecondarySuggestions([]);
		this.updateDropdownContents(suggestionItems);

		if (suggestionItems.length) {
			this.setHighlightedIndex(0);
			this.highlightNewAddress(0);
		}

		const count = suggestionItems.length;
		const plural = count === 1 ? "" : "es";
		this.announce(`${count} address${plural} found. Use arrow keys to navigate.`);

		this.openDropdown();
	}

	formatSecondaryAddressSuggestions(suggestions: AddressSuggestion[], searchString: string): void {
		const addressSuggestionResults = this.getAddressSuggestions();
		const selectedSuggestionIndex = this.getSelectedIndex();
		const baseIndex = addressSuggestionResults.length;

		const suggestionItems = suggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + selectedSuggestionIndex + 1);
				};

				const suggestionId = this.getSuggestionId(baseIndex + addressIndex);
				const suggestionListElements = this.createSecondarySuggestionElement(
					address,
					searchString,
					suggestionId,
				);
				const suggestionElement = suggestionListElements[
					"secondarySuggestionElement"
				] as HTMLElement;
				suggestionElement.addEventListener("click", suggestionOnClickHandler);

				return {
					address,
					suggestionElement,
				};
			},
		);

		this.setSecondarySuggestions(suggestionItems);

		const combinedSuggestionList = this.getMergedSuggestions();
		this.updateDropdownContents(combinedSuggestionList);

		if (suggestionItems.length) {
			const selectedIndex = this.getSelectedIndex();
			this.setHighlightedIndex(selectedIndex + 1);
			this.highlightNewAddress(0);
		}

		const count = suggestionItems.length;
		const plural = count === 1 ? "y" : "ies";
		this.announce(`${count} unit entr${plural} found. Use arrow keys to navigate.`);

		this.openDropdown();
	}

	handleAutocompleteError(_errorName: string): void {
		this.closeDropdown();
	}

	handleAutocompleteSecondaryError(_errorName: string): void {
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
		return this.services.styleService!.getMergedAddressSuggestions({
			addressSuggestionResults: this.addressSuggestionResults,
			secondaryAddressSuggestionResults: this.secondaryAddressSuggestionResults,
			selectedSuggestionIndex: this.selectedSuggestionIndex,
		});
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
		return this.services.domService!.findDomElement(
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

	scrollToHighlighted(element: HTMLElement): void {
		if (this.suggestionsElement) {
			this.scrollToHighlightedSuggestion(element, this.suggestionsElement);
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
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const entriesElementClasses = ["smartyAddress__suggestionEntries"];
		const suggestionElementClasses = ["smartyAddress__suggestion"];

		const entriesChildren: ElementConfig[] | undefined =
			entries > 1 ? [{ text: `${entries} entries` }] : undefined;

		const formattedAddress =
			this.services.styleService!.getFormattedAddressSuggestion(suggestion);
		const highlightedParts = this.services.styleService!.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);
		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const entriesLabel = entries > 1 ? `, ${entries} entries available` : "";
		const ariaLabel = `${formattedAddress}${entriesLabel}`;

		const attributes: Record<string, string> = {
			"data-address": JSON.stringify(suggestion),
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

		return this.buildElementsFromMap(elementsMap);
	}

	createSecondarySuggestionElement(
		suggestion: AddressSuggestion,
		searchString: string = "",
		suggestionId?: string,
	): Record<string, HTMLElement | Text> {
		const addressElementClasses = ["smartyAddress__autocompleteAddress"];
		const addressWrapperElementClasses = ["smartyAddress__addressWrapper"];
		const secondarySuggestionElementClasses = ["smartyAddress__secondarySuggestion"];

		const formattedAddress = this.services.styleService!.getFormattedAddressSuggestion(
			suggestion,
			true,
		);
		const fullAddress = this.services.styleService!.getFormattedAddressSuggestion(
			suggestion,
			false,
		);
		const highlightedParts = this.services.styleService!.createHighlightedTextElements(
			formattedAddress,
			searchString,
		);
		const addressChildren: ElementConfig[] = highlightedParts.map((part) => ({
			elementType: "span",
			className: part.isMatch ? ["smartyAddress__matchedText"] : [],
			children: [{ text: part.text }],
		}));

		const attributes: Record<string, string> = {
			"data-address": JSON.stringify(suggestion),
			role: "option",
			"aria-label": fullAddress,
		};
		if (suggestionId) {
			attributes.id = suggestionId;
		}

		const elementsMap = [
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

		return this.buildElementsFromMap(elementsMap);
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

	getNearestStyledElement(element: HTMLElement, colorProperty: string): HTMLElement {
		const colorValue = this.services.domService!.getElementStyles(element, colorProperty);
		const { alpha } = this.services.styleService!.getRgbaFromCssColor(colorValue);

		return alpha < 0.1 && element.parentElement
			? this.getNearestStyledElement(element.parentElement, colorProperty)
			: element;
	}

	updateDynamicStyles(stylesElement: HTMLStyleElement, searchInputElement: HTMLInputElement): void {
		const { left, bottom, width } = searchInputElement.getBoundingClientRect();
		const scrollY = window.scrollY;
		const scrollX = window.scrollX;

		const backgroundColorElement = this.getNearestStyledElement(
			searchInputElement,
			"backgroundColor",
		);
		const colorElement = this.getNearestStyledElement(searchInputElement, "color");
		const inputBackgroundColor = this.services.domService!.getElementStyles(
			backgroundColorElement,
			"backgroundColor",
		);
		const inputTextColor = this.services.domService!.getElementStyles(colorElement, "color");
		const { hue, saturation, lightness } =
			this.services.styleService!.getHslFromColorString(inputBackgroundColor);

		const isLightMode = lightness > 50;
		const useBlueLogo = lightness > 75;

		const secondaryLightness = isLightMode ? lightness - 10 : lightness + 10;
		const tertiaryLightness = isLightMode ? lightness - 20 : lightness + 20;
		const secondarySurfaceColor = `hsl(${hue} ${saturation}% ${secondaryLightness}%)`;
		const tertiarySurfaceColor = `hsl(${hue} ${saturation}% ${tertiaryLightness}%)`;
		const hoverMixColor = isLightMode ? "#000" : "#fff";

		const accentColor = isLightMode ? "#0066ff" : "#6699ff";

		const dynamicColorStyles = {
			"--smartyAddress__textBasePrimaryColor": inputTextColor,
			"--smartyAddress__surfaceBasePrimaryColor": inputBackgroundColor,
			"--smartyAddress__surfaceBaseSecondaryColor": secondarySurfaceColor,
			"--smartyAddress__surfaceBaseTertiaryColor": tertiarySurfaceColor,
			"--smartyAddress__surfaceInverseExtremeColor": hoverMixColor,
			"--smartyAddress__surfaceBasePrimaryInverseColor": inputTextColor,
			"--smartyAddress__textAccentColor": accentColor,
			"--smartyAddress__logoDarkDisplay": useBlueLogo ? "block" : "none",
			"--smartyAddress__logoLightDisplay": useBlueLogo ? "none" : "block",
			"--smartyAddress__largeShadow1": "0 12px 24px 0 rgba(4, 34, 75, 0.10)",
			"--smartyAddress__largeShadow2": "0 20px 40px 0 rgba(21, 27, 35, 0.06)",
		};

		const dynamicPositionStyles = {
			"--smartyAddress__dropdownPositionTop": `${bottom + scrollY}px`,
			"--smartyAddress__dropdownPositionLeft": `${left + scrollX}px`,
			"--smartyAddress__dropdownWidth": `${width}px`,
		};

		const colorsStyleBlock = this.services.styleService!.formatStyleBlock(
			`.smartyAddress__color_dynamic.${this.services.styleService!.getInstanceClassName(this.instanceId)}`,
			dynamicColorStyles,
		);
		const positionStyleBlock = this.services.styleService!.formatStyleBlock(
			`.smartyAddress__position_dynamic.${this.services.styleService!.getInstanceClassName(this.instanceId)}`,
			dynamicPositionStyles,
		);
		stylesElement.innerHTML = `${colorsStyleBlock} ${positionStyleBlock}`;
	}

	private buildElementsFromMap(
		fullElementsMap: ElementConfig[],
	): Record<string, HTMLElement | Text> {
		const elements: Record<string, HTMLElement | Text> = {};

		const buildElement = ({
			name,
			text,
			elementType,
			className = [],
			attributes = {},
			children = [],
		}: ElementConfig): HTMLElement | Text => {
			const element = text
				? document.createTextNode(text)
				: this.services.domService!.createDomElement(
						elementType!,
						className,
						children.map(buildElement),
					);

			if (element instanceof HTMLElement) {
				Object.entries(attributes).forEach(([attr, value]) => {
					element.setAttribute(attr, value);
				});
			}

			if (name) {
				elements[name] = element;
			}

			return element;
		};

		fullElementsMap.map(buildElement);

		return elements;
	}

	buildAutocompleteDomElements(instanceClassname: string): Record<string, HTMLElement | Text> {
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

		const elementsMap = [
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

		return this.buildElementsFromMap(elementsMap);
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

		const observerCallback = () => dynamicStylingHandler();
		const observerOptions: MutationObserverInit = {
			attributes: true,
			attributeFilter: ["style", "class"],
		};

		const observer = new MutationObserver(observerCallback);

		let element: HTMLElement | null = searchInputElement;
		while (element && element !== document.body) {
			observer.observe(element, observerOptions);
			element = element.parentElement;
		}
		if (document.body) {
			observer.observe(document.body, observerOptions);
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
}
