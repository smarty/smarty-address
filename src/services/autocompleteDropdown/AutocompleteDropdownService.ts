import { BaseService } from "../BaseService";
import { AddressSuggestion, SmartyAddressConfig, UiSuggestionItem } from "../../interfaces";

export class AutocompleteDropdownService extends BaseService {
	private config?: SmartyAddressConfig;

	constructor(_instanceId: number) {
		super();
	}

	init(config: SmartyAddressConfig) {
		this.config = config;
		this.setupDom();
	}

	async setupDom() {
		await this.services.dropdownDomService?.setupDom(
			(e) => this.handleSearchInputOnChange(e),
			(e) => this.handleAutocompleteKeydown(e),
		);
	}

	handleAutocompleteKeydown(event: KeyboardEvent) {
		const pressedKey = event.key;
		const dropdownIsOpen = this.services.dropdownStateService?.isDropdownOpen();

		if (dropdownIsOpen) {
			const handledKeys: Record<string, () => void> = {
				ArrowDown: () => this.highlightNewAddress(1),
				ArrowUp: () => this.highlightNewAddress(-1),
				Enter: () =>
					this.handleSelectDropdownItem(
						this.services.dropdownStateService?.getHighlightedIndex() ?? 0,
					),
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
		const selectedAddressSearchTerm =
			this.services.dropdownStateService?.getSelectedAddressSearchTerm() ?? "";

		if (!searchInputValue.startsWith(selectedAddressSearchTerm)) {
			this.services.dropdownStateService?.setSelectedIndex(-1);
		}

		const mergedAddressSuggestions =
			this.services.dropdownStateService?.getMergedSuggestions() ?? [];
		const currentSelectedIndex = this.services.dropdownStateService?.getSelectedIndex() ?? -1;
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
		const items = this.services.dropdownStateService?.getMergedSuggestions() ?? [];
		const currentIndex = this.services.dropdownStateService?.getHighlightedIndex() ?? 0;
		const newIndex = (currentIndex + indexChange + items.length) % items.length;

		items.forEach((item: UiSuggestionItem, i: number) => {
			item.suggestionElement.setAttribute("aria-selected", i === newIndex ? "true" : "false");
		});

		if (items[newIndex]) {
			this.services.dropdownDomService?.scrollToHighlighted(items[newIndex].suggestionElement);
		}
		this.services.dropdownStateService?.setHighlightedIndex(newIndex);

		if (items[newIndex]) {
			const suggestionId = items[newIndex].suggestionElement.id;
			this.services.dropdownDomService?.updateAriaActivedescendant(suggestionId);
		}

		return newIndex;
	}

	handleSelectDropdownItem(addressIndex: number) {
		const mergedAddressSuggestions =
			this.services.dropdownStateService?.getMergedSuggestions() ?? [];
		const selectedAddress = mergedAddressSuggestions[addressIndex];
		if (!selectedAddress) return;

		if (this.config?.onAddressSelected) {
			this.config.onAddressSelected(selectedAddress.address);
		}

		const { street_line, secondary = "", entries = 0 } = selectedAddress.address;
		const searchInputElement = this.services.dropdownDomService?.getSearchInputElement();
		this.services.dropdownStateService?.setSelectedIndex(addressIndex);

		if (entries > 1 && searchInputElement) {
			const newSearchTerm = `${street_line} ${secondary}`;
			this.services.dropdownStateService?.setSelectedAddressSearchTerm(newSearchTerm);
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
			this.services.addressFormUiService?.populateFormWithNewAddress(selectedAddress.address);
			this.closeDropdown();
		}
	}

	formatAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
		let filteredSuggestions = suggestions;
		if (this.config?.onSuggestionsReceived) {
			filteredSuggestions = this.config.onSuggestionsReceived(suggestions);
		}

		const selectedSuggestionIndex = this.services.dropdownStateService?.getSelectedIndex() ?? -1;

		const suggestionItems = filteredSuggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + selectedSuggestionIndex + 1);
				};

				const suggestionId = this.services.domUtilsService!.getSuggestionId(addressIndex);
				const suggestionListElements = this.services.domUtilsService!.createSuggestionElement(
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

		this.services.dropdownStateService?.setAddressSuggestions(suggestionItems);
		this.services.dropdownStateService?.setSecondarySuggestions([]);
		this.services.dropdownDomService?.updateDropdownContents(suggestionItems);

		if (suggestionItems.length) {
			const newIndex = this.highlightNewAddress(0);
			this.services.dropdownStateService?.setHighlightedIndex(newIndex);
		}

		const count = suggestionItems.length;
		const plural = count === 1 ? "" : "es";
		this.services.dropdownDomService?.announce(
			`${count} address${plural} found. Use arrow keys to navigate.`,
		);

		this.openDropdown();
	}

	formatSecondaryAddressSuggestions(suggestions: AddressSuggestion[], searchString: string) {
		const addressSuggestionResults =
			this.services.dropdownStateService?.getAddressSuggestions() ?? [];
		const selectedSuggestionIndex = this.services.dropdownStateService?.getSelectedIndex() ?? -1;
		const baseIndex = addressSuggestionResults.length;

		const suggestionItems = suggestions.map(
			(address: AddressSuggestion, addressIndex: number): UiSuggestionItem => {
				const suggestionOnClickHandler = () => {
					this.handleSelectDropdownItem(addressIndex + selectedSuggestionIndex + 1);
				};

				const suggestionId = this.services.domUtilsService!.getSuggestionId(
					baseIndex + addressIndex,
				);
				const suggestionListElements =
					this.services.domUtilsService!.createSecondarySuggestionElement(
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

		this.services.dropdownStateService?.setSecondarySuggestions(suggestionItems);

		const combinedSuggestionList = this.services.dropdownStateService?.getMergedSuggestions() ?? [];
		this.services.dropdownDomService?.updateDropdownContents(combinedSuggestionList);

		if (suggestionItems.length) {
			const selectedIndex = this.services.dropdownStateService?.getSelectedIndex() ?? -1;
			this.services.dropdownStateService?.setHighlightedIndex(selectedIndex + 1);
			this.highlightNewAddress(0);
		}

		const count = suggestionItems.length;
		const plural = count === 1 ? "y" : "ies";
		this.services.dropdownDomService?.announce(
			`${count} unit entr${plural} found. Use arrow keys to navigate.`,
		);

		this.openDropdown();
	}

	handleAutocompleteError(_errorName: string) {
		this.closeDropdown();
	}

	handleAutocompleteSecondaryError(_errorName: string) {
		this.closeDropdown();
	}

	openDropdown() {
		this.services.dropdownDomService?.setAriaExpanded(true);
		this.services.dropdownStateService?.setDropdownOpen(true);
		this.services.dropdownDomService?.showDropdown();
		if (this.config?.onDropdownOpen) {
			this.config.onDropdownOpen();
		}
	}

	closeDropdown() {
		this.services.dropdownDomService?.setAriaExpanded(false);
		this.services.dropdownDomService?.updateAriaActivedescendant(null);
		this.services.dropdownStateService?.setDropdownOpen(false);
		this.services.dropdownStateService?.reset();
		this.services.dropdownDomService?.hideDropdown();
		if (this.config?.onDropdownClose) {
			this.config.onDropdownClose();
		}
	}
}
