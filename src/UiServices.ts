import {EventDispatcher} from "./utils/EventDispatcher.ts";
import {EventHandler, StateObject} from "./interfaces.ts";

export const UiService = (eventDispatcher: EventDispatcher, overrideMethods = {}) => {
	const eventHandlerWrapper = (eventHandler: EventHandler) => {
		return (event: CustomEvent) => {
			eventHandler(event, state, setState);
		};
	};

	const defaultMethods = {
	};
	const state: StateObject = {
		eventDispatcher,
		eventHandlerWrapper,
		searchInputElement: null,
		streetLineInputElement: null,
		secondaryInputElement: null,
		cityInputElement: null,
		stateInputElement: null,
		zipcodeInputElement: null,
	};

	const setState = (name: string, newState: unknown) => {
		state[name] = newState;
	}

	const mergedMethods = {
		...defaultMethods,
		...overrideMethods,
	};

};
































	return element;
};
