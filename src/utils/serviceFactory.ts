import { ServiceDefinition, ServiceHandlersObject, ServicesObject } from "../interfaces";

const allServices: Record<number, ServicesObject> = {};

export const initService = (
	name: string,
	{ initialState, serviceHandlers, utils }: ServiceDefinition<any, any>,
	instanceId: number,
): ServiceHandlersObject => {
	if (!allServices[instanceId]) allServices[instanceId] = {};
	const instanceServices = allServices[instanceId];

	const state: Record<string, any> = { instanceId, ...initialState };
	const wrappedServiceHandlers: ServiceHandlersObject = {};

	const setState = (name: string, newState: unknown) => {
		// TODO: Make state updates more robust (or just directly modify value in the service handlers)
		state[name] = newState;
	};
	const defaultProps = { state, setState, utils, services: instanceServices };

	Object.entries(serviceHandlers).forEach(([actionName, action]) => {
		wrappedServiceHandlers[actionName] = (customProps?: any) => {
			return action(defaultProps, customProps);
		};
	});

	instanceServices[name] = wrappedServiceHandlers;

	return instanceServices[name] as ServiceHandlersObject;
};
