import { BaseService } from "../BaseService";
import { SmartyAddressConfig, UiSuggestionItem } from "../../interfaces";

export class DropdownDomService extends BaseService {
	private instanceId: number;
	private theme: string[] = [];
	private searchInputSelector: string = "";

	private dropdownWrapperElement: HTMLElement | null = null;
	private dropdownElement: HTMLElement | null = null;
	private suggestionsElement: HTMLElement | null = null;
	private customStylesElement: HTMLStyleElement | null = null;
	private announcementElement: HTMLElement | null = null;

	constructor(instanceId: number) {
		super();
		this.instanceId = instanceId;
	}

	init(config: SmartyAddressConfig): void {
		const previousTheme = this.theme;
		const newTheme = config?.theme;
		this.theme = newTheme;

		if (previousTheme !== this.theme && this.dropdownWrapperElement) {
			this.services.domUtilsService!.updateThemeClass(
				newTheme,
				previousTheme,
				this.dropdownWrapperElement,
			);
		}

		this.searchInputSelector = config.searchInputSelector ?? config.streetSelector ?? "";
	}

	async setupDom(
		onInput: (e: Event) => void,
		onKeydown: (e: KeyboardEvent) => void,
	): Promise<void> {
		const instanceClassname = this.services.formattingService!.getInstanceClassName(
			this.instanceId,
		);
		const elements = this.services.domUtilsService!.buildAutocompleteDomElements(instanceClassname);
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
		}

		if (dropdownWrapperElement instanceof HTMLElement) {
			this.services.domUtilsService!.updateThemeClass(this.theme, [], dropdownWrapperElement);
		}

		const searchInputElement = (await this.services.domUtilsService!.findDomElementWithRetry(
			this.searchInputSelector,
		)) as HTMLInputElement | null;

		if (searchInputElement) {
			this.attachEventListeners(onInput, onKeydown);

			const dynamicStylingHandler = () =>
				this.services.domUtilsService!.updateDynamicStyles(
					this.customStylesElement as HTMLStyleElement,
					searchInputElement,
				);

			this.services.domUtilsService!.configureDynamicStyling(
				dynamicStylingHandler,
				searchInputElement,
			);
		} else {
			console.error(
				`Failed to find search input element with selector "${this.searchInputSelector}".`,
			);
		}
	}

	getDropdownId(): string {
		return `smartyAddress__dropdown_${this.instanceId}`;
	}

	getSearchInputElement(): HTMLInputElement | null {
		return this.services.domUtilsService!.findDomElement(
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
			this.services.domUtilsService!.showElement(this.dropdownElement);
		}
	}

	hideDropdown(): void {
		if (this.dropdownElement) {
			this.services.domUtilsService!.hideElement(this.dropdownElement);
		}
	}

	announce(message: string): void {
		if (this.announcementElement) {
			this.announcementElement.textContent = message;
		}
	}

	attachEventListeners(onInput: (e: Event) => void, onKeydown: (e: KeyboardEvent) => void): void {
		const searchInputElement = this.getSearchInputElement();
		if (!searchInputElement) return;

		this.services.domUtilsService!.configureSearchInputForAutocomplete(
			searchInputElement,
			this.getDropdownId(),
		);

		searchInputElement.addEventListener("input", onInput);
		searchInputElement.addEventListener("keydown", onKeydown);
	}

	updateTheme(newTheme: string[], previousTheme: string[]): void {
		if (this.dropdownWrapperElement) {
			this.services.domUtilsService!.updateThemeClass(
				newTheme,
				previousTheme,
				this.dropdownWrapperElement,
			);
		}
	}

	updateDropdownContents(items: UiSuggestionItem[]): void {
		if (this.suggestionsElement) {
			this.services.domUtilsService!.updateDropdownContents(items, this.suggestionsElement);
		}
	}

	scrollToHighlighted(element: HTMLElement): void {
		if (this.suggestionsElement) {
			this.services.domUtilsService!.scrollToHighlightedSuggestion(
				element,
				this.suggestionsElement,
			);
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
			this.services.domUtilsService!.updateAriaActivedescendant(searchInputElement, suggestionId);
		}
	}
}
