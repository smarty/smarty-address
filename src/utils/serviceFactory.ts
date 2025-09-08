import {EventHandler, ServiceDefinition} from "../interfaces.ts";
import {EventDispatcher} from "./EventDispatcher.ts";

export const defineService = (
	{eventHandlersMap, initialState}:ServiceDefinition,
	eventDispatcher:EventDispatcher,
):void => {
	const eventHandlerWrapper = (eventHandler: EventHandler) => {
		return (event: CustomEvent) => {
			eventHandler({event, state, setState});
		};
	};

	const state = {eventDispatcher, eventHandlerWrapper, ...initialState};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust
		// state[name] = {...state[name], ...newState};
		state[name] = newState;
	};

	eventHandlersMap.forEach(({handler, events}) => {
		events.forEach((eventName) => {
			state.eventDispatcher.addEventListener(eventName, eventHandlerWrapper(handler));
		});
	});
};
