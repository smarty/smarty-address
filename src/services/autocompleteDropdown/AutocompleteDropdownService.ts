import { BaseService } from "../BaseService";
import { AddressSuggestion, SmartyAddressConfig, UiSuggestionItem } from "../../interfaces";
import {
	buildAutocompleteDomElements,
	configureDynamicStyling,
	createSecondarySuggestionElement,
	createSuggestionElement,
	scrollToHighlightedSuggestion,
	hideElement,
	showElement,
	updateDropdownContents,
	updateDynamicStyles,
	updateThemeClass,
	configureSearchInputForAutocomplete,
	findDomElement,
	findDomElementWithRetry,
} from "../../utils/domUtils";
import { getInstanceClassName, getMergedAddressSuggestions } from "../../utils/uiUtils";

export class AutocompleteDropdownService extends BaseService {
	private instanceId: number;
	private config?: SmartyAddressConfig;
	private theme: string[] = [];
	private searchInputSelector: string = "";

	private dropdownWrapperElement: HTMLElement | null = null;
	private dropdownElement: HTMLElement | null = null;
	private suggestionsElement: HTMLElement | null = null;
	private customStylesElement: HTMLStyleElement | null = null;

	private selectedAddressSearchTerm: string = "";
	private dropdownIsOpen: boolean = false;
	private highlightedSuggestionIndex: number = 0;
	private selectedSuggestionIndex: number = -1;
	private addressSuggestionResults: UiSuggestionItem[] = [];
	private secondaryAddressSuggestionResults: UiSuggestionItem[] = [];

	constructor(instanceId: number) {
		super();
		this.instanceId = instanceId;
	}

	init(config: SmartyAddressConfig) {
		this.config = config;
		const previousTheme = this.theme;
		const newTheme = config?.theme;
		this.theme = newTheme;

		if (previousTheme !== this.theme && this.dropdownWrapperElement) {
			updateThemeClass(newTheme, previousTheme, this.dropdownWrapperElement);
		}

		this.searchInputSelector = config.searchInputSelector ?? config.streetLineSelector ?? "";

		this.setupDom();
	}

	async setupDom() {
		const instanceClassname = getInstanceClassName(this.instanceId);
		const elements = buildAutocompleteDomElements(instanceClassname);
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

		if (dropdownWrapperElement instanceof HTMLElement) {
			updateThemeClass(this.theme, [], dropdownWrapperElement);
		}

		const searchInputElement = (await findDomElementWithRetry(
			this.searchInputSelector,
			findDomElement,
		)) as HTMLInputElement | null;

		if (searchInputElement) {
			this.watchSearchInputForChanges();

			const dynamicStylingHandler = () =>
				updateDynamicStyles(
					this.customStylesElement as HTMLStyleElement,
					searchInputElement,
					this.instanceId,
				);

			configureDynamicStyling(dynamicStylingHandler);
		} else {
			console.error(
				`Failed to find search input element with selector "${this.searchInputSelector}".`,
			);
		}
	}

	watchSearchInputForChanges() {
		const searchInputElement = findDomElement(this.searchInputSelector) as HTMLInputElement;
		if (!searchInputElement) return;

		configureSearchInputForAutocomplete(searchInputElement);

		searchInputElement.addEventListener("input", (e) => this.handleSearchInputOnChange(e));
		searchInputElement.addEventListener("keydown", (e) => this.handleAutocompleteKeydown(e));
	}

	handleAutocompleteKeydown(event: KeyboardEvent) {
		const pressedKey = event.key;
		if (this.dropdownIsOpen) {
			const handledKeys: Record<string, () => void> = {
				ArrowDown: () => this.highlightNewAddress(1),
				ArrowUp: () => this.highlightNewAddress(-1),
				Enter: () => this.handleSelectDropdownItem(this.highlightedSuggestionIndex),
				Escape: () => this.closeDropdown(),
			};

			if (handledKeys[pressedKey]) {
				handledKeys[pressedKey]();
				event.preventDefault();
			}
		}
	}

	handleSearchInputOnChange(event: Event) {
		const searchInputValue = (event.target as HTMLInputElement)?.value;

		if (!searchInputValue.startsWith(this.selectedAddressSearchTerm)) {
			this.selectedSuggestionIndex = -1;
		}

		const mergedAddressSuggestions = this.getMergedSuggestions();
		const selectedAddress = mergedAddressSuggestions[this.selectedSuggestionIndex];

		if (searchInputValue.length) {
			if (this.selectedSuggestionIndex > -1) {
				this.services.apiService?.fetchSecondaryAddressSuggestions(
					searchInputValue,
					selectedAddress?.address,
				);
			} else {
				this.services.apiService?.fetchAddressSuggestions(searchInputValue);
			}
		}
	}

