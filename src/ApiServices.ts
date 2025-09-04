import {AddressSuggestion} from "./interfaces.ts";
import {EventDispatcher} from "./utils/EventDispatcher.ts";

export class ApiServices {
	private autocompleteBaseUrl = 'https://us-autocomplete-pro.api.smarty.com/lookup';
	private apiKey: string = "";
	private eventDispatcher: EventDispatcher;

	constructor(eventDispatcher: EventDispatcher) {
		this.setup(eventDispatcher);
	}

	setup = (eventDispatcher: EventDispatcher) => {
		this.eventDispatcher = eventDispatcher;
		this.eventDispatcher.addEventListener("SmartyAddress.receivedSmartyAddressConfig", this.setApiKey);
		this.eventDispatcher.addEventListener("UiServices.requestedNewAddressSuggestions", this.fetchAddressSuggestions);
	};

	setApiKey = (event:CustomEvent) => {
		this.apiKey = event.detail.embeddedKey;
	};

	fetchAddressSuggestions = async (event: CustomEvent, regionRestrictions?: string[]) => {
		const search = event.detail.searchString;
	}

}
