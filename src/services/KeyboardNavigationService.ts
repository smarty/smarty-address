import { BaseService } from "./BaseService";
import { UiAutocompleteSuggestionItem } from "./DropdownStateService";

export interface KeyboardNavigationCallbacks {
	onSelectItem: (index: number) => void;
	onClose: () => void;
	getAutocompleteSuggestionsElement: () => HTMLElement | null;
	updateAriaActivedescendant: (suggestionId: string | null) => void;
}

export class KeyboardNavigationService extends BaseService {
	private callbacks?: KeyboardNavigationCallbacks;

	setCallbacks(callbacks: KeyboardNavigationCallbacks): void {
		this.callbacks = callbacks;
	}

	handleAutocompleteKeydown(event: KeyboardEvent): void {
		const pressedKey = event.key;
		const dropdownIsOpen = this.dropdownStateService.isDropdownOpen();

		if (dropdownIsOpen) {
			const handledKeys: Record<string, () => void> = {
				ArrowDown: () => this.highlightNewAddress(1),
				ArrowUp: () => this.highlightNewAddress(-1),
				Enter: () => this.callbacks?.onSelectItem(this.dropdownStateService.getHighlightedIndex()),
				Escape: () => this.callbacks?.onClose(),
			};

			if (handledKeys[pressedKey]) {
				handledKeys[pressedKey]();
				event.preventDefault();
			}
		}
	}

	highlightNewAddress(indexChange: number): number {
		const items = this.dropdownStateService.getMergedAutocompleteSuggestions();
		const currentIndex = this.dropdownStateService.getHighlightedIndex();
		const newIndex = (currentIndex + indexChange + items.length) % items.length;

		items.forEach((item: UiAutocompleteSuggestionItem, i: number) => {
			item.autocompleteSuggestionElement.setAttribute(
				"aria-selected",
				i === newIndex ? "true" : "false",
			);
		});

		const suggestionsElement = this.callbacks?.getAutocompleteSuggestionsElement();
		if (items[newIndex] && suggestionsElement) {
			this.scrollToHighlightedAutocompleteSuggestion(
				items[newIndex].autocompleteSuggestionElement,
				suggestionsElement,
			);
		}
		this.dropdownStateService.setHighlightedIndex(newIndex);

		if (items[newIndex]) {
			const suggestionId = items[newIndex].autocompleteSuggestionElement.id;
			this.callbacks?.updateAriaActivedescendant(suggestionId);
		}

		return newIndex;
	}

	scrollToHighlightedAutocompleteSuggestion(
		highlightedElement: HTMLElement,
		container: HTMLElement,
	): void {
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
}