	highlightNewAddress(indexChange: number): number {
		const items = this.getMergedSuggestions();
		const currentIndex = this.highlightedSuggestionIndex;
		const newIndex = (currentIndex + indexChange + items.length) % items.length;

		items.forEach((item: UiSuggestionItem, i: number) => {
			item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
		});

		if (items[newIndex] && this.suggestionsElement) {
			scrollToHighlightedSuggestion(items[newIndex].suggestionElement, this.suggestionsElement);
		}
		this.highlightedSuggestionIndex = newIndex;

		return newIndex;
	}

	handleSelectDropdownItem(addressIndex: number) {
		const mergedAddressSuggestions = this.getMergedSuggestions();
		const selectedAddress = mergedAddressSuggestions[addressIndex];
		if (!selectedAddress) return;

		if (this.config?.onAddressSelected) {
			this.config.onAddressSelected(selectedAddress.address);
		}

		const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
		const searchInputElement = findDomElement(this.searchInputSelector) as HTMLInputElement;
		this.selectedSuggestionIndex = addressIndex;

		if (entries > 1 && searchInputElement) {
			const newSearchTerm = `${street_line} ${secondary}`;
			this.selectedAddressSearchTerm = newSearchTerm;
			searchInputElement.value = newSearchTerm;
			this.services.apiService?.fetchSecondaryAddressSuggestions(
				newSearchTerm,
				selectedAddress.address,
			);
			searchInputElement.focus();
		} else {
			this.services.addressFormUiService?.populateFormWithNewAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
		let filteredSuggestions = suggestions;
		if (this.config?.onSuggestionsReceived) {
			filteredSuggestions = this.config.onSuggestionsReceived(suggestions);
		}

		const suggestionItems = filteredSuggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + this.selectedSuggestionIndex + 1);
				};

				const suggestionListElements = createSuggestionElement(address, searchString);
				const suggestionElement = suggestionListElements["suggestionElement"] as HTMLElement;
				suggestionElement.addEventListener("click", suggestionOnClickHandler);

				return {
					address,
					suggestionElement,
				};
			},
		);

		this.addressSuggestionResults = suggestionItems;
		this.secondaryAddressSuggestionResults = [];
		if (this.suggestionsElement) {
			updateDropdownContents(suggestionItems, this.suggestionsElement);
		}

		if (suggestionItems.length) {
			const newIndex = this.highlightNewAddress(0);
			this.highlightedSuggestionIndex = newIndex;
		}

		this.openDropdown();
	}

	formatSecondaryAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
		const suggestionItems = suggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + this.selectedSuggestionIndex + 1);
				};

				const suggestionListElements = createSecondarySuggestionElement(address, searchString);
				const suggestionElement = suggestionListElements["secondarySuggestionElement"] as HTMLElement;
				suggestionElement.addEventListener("click", suggestionOnClickHandler);

				return {
					address,
					suggestionElement,
				};
			},
		);

		this.secondaryAddressSuggestionResults = suggestionItems;

		const combinedSuggestionList = this.getMergedSuggestions();
		if (this.suggestionsElement) {
			updateDropdownContents(combinedSuggestionList, this.suggestionsElement);
		}

		if (suggestionItems.length) {
			const newIndex = this.highlightNewAddress(0);
			this.highlightedSuggestionIndex = newIndex;
		}

		this.openDropdown();
	}

	handleAutocompleteError(_errorName: string) {
		this.closeDropdown();
	}

	handleAutocompleteSecondaryError(_errorName: string) {
		this.closeDropdown();
	}

	openDropdown() {
		const searchInputElement = findDomElement(this.searchInputSelector);
		if (searchInputElement) {
			searchInputElement.setAttribute("aria-expanded", "true");
		}
		this.dropdownIsOpen = true;
		if (this.dropdownElement) {
			showElement(this.dropdownElement);
		}
		if (this.config?.onDropdownOpen) {
			this.config.onDropdownOpen();
		}
	}

	closeDropdown() {
		const searchInputElement = findDomElement(this.searchInputSelector);
		if (searchInputElement) {
			searchInputElement.setAttribute("aria-expanded", "false");
		}
		this.dropdownIsOpen = false;
		this.selectedAddressSearchTerm = "";
		this.selectedSuggestionIndex = -1;
		if (this.dropdownElement) {
			hideElement(this.dropdownElement);
		}
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}

	private getMergedSuggestions(): UiSuggestionItem[] {
		return getMergedAddressSuggestions({
			addressSuggestionResults: this.addressSuggestionResults,
			secondaryAddressSuggestionResults: this.secondaryAddressSuggestionResults,
			selectedSuggestionIndex: this.selectedSuggestionIndex,
		});
	}
}
