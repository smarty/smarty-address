import { BaseService } from "../BaseService";
import { UiSuggestionItem } from "../../interfaces";
import { getMergedAddressSuggestions } from "../../utils/uiUtils";

export class DropdownStateService extends BaseService {
	private selectedAddressSearchTerm: string = "";
	private dropdownIsOpen: boolean = false;
	private highlightedSuggestionIndex: number = 0;
	private selectedSuggestionIndex: number = -1;
	private addressSuggestionResults: UiSuggestionItem[] = [];
	private secondaryAddressSuggestionResults: UiSuggestionItem[] = [];

	getMergedSuggestions(): UiSuggestionItem[] {
		return getMergedAddressSuggestions({
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
	}
}
