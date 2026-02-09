import { BaseService } from "./BaseService";
import { AutocompleteSuggestion } from "../interfaces";

export interface UiAutocompleteSuggestionItem {
	address: AutocompleteSuggestion;
	autocompleteSuggestionElement: HTMLElement;
}

export class DropdownStateService extends BaseService {
	private selectedAddressSearchTerm: string = "";
	private _isDropdownOpen: boolean = false;
	private isInteractingWithDropdown: boolean = false;
	private highlightedAutocompleteSuggestionIndex: number = 0;
	private selectedAutocompleteSuggestionIndex: number = -1;
	private autocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];
	private secondaryAutocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];

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

	getIsInteractingWithDropdown(): boolean {
		return this.isInteractingWithDropdown;
	}

	setIsInteractingWithDropdown(interacting: boolean): void {
		this.isInteractingWithDropdown = interacting;
	}

	resetSelectionState(): void {
		this.selectedAddressSearchTerm = "";
		this.selectedAutocompleteSuggestionIndex = -1;
		this.highlightedAutocompleteSuggestionIndex = 0;
	}
}
