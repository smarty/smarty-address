import { ServiceDefinition, ServiceHandlersObject } from "../interfaces";

const allServices = {};

export const initService = (
	name: string,
	{ initialState = {}, serviceHandlers = {}, utils }: ServiceDefinition,
	instanceId: number,
): ServiceHandlersObject => {
	if (!allServices[instanceId]) allServices[instanceId] = {};
	const instanceServices = allServices[instanceId];

	const state = { instanceId, ...initialState };
	const wrappedServiceMethods = {};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust
		state[name] = newState;
	};
	const defaultProps = { state, setState, utils, services: instanceServices };

	Object.entries(serviceHandlers).forEach(([actionName, action]) => {
		wrappedServiceMethods[actionName] = (customProps: object) => {
			return action(defaultProps, customProps);
		};
	});

	instanceServices[name] = wrappedServiceMethods;

	return instanceServices[name];
};
