import { BaseService } from "./BaseService";
import { AutocompleteSuggestion } from "../interfaces";

export interface UiAutocompleteSuggestionItem {
	address: AutocompleteSuggestion;
	autocompleteSuggestionElement: HTMLElement;
	isShowAllControl?: boolean;
}

export const INITIAL_VISIBLE_SECONDARIES = 5;

export class DropdownStateService extends BaseService {
	private selectedAddressSearchTerm: string = "";
	private _isDropdownOpen: boolean = false;
	private isInteractingWithDropdown: boolean = false;
	private highlightedAutocompleteSuggestionIndex: number = 0;
	private selectedAutocompleteSuggestionIndex: number = -1;
	private autocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];
	private secondaryAutocompleteSuggestionResults: UiAutocompleteSuggestionItem[] = [];
	private _secondariesExpanded: boolean = false;
	private _showAllItem: UiAutocompleteSuggestionItem | null = null;

	getVisibleSecondaryAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		const all = this.secondaryAutocompleteSuggestionResults;
		if (this._secondariesExpanded || all.length <= INITIAL_VISIBLE_SECONDARIES) return all;
		return all.slice(0, INITIAL_VISIBLE_SECONDARIES);
	}

	getMergedAutocompleteSuggestions(): UiAutocompleteSuggestionItem[] {
		const visible = this.getVisibleSecondaryAutocompleteSuggestions();
		const showAll = this._showAllItem && !this._secondariesExpanded ? [this._showAllItem] : [];
		return this.autocompleteSuggestionResults.toSpliced(
			this.selectedAutocompleteSuggestionIndex + 1,
			0,
			...visible,
			...showAll,
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

	isSecondariesExpanded(): boolean {
		return this._secondariesExpanded;
	}

	setSecondariesExpanded(expanded: boolean): void {
		this._secondariesExpanded = expanded;
	}

	getShowAllItem(): UiAutocompleteSuggestionItem | null {
		return this._showAllItem;
	}

	setShowAllItem(item: UiAutocompleteSuggestionItem | null): void {
		this._showAllItem = item;
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
		this._secondariesExpanded = false;
		this._showAllItem = null;
	}
}
