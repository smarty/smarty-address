import {EventHandler, EventHandlersObject, AbstractStateObject, Service} from "../interfaces.ts";
import {EventDispatcher} from "./EventDispatcher.ts";

export const defineService = (
	defaultEventHandlers:EventHandlersObject = {},
	initialState:AbstractStateObject,
	init:(state:AbstractStateObject, eventHandlers:{}) => void
):Service => {
	return (eventDispatcher: EventDispatcher, overrideEventHandlers = {}) => {
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
			...defaultEventHandlers,
			...overrideEventHandlers,
		};

		const wrappedEventHandlers = Object.fromEntries(Object.entries(mergedMethods).map(([key, eventHandler]:[string, EventHandler]) => {
			return [key, eventHandlerWrapper(eventHandler)];
		}));

		init(state, wrappedEventHandlers);
	};
};
