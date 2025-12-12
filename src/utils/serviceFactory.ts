import { ServiceDefinition, ServiceHandlersObject } from "../interfaces";

const allServices = {};

export const initService = (
	name: string,
	{ initialState, serviceHandlers, utils }: ServiceDefinition,
	instanceId: number,
): ServiceHandlersObject => {
	if (!allServices[instanceId]) allServices[instanceId] = {};
	const instanceServices = allServices[instanceId];

	const state = { instanceId, ...initialState };
	const wrappedServiceHandlers = {};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust (or just directly modify value in the service handlers)
		state[name] = newState;
	};
	const defaultProps = { state, setState, utils, services: instanceServices };

	Object.entries(serviceHandlers).forEach(([actionName, action]) => {
		wrappedServiceHandlers[actionName] = (customProps: object) => {
			return action(defaultProps, customProps);
		};
	});

	instanceServices[name] = wrappedServiceHandlers;

	return instanceServices[name];
};
