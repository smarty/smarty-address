import {AddressSuggestion} from "../interfaces.ts";

export const formatSelectedAddress = ({street_line, secondary = "", city, state, zipcode, entries}:AddressSuggestion) => {
	return `${street_line} ${secondary} (${entries}) ${city} ${state} ${zipcode}`;
};