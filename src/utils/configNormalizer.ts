import { SmartyAddressConfig, NormalizedSmartyAddressConfig } from "../interfaces";
import { SELECTOR_ALIASES, API_FILTER_ALIASES } from "../constants/configAliases";

export function normalizeConfig(config: SmartyAddressConfig): NormalizedSmartyAddressConfig {
	const normalized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(config)) {
		if (value === undefined) continue;

		const selectorCanonical = SELECTOR_ALIASES[key];
		if (selectorCanonical) {
			if (normalized[selectorCanonical] === undefined) {
				normalized[selectorCanonical] = value;
			}
			continue;
		}

		const filterCanonical = API_FILTER_ALIASES[key];
		if (filterCanonical) {
			if (normalized[filterCanonical] === undefined) {
				normalized[filterCanonical] = value;
			}
			continue;
		}

		normalized[key] = value;
	}

	return normalized as unknown as NormalizedSmartyAddressConfig;
}
