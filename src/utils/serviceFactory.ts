import {EventHandler, ServiceDefinition, ServicesObject} from "../interfaces";
import {EventDispatcher} from "./EventDispatcher";

const allServices = {};

export const initService = (
	{name, eventHandlers, initialState = {}, serviceMethods = {}, utils}:ServiceDefinition,
	eventDispatcher:EventDispatcher,
	instanceId:number,
):ServicesObject => {
	if (!allServices[instanceId]) allServices[instanceId] = {};
	const instanceServices = allServices[instanceId];

	const state = {eventDispatcher, instanceId, ...initialState};
	const wrappedServiceMethods = {};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust
		state[name] = newState;
		// TODO: Would it make sense to dispatch an event every time state is updated? If so, we would also need to know which service triggered the update (e.g. eventDispatcher.dispatch("uiService_stateUpdated", {name, newState})
	};
	const defaultProps = {state, setState, utils, services: instanceServices};

	Object.entries(serviceMethods).forEach(([actionName, action]) => {
		wrappedServiceMethods[actionName] = (customProps:object) => {
			return action(defaultProps, customProps);
		}
	});

	const eventHandlerWrapper = (eventHandler: EventHandler) => {
		return (event: CustomEvent) => {
			eventHandler({event, state, setState, utils, services: instanceServices});
		};
	};

	instanceServices[name] = wrappedServiceMethods;

	Object.entries(eventHandlers).forEach(([eventName, eventHandler]) => {
		state.eventDispatcher.addEventListener(eventName, eventHandlerWrapper(eventHandler));
	});

	return instanceServices[name];
};
 