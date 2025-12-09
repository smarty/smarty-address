import {ServiceDefinition, ServiceMethodsObject} from "../interfaces";
import {EventDispatcher} from "./EventDispatcher";

const allServices = {};

export const initService = (
	name:string,
	{initialState = {}, serviceMethods = {}, utils}:ServiceDefinition,
	eventDispatcher:EventDispatcher,
	instanceId:number,
):ServiceMethodsObject => {
	if (!allServices[instanceId]) allServices[instanceId] = {};
	const instanceServices = allServices[instanceId];

	const state = {eventDispatcher, instanceId, ...initialState};
	const wrappedServiceMethods = {};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust
		state[name] = newState;
	};
	const defaultProps = {state, setState, utils, services: instanceServices};

	Object.entries(serviceMethods).forEach(([actionName, action]) => {
		wrappedServiceMethods[actionName] = (customProps:object) => {
			return action(defaultProps, customProps);
		}
	});

	instanceServices[name] = wrappedServiceMethods;

	return instanceServices[name];
};
 