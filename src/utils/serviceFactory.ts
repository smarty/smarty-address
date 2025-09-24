import {EventHandler, ServiceDefinition} from "../interfaces.ts";
import {EventDispatcher} from "./EventDispatcher.ts";

export const initService = (
	{eventHandlersMap, initialState = {}}:ServiceDefinition,
	eventDispatcher:EventDispatcher,
	instanceId:number,
):void => {
	const eventHandlerWrapper = (eventHandler: EventHandler) => {
		return (event: CustomEvent) => {
			eventHandler({event, state, setState});
		};
	};

	const state = {eventDispatcher, instanceId, ...initialState};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust
		// state[name] = {...state[name], ...newState};
		state[name] = newState;
		// TODO: Would it make sense to dispatch an event every time state is updated? If so, we would also need to know which service triggered the update (e.g. eventDispatcher.dispatch("uiService_stateUpdated", {name, newState})

	};

	Object.entries(eventHandlersMap).forEach(([eventName, eventHandlers]) => {
		eventHandlers.forEach((eventHandler) => {
			state.eventDispatcher.addEventListener(eventName, eventHandlerWrapper(eventHandler));
		});
	});
};
 