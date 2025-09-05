import {EventHandler, EventHandlersObject, AbstractStateObject} from "../interfaces.ts";
import {EventDispatcher} from "./EventDispatcher.ts";

export const defineService = (defaultMethods:EventHandlersObject = {}, initialState:AbstractStateObject, init:(state:AbstractStateObject, methods:{}) =>void) => {
	return (eventDispatcher: EventDispatcher, overrideMethods = {}) => {
		const eventHandlerWrapper = (eventHandler: EventHandler) => {
			return (event: CustomEvent) => {
				eventHandler(event, state, setState);
			};
		};

		const state = {eventDispatcher, eventHandlerWrapper, ...initialState};

		const setState = (name: string, newState: unknown) => {
			// state[name] = {...state[name], ...newState};
			state[name] = newState;
		}

		const mergedMethods:EventHandlersObject = {
			...defaultMethods,
			...overrideMethods,
		};

		const wrappedEventHandlers = Object.fromEntries(Object.entries(mergedMethods).map(([key, eventHandler]:[string, EventHandler]) => {
			return [key, eventHandlerWrapper(eventHandler)];
		}));

		init(state, wrappedEventHandlers);
	};
};